import React, { useState } from 'react'
import { Radio, Database, HardDrive, Wifi, WifiOff, Globe, Play, Square, Circle } from 'lucide-react'

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
  onChangeIp,
  isReceivingTelemetry,
  onToggleTelemetry
}) {
  const isMongoConnected = meta?.mongoConnected || false
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
    if (e.key === 'Escape') setIpInput('')
  }

  return (
    <header
      className={`bg-zinc-950/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300 border-b ${
        connected ? 'border-emerald-900/40 metallic-green-glow' : 'border-red-950/50 metallic-red-glow'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding in clean industrial grayscale */}
        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
              connected
                ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-400'
                : 'border-red-900/60 bg-red-950/30 text-red-400'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-widest text-zinc-100 uppercase">
                CanSat Ground Control
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 font-semibold">
                16 Hz
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              ESP32-S3 Telemetry Station
            </div>
          </div>
        </div>

        {/* Center: Controls (Manual Telemetry Toggle, IP, Recording, Sessions) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MANUAL TELEMETRY RECEIVING TOGGLE BUTTON */}
          <button
            onClick={onToggleTelemetry}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
              isReceivingTelemetry
                ? 'border-emerald-600/70 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'border-red-900/70 bg-red-950/30 text-red-300 hover:bg-red-900/40 shadow-[0_0_12px_rgba(220,38,38,0.2)]'
            }`}
            title={isReceivingTelemetry ? 'Stop receiving live telemetry packets' : 'Start receiving live telemetry packets'}
          >
            {isReceivingTelemetry ? (
              <>
                <Square className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>STOP TELEMETRY</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                <span>START TELEMETRY</span>
              </>
            )}
          </button>

          {/* Dynamic IP Input */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900">
            <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
              Enter IP:
            </span>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              onKeyDown={handleIpKeyDown}
              placeholder={esp32Url ? esp32Url.replace(/^https?:\/\//, '') : '10.168.251.244'}
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 w-28 sm:w-36 focus:outline-none focus:border-zinc-500"
              title={`Current ESP32 target: ${esp32Url || 'http://10.168.251.244'}`}
            />
            <button
              onClick={handleIpSubmit}
              disabled={ipLoading || !ipInput.trim()}
              className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 transition-colors"
            >
              {ipLoading ? '...' : 'SET'}
            </button>
          </div>

          {/* Start / Stop Recording Button */}
          <button
            onClick={onToggleRecording}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
              isRecording
                ? 'border-red-700/60 bg-red-950/40 text-red-300 hover:bg-red-900/50'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
            title={isRecording ? 'Stop recording telemetry to MongoDB' : 'Start recording telemetry to MongoDB'}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 text-red-400 fill-red-400" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 text-zinc-400 fill-zinc-400" />
                <span>Start Recording</span>
              </>
            )}
          </button>

          {/* Flight Logs Button */}
          <button
            onClick={onOpenSessions}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-colors"
            title="Browse recorded session files and MongoDB logs"
          >
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
            <span>Flight Logs</span>
          </button>
        </div>

        {/* Right: Mode & Connection Status Indicators */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          {/* Live vs Sim Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={() => onToggleMode('live')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                mode === 'live'
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              LIVE
            </button>
            <button
              onClick={() => onToggleMode('simulation')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                mode === 'simulation'
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              SIMULATE
            </button>
          </div>

          {/* MongoDB Status */}
          <div
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border ${
              isMongoConnected
                ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
            title={isMongoConnected ? 'MongoDB connected' : 'MongoDB offline'}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isMongoConnected ? 'MongoDB' : 'File Mode'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isMongoConnected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
          </div>

          {/* System Satellite Connection Status with Metallic Red or Green Accent */}
          <div
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-bold transition-all ${
              connected
                ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-400 metallic-green-glow'
                : 'border-red-900/60 bg-red-950/30 text-red-400 metallic-red-glow'
            }`}
          >
            {connected ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
            <span>{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
