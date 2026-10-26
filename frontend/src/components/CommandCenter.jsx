import React, { useState } from 'react'
import {
  RotateCcw,
  Target,
  Rocket,
  ShieldAlert,
  Radio,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Lock,
  Unlock,
  Sparkles
} from 'lucide-react'

export default function CommandCenter({
  onCommand,
  loadingCommand,
  commandLogs = [],
  onStartNewSession,
  onEndSession,
  activeSession,
  mode,
  onToggleMode
}) {
  const [safetyArmEject, setSafetyArmEject] = useState(false)
  const [safetyArmLaunch, setSafetyArmLaunch] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState(null) // 'eject' | 'launch' | null

  const handleLaunchClick = () => {
    if (!safetyArmLaunch) {
      setConfirmDialog('launch')
    } else {
      onCommand('launch', 'Launch Sequence')
    }
  }

  const handleEjectClick = () => {
    if (!safetyArmEject) {
      setConfirmDialog('eject')
    } else {
      onCommand('eject', 'Parachute Ejection')
    }
  }

  return (
    <div className="hud-panel rounded-2xl p-5 border border-white/10 relative overflow-hidden">
      {/* Background cyber accent glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
              Mission Command Center
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                mode === 'simulation'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {mode === 'simulation' ? 'SIMULATION MODE' : 'LIVE API LINK'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Direct Telemetry & Actuator Override</p>
          </div>
        </div>

        {/* Quick controls: Mode switch + Session buttons */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          {onToggleMode && (
            <button
              onClick={() => onToggleMode(mode === 'live' ? 'simulation' : 'live')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all hover:scale-105 active:scale-95 ${
                mode === 'simulation'
                  ? 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
                  : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
              title={mode === 'live' ? 'Switch to Flight Simulation' : 'Switch to Live ESP32 Stream'}
            >
              {mode === 'simulation' ? <Rocket className="w-3.5 h-3.5 text-purple-400" /> : <Radio className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{mode === 'simulation' ? 'Sim Flight Active' : 'Live Stream'}</span>
            </button>
          )}

          {activeSession ? (
            <button
              onClick={onEndSession}
              disabled={loadingCommand}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-300 transition-all hover:scale-105 active:scale-95"
            >
              <Square className="w-3.5 h-3.5 text-red-400 fill-current" />
              <span>Finalize Session</span>
            </button>
          ) : (
            <button
              onClick={onStartNewSession}
              disabled={loadingCommand}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
              <span>New Flight Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Action Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {/* CALIBRATE BUTTON */}
        <button
          onClick={() => onCommand('calibrate', 'Calibrate')}
          disabled={loadingCommand}
          className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-space-900/80 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2.5 group-hover:bg-cyan-500 group-hover:text-space-950 transition-colors">
            <Target className="w-5 h-5 transition-transform group-hover:rotate-45" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-200 group-hover:text-white">
            Calibrate
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1">Zero Reference</span>
        </button>

        {/* RESET BUTTON */}
        <button
          onClick={() => onCommand('reset', 'Reset Counter')}
          disabled={loadingCommand}
          className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-space-900/80 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 group-hover:bg-amber-500 group-hover:text-space-950 transition-colors">
            <RotateCcw className="w-5 h-5 transition-transform group-hover:-rotate-90" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-200 group-hover:text-white">
            Reset
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1">Packet Counter</span>
        </button>

        {/* EJECT BUTTON (PARACHUTE / PAYLOAD) */}
        <div className="relative">
          <button
            onClick={handleEjectClick}
            disabled={loadingCommand}
            className={`w-full group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              safetyArmEject
                ? 'border-rose-500 bg-gradient-to-b from-rose-950/60 to-space-900/90 shadow-[0_0_25px_rgba(244,63,94,0.35)] animate-pulse-fast'
                : 'border-rose-500/30 bg-gradient-to-b from-rose-950/30 to-space-900/80 hover:border-rose-400'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-2.5 transition-colors ${
              safetyArmEject
                ? 'bg-rose-500 border-rose-300 text-white'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-rose-200 group-hover:text-white">
              Eject
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              {safetyArmEject ? 'ARMED • DEPLOY' : 'Parachute Actuator'}
            </span>
          </button>

          {/* Safety Arm toggle for Eject */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSafetyArmEject(!safetyArmEject)
            }}
            className={`absolute top-2 right-2 p-1 rounded-md text-[10px] border transition-colors ${
              safetyArmEject
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-space-800 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={safetyArmEject ? 'Disarm Eject' : 'Arm Eject Safety'}
          >
            {safetyArmEject ? <Unlock className="w-3 h-3 text-rose-400" /> : <Lock className="w-3 h-3" />}
          </button>
        </div>

        {/* LAUNCH BUTTON */}
        <div className="relative">
          <button
            onClick={handleLaunchClick}
            disabled={loadingCommand}
            className={`w-full group relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 active:scale-95 disabled:opacity-50 ${
              safetyArmLaunch
                ? 'border-emerald-400 bg-gradient-to-b from-emerald-950/60 to-space-900/90 shadow-[0_0_25px_rgba(16,185,129,0.35)] animate-pulse-fast'
                : 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-space-900/80 hover:border-emerald-400'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-2.5 transition-colors ${
              safetyArmLaunch
                ? 'bg-emerald-500 border-emerald-300 text-space-950'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-space-950'
            }`}>
              <Rocket className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-200 group-hover:text-white">
              Launch
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              {safetyArmLaunch ? 'ARMED • IGNITE' : 'Mission Sequence'}
            </span>
          </button>

          {/* Safety Arm toggle for Launch */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSafetyArmLaunch(!safetyArmLaunch)
            }}
            className={`absolute top-2 right-2 p-1 rounded-md text-[10px] border transition-colors ${
              safetyArmLaunch
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-space-800 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={safetyArmLaunch ? 'Disarm Launch' : 'Arm Launch Safety'}
          >
            {safetyArmLaunch ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Safety Confirmation Modal / Warning Bar if clicked without arming */}
      {confirmDialog && (
        <div className="mb-4 p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-200 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Confirm <strong>{confirmDialog.toUpperCase()}</strong>: Are you sure you want to trigger this action?
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                if (confirmDialog === 'eject') onCommand('eject', 'Parachute Ejection')
                if (confirmDialog === 'launch') onCommand('launch', 'Launch Sequence')
                setConfirmDialog(null)
              }}
              className="px-2.5 py-1 rounded bg-amber-500 text-space-950 font-bold hover:bg-amber-400"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDialog(null)}
              className="px-2.5 py-1 rounded border border-white/20 text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Live Command Execution Console */}
      <div className="rounded-xl border border-white/10 bg-space-950/80 p-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-semibold uppercase">Command Terminal Log</span>
          </div>
          <span className="text-[10px] text-slate-500">Live Telemetry Link (16 Hz)</span>
        </div>

        <div className="h-28 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
          {commandLogs.length === 0 ? (
            <div className="text-slate-500 italic py-2 flex items-center gap-1.5">
              <span>●</span>
              <span>Uplink terminal online. Awaiting command dispatch...</span>
            </div>
          ) : (
            commandLogs.slice(-6).map((log, index) => (
              <div key={index} className="flex items-start justify-between text-slate-300 gap-2">
                <div className="flex items-center space-x-2 truncate">
                  <span className="text-slate-500">[{log.time}]</span>
                  <span className="font-bold text-cyan-300 uppercase">{log.command}</span>
                  <span className="text-slate-400 truncate">{log.details}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold shrink-0 ${
                    log.status === 'SUCCESS' || log.status === 'DEPLOYED' || log.status === 'INITIATED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
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
