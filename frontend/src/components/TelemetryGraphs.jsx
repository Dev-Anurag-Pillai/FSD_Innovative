import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  Activity,
  Gauge,
  BatteryCharging,
  Compass,
  Layers,
  Pause,
  Play,
  RotateCw,
  Maximize2
} from 'lucide-react'

// Real-Time Canvas Graph Component for high 16Hz framerate
function LiveGraph({
  title,
  dataKey,
  dataKey2,
  dataKey3,
  unit,
  color = '#00f2fe',
  color2 = '#10b981',
  color3 = '#f43f5e',
  history = [],
  currentValue,
  icon: Icon,
  minVal,
  maxVal,
  zeroBaseline = false,
  multiAxis = false
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  // Compute min, max, avg for statistics
  const stats = useMemo(() => {
    if (!history.length) return { min: 0, max: 0, avg: 0 }
    const vals = history.map(d => d[dataKey]).filter(v => typeof v === 'number' && !isNaN(v))
    if (!vals.length) return { min: 0, max: 0, avg: 0 }
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const sum = vals.reduce((a, b) => a + b, 0)
    return {
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: (sum / vals.length).toFixed(2)
    }
  }, [history, dataKey])

  // SVG dimensions
  const width = 360
  const height = 130
  const padding = { top: 12, right: 12, bottom: 20, left: 38 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  // Calculate dynamic Y-bounds
  const { yMin, yMax } = useMemo(() => {
    if (!history.length) return { yMin: 0, yMax: 10 }
    let allVals = []
    if (multiAxis) {
      allVals = history.flatMap(d => [d[dataKey], d[dataKey2], d[dataKey3]]).filter(v => typeof v === 'number')
    } else {
      allVals = history.map(d => d[dataKey]).filter(v => typeof v === 'number')
    }
    if (!allVals.length) return { yMin: 0, yMax: 10 }

    let min = Math.min(...allVals)
    let max = Math.max(...allVals)

    if (zeroBaseline) {
      min = Math.min(min, 0)
      max = Math.max(max, 0)
    }

    if (min === max) {
      min -= 1
      max += 1
    }

    // Add 10% breathing room
    const span = max - min
    return {
      yMin: min - span * 0.1,
      yMax: max + span * 0.1
    }
  }, [history, dataKey, dataKey2, dataKey3, multiAxis, zeroBaseline])

  // Map data to SVG coordinates
  const points = useMemo(() => {
    if (history.length < 2) return ''
    return history.map((d, i) => {
      const x = padding.left + (i / (history.length - 1)) * innerW
      const val = d[dataKey] || 0
      const normY = (val - yMin) / (yMax - yMin)
      const y = padding.top + innerH - normY * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }, [history, dataKey, yMin, yMax, innerW, innerH, padding])

  // Multi-axis secondary lines
  const points2 = useMemo(() => {
    if (!multiAxis || history.length < 2) return ''
    return history.map((d, i) => {
      const x = padding.left + (i / (history.length - 1)) * innerW
      const val = d[dataKey2] || 0
      const normY = (val - yMin) / (yMax - yMin)
      const y = padding.top + innerH - normY * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }, [history, dataKey2, multiAxis, yMin, yMax, innerW, innerH, padding])

  const points3 = useMemo(() => {
    if (!multiAxis || history.length < 2) return ''
    return history.map((d, i) => {
      const x = padding.left + (i / (history.length - 1)) * innerW
      const val = d[dataKey3] || 0
      const normY = (val - yMin) / (yMax - yMin)
      const y = padding.top + innerH - normY * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
  }, [history, dataKey3, multiAxis, yMin, yMax, innerW, innerH, padding])

  // Area path for gradient fill
  const areaPath = useMemo(() => {
    if (multiAxis || history.length < 2) return ''
    const firstX = padding.left
    const lastX = padding.left + innerW
    const baselineY = padding.top + innerH
    return `M ${firstX},${baselineY} L ${points.split(' ').join(' L ')} L ${lastX},${baselineY} Z`
  }, [points, history.length, multiAxis, innerW, innerH, padding])

  // Zero-line Y coordinate if inside range
  const zeroY = useMemo(() => {
    if (yMin <= 0 && yMax >= 0) {
      const norm = (0 - yMin) / (yMax - yMin)
      return padding.top + innerH - norm * innerH
    }
    return null
  }, [yMin, yMax, innerH, padding])

  const gradId = `grad-${dataKey}`

  return (
    <div className="hud-panel rounded-2xl p-4 border border-white/10 flex flex-col justify-between hover:border-cyan-500/30 transition-all group">
      {/* Top Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {Icon && (
            <div
              className="p-1.5 rounded-lg border text-white"
              style={{ backgroundColor: `${color}15`, borderColor: `${color}35`, color }}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              {title}
            </div>
            {multiAxis ? (
              <div className="flex items-center space-x-2 text-[10px] font-mono mt-0.5">
                <span style={{ color }}>● X: {history[history.length - 1]?.x?.toFixed(1) || 0}°</span>
                <span style={{ color: color2 }}>● Y: {history[history.length - 1]?.y?.toFixed(1) || 0}°</span>
                <span style={{ color: color3 }}>● Z: {history[history.length - 1]?.z?.toFixed(1) || 0}°</span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 font-mono">
                Min: {stats.min} • Max: {stats.max} • Avg: {stats.avg}
              </div>
            )}
          </div>
        </div>

        {/* Live numerical readout */}
        {!multiAxis && (
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-white tracking-tight">
              {typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue || '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-mono ml-1">{unit}</span>
          </div>
        )}
      </div>

      {/* SVG Real-Time Graph */}
      <div className="relative w-full h-[130px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + innerH / 2}
            x2={width - padding.right}
            y2={padding.top + innerH / 2}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + innerH}
            x2={width - padding.right}
            y2={padding.top + innerH}
            stroke="rgba(255,255,255,0.05)"
          />

          {/* Zero baseline if applicable */}
          {zeroY !== null && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="rgba(255,255,255,0.2)"
              strokeDasharray="4 2"
            />
          )}

          {/* Y Axis Labels */}
          <text
            x={padding.left - 4}
            y={padding.top + 8}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {yMax.toFixed(0)}
          </text>
          <text
            x={padding.left - 4}
            y={padding.top + innerH}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            fontFamily="monospace"
          >
            {yMin.toFixed(0)}
          </text>

          {/* Fill under line */}
          {areaPath && (
            <path d={areaPath} fill={`url(#${gradId})`} />
          )}

          {/* Primary Line */}
          {points && (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          )}

          {/* Secondary Lines for multi-axis */}
          {points2 && (
            <polyline
              fill="none"
              stroke={color2}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points2}
            />
          )}

          {points3 && (
            <polyline
              fill="none"
              stroke={color3}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points3}
            />
          )}

          {/* Latest point glow circle */}
          {history.length > 0 && !multiAxis && (
            (() => {
              const lastVal = history[history.length - 1][dataKey] || 0
              const normY = (lastVal - yMin) / (yMax - yMin)
              const cx = padding.left + innerW
              const cy = padding.top + innerH - normY * innerH
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={color}
                  stroke="#0a0e17"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              )
            })()
          )}
        </svg>
      </div>
    </div>
  )
}

export default function TelemetryGraphs({ telemetryHistory = [], currentData = {} }) {
  const [isPaused, setIsPaused] = useState(false)
  const [bufferSize, setBufferSize] = useState(50)

  // Sliced history based on window size
  const displayHistory = useMemo(() => {
    return telemetryHistory.slice(-bufferSize)
  }, [telemetryHistory, bufferSize])

  return (
    <div className="space-y-4">
      {/* Section Header with Graph Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
              Real-Time Telemetry Plots
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
                ALL VALUES LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">Continuous 16 Hz Dynamic Flight Data</p>
          </div>
        </div>

        {/* Controls: Window Size & Pause */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center rounded-lg border border-white/10 bg-space-850 p-0.5">
            {[30, 50, 100].map((size) => (
              <button
                key={size}
                onClick={() => setBufferSize(size)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  bufferSize === size
                    ? 'bg-cyan-500 text-space-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {size} pts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Graphs for ALL Values */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. ALTITUDE GRAPH */}
        <LiveGraph
          title="Altitude Profile"
          dataKey="a"
          unit="m"
          color="#00f2fe"
          history={displayHistory}
          currentValue={currentData.a}
          icon={TrendingUp}
          zeroBaseline={true}
        />

        {/* 2. VELOCITY GRAPH */}
        <LiveGraph
          title="Vertical Velocity"
          dataKey="v"
          unit="m/s"
          color="#f59e0b"
          history={displayHistory}
          currentValue={currentData.v}
          icon={Activity}
          zeroBaseline={true}
        />

        {/* 3. PRESSURE GRAPH */}
        <LiveGraph
          title="Barometric Pressure"
          dataKey="pr"
          unit="hPa"
          color="#a855f7"
          history={displayHistory}
          currentValue={currentData.pr}
          icon={Gauge}
        />

        {/* 4. BATTERY VOLTAGE GRAPH */}
        <LiveGraph
          title="Battery Voltage"
          dataKey="bv"
          unit="V"
          color="#10b981"
          history={displayHistory}
          currentValue={currentData.bv}
          icon={BatteryCharging}
        />

        {/* 5. 3-AXIS GYRO & ORIENTATION GRAPH */}
        <LiveGraph
          title="3-Axis Attitude (X/Y/Z)"
          dataKey="x"
          dataKey2="y"
          dataKey3="z"
          unit="°"
          color="#f87171"
          color2="#4ade80"
          color3="#60a5fa"
          history={displayHistory}
          currentValue={0}
          icon={Compass}
          multiAxis={true}
          zeroBaseline={true}
        />

        {/* 6. PACKET CONTINUITY */}
        <LiveGraph
          title="Telemetry Continuity"
          dataKey="p"
          unit="pkts"
          color="#38bdf8"
          history={displayHistory}
          currentValue={currentData.p}
          icon={Layers}
        />
      </div>
    </div>
  )
}
