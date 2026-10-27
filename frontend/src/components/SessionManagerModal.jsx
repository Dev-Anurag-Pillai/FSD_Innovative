import React, { useEffect, useState } from 'react'
import {
  X,
  Database,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Clock,
  Layers,
  Activity,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-4xl rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Telemetry Sessions & Logs
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                MongoDB DBMS Records & File Storage
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSessions}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh Sessions"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="px-4 py-2.5 border-b border-zinc-850 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-500">DBMS Status:</span>
            <span
              className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                mongoInfo?.connected
                  ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400'
              }`}
            >
              {mongoInfo?.connected ? 'MongoDB Active' : 'Disk Storage'}
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-500">Database: <span className="text-zinc-300">{mongoInfo?.database || 'cansat_telemetry'}</span></span>
          </div>

          <button
            onClick={() => {
              onStartNewSession()
              setTimeout(fetchSessions, 600)
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 font-mono">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <HardDrive className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              <p>No telemetry sessions recorded yet.</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = activeSession && activeSession.sessionId === s.sessionId
              const dateStr = s.startTime ? new Date(s.startTime).toLocaleString() : 'N/A'

              return (
                <div
                  key={s.sessionId}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'border-zinc-600 bg-zinc-900'
                      : 'border-zinc-850 bg-zinc-900/60 hover:border-zinc-750'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-zinc-200">
                        {s.sessionId}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold border border-zinc-700">
                          ACTIVE
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-800">
                        {s.source || 'esp32_hardware'}
                      </span>
                    </div>

                    {/* Download Buttons for CSV & JSON */}
                    <div className="flex items-center space-x-2">
                      <a
                        href={`/api/sessions/${s.sessionId}/download/json`}
                        download
                        className="flex items-center space-x-1 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                        title="Download JSON File"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        <span>JSON</span>
                      </a>
                      <a
                        href={`/api/sessions/${s.sessionId}/download/csv`}
                        download
                        className="flex items-center space-x-1 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs transition-colors"
                        title="Download CSV File"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </a>
                    </div>
                  </div>

                  {/* Metadata Info Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-500 mt-2.5 pt-2.5 border-t border-zinc-850">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3 h-3 text-zinc-600" />
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <span>{s.durationSeconds ? `${s.durationSeconds}s` : 'Active'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-3 h-3 text-zinc-600" />
                      <span>{s.packetCount || 0} pkts</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Activity className="w-3 h-3 text-zinc-600" />
                      <span>Max Alt: {s.stats?.maxAltitude ? `${s.stats.maxAltitude.toFixed(1)}m` : '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Files in: <code className="text-zinc-400">frontend/server/data/sessions/</code></span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
