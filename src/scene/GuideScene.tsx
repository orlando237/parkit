import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGuide } from '../store/useGuide'
import { useParkit } from '../store/useParkit'
import { ORDER } from '../domain/data'
import { zoneStats } from '../domain/selectors'
import {
  ZONE_GRID,
  buildGridRoute,
  userPosToCell,
  type GridCell,
} from '../components/CampusMap2D'
import type { SpotInfo, ZoneId } from '../domain/types'
import { Campus, TILE_3D, cellCenter3D } from './Campus'
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
  const userPos = useParkit((s) => s.userPos)
  const running = useGuide((s) => s.running)
  const finished = useGuide((s) => s.finished)
  const reset = useGuide((s) => s.reset)

  const routeCells = useMemo<GridCell[]>(() => {
    const startCell = userPosToCell(userPos)
    return buildGridRoute(startCell, target.zone.id)
  }, [userPos, target.zone.id])

  const sceneTarget = useMemo<SceneTarget>(() => {
    const zg = ZONE_GRID[target.zone.id]
    const entry3D = cellCenter3D(zg.entry.c, zg.entry.r)
    const cx = (zg.c0 + zg.w / 2) * TILE_3D
    const cz = (zg.r0 + zg.h / 2) * TILE_3D
    return {
      id: target.spot.id,
      zone: target.zone.id,
      x: cx,
      z: cz,
      zoneZ: entry3D.z,
      index: target.index,
    }
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

  const start3D = cellCenter3D(routeCells[0].c, routeCells[0].r)

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [start3D.x, 26, start3D.z + 36], fov: 46, near: 1, far: 1200 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => gl.setClearColor('#DCEFE2')}
      >
        <ambientLight intensity={0.92} />
        <directionalLight position={[180, 260, 120]} intensity={1.15} />
        <directionalLight position={[-120, 140, -90]} intensity={0.45} />
        <Campus
          target={sceneTarget}
          occupied={occupied}
          freeCounts={freeCounts}
          isMine={isMine}
          routeCells={routeCells}
        />
        <Walker
          routeCells={routeCells}
          running={running}
          finished={finished}
          totalMeters={totalMeters}
          totalMinutes={totalMinutes}
        />
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
