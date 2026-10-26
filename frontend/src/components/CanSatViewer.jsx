import React, { useRef, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Center } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'
import { Compass, Box, RotateCcw } from 'lucide-react'

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
      <meshPhysicalMaterial
        color="#38bdf8"
        metalness={0.4}
        roughness={0.3}
        clearcoat={0.6}
        clearcoatRoughness={0.2}
        envMapIntensity={1.0}
      />
    </mesh>
  )
}

function FallbackBox() {
  return (
    <mesh>
      <cylinderGeometry args={[0.6, 0.6, 1.8, 24]} />
      <meshStandardMaterial color="#0284c7" wireframe />
    </mesh>
  )
}

export default function CanSatViewer({ orientation }) {
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
    <div className="hud-panel rounded-2xl p-4 border border-white/10 flex flex-col h-full relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-white">
              3D Attitude & Orientation
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">BNO055 9-DOF Inertial Fusion</p>
          </div>
        </div>

        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors"
          title="Reset 3D Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Angle Readout Chips */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="px-2.5 py-1.5 rounded-xl border border-red-500/30 bg-red-950/20 text-center">
          <div className="text-[10px] font-mono text-red-400 font-bold uppercase">Heading (X)</div>
          <div className="text-sm font-bold font-mono text-white">{x.toFixed(1)}°</div>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center">
          <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Roll (Y)</div>
          <div className="text-sm font-bold font-mono text-white">{y.toFixed(1)}°</div>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-950/20 text-center">
          <div className="text-[10px] font-mono text-blue-400 font-bold uppercase">Pitch (Z)</div>
          <div className="text-sm font-bold font-mono text-white">{z.toFixed(1)}°</div>
        </div>
      </div>

      {/* 3D Canvas Scene */}
      <div className="relative flex-1 min-h-[300px] w-full rounded-xl overflow-hidden bg-gradient-to-b from-space-950/90 to-space-900/95 border border-white/5">
        <Canvas
          camera={{ position: [3, 2, 3], fov: 40 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 8, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#8b5cf6" />
          <pointLight position={[0, 4, 0]} intensity={0.7} color="#38bdf8" />

          <Suspense fallback={<FallbackBox />}>
            <Center>
              <CanSatModel orientation={orientation} />
            </Center>
          </Suspense>

          {/* Reference coordinates grid and axes */}
          <axesHelper args={[1.6]} />
          <gridHelper args={[4, 10, '#1e293b', '#0f172a']} position={[0, -1.4, 0]} />

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={2}
            maxDistance={7}
          />
        </Canvas>

        {/* Orbit Hint */}
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-500 bg-space-950/80 px-2 py-0.5 rounded border border-white/5 pointer-events-none">
          Click & Drag to Orbit • Scroll to Zoom
        </div>
      </div>
    </div>
  )
}
