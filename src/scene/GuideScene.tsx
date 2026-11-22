import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGuide } from '../store/useGuide'
import { useParkit } from '../store/useParkit'
import { GEO, ORDER } from '../domain/data'
import { miniPos, zoneStats } from '../domain/selectors'
import type { SpotInfo, ZoneId } from '../domain/types'
import { Campus } from './Campus'
import { Walker } from './Walker'
import { HudOverlay } from './HudOverlay'
import { DestPinBridge } from './DestPin'

export interface SceneTarget {
  id: string
  zone: ZoneId
  x: number
  z: number
  zoneZ: number
  index: number
}

interface GuideSceneProps {
  target: SpotInfo
  isMine: boolean
  totalMeters: number
  totalMinutes: number
  onStart: () => void
}

export function GuideScene({ target, isMine, totalMeters, totalMinutes, onStart }: GuideSceneProps) {
  const zones = useParkit((s) => s.zones)
  const running = useGuide((s) => s.running)
  const finished = useGuide((s) => s.finished)
  const reset = useGuide((s) => s.reset)

  const sceneTarget = useMemo<SceneTarget>(() => {
    const idx = target.index
    const p = miniPos(target.zone.id, idx)
    return { id: target.spot.id, zone: target.zone.id, x: p.x, z: p.z, zoneZ: GEO[target.zone.id].cy, index: idx }
  }, [target])

  const occupied = useMemo(
    () =>
      ORDER.reduce(
        (acc, id) => {
          acc[id] = zones[id].spots.map((p, i) => (p.free ? -1 : i)).filter((i) => i >= 0)
          return acc
        },
        {} as Record<ZoneId, number[]>,
      ),
    [zones],
  )

  const freeCounts = useMemo(
    () =>
      ORDER.reduce(
        (acc, id) => {
          acc[id] = zoneStats(zones[id]).free
          return acc
        },
        {} as Record<ZoneId, number>,
      ),
    [zones],
  )

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [165, 21, 208], fov: 45, near: 1, far: 1200 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#EAF2FA')}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[120, 220, 80]} intensity={1.15} />
        <directionalLight position={[-140, 120, -90]} intensity={0.45} />
        <Campus target={sceneTarget} occupied={occupied} freeCounts={freeCounts} isMine={isMine} />
        <Walker target={sceneTarget} running={running} finished={finished} />
        <DestPinBridge target={sceneTarget} running={running} finished={finished} />
      </Canvas>
      <HudOverlay
        target={sceneTarget}
        zoneName={`Zona ${target.zone.id} · ${target.zone.name}`}
        running={running}
        finished={finished}
        totalMeters={totalMeters}
        totalMinutes={totalMinutes}
        onStart={onStart}
        onReset={reset}
      />
    </div>
  )
}
