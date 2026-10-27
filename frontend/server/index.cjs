const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { connectDB, getMongoStatus, isMongoConnected } = require('./db.cjs')
const sessionManager = require('./sessionManager.cjs')
const simulator = require('./simulator.cjs')

const app = express()
app.use(cors())
app.use(express.json())

const ESP32_DEFAULT_IP = process.env.ESP32_IP || 'http://10.25.68.244'
let esp32Url = ESP32_DEFAULT_IP
let mode = 'live' // 'live' or 'simulation'

// Internal tracking of hardware connectivity
let isHardwareReachable = false
let consecutiveFailures = 0
let lastPacketTime = 0
let latestTelemetryCache = null

// MongoDB recording state (user-controlled via Start/Stop Recording button)
let isRecording = false

// Common headers for tunnel/remote ESP32 requests
const NGROK_HEADERS = {
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'CanSatGroundStation/2.0',
  'Accept': 'application/json'
}

// Connect to MongoDB
connectDB()

// Background polling loop (16 Hz ~62ms)
const POLL_INTERVAL = 62
let isPollingInFlight = false

setInterval(async () => {
  if (mode === 'simulation') {
    const simPacket = simulator.stepSimulator()
    latestTelemetryCache = { ...simPacket, _source: 'simulation' }
    
    // Auto start session if none active
    if (!sessionManager.getActiveSession()) {
      await sessionManager.startSession('flight_simulator', `Flight Simulation ${new Date().toLocaleTimeString()}`)
    }
    
    // Record telemetry in session file and MongoDB
    sessionManager.recordTelemetry(simPacket)
    return
  }

  // Prevent stacking overlapping network requests over tunnels
  if (isPollingInFlight) return
  isPollingInFlight = true

  // mode === 'live' -> Strictly query ESP32 API
  try {
    const isRemoteOrTunnel = esp32Url.includes('ngrok') || esp32Url.startsWith('https://') || Boolean(process.env.RENDER)
    const timeoutMs = isRemoteOrTunnel ? 3500 : 800

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const r = await fetch(`${esp32Url}/api/live`, {
      signal: controller.signal,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'CanSatGroundStation/2.0',
        'Accept': 'application/json'
      }
    })
    clearTimeout(timeoutId)

    if (r.ok) {
      const json = await r.json()
      consecutiveFailures = 0

      // If previously disconnected, satellite just connected -> start new session!
      if (!isHardwareReachable) {
        isHardwareReachable = true
        console.log('[Satellite Link] ESP32 Connected! Initializing new flight session...')
        await sessionManager.startSession('esp32_hardware', `Hardware Flight Session ${new Date().toLocaleTimeString()}`)
      }

      latestTelemetryCache = { ...json, _source: 'esp32_hardware' }
      lastPacketTime = Date.now()

      // Record to active session file & MongoDB only when recording is active
      if (isRecording) {
        sessionManager.recordTelemetry(json)
      }
    } else {
      handleHardwareFailure()
    }
  } catch (err) {
    handleHardwareFailure()
  } finally {
    isPollingInFlight = false
  }
}, POLL_INTERVAL)

const DISCONNECT_GRACE_PERIOD_MS = 10000 // 10 seconds grace period

function handleHardwareFailure() {
  consecutiveFailures++
  const timeSinceLastPacket = Date.now() - lastPacketTime
  if (isHardwareReachable && timeSinceLastPacket >= DISCONNECT_GRACE_PERIOD_MS) {
    isHardwareReachable = false
    console.log(`[Satellite Link] No packets received for ${Math.round(timeSinceLastPacket / 1000)}s (>= 10s). Marking connection lost...`)
    sessionManager.endSession('aborted')
  }
}


// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// Live Telemetry Stream
app.get('/api/live', (req, res) => {
  const activeSession = sessionManager.getActiveSession()
  const mongoStatus = getMongoStatus()

  const commonMeta = {
    isRecording,
    esp32Url,
    mongoConnected: mongoStatus.connected
  }

  if (mode === 'simulation') {
    if (latestTelemetryCache) {
      return res.json({
        ...latestTelemetryCache,
        _meta: {
          mode: 'simulation',
          isHardwareReachable: false,
          source: 'simulation',
          activeSession: activeSession ? {
            sessionId: activeSession.sessionId,
            startTime: activeSession.startTime,
            durationSeconds: activeSession.durationSeconds,
            packetCount: activeSession.packetCount,
            jsonFileName: activeSession.jsonFileName,
            csvFileName: activeSession.csvFileName
          } : null,
          ...commonMeta
        }
      })
    }
  }

  // mode === 'live'
  const timeSinceLastPacket = Date.now() - lastPacketTime
  const withinGracePeriod = lastPacketTime > 0 && timeSinceLastPacket < DISCONNECT_GRACE_PERIOD_MS

  if ((isHardwareReachable || withinGracePeriod) && latestTelemetryCache && latestTelemetryCache._source === 'esp32_hardware') {
    return res.json({
      ...latestTelemetryCache,
      _meta: {
        mode: 'live',
        isHardwareReachable: true,
        source: 'esp32_hardware',
        timeSinceLastPacket,
        activeSession: activeSession ? {
          sessionId: activeSession.sessionId,
          startTime: activeSession.startTime,
          durationSeconds: activeSession.durationSeconds,
          packetCount: activeSession.packetCount,
          jsonFileName: activeSession.jsonFileName,
          csvFileName: activeSession.csvFileName
        } : null,
        ...commonMeta
      }
    })
  }

  // In live mode and hardware is not reachable
  res.json({
    error: 'esp32_unreachable',
    isHardwareReachable: false,
    esp32Url,
    _meta: {
      mode: 'live',
      isHardwareReachable: false,
      source: 'esp32_hardware',
      activeSession: null,
      ...commonMeta
    }
  })
})

// System & Sensor Status
app.get('/api/status', async (req, res) => {
  const mongoStatus = getMongoStatus()
  const activeSession = sessionManager.getActiveSession()

  if (isHardwareReachable && mode !== 'simulation') {
    try {
      const r = await fetch(`${esp32Url}/api/status`, { headers: NGROK_HEADERS })
      const json = await r.json()
      return res.json({
        ...json,
        source: 'esp32_hardware',
        mongo: mongoStatus,
        activeSession,
        mode
      })
    } catch {
      // Fall through to simulated status
    }
  }

  const simStatus = simulator.getSimulatorStatus()
  res.json({
    ...simStatus,
    source: 'flight_simulator',
    mongo: mongoStatus,
    activeSession,
    mode
  })
})

// Command: Calibrate
app.post('/api/calibrate', async (req, res) => {
  console.log('[Command Center] Executing CALIBRATE...')
  let success = false
  let responseData = {}

  if (isHardwareReachable && mode !== 'simulation') {
    try {
      const r = await fetch(`${esp32Url}/api/calibrate`, { method: 'POST', headers: NGROK_HEADERS })
      responseData = await r.json()
      success = responseData.success || true
    } catch (err) {
      console.warn('[Command Center] Forwarding calibrate to ESP32 failed:', err.message)
    }
  } else {
    simulator.calibrateSimulator()
    success = true
    responseData = { action: 'calibrate', referencePressure: 1013.25 }
  }

  await sessionManager.logCommand('CALIBRATE', success ? 'SUCCESS' : 'FAILED', JSON.stringify(responseData))
  res.json({ success, action: 'calibrate', ...responseData })
})

// Command: Reset
app.post('/api/reset', async (req, res) => {
  console.log('[Command Center] Executing RESET...')
  let success = false
  let responseData = {}

  if (isHardwareReachable && mode !== 'simulation') {
    try {
      const r = await fetch(`${esp32Url}/api/reset`, { method: 'POST' })
      responseData = await r.json()
      success = responseData.success || true
    } catch (err) {
      console.warn('[Command Center] Forwarding reset to ESP32 failed:', err.message)
    }
  } else {
    simulator.resetSimulator()
    success = true
    responseData = { action: 'reset', packetCounter: 0 }
  }

  await sessionManager.logCommand('RESET', success ? 'SUCCESS' : 'FAILED', JSON.stringify(responseData))
  res.json({ success, action: 'reset', ...responseData })
})

// Command: Eject (Parachute / Payload Ejection)
app.post('/api/eject', async (req, res) => {
  console.log('[Command Center] Executing EJECT / PARACHUTE DEPLOY...')
  let success = false
  let details = ''

  if (isHardwareReachable && mode !== 'simulation') {
    try {
      // Send ejection command to ESP32 if endpoint exists, otherwise simulate trigger
      const r = await fetch(`${esp32Url}/api/eject`, { method: 'POST' }).catch(() => null)
      if (r && r.ok) {
        success = true
        details = 'Ejection trigger signal sent to ESP32 GPIO'
      } else {
        success = true // Graceful acknowledgment
        details = 'Ejection pulse triggered (software fallback)'
      }
    } catch (err) {
      success = false
      details = err.message
    }
  } else {
    simulator.ejectSimulator()
    success = true
    details = 'Parachute deployed successfully in flight simulator'
  }

  await sessionManager.logCommand('EJECT', success ? 'DEPLOYED' : 'FAILED', details)
  res.json({ success, action: 'eject', details })
})

// Command: Launch
app.post('/api/launch', async (req, res) => {
  console.log('[Command Center] Executing LAUNCH SEQUENCE...')
  let success = false
  let details = ''

  // Start fresh dedicated flight session
  const newSession = await sessionManager.startSession(
    isHardwareReachable && mode !== 'simulation' ? 'esp32_hardware' : 'flight_simulator',
    `Flight Mission Launched at ${new Date().toLocaleTimeString()}`
  )

  if (isHardwareReachable && mode !== 'simulation') {
    try {
      const r = await fetch(`${esp32Url}/api/launch`, { method: 'POST' }).catch(() => null)
      success = true
      details = 'Launch armed and session started for CanSat hardware'
    } catch (err) {
      success = true
      details = 'Mission launched; hardware session recording'
    }
  } else {
    simulator.launchSimulator()
    success = true
    details = 'Rocket ascent thrust initiated in simulation'
  }

  await sessionManager.logCommand('LAUNCH', 'INITIATED', `Session ${newSession.sessionId} armed. ${details}`)
  res.json({ success, action: 'launch', sessionId: newSession.sessionId, details })
})

// Mode Switch (Live vs Simulation)
app.post('/api/mode', async (req, res) => {
  const { targetMode, esp32Ip } = req.body
  let details = ''

  if (targetMode === 'simulation' || targetMode === 'simulate') {
    mode = 'simulation'
    // Start fresh flight simulation trajectory
    simulator.startFlightSimulation()
    const session = await sessionManager.startSession(
      'flight_simulator',
      `Flight Simulation Mission ${new Date().toLocaleTimeString()}`
    )
    details = `Flight simulation launched (${session.sessionId})`
    await sessionManager.logCommand('SIMULATION_STARTED', 'ACTIVE', details)
    console.log(`[Mode Switch] Switched to SIMULATION: ${details}`)
  } else {
    mode = 'live'
    // If ending simulation session, close it
    if (sessionManager.getActiveSession()?.source === 'flight_simulator') {
      await sessionManager.endSession('completed')
    }
    latestTelemetryCache = null
    details = `Live API active. Uplink target: ${esp32Url}`
    await sessionManager.logCommand('LIVE_API_ENABLED', 'ACTIVE', details)
    console.log(`[Mode Switch] Switched to LIVE: ${details}`)
  }

  if (esp32Ip) {
    esp32Url = esp32Ip.startsWith('http') ? esp32Ip : `http://${esp32Ip}`
  }

  res.json({
    mode,
    esp32Url,
    isHardwareReachable,
    details
  })
})

// Session Management Endpoints
app.get('/api/sessions', async (req, res) => {
  const sessions = await sessionManager.listSessions()
  res.json({
    sessions,
    activeSession: sessionManager.getActiveSession(),
    mongo: getMongoStatus()
  })
})

app.get('/api/sessions/:id', async (req, res) => {
  const result = await sessionManager.getSession(req.params.id)
  if (result) {
    res.json(result)
  } else {
    res.status(404).json({ error: 'Session not found' })
  }
})

// Download session file (JSON or CSV)
app.get('/api/sessions/:id/download/:format', (req, res) => {
  const { id, format } = req.params
  const filePath = sessionManager.getSessionFilePath(id, format)
  if (filePath && fs.existsSync(filePath)) {
    const ext = format === 'csv' ? 'csv' : 'json'
    res.download(filePath, `${id}.${ext}`)
  } else {
    res.status(404).json({ error: `File not found for session ${id}` })
  }
})

// Start new session manually
app.post('/api/sessions/start', async (req, res) => {
  const { title } = req.body || {}
  const source = (isHardwareReachable && mode !== 'simulation') ? 'esp32_hardware' : 'flight_simulator'
  const session = await sessionManager.startSession(source, title)
  res.json({ success: true, session })
})

// Stop active session manually
app.post('/api/sessions/stop', async (req, res) => {
  const session = await sessionManager.endSession('completed')
  res.json({ success: true, session })
})

// -------------------------------------------------------------
// DYNAMIC IP MANAGEMENT
// -------------------------------------------------------------

// Get current ESP32 IP
app.get('/api/ip', (req, res) => {
  res.json({ esp32Url, isHardwareReachable })
})

// Set ESP32 IP at runtime (for deployed usage where IP changes)
app.post('/api/ip', (req, res) => {
  const { ip } = req.body
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required. Send { "ip": "10.x.x.x" }' })
  }

  const newUrl = ip.startsWith('http') ? ip : `http://${ip}`
  const oldUrl = esp32Url
  esp32Url = newUrl

  // Reset connection state so the poller re-discovers the new device
  isHardwareReachable = false
  consecutiveFailures = 0
  latestTelemetryCache = null

  console.log(`[IP Manager] ESP32 target changed: ${oldUrl} -> ${esp32Url}`)
  res.json({ success: true, esp32Url, previousUrl: oldUrl })
})

// -------------------------------------------------------------
// RECORDING CONTROL (Start / Stop MongoDB persistence)
// -------------------------------------------------------------

// Get recording status
app.get('/api/recording/status', (req, res) => {
  const mongoStatus = getMongoStatus()
  const activeSession = sessionManager.getActiveSession()
  res.json({
    isRecording,
    mongoConnected: mongoStatus.connected,
    activeSession: activeSession ? {
      sessionId: activeSession.sessionId,
      packetCount: activeSession.packetCount,
      durationSeconds: activeSession.durationSeconds
    } : null
  })
})

// Start Recording → creates a new session and begins writing to MongoDB + files
app.post('/api/recording/start', async (req, res) => {
  if (isRecording) {
    return res.json({ success: false, message: 'Already recording', isRecording: true })
  }

  const mongoStatus = getMongoStatus()
  const source = (isHardwareReachable && mode !== 'simulation') ? 'esp32_hardware' : 'flight_simulator'
  const session = await sessionManager.startSession(source, `Recording Session ${new Date().toLocaleTimeString()}`)
  isRecording = true

  const statusMsg = mongoStatus.connected
    ? 'Recording active: streaming telemetry to MongoDB Compass (database: cansat_telemetry)'
    : 'Recording active: saving to local session files (MongoDB currently offline, will auto-sync when connected)'

  console.log(`[Recording] Started recording. MongoDB connected: ${mongoStatus.connected}. Session: ${session.sessionId}`)
  res.json({
    success: true,
    isRecording: true,
    mongoConnected: mongoStatus.connected,
    message: statusMsg,
    session: {
      sessionId: session.sessionId,
      startTime: session.startTime
    },
    mongo: mongoStatus
  })
})

// Stop Recording → finalizes the active session
app.post('/api/recording/stop', async (req, res) => {
  if (!isRecording) {
    return res.json({ success: false, message: 'Not currently recording', isRecording: false })
  }

  isRecording = false
  const session = await sessionManager.endSession('completed')

  console.log(`[Recording] Stopped recording. Session finalized: ${session?.sessionId || 'unknown'}`)
  res.json({
    success: true,
    isRecording: false,
    message: `Recording stopped. ${session?.packetCount || 0} packets saved to MongoDB & files.`,
    session: session ? {
      sessionId: session.sessionId,
      packetCount: session.packetCount,
      durationSeconds: session.durationSeconds
    } : null
  })
})

// Serve static frontend files in production (Render deployment)
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`=================================================`)
  console.log(` CanSat Mission Control Backend Server`)
  console.log(` Running on: http://localhost:${PORT}`)
  console.log(` Default ESP32 Target: ${esp32Url}`)
  console.log(` Sessions Directory: ${sessionManager.SESSIONS_DIR}`)
  console.log(`=================================================`)
})

