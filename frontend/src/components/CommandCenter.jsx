import React, { useState } from 'react'
import {
  RotateCcw,
  Target,
  Rocket,
  ShieldAlert,
  Radio,
  Terminal,
  Lock,
  Unlock,
  Play,
  Square
} from 'lucide-react'

export default function CommandCenter({
  onCommand,
  loadingCommand,
  commandLogs = [],
  onStartNewSession,
  onEndSession,
  activeSession,
  mode,
  onToggleMode,
  connected
}) {
  const [safetyArmEject, setSafetyArmEject] = useState(false)
  const [safetyArmLaunch, setSafetyArmLaunch] = useState(false)

  const handleLaunchClick = () => {
    onCommand('launch', 'Launch Sequence')
  }

  const handleEjectClick = () => {
    onCommand('eject', 'Parachute Ejection')
  }

  return (
    <div
      className={`hud-panel rounded-2xl p-5 border transition-all ${
        connected ? 'border-emerald-900/40' : 'border-red-950/50'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-2.5">
          <div
            className={`p-2 rounded-lg border ${
              connected
                ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400'
                : 'border-red-900/60 bg-red-950/20 text-red-400'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-100 flex items-center gap-2">
              Command Station
              <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 font-mono">
                {mode === 'simulation' ? 'SIMULATION' : 'LIVE API'}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400 font-mono">Telemetry & Actuator Commands</p>
          </div>
        </div>

        {/* Quick controls: Session Buttons */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          {activeSession ? (
            <button
              onClick={onEndSession}
              disabled={loadingCommand}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-zinc-400 fill-current" />
              <span>Finalize Session</span>
            </button>
          ) : (
            <button
              onClick={onStartNewSession}
              disabled={loadingCommand}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-zinc-400 fill-current" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* CALIBRATE BUTTON */}
        <button
          onClick={() => onCommand('calibrate', 'Calibrate')}
          disabled={loadingCommand}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
            <Target className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase text-zinc-200">
            Calibrate
          </span>
          <span className="text-[10px] font-mono text-zinc-500 mt-0.5">Zero Baseline</span>
        </button>

        {/* RESET BUTTON */}
        <button
          onClick={() => onCommand('reset', 'Reset Counter')}
          disabled={loadingCommand}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
            <RotateCcw className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold uppercase text-zinc-200">
            Reset
          </span>
          <span className="text-[10px] font-mono text-zinc-500 mt-0.5">Packet Counter</span>
        </button>

        {/* EJECT BUTTON (PARACHUTE) */}
        <div className="relative">
          <button
            onClick={handleEjectClick}
            disabled={loadingCommand || !safetyArmEject}
            className={`w-full flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
              safetyArmEject
                ? 'border-red-700/80 bg-red-950/30 text-red-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold uppercase">
              Eject
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
              {safetyArmEject ? 'ARMED' : 'Parachute'}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setSafetyArmEject(!safetyArmEject)
            }}
            className={`absolute top-2 right-2 p-1 rounded text-[10px] border transition-colors ${
              safetyArmEject
                ? 'border-red-700 bg-red-950/50 text-red-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={safetyArmEject ? 'Disarm Eject' : 'Arm Eject Safety'}
          >
            {safetyArmEject ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </button>
        </div>

        {/* LAUNCH BUTTON */}
        <div className="relative">
          <button
            onClick={handleLaunchClick}
            disabled={loadingCommand || !safetyArmLaunch}
            className={`w-full flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all active:scale-95 disabled:opacity-40 ${
              safetyArmLaunch
                ? 'border-emerald-700/80 bg-emerald-950/30 text-emerald-200'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-2">
              <Rocket className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold uppercase">
              Launch
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
              {safetyArmLaunch ? 'ARMED' : 'Mission'}
            </span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setSafetyArmLaunch(!safetyArmLaunch)
            }}
            className={`absolute top-2 right-2 p-1 rounded text-[10px] border transition-colors ${
              safetyArmLaunch
                ? 'border-emerald-700 bg-emerald-950/50 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={safetyArmLaunch ? 'Disarm Launch' : 'Arm Launch Safety'}
          >
            {safetyArmLaunch ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Terminal Command Console */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-850 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-300 font-semibold uppercase">Command Log</span>
          </div>
          <span className="text-[10px] text-zinc-600">Terminal (16 Hz)</span>
        </div>

        <div className="h-28 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
          {commandLogs.length === 0 ? (
            <div className="text-zinc-600 italic py-2 flex items-center gap-1.5">
              <span>●</span>
              <span>Awaiting command execution...</span>
            </div>
          ) : (
            commandLogs.slice(-6).map((log, index) => (
              <div key={index} className="flex items-start justify-between text-zinc-300 gap-2">
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-zinc-600">[{log.time}]</span>
                  <span className="font-bold text-zinc-200 uppercase">{log.command}</span>
                  <span className="text-zinc-400 truncate">{log.details}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-zinc-800 bg-zinc-900 text-zinc-300 shrink-0">
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
