import React, { useState } from 'react'
import { Radio, Database, HardDrive, Wifi, WifiOff, Clock, ShieldCheck, Flame, RotateCw, Rocket, Circle, Square, Globe } from 'lucide-react'

export default function Navbar({
  connected,
  meta,
  status,
  activeSession,
  onOpenSessions,
  onToggleMode,
  mode,
  isRecording,
  onToggleRecording,
  esp32Url,
  onChangeIp
}) {
  const isMongoConnected = meta?.mongoConnected || false
  const isHardware = meta?.source === 'esp32_hardware'
  const isSim = meta?.source === 'simulation'

  const [ipInput, setIpInput] = useState('')
  const [ipLoading, setIpLoading] = useState(false)

  const handleIpSubmit = async () => {
    if (!ipInput.trim()) return
    setIpLoading(true)
    try {
      await onChangeIp(ipInput.trim())
      setIpInput('')
    } catch (e) {
      console.error(e)
    } finally {
      setIpLoading(false)
    }
  }

  const handleIpKeyDown = (e) => {
    if (e.key === 'Enter') handleIpSubmit()
    if (e.key === 'Escape') {
      setIpInput('')
    }
  }

  return (
    <header className="border-b border-white/10 bg-space-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Mission Info */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
            <div className="absolute -inset-0.5 rounded-xl bg-cyan-400/20 blur-sm -z-10" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                CANSAT GROUND CONTROL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-semibold uppercase">
                v2.0 • 16 Hz
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span>ESP32-S3 TELEMETRY SYSTEM</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">ID: SAT-ALPHA-01</span>
            </div>
          </div>
        </div>

        {/* Center: IP Input + Recording + Session Info */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dynamic IP Input */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/30 bg-space-850 shadow-inner">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-300 whitespace-nowrap">
              Enter IP:
            </span>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={handleIpKeyDown}
              placeholder={esp32Url ? esp32Url.replace(/^https?:\/\//, '') : '10.168.251.244'}
              className="bg-space-950/70 border border-white/10 rounded px-2 py-0.5 text-xs font-mono text-cyan-200 placeholder:text-slate-500 w-28 sm:w-36 focus:outline-none focus:border-cyan-400 transition-colors"
              title={`Current ESP32 target: ${esp32Url || 'http://10.168.251.244'}`}
            />
            <button
              onClick={handleIpSubmit}
              disabled={ipLoading || !ipInput.trim()}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors shadow-[0_0_8px_rgba(6,182,212,0.3)]"
            >
              {ipLoading ? '...' : 'SET'}
            </button>
          </div>

          {/* Start / Stop Recording Button */}
          <button
            onClick={onToggleRecording}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              isRecording
                ? 'border-red-500/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            }`}
            title={isRecording ? 'Stop recording telemetry to MongoDB' : 'Start recording telemetry to MongoDB'}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 text-red-400 fill-red-400" />
                <span>Stop Recording</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                <span>Start Recording</span>
              </>
            )}
          </button>

          {/* Active Session indicator */}
          {activeSession ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 text-red-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold">REC:</span>
              <span className="text-slate-300 truncate max-w-[160px]" title={activeSession.sessionId}>
                {activeSession.sessionId}
              </span>
              <span className="text-red-400 font-bold ml-1">
                ({activeSession.packetCount || 0} pkts)
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-space-850 text-slate-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>STANDBY</span>
            </div>
          )}

          {/* Session Explorer Button */}
          <button
            onClick={onOpenSessions}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition-colors"
            title="Browse recorded session files and MongoDB logs"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Flight Logs</span>
          </button>
        </div>

        {/* Right: Telemetry Link & DBMS Health */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          {/* Simulate vs Live Toggle Switch */}
          <div className="flex items-center p-1 rounded-xl border border-white/10 bg-space-850 shadow-inner">
            <button
              onClick={() => onToggleMode('live')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                mode === 'live'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-space-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Fetch real-time telemetry from ESP32 API"
            >
              <Radio className={`w-3.5 h-3.5 ${mode === 'live' ? 'animate-pulse' : ''}`} />
              <span>LIVE</span>
            </button>

            <button
              onClick={() => onToggleMode('simulation')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                mode === 'simulation'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Start a realistic flight simulation sequence"
            >
              <Rocket className={`w-3.5 h-3.5 ${mode === 'simulation' ? 'animate-bounce' : ''}`} />
              <span>SIMULATE</span>
            </button>
          </div>

          {/* MongoDB Status Chip */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
              isMongoConnected
                ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
            }`}
            title={
              isMongoConnected
                ? 'MongoDB connected - telemetry and sessions synchronized'
                : 'MongoDB offline - local JSON/CSV file logging active, auto-reconnecting...'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isMongoConnected ? 'MongoDB: Online' : 'MongoDB: File Mode'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isMongoConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          </div>

          {/* Satellite Radio Link Status */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
              connected
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-red-500/40 bg-red-950/30 text-red-300'
            }`}
          >
            {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
            <span className="font-bold">
              {connected ? (isHardware ? 'LINK LIVE' : 'SIM LINK') : 'LINK DOWN'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
