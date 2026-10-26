import React, { useEffect, useState } from 'react'
import {
  X,
  Database,
  FileJson,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Plus
} from 'lucide-react'

export default function SessionManagerModal({
  isOpen,
  onClose,
  activeSession,
  onStartNewSession
}) {
  const [sessions, setSessions] = useState([])
  const [mongoInfo, setMongoInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions')
      const json = await res.json()
      setSessions(json.sessions || [])
      setMongoInfo(json.mongo || null)
    } catch (e) {
      console.error('Error fetching sessions:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-4xl rounded-2xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-space-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Session Telemetry Database & Flight Logs
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                MongoDB DBMS Records & Timestamped Session Storage Files
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSessions}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30 transition-colors"
              title="Refresh Sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-rose-500/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MongoDB & DBMS System Banner */}
        <div className="px-5 py-3 border-b border-white/5 bg-space-950/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">DBMS Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                mongoInfo?.connected
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/20 border border-amber-500/30 text-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mongoInfo?.connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              {mongoInfo?.connected ? 'MongoDB Active' : 'Disk Storage (Mongo Auto-Syncing)'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Database: <code className="text-cyan-300">{mongoInfo?.database || 'cansat_telemetry'}</code></span>
          </div>

          <button
            onClick={() => {
              onStartNewSession()
              setTimeout(fetchSessions, 600)
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Session</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1 font-mono">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <HardDrive className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
              <p>No telemetry sessions recorded yet.</p>
              <p className="text-xs text-slate-600 mt-1">
                A new session file and database entry are created automatically each time the satellite connects.
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = activeSession && activeSession.sessionId === s.sessionId
              const dateStr = s.startTime ? new Date(s.startTime).toLocaleString() : 'N/A'

              return (
                <div
                  key={s.sessionId}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'border-white/10 bg-space-900/60 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                        }`}
                      />
                      <span className="text-sm font-bold text-white tracking-wide">
                        {s.sessionId}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                          LIVE RECORDING
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-space-800 text-slate-400 border border-white/5">
                        {s.source || 'esp32_hardware'}
                      </span>
                    </div>

                    {/* Download Buttons for CSV & JSON */}
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/api/sessions/${s.sessionId}/download/json`}
                        download
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-md border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs transition-colors"
                        title="Download JSON Telemetry File"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </a>
                      <a
                        href={`/api/sessions/${s.sessionId}/download/csv`}
                        download
                        className="flex items-center space-x-1 px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs transition-colors"
                        title="Download CSV Telemetry File"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </a>
                    </div>
                  </div>

                  {/* Metadata Info Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Duration: {s.durationSeconds ? `${s.durationSeconds}s` : 'Active'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Packets: {s.packetCount || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                      <span>Max Alt: {s.stats?.maxAltitude ? `${s.stats.maxAltitude.toFixed(1)}m` : '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-space-900/90 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Files saved in: <code className="text-cyan-300">frontend/server/data/sessions/</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/20 text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
