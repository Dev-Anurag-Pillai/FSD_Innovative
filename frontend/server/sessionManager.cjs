const fs = require('fs')
const path = require('path')
const Session = require('./models/Session.cjs')
const Telemetry = require('./models/Telemetry.cjs')
const { isMongoConnected } = require('./db.cjs')

const SESSIONS_DIR = path.join(__dirname, 'data', 'sessions')

// Ensure directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

let activeSession = null
let jsonStream = null
let csvStream = null
let telemetryBuffer = []
let packetBatchTimer = null
let isFirstPacketInJson = true

// Format current date and time for filename: session_YYYY-MM-DD_HH-mm-ss
function getTimestampString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const YYYY = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const DD = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `session_${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`
}

async function startSession(source = 'esp32_hardware', customTitle = null) {
  // If there's an active session, close it first
  if (activeSession) {
    await endSession('completed')
  }

  const now = new Date()
  const sessionId = getTimestampString(now)
  const jsonFileName = `${sessionId}.json`
  const csvFileName = `${sessionId}.csv`
  const jsonFilePath = path.join(SESSIONS_DIR, jsonFileName)
  const csvFilePath = path.join(SESSIONS_DIR, csvFileName)

  const sessionObj = {
    sessionId,
    title: customTitle || `Mission Session ${now.toLocaleString()}`,
    startTime: now,
    status: 'active',
    source,
    jsonFileName,
    csvFileName,
    jsonFilePath,
    csvFilePath,
    packetCount: 0,
    stats: {
      maxAltitude: -9999,
      minAltitude: 9999,
      maxVelocity: -9999,
      minVelocity: 9999,
      avgPressure: 0,
      minBatteryVoltage: 999,
      maxBatteryVoltage: -999
    },
    commandsLogged: [
      {
        command: 'SESSION_START',
        timestamp: now,
        status: 'SUCCESS',
        details: `Session started automatically via ${source}`
      }
    ]
  }

  activeSession = sessionObj

  // Initialize CSV File with headers
  try {
    const csvHeader = 'packet,timestamp,pressure_hPa,altitude_m,velocity_ms,orientationX_deg,orientationY_deg,orientationZ_deg,batteryVoltage_v\n'
    fs.writeFileSync(csvFilePath, csvHeader, 'utf8')
    csvStream = fs.createWriteStream(csvFilePath, { flags: 'a' })
  } catch (err) {
    console.error('[SessionManager] Error creating CSV file:', err.message)
  }

  // Initialize JSON File
  try {
    const jsonHeader = `{\n  "sessionId": "${sessionId}",\n  "startTime": "${now.toISOString()}",\n  "source": "${source}",\n  "telemetry": [\n`
    fs.writeFileSync(jsonFilePath, jsonHeader, 'utf8')
    jsonStream = fs.createWriteStream(jsonFilePath, { flags: 'a' })
    isFirstPacketInJson = true
  } catch (err) {
    console.error('[SessionManager] Error creating JSON file:', err.message)
  }

  // Save to MongoDB if connected
  if (isMongoConnected()) {
    try {
      const dbSession = new Session({
        sessionId,
        title: sessionObj.title,
        startTime: now,
        status: 'active',
        source,
        jsonFileName,
        csvFileName,
        stats: sessionObj.stats,
        commandsLogged: sessionObj.commandsLogged
      })
      await dbSession.save()
      console.log(`[SessionManager] MongoDB Session record saved: ${sessionId}`)
    } catch (err) {
      console.warn(`[SessionManager] Could not save Session to MongoDB: ${err.message}`)
    }
  }

  console.log(`[SessionManager] Started new session: ${sessionId}`)
  console.log(`[SessionManager] Files created:`)
  console.log(`  -> ${jsonFilePath}`)
  console.log(`  -> ${csvFilePath}`)

  return activeSession
}

async function recordTelemetry(packetData) {
  if (!activeSession) {
    await startSession('esp32_hardware')
  }

  const s = activeSession
  s.packetCount++

  const p = Number(packetData.p || s.packetCount)
  const pr = Number(packetData.pr || 0)
  const a = Number(packetData.a || 0)
  const v = Number(packetData.v || 0)
  const x = Number(packetData.x || 0)
  const y = Number(packetData.y || 0)
  const z = Number(packetData.z || 0)
  const bv = Number(packetData.bv || 0)
  const now = new Date()

  // Update rolling stats
  if (a > s.stats.maxAltitude) s.stats.maxAltitude = a
  if (a < s.stats.minAltitude) s.stats.minAltitude = a
  if (v > s.stats.maxVelocity) s.stats.maxVelocity = v
  if (v < s.stats.minVelocity) s.stats.minVelocity = v
  if (bv < s.stats.minBatteryVoltage) s.stats.minBatteryVoltage = bv
  if (bv > s.stats.maxBatteryVoltage) s.stats.maxBatteryVoltage = bv
  s.stats.avgPressure = s.stats.avgPressure === 0 ? pr : (s.stats.avgPressure * 0.95 + pr * 0.05)

  // Write to CSV
  if (csvStream) {
    const csvLine = `${p},"${now.toISOString()}",${pr.toFixed(2)},${a.toFixed(2)},${v.toFixed(2)},${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)},${bv.toFixed(3)}\n`
    csvStream.write(csvLine)
  }

  // Write to JSON
  if (jsonStream) {
    const record = {
      packet: p,
      timestamp: now.toISOString(),
      pressure: pr,
      altitude: a,
      velocity: v,
      orientationX: x,
      orientationY: y,
      orientationZ: z,
      batteryVoltage: bv
    }
    const prefix = isFirstPacketInJson ? '    ' : ',\n    '
    jsonStream.write(prefix + JSON.stringify(record))
    isFirstPacketInJson = false
  }

  // Buffer for MongoDB batch insertion
  telemetryBuffer.push({
    sessionId: s.sessionId,
    packet: p,
    pressure: pr,
    altitude: a,
    velocity: v,
    orientationX: x,
    orientationY: y,
    orientationZ: z,
    batteryVoltage: bv,
    timestamp: now
  })

  // Flush batch to MongoDB every 25 packets (~1.5s at 16 Hz)
  if (telemetryBuffer.length >= 25 && isMongoConnected()) {
    flushMongoBuffer()
  }
}

async function flushMongoBuffer() {
  if (telemetryBuffer.length === 0 || !isMongoConnected()) return
  const batch = [...telemetryBuffer]
  telemetryBuffer = []

  try {
    await Telemetry.insertMany(batch, { ordered: false })
    if (activeSession) {
      await Session.updateOne(
        { sessionId: activeSession.sessionId },
        {
          $set: {
            packetCount: activeSession.packetCount,
            stats: activeSession.stats
          }
        }
      )
    }
  } catch (err) {
    console.warn('[SessionManager] Mongo telemetry buffer flush warning:', err.message)
  }
}

async function logCommand(command, status = 'SUCCESS', details = '') {
  const logItem = {
    command,
    timestamp: new Date(),
    status,
    details
  }

  if (activeSession) {
    activeSession.commandsLogged.push(logItem)
    if (isMongoConnected()) {
      try {
        await Session.updateOne(
          { sessionId: activeSession.sessionId },
          { $push: { commandsLogged: logItem } }
        )
      } catch (err) {
        console.warn('[SessionManager] Could not log command to Mongo:', err.message)
      }
    }
  }

  return logItem
}

async function endSession(status = 'completed') {
  if (!activeSession) return null

  const s = activeSession
  const now = new Date()
  s.endTime = now
  s.durationSeconds = Math.round((now.getTime() - new Date(s.startTime).getTime()) / 1000)
  s.status = status

  // Log session end
  s.commandsLogged.push({
    command: 'SESSION_END',
    timestamp: now,
    status: 'SUCCESS',
    details: `Session closed after ${s.durationSeconds}s, ${s.packetCount} packets.`
  })

  // Close JSON file
  if (jsonStream) {
    try {
      const jsonFooter = `\n  ],\n  "endTime": "${now.toISOString()}",\n  "durationSeconds": ${s.durationSeconds},\n  "packetCount": ${s.packetCount},\n  "status": "${status}",\n  "stats": ${JSON.stringify(s.stats, null, 2)}\n}\n`
      jsonStream.write(jsonFooter)
      jsonStream.end()
    } catch (e) {
      console.error('[SessionManager] Error closing JSON file:', e.message)
    }
    jsonStream = null
  }

  // Close CSV file
  if (csvStream) {
    try {
      csvStream.end()
    } catch (e) {
      console.error('[SessionManager] Error closing CSV file:', e.message)
    }
    csvStream = null
  }

  // Flush remaining Mongo records
  await flushMongoBuffer()

  // Update Mongo Session document
  if (isMongoConnected()) {
    try {
      await Session.updateOne(
        { sessionId: s.sessionId },
        {
          $set: {
            endTime: now,
            durationSeconds: s.durationSeconds,
            status,
            packetCount: s.packetCount,
            stats: s.stats,
            commandsLogged: s.commandsLogged
          }
        }
      )
    } catch (err) {
      console.warn('[SessionManager] Could not update finished session in Mongo:', err.message)
    }
  }

  console.log(`[SessionManager] Closed session: ${s.sessionId} (${s.packetCount} packets recorded)`)
  const finished = { ...s }
  activeSession = null
  return finished
}

function getActiveSession() {
  if (!activeSession) return null
  const now = new Date()
  const duration = Math.round((now.getTime() - new Date(activeSession.startTime).getTime()) / 1000)
  return {
    ...activeSession,
    durationSeconds: duration
  }
}

// List all sessions (from MongoDB if available, otherwise read disk directory)
async function listSessions() {
  if (isMongoConnected()) {
    try {
      const sessions = await Session.find().sort({ startTime: -1 }).limit(50).lean()
      if (sessions.length > 0) {
        return sessions
      }
    } catch (err) {
      console.warn('[SessionManager] Querying Mongo failed, fallback to filesystem:', err.message)
    }
  }

  // Filesystem fallback
  try {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
    const list = files.map(file => {
      const filePath = path.join(SESSIONS_DIR, file)
      const stats = fs.statSync(filePath)
      const sessionId = file.replace('.json', '')
      return {
        sessionId,
        title: `Recorded Session (${sessionId})`,
        startTime: stats.birthtime || stats.mtime,
        status: (activeSession && activeSession.sessionId === sessionId) ? 'active' : 'completed',
        jsonFileName: file,
        csvFileName: `${sessionId}.csv`,
        fileSizeBytes: stats.size
      }
    }).sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

    return list
  } catch (err) {
    console.error('[SessionManager] Error reading sessions directory:', err.message)
    return []
  }
}

// Get session details and data
async function getSession(sessionId) {
  // If active in memory
  if (activeSession && activeSession.sessionId === sessionId) {
    return {
      session: getActiveSession(),
      isActive: true
    }
  }

  // Query MongoDB
  if (isMongoConnected()) {
    try {
      const session = await Session.findOne({ sessionId }).lean()
      if (session) {
        const telemetry = await Telemetry.find({ sessionId }).sort({ packet: 1 }).limit(1000).lean()
        return {
          session,
          telemetry
        }
      }
    } catch (err) {
      console.warn('[SessionManager] Mongo query error:', err.message)
    }
  }

  // Read from file
  const jsonPath = path.join(SESSIONS_DIR, `${sessionId}.json`)
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8')
      const parsed = JSON.parse(raw)
      return {
        session: {
          sessionId,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          durationSeconds: parsed.durationSeconds,
          status: parsed.status,
          stats: parsed.stats,
          packetCount: parsed.packetCount || parsed.telemetry?.length || 0,
          jsonFileName: `${sessionId}.json`,
          csvFileName: `${sessionId}.csv`,
        },
        telemetry: parsed.telemetry || []
      }
    } catch (e) {
      console.error('[SessionManager] Error reading JSON file:', e.message)
    }
  }

  return null
}

function getSessionFilePath(sessionId, format = 'json') {
  const ext = format === 'csv' ? 'csv' : 'json'
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.${ext}`)
  if (fs.existsSync(filePath)) {
    return filePath
  }
  return null
}

module.exports = {
  startSession,
  recordTelemetry,
  endSession,
  logCommand,
  getActiveSession,
  listSessions,
  getSession,
  getSessionFilePath,
  SESSIONS_DIR
}
