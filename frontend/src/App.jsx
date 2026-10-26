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
  ShieldCheck,
  AlertCircle,
  Radio,
  Clock,
  Compass,
  CheckCircle2,
  HardDrive,
  Rocket
} from 'lucide-react'

const POLL_INTERVAL = 62 // ~16 Hz
const MAX_HISTORY = 120

export default function App() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(null)
  const [connected, setConnected] = useState(false)
  const [loadingCommand, setLoadingCommand] = useState(false)
  const [commandLogs, setCommandLogs] = useState([])
  const [telemetryHistory, setTelemetryHistory] = useState([])
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [mode, setMode] = useState('auto')
  const [meta, setMeta] = useState(null)
  const prevPacket = useRef(null)

  // Fetch status on mount and periodically
  const fetchStatus = useCallback(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 3000)
    return () => clearInterval(id)
  }, [fetchStatus])

  // Real-time live polling loop (16 Hz)
  useEffect(() => {
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
              }

              if (json.error === 'esp32_unreachable') {
                setConnected(false)
              } else {
                setData(json)
                setConnected(true)

                // Append to history buffer for graphs
                setTelemetryHistory(prev => {
                  const next = [...prev, json]
                  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
                })
              }
            }
          } else {
            if (active) setConnected(false)
          }
        } catch {
          if (active) setConnected(false)
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL))
      }
    }

    poll()
    return () => { active = false }
  }, [mode])

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

      // Re-fetch status if calibrate or launch
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

      if (targetMode === 'simulation' || targetMode === 'simulate') {
        setCommandLogs(prev => [
          ...prev,
          {
            command: 'SIMULATE MODE',
            time: timeStr,
            status: 'LAUNCHED',
            details: json.details || 'Flight simulation started & rocket ascent thrust initiated'
          }
        ])
        setTelemetryHistory([])
      } else {
        setCommandLogs(prev => [
          ...prev,
          {
            command: 'LIVE API MODE',
            time: timeStr,
            status: 'ACTIVE',
            details: json.details || 'Streaming live telemetry from ESP32 API'
          }
        ])
      }

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
            details: `Saved ${json.session.packetCount} packets to file`
          }
        ])
        fetchStatus()
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Pulse animation detection on packet change
  const packetChanged = data && prevPacket.current !== data.p
  if (data) prevPacket.current = data.p

  const activeSession = meta?.activeSession || status?.activeSession

  // Key cards
  const cards = data ? [
    {
      label: 'Packet Number',
      value: data.p,
      unit: '',
      icon: Layers,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    },
    {
      label: 'Altitude',
      value: data.a?.toFixed(2),
      unit: 'm',
      icon: TrendingUp,
      color: 'text-cyan-300',
      borderColor: 'border-cyan-500/30'
    },
    {
      label: 'Vertical Velocity',
      value: data.v?.toFixed(2),
      unit: 'm/s',
      icon: Activity,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    },
    {
      label: 'Baro Pressure',
      value: data.pr?.toFixed(2),
      unit: 'hPa',
      icon: Gauge,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Battery Bus',
      value: data.bv?.toFixed(3),
      unit: 'V',
      icon: Battery,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      label: 'Flight State',
      value: data.state || (connected ? 'ACTIVE' : 'OFFLINE'),
      unit: '',
      icon: Radio,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    }
  ] : []

  const orientation = data ? { x: data.x || 0, y: data.y || 0, z: data.z || 0 } : null

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-space-950">
      {/* Top Mission Navbar */}
      <Navbar
        connected={connected}
        meta={meta}
        status={status}
        activeSession={activeSession}
        onOpenSessions={() => setIsSessionModalOpen(true)}
        onToggleMode={handleToggleMode}
        mode={mode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Sensor Status Bar */}
        {status && (
          <div className="hud-panel rounded-xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                Hardware Bus:
              </span>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-white/5 bg-space-900">
                <span className={`w-2 h-2 rounded-full ${status.bmp ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                <span className="text-slate-300 font-bold">BMP390</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-white/5 bg-space-900">
                <span className={`w-2 h-2 rounded-full ${status.bno ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                <span className="text-slate-300 font-bold">BNO055</span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-white/5 bg-space-900">
                <span className={`w-2 h-2 rounded-full ${status.ina ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                <span className="text-slate-300 font-bold">INA219</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-slate-400">
              <div>
                Pressure Baseline: <strong className="text-cyan-300 font-mono">{status.ref?.toFixed(2) || '1013.25'} hPa</strong>
              </div>
              <span className="text-slate-600">•</span>
              <div>
                Parachute: <strong className={status.parachuteDeployed ? 'text-emerald-400' : 'text-slate-400'}>
                  {status.parachuteDeployed ? 'DEPLOYED' : 'ARMED'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Offline Alert when in Live Mode and satellite is disconnected */}
        {mode === 'live' && !connected && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-pulse-fast">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Live Stream Offline:</strong> Awaiting ESP32 at <code className="text-cyan-300">http://10.168.251.244/api/live</code>. Click <strong>SIMULATE</strong> to start a flight simulation test.
              </span>
            </div>
            <button
              onClick={() => handleToggleMode('simulation')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/50 hover:bg-purple-900/60 text-purple-200 font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)]"
            >
              <Rocket className="w-3.5 h-3.5 text-purple-400" />
              <span>Launch Flight Simulation</span>
            </button>
          </div>
        )}

        {/* Primary Telemetry Metric Cards */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {cards.map((c) => {
              const Icon = c.icon
              const isPkt = c.label === 'Packet Number'
              return (
                <div
                  key={c.label}
                  className={`hud-panel rounded-xl p-3.5 border transition-all ${c.borderColor} ${
                    isPkt && packetChanged ? 'scale-[1.02] bg-cyan-950/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-400 mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider truncate">
                      {c.label}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  </div>
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${c.color}`}>
                      {c.value}
                    </span>
                    {c.unit && (
                      <span className="text-xs text-slate-400 font-mono">{c.unit}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Middle Section: Command Center & 3D Attitude Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column (Command Center): 7 cols */}
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
            />
          </div>

          {/* Right Column (3D CanSat Visualizer): 5 cols */}
          <div className="lg:col-span-5 flex flex-col">
            <CanSatViewer orientation={orientation} />
          </div>
        </div>

        {/* Lower Section: Telemetry Graphs for ALL Values */}
        <div className="pt-2">
          <TelemetryGraphs
            telemetryHistory={telemetryHistory}
            currentData={data || {}}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-space-950 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div>
            CanSat Ground Station • MongoDB Session DBMS • React + Tailwind CSS + Node.js
          </div>
          <div className="flex items-center gap-3">
            <span>Sample Rate: 16 Hz</span>
            <span>•</span>
            <span>Port: 3001</span>
            <span>•</span>
            <span className="text-cyan-400">All Systems Nominal</span>
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
