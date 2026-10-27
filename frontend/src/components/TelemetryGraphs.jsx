import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  Activity,
  Gauge,
  BatteryCharging,
  Compass,
  Layers
} from 'lucide-react'

// Real-Time Graph Component in Minimal Grayscale
function LiveGraph({
  title,
  dataKey,
  dataKey2,
  dataKey3,
  unit,
  color = '#e4e4e7',
  color2 = '#a1a1aa',
  color3 = '#71717a',
  history = [],
  currentValue,
  icon: Icon,
  minVal,
  maxVal,
  zeroBaseline = false,
  multiAxis = false,
  connected
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
      allVals = history.flatMap(d => [d[dataKey], d[dataKey2], d[dataKey3]]).filter(v => typeof v === 'number' && !isNaN(v))
    } else {
      allVals = history.map(d => d[dataKey]).filter(v => typeof v === 'number' && !isNaN(v))
    }

    if (!allVals.length) return { yMin: 0, yMax: 10 }
    let min = Math.min(...allVals)
    let max = Math.max(...allVals)

    if (minVal !== undefined) min = minVal
    if (maxVal !== undefined) max = maxVal

    if (zeroBaseline) min = Math.min(0, min)
    if (min === max) {
      min -= 1
      max += 1
    }

    const margin = (max - min) * 0.1 || 1
    return { yMin: min - margin, yMax: max + margin }
  }, [history, dataKey, dataKey2, dataKey3, multiAxis, minVal, maxVal, zeroBaseline])

  // Generate SVG path for a given data key
  const generatePath = (key) => {
    if (!history.length) return ''
    return history.reduce((acc, point, i) => {
      const val = point[key] !== undefined ? point[key] : (yMin + yMax) / 2
      const x = padding.left + (i / Math.max(history.length - 1, 1)) * innerW
      const normY = (val - yMin) / (yMax - yMin)
      const y = padding.top + innerH - normY * innerH
      return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }, '')
  }

  // Generate filled area for single series
  const generateArea = (key) => {
    if (history.length < 2) return ''
    const linePath = generatePath(key)
    const firstX = padding.left
    const lastX = padding.left + innerW
    const bottomY = padding.top + innerH
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY.toFixed(1)} L ${firstX.toFixed(1)} ${bottomY.toFixed(1)} Z`
  }

  const gradId = `grad-${dataKey}`

  return (
    <div
      className={`hud-panel rounded-2xl p-4 border flex flex-col justify-between transition-all group ${
        connected ? 'border-emerald-900/40 hover:border-emerald-700/60' : 'border-red-950/50 hover:border-red-800/40'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          {Icon && (
            <div className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
              {title}
            </div>
            {multiAxis ? (
              <div className="flex items-center space-x-2 text-[10px] font-mono mt-0.5">
                <span className="text-zinc-200">● X: {history[history.length - 1]?.x?.toFixed(1) || 0}°</span>
                <span className="text-zinc-400">● Y: {history[history.length - 1]?.y?.toFixed(1) || 0}°</span>
                <span className="text-zinc-500">● Z: {history[history.length - 1]?.z?.toFixed(1) || 0}°</span>
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 font-mono">
                Min: {stats.min} • Max: {stats.max} • Avg: {stats.avg}
              </div>
            )}
          </div>
        </div>

        {/* Live numerical readout */}
        {!multiAxis && (
          <div className="text-right">
            <span className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
              {typeof currentValue === 'number' ? currentValue.toFixed(2) : currentValue || '0.00'}
            </span>
            <span className="text-xs text-zinc-500 font-mono ml-1">{unit}</span>
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
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={width - padding.right}
            y2={padding.top}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + innerH / 2}
            x2={width - padding.right}
            y2={padding.top + innerH / 2}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="3 3"
          />
          <line
            x1={padding.left}
            y1={padding.top + innerH}
            x2={width - padding.right}
            y2={padding.top + innerH}
            stroke="rgba(255,255,255,0.08)"
          />

          {/* Y-Axis Label ticks */}
          <text
            x={padding.left - 4}
            y={padding.top + 4}
            textAnchor="end"
            fontSize="9"
            fill="#71717a"
            fontFamily="monospace"
          >
            {yMax.toFixed(0)}
          </text>
          <text
            x={padding.left - 4}
            y={padding.top + innerH}
            textAnchor="end"
            fontSize="9"
            fill="#71717a"
            fontFamily="monospace"
          >
            {yMin.toFixed(0)}
          </text>

          {/* Render Series Paths */}
          {!multiAxis && history.length > 1 && (
            <path
              d={generateArea(dataKey)}
              fill={`url(#${gradId})`}
              className="transition-all duration-75"
            />
          )}

          {multiAxis ? (
            <>
              <path
                d={generatePath(dataKey)}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d={generatePath(dataKey2)}
                fill="none"
                stroke={color2}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d={generatePath(dataKey3)}
                fill="none"
                stroke={color3}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </>
          ) : (
            <path
              d={generatePath(dataKey)}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinecap="round"
              className="transition-all duration-75"
            />
          )}

          {/* Pulse endpoint dot */}
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
                  r="3"
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="1"
                />
              )
            })()
          )}
        </svg>
      </div>
    </div>
  )
}

export default function TelemetryGraphs({ telemetryHistory = [], currentData = {}, connected }) {
  const [bufferSize, setBufferSize] = useState(50)

  const displayHistory = useMemo(() => {
    return telemetryHistory.slice(-bufferSize)
  }, [telemetryHistory, bufferSize])

  return (
    <div className="space-y-3">
      {/* Section Header with Graph Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-200 flex items-center gap-2">
              Telemetry Plots
              <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-mono">
                16 Hz
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono">Real-time Flight Telemetry Curves</p>
          </div>
        </div>

        {/* Window Size Selection */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
            {[30, 50, 100].map((size) => (
              <button
                key={size}
                onClick={() => setBufferSize(size)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  bufferSize === size
                    ? 'bg-zinc-700 text-zinc-100 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {size} pts
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Graphs in Grayscale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. ALTITUDE GRAPH */}
        <LiveGraph
          title="Altitude Profile"
          dataKey="a"
          unit="m"
          color="#f4f4f5"
          history={displayHistory}
          currentValue={currentData.a}
          icon={TrendingUp}
          zeroBaseline={true}
          connected={connected}
        />

        {/* 2. VELOCITY GRAPH */}
        <LiveGraph
          title="Vertical Velocity"
          dataKey="v"
          unit="m/s"
          color="#e4e4e7"
          history={displayHistory}
          currentValue={currentData.v}
          icon={Activity}
          zeroBaseline={true}
          connected={connected}
        />

        {/* 3. PRESSURE GRAPH */}
        <LiveGraph
          title="Barometric Pressure"
          dataKey="pr"
          unit="hPa"
          color="#d4d4d8"
          history={displayHistory}
          currentValue={currentData.pr}
          icon={Gauge}
          connected={connected}
        />

        {/* 4. BATTERY VOLTAGE GRAPH */}
        <LiveGraph
          title="Battery Voltage"
          dataKey="bv"
          unit="V"
          color="#f4f4f5"
          history={displayHistory}
          currentValue={currentData.bv}
          icon={BatteryCharging}
          connected={connected}
        />

        {/* 5. 3-AXIS GYRO & ORIENTATION GRAPH */}
        <LiveGraph
          title="3-Axis Attitude (X/Y/Z)"
          dataKey="x"
          dataKey2="y"
          dataKey3="z"
          unit="°"
          color="#ffffff"
          color2="#a1a1aa"
          color3="#71717a"
          history={displayHistory}
          currentValue={0}
          icon={Compass}
          multiAxis={true}
          zeroBaseline={true}
          connected={connected}
        />

        {/* 6. PACKET CONTINUITY */}
        <LiveGraph
          title="Telemetry Continuity"
          dataKey="p"
          unit="pkts"
          color="#d4d4d8"
          history={displayHistory}
          currentValue={currentData.p}
          icon={Layers}
          connected={connected}
        />
      </div>
    </div>
  )
}
