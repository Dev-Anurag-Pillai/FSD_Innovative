import React, { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'
import { Box, RotateCcw } from 'lucide-react'

const DEG2RAD = Math.PI / 180

function CanSatModel({ orientation }) {
  const meshRef = useRef()
  const targetRotation = useRef(new THREE.Euler(0, 0, 0))

  const geometry = useLoader(STLLoader, '/cansat.stl')

  const processedGeometry = useMemo(() => {
    const geo = geometry.clone()
    geo.computeBoundingBox()
    geo.center()

    const box = geo.boundingBox
    const maxDim = Math.max(
      box.max.x - box.min.x,
      box.max.y - box.min.y,
      box.max.z - box.min.z
    )
    const scale = 2.4 / maxDim
    geo.scale(scale, scale, scale)
    geo.computeVertexNormals()

    return geo
  }, [geometry])

  useEffect(() => {
    if (orientation) {
      targetRotation.current.set(
        (orientation.z || 0) * DEG2RAD,  // pitch -> X
        (orientation.x || 0) * DEG2RAD,  // yaw -> Y
        -(orientation.y || 0) * DEG2RAD  // roll -> Z
      )
    }
  }, [orientation])

  useFrame(() => {
    if (meshRef.current) {
      const mesh = meshRef.current
      mesh.rotation.x += (targetRotation.current.x - mesh.rotation.x) * 0.15
      mesh.rotation.y += (targetRotation.current.y - mesh.rotation.y) * 0.15
      mesh.rotation.z += (targetRotation.current.z - mesh.rotation.z) * 0.15
    }
  })

  return (
    <mesh ref={meshRef} geometry={processedGeometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#a1a1aa"
        metalness={0.7}
        roughness={0.3}
      />
    </mesh>
  )
}

export default function CanSatViewer({ orientation, connected }) {
  const controlsRef = useRef()

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const x = orientation?.x || 0
  const y = orientation?.y || 0
  const z = orientation?.z || 0

  return (
    <div
      className={`hud-panel rounded-2xl p-4 border flex flex-col h-full relative overflow-hidden transition-all ${
        connected ? 'border-emerald-900/40' : 'border-red-950/50'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-200">
              3D Attitude & Orientation
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono">BNO055 Inertial Fusion</p>
          </div>
        </div>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Angle Readout Chips in Minimal Grayscale */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-center">
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Heading (X)</div>
          <div className="text-sm font-bold font-mono text-zinc-100">{x.toFixed(1)}°</div>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-center">
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Roll (Y)</div>
          <div className="text-sm font-bold font-mono text-zinc-100">{y.toFixed(1)}°</div>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-center">
          <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Pitch (Z)</div>
          <div className="text-sm font-bold font-mono text-zinc-100">{z.toFixed(1)}°</div>
        </div>
      </div>

      {/* 3D Canvas Scene */}
      <div className="relative flex-1 min-h-[300px] w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-900">
        <Canvas
          camera={{ position: [3, 2, 3], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[6, 8, 5]} intensity={1.2} />
          <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#e4e4e7" />
          <pointLight position={[0, 4, 0]} intensity={0.5} color="#ffffff" />

          <CanSatModel orientation={orientation} />

          <OrbitControls
            ref={controlsRef}
            enableZoom={true}
            enablePan={false}
            autoRotate={false}
            minDistance={2}
            maxDistance={8}
          />
        </Canvas>
      </div>
    </div>
  )
}
