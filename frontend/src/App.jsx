import React, { useState, useEffect, useRef, useCallback } from 'react'
import Navbar from './components/Navbar'
import CommandCenter from './components/CommandCenter'
import TelemetryGraphs from './components/TelemetryGraphs'
import CanSatViewer from './components/CanSatViewer'
import SessionManagerModal from './components/SessionManagerModal'
import {
  Activity,
  Layers,
  Gauge,
  TrendingUp,
  Battery,
  Radio
} from 'lucide-react'

const POLL_INTERVAL = 62 // ~16 Hz
const MAX_HISTORY = 120

export default function App() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(null)
  const [connected, setConnected] = useState(false)
  const [isReceivingTelemetry, setIsReceivingTelemetry] = useState(false)
  const [loadingCommand, setLoadingCommand] = useState(false)
  const [commandLogs, setCommandLogs] = useState([])
  const [telemetryHistory, setTelemetryHistory] = useState([])
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [mode, setMode] = useState('auto')
  const [meta, setMeta] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [esp32Url, setEsp32Url] = useState('')
  const prevPacket = useRef(null)
  const lastPacketReceivedTime = useRef(0)
  const DISCONNECT_TIMEOUT_MS = 10000 // Only disconnect if no packet for at least 10s

  // Fetch status only when telemetry receiving is active
  const fetchStatus = useCallback(() => {
    if (!isReceivingTelemetry) return
    fetch('/api/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [isReceivingTelemetry])

  useEffect(() => {
    if (isReceivingTelemetry) {
      fetchStatus()
      const id = setInterval(fetchStatus, 3000)
      return () => clearInterval(id)
    }
  }, [isReceivingTelemetry, fetchStatus])

  // 10-second inactivity watchdog: only mark disconnected if no packet received for >= 10s
  useEffect(() => {
    if (!isReceivingTelemetry) return

    const interval = setInterval(() => {
      if (lastPacketReceivedTime.current > 0) {
        const elapsed = Date.now() - lastPacketReceivedTime.current
        if (elapsed >= DISCONNECT_TIMEOUT_MS) {
          setConnected(false)
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isReceivingTelemetry])

  // Real-time live polling loop (16 Hz) - ONLY active when manually toggled on
  useEffect(() => {
    if (!isReceivingTelemetry) {
      setConnected(false)
      return
    }

    let active = true

    async function poll() {
      while (active) {
        try {
          const res = await fetch('/api/live')
          if (res.ok) {
            const json = await res.json()
            if (active) {
              if (json._meta?.mode && json._meta.mode !== mode) {
                setMode(json._meta.mode)
              }
              if (json._meta) {
                setMeta(json._meta)
                if (json._meta.isRecording !== undefined) setIsRecording(json._meta.isRecording)
                if (json._meta.esp32Url) setEsp32Url(json._meta.esp32Url)
              }

              if (json.error === 'esp32_unreachable') {
                const elapsed = Date.now() - lastPacketReceivedTime.current
                if (lastPacketReceivedTime.current === 0 || elapsed >= DISCONNECT_TIMEOUT_MS) {
                  setConnected(false)
                }
              } else {
                setData(json)
                lastPacketReceivedTime.current = Date.now()
                setConnected(true)

                // Append to history buffer for graphs
                setTelemetryHistory(prev => {
                  const next = [...prev, json]
                  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
                })
              }
            }
          } else {
            if (active) {
              const elapsed = Date.now() - lastPacketReceivedTime.current
              if (lastPacketReceivedTime.current === 0 || elapsed >= DISCONNECT_TIMEOUT_MS) {
                setConnected(false)
              }
            }
          }
        } catch {
          if (active) {
            const elapsed = Date.now() - lastPacketReceivedTime.current
            if (lastPacketReceivedTime.current === 0 || elapsed >= DISCONNECT_TIMEOUT_MS) {
              setConnected(false)
            }
          }
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
      }
    }

    poll()
    return () => { active = false }
  }, [isReceivingTelemetry, mode])

  // Toggle Manual Telemetry Receiving
  const handleToggleTelemetry = () => {
    setIsReceivingTelemetry(prev => {
      const next = !prev
      if (!next) {
        lastPacketReceivedTime.current = 0
        setConnected(false)
      }
      return next
    })
  }

  // Action Dispatcher for Command Center
  const handleCommand = async (endpoint, label) => {
    setLoadingCommand(true)
    const timeStr = new Date().toLocaleTimeString()

    try {
      const res = await fetch(`/api/${endpoint}`, { method: 'POST' })
      const json = await res.json()

      const status = json.success ? (json.action === 'eject' ? 'DEPLOYED' : 'SUCCESS') : 'FAILED'
      const details = json.details || `${label} executed.`

      setCommandLogs(prev => [
        ...prev,
        {
          command: label,
          time: timeStr,
          status,
          details
        }
      ])

      if (endpoint === 'calibrate' || endpoint === 'launch') {
        fetchStatus()
      }
    } catch (err) {
      setCommandLogs(prev => [
        ...prev,
        {
          command: label,
          time: timeStr,
          status: 'ERROR',
          details: err.message || 'Network unreachable'
        }
      ])
    } finally {
      setLoadingCommand(false)
    }
  }

  // Toggle Mode (live vs simulation)
  const handleToggleMode = async (targetMode) => {
    setMode(targetMode)
    const timeStr = new Date().toLocaleTimeString()

    try {
      const res = await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetMode })
      })
      const json = await res.json()

      setCommandLogs(prev => [
        ...prev,
        {
          command: targetMode === 'simulation' ? 'SIMULATION' : 'LIVE LINK',
          time: timeStr,
          status: 'ACTIVE',
          details: json.details || `Switched to ${targetMode}`
        }
      ])

      fetchStatus()
    } catch (e) {
      console.error(e)
    }
  }

  // Start new session manually
  const handleStartNewSession = async () => {
    try {
      const res = await fetch('/api/sessions/start', { method: 'POST' })
      const json = await res.json()
      if (json.session) {
        setCommandLogs(prev => [
          ...prev,
          {
            command: 'NEW SESSION',
            time: new Date().toLocaleTimeString(),
            status: 'SUCCESS',
            details: `Initialized ${json.session.sessionId}`
          }
        ])
        fetchStatus()
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Finalize active session
  const handleEndSession = async () => {
    try {
      const res = await fetch('/api/sessions/stop', { method: 'POST' })
      const json = await res.json()
      if (json.session) {
        setCommandLogs(prev => [
          ...prev,
          {
            command: 'SESSION CLOSED',
            time: new Date().toLocaleTimeString(),
            status: 'SUCCESS',
            details: `Saved ${json.session.packetCount} packets`
          }
        ])
        fetchStatus()
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Toggle MongoDB Recording
  const handleToggleRecording = async () => {
    const endpoint = isRecording ? '/api/recording/stop' : '/api/recording/start'
    const timeStr = new Date().toLocaleTimeString()

    try {
      const res = await fetch(endpoint, { method: 'POST' })
      const json = await res.json()

      if (json.success) {
        setIsRecording(json.isRecording)
        setCommandLogs(prev => [
          ...prev,
          {
            command: json.isRecording ? 'START RECORDING' : 'STOP RECORDING',
            time: timeStr,
            status: 'SUCCESS',
            details: json.message || (json.isRecording
              ? `Recording session ${json.session?.sessionId || ''} started`
              : `Recording stopped. ${json.session?.packetCount || 0} packets saved.`)
          }
        ])
        fetchStatus()
      } else {
        setCommandLogs(prev => [
          ...prev,
          {
            command: isRecording ? 'STOP RECORDING' : 'START RECORDING',
            time: timeStr,
            status: 'FAILED',
            details: json.message || 'Operation failed'
          }
        ])
      }
    } catch (err) {
      setCommandLogs(prev => [
        ...prev,
        {
          command: 'RECORDING',
          time: timeStr,
          status: 'ERROR',
          details: err.message || 'Network error'
        }
      ])
    }
  }

  // Change ESP32 IP address at runtime
  const handleChangeIp = async (newIp) => {
    const timeStr = new Date().toLocaleTimeString()
    try {
      const res = await fetch('/api/ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIp })
      })
      const json = await res.json()

      if (json.success) {
        setEsp32Url(json.esp32Url)
        setCommandLogs(prev => [
          ...prev,
          {
            command: 'SET IP',
            time: timeStr,
            status: 'SUCCESS',
            details: `Target: ${json.esp32Url}`
          }
        ])
        fetchStatus()
      }
    } catch (err) {
      setCommandLogs(prev => [
        ...prev,
        {
          command: 'SET IP',
          time: timeStr,
          status: 'ERROR',
          details: err.message || 'Failed to update IP'
        }
      ])
    }
  }

  if (data) prevPacket.current = data.p
  const activeSession = meta?.activeSession || status?.activeSession

  // Grayscale Key Cards with status-based border accents
  const cards = data ? [
    {
      label: 'Packet Number',
      value: data.p,
      unit: '',
      icon: Layers
    },
    {
      label: 'Altitude',
      value: data.a?.toFixed(2),
      unit: 'm',
      icon: TrendingUp
    },
    {
      label: 'Vertical Velocity',
      value: data.v?.toFixed(2),
      unit: 'm/s',
      icon: Activity
    },
    {
      label: 'Baro Pressure',
      value: data.pr?.toFixed(2),
      unit: 'hPa',
      icon: Gauge
    },
    {
      label: 'Battery Bus',
      value: data.bv?.toFixed(3),
      unit: 'V',
      icon: Battery
    },
    {
      label: 'Flight State',
      value: data.state || (connected ? 'ACTIVE' : 'STANDBY'),
      unit: '',
      icon: Radio
    }
  ] : []

  const orientation = data ? { x: data.x || 0, y: data.y || 0, z: data.z || 0 } : null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navigation Bar with Manual Telemetry Toggle & Status Accents */}
      <Navbar
        connected={connected}
        meta={meta}
        status={status}
        activeSession={activeSession}
        onOpenSessions={() => setIsSessionModalOpen(true)}
        onToggleMode={handleToggleMode}
        mode={mode}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        esp32Url={esp32Url}
        onChangeIp={handleChangeIp}
        isReceivingTelemetry={isReceivingTelemetry}
        onToggleTelemetry={handleToggleTelemetry}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Sensor Status Bar in Grayscale */}
        {status && (
          <div className="hud-panel rounded-xl p-3 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                Hardware Bus:
              </span>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900">
                <span className={`w-2 h-2 rounded-full ${status.bmp ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-700'}`} />
                <span className="text-zinc-300 font-bold">BMP390</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900">
                <span className={`w-2 h-2 rounded-full ${status.bno ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-700'}`} />
                <span className="text-zinc-300 font-bold">BNO055</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900">
                <span className={`w-2 h-2 rounded-full ${status.ina ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-700'}`} />
                <span className="text-zinc-300 font-bold">INA219</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-zinc-400">
              <div>
                Pressure Baseline: <strong className="text-zinc-200 font-mono">{status.ref?.toFixed(2) || '1013.25'} hPa</strong>
              </div>
              <span className="text-zinc-600">•</span>
              <div>
                Parachute: <strong className={status.parachuteDeployed ? 'text-emerald-400' : 'text-zinc-400'}>
                  {status.parachuteDeployed ? 'DEPLOYED' : 'ARMED'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Primary Telemetry Metric Cards (Grayscale with subtle metallic accent borders) */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {cards.map((c) => {
              const Icon = c.icon
              return (
                <div
                  key={c.label}
                  className={`hud-panel rounded-xl p-3.5 border transition-all ${
                    connected
                      ? 'border-emerald-900/40 hover:border-emerald-700/60'
                      : 'border-red-950/60 hover:border-red-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider truncate">
                      {c.label}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-zinc-100">
                      {c.value}
                    </span>
                    {c.unit && (
                      <span className="text-xs text-zinc-400 font-mono">{c.unit}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Middle Section: Command Center & 3D Attitude Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <CommandCenter
              onCommand={handleCommand}
              loadingCommand={loadingCommand}
              commandLogs={commandLogs}
              onStartNewSession={handleStartNewSession}
              onEndSession={handleEndSession}
              activeSession={activeSession}
              mode={mode}
              onToggleMode={handleToggleMode}
              connected={connected}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <CanSatViewer orientation={orientation} connected={connected} />
          </div>
        </div>

        {/* Lower Section: Telemetry Graphs in Minimal Grayscale */}
        <div className="pt-2">
          <TelemetryGraphs
            telemetryHistory={telemetryHistory}
            currentData={data || {}}
            connected={connected}
          />
        </div>
      </main>

      {/* Footer in Clean Grayscale */}
      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950 py-3 px-6 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            CanSat Ground Station • MongoDB Session DBMS • React + Node.js
          </div>
          <div className="flex items-center gap-3">
            <span>Sample Rate: 16 Hz</span>
            <span>•</span>
            <span>{isReceivingTelemetry ? 'Telemetry Stream: Active' : 'Telemetry Stream: Standby'}</span>
          </div>
        </div>
      </footer>

      {/* Session Manager / DBMS Explorer Modal */}
      <SessionManagerModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        activeSession={activeSession}
        onStartNewSession={handleStartNewSession}
      />
    </div>
  )
}
