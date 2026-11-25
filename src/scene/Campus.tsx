import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ORDER } from '../domain/data'
import { useGuide } from '../store/useGuide'
import {
  CAMPUS_BLOCKS,
  GRID_BUSHES,
  GRID_N,
  GRID_TREES,
  ZONE_GRID,
  isPathCell,
  type CampusBlock,
  type GridCell,
} from '../components/CampusMap2D'
import type { ZoneId } from '../domain/types'
import type { SceneTarget } from './GuideScene'

export const TILE_3D = 12
const WORLD_SIZE = GRID_N * TILE_3D

export function cellCenter3D(c: number, r: number): { x: number; z: number } {
  return {
    x: (c + 0.5) * TILE_3D,
    z: (r + 0.5) * TILE_3D,
  }
}

interface CampusProps {
  target: SceneTarget
  occupied: Record<ZoneId, number[]>
  freeCounts: Record<ZoneId, number>
  isMine: boolean
  routeCells: GridCell[]
}

const ZONE_NAMES: Record<ZoneId, string> = {
  A: 'P-A · Informática',
  B: 'P-B · Agronomía',
  C: 'P-C · Postgrados',
  D: 'P-D · Bioclimático',
}

function Tree({ scale = 1 }: { scale?: number }) {
  return (
    <group>
      <mesh position={[0, 2.8 * scale, 0]}>
        <cylinderGeometry args={[0.9 * scale, 1.2 * scale, 5.6 * scale, 7]} />
        <meshLambertMaterial color="#6D4C3D" />
      </mesh>
      <mesh position={[0, 6.8 * scale, 0]} scale={[1, 0.85, 1]}>
        <sphereGeometry args={[4.2 * scale, 9, 7]} />
        <meshLambertMaterial color="#22A45D" />
      </mesh>
      <mesh position={[0.6 * scale, 9.6 * scale, -0.4 * scale]}>
        <sphereGeometry args={[3.0 * scale, 8, 6]} />
        <meshLambertMaterial color="#52C47E" />
      </mesh>
    </group>
  )
}

function Bush({ scale = 1 }: { scale?: number }) {
  return (
    <group>
      <mesh position={[0, 1.5 * scale, 0]}>
        <sphereGeometry args={[2.1 * scale, 8, 6]} />
        <meshLambertMaterial color="#38A169" />
      </mesh>
      <mesh position={[1.4 * scale, 1.2 * scale, 0.6 * scale]}>
        <sphereGeometry args={[1.6 * scale, 7, 6]} />
        <meshLambertMaterial color="#2F855A" />
      </mesh>
      <mesh position={[-1.3 * scale, 1.2 * scale, -0.5 * scale]}>
        <sphereGeometry args={[1.7 * scale, 7, 6]} />
        <meshLambertMaterial color="#48BB78" />
      </mesh>
    </group>
  )
}

function ParkedBike({ color = '#141414' }: { color?: string }) {
  return (
    <group scale={0.7}>
      <mesh position={[0, 2.2, -3.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.0, 2.0, 1.4, 10]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 2.2, 3.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.0, 2.0, 1.4, 10]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 4.0, 0]}>
        <boxGeometry args={[2.8, 2.8, 7.6]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  )
}

function Block3D({ b }: { b: CampusBlock }) {
  const bx = (b.c + b.w / 2) * TILE_3D
  const bz = (b.r + b.h / 2) * TILE_3D
  const bw = b.w * TILE_3D - 2
  const bd = b.h * TILE_3D - 2

  if (b.kind === 'sport') {
    const isSoccer = b.label.includes('Fútbol')
    const courtColor = isSoccer ? '#74C365' : '#60A5FA'
    return (
      <group position={[bx, 0.15, bz]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[bw, 0.5, bd]} />
          <meshLambertMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[bw - 2, 0.55, bd - 2]} />
          <meshLambertMaterial color={courtColor} />
        </mesh>
        {/* Línea media */}
        <mesh position={[0, 0.78, 0]}>
          <boxGeometry args={[bw - 4, 0.12, 0.8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        {/* Círculo central */}
        <mesh position={[0, 0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.2, 5.0, 20]} />
          <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} />
        </mesh>
        {/* Arcos 3D en ambos extremos */}
        {[-bd / 2 + 2.5, bd / 2 - 2.5].map((gz, idx) => (
          <group key={idx} position={[0, 2.4, gz]}>
            <mesh position={[-4.5, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 4.2, 6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[4.5, 0, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 4.2, 6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0, 2.1, 0]}>
              <boxGeometry args={[9.6, 0.6, 0.6]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  const bh = 15
  return (
    <group position={[bx, 0.2, bz]}>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[bw + 1.5, 1.6, bd + 1.5]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, bh / 2 + 1, 0]}>
        <boxGeometry args={[bw, bh, bd]} />
        <meshLambertMaterial color="#CBD8E6" />
      </mesh>
      {/* Franjas de ventanas como en el bloque */}
      <mesh position={[0, 5.5, 0]}>
        <boxGeometry args={[bw + 0.4, 1.8, bd + 0.4]} />
        <meshLambertMaterial color="#22528A" />
      </mesh>
      <mesh position={[0, 10.5, 0]}>
        <boxGeometry args={[bw + 0.4, 1.8, bd + 0.4]} />
        <meshLambertMaterial color="#22528A" />
      </mesh>
      <mesh position={[0, bh + 1.4, 0]}>
        <boxGeometry args={[bw + 1.2, 1.2, bd + 1.2]} />
        <meshLambertMaterial color="#9FB6CE" />
      </mesh>
    </group>
  )
}

function ZoneLot3D({
  id,
  occupied,
  target,
  isMine,
}: {
  id: ZoneId
  occupied: number[]
  target: SceneTarget
  isMine: boolean
}) {
  const zg = ZONE_GRID[id]
  const w = zg.w * TILE_3D - 2
  const d = zg.h * TILE_3D - 2
  const cx = (zg.c0 + zg.w / 2) * TILE_3D
  const cz = (zg.r0 + zg.h / 2) * TILE_3D
  const isTargetZone = target.zone === id

  const cols = 4
  const rows = 3
  const cellW = (w - 6) / cols
  const cellD = (d - 6) / rows

  return (
    <group position={[cx, 0.2, cz]}>
      {/* Plataforma blanca con borde azul o amarillo */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[w, 0.8, d]} />
        <meshLambertMaterial color={isTargetZone ? '#FFC200' : '#22528A'} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[w - 2.4, 0.9, d - 2.4]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      {/* Techo de sombra parcial */}
      <mesh position={[0, 11.5, -d * 0.16]}>
        <boxGeometry args={[w - 4, 0.9, d * 0.55]} />
        <meshLambertMaterial color="#3B76B1" transparent opacity={0.85} />
      </mesh>

      {Array.from({ length: 12 }).map((_, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        const sx = -w / 2 + 3 + cellW * (col + 0.5)
        const sz = -d / 2 + 3 + cellD * (row + 0.5)
        const isSpotTarget = isTargetZone && idx === target.index
        const isOcc = !isSpotTarget && occupied.includes(idx)
        return (
          <group key={idx} position={[sx, 0.65, sz]}>
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[cellW - 1.4, 0.8, cellD - 1.6]} />
              <meshLambertMaterial
                color={isSpotTarget ? '#FFC200' : isOcc ? '#E5484D' : '#22A45D'}
              />
            </mesh>
            {isSpotTarget && isMine && (
              <group position={[0, 0.9, 0]}>
                <ParkedBike color="#22528A" />
              </group>
            )}
            {isOcc && idx % 2 === 0 && (
              <group position={[0, 0.9, 0]}>
                <ParkedBike />
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}

function FloatingLabel({ text, position, zone }: { text: string; position: [number, number, number]; zone?: boolean }) {
  const { camera, size } = useThree()
  const vec = useMemo(() => new THREE.Vector3(...position), [position])
  const last = useRef({ x: -1, y: -1, z: -1 })

  const host = useMemo(() => {
    if (typeof document === 'undefined') return null
    const d = document.createElement('div')
    d.className = 'b-label'
    d.dataset.zone = zone ? 'true' : 'false'
    d.style.opacity = '0'
    d.textContent = text
    return d
  }, [text, zone])

  useEffect(() => {
    if (!host) return
    const parent = document.querySelector('.viewport-wrap')
    parent?.appendChild(host)
    return () => host.remove()
  }, [host])

  useFrame(() => {
    if (!host) return
    const v = vec.clone().project(camera)
    const x = (v.x * 0.5 + 0.5) * size.width
    const y = (-v.y * 0.5 + 0.5) * size.height
    const visible = v.z < 1 && x > 16 && x < size.width - 16 && y > 64 && y < size.height - 96
    const prev = last.current
    if (prev.x !== x || prev.y !== y) {
      host.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
      prev.x = x
      prev.y = y
    }
    if (prev.z !== v.z) {
      host.style.zIndex = visible ? String(Math.round(1000 - v.z * 1000)) : '0'
      prev.z = v.z
    }
    const opacity = visible ? '1' : '0'
    if (host.style.opacity !== opacity) host.style.opacity = opacity
  })

  return null
}

export function Campus({ target, occupied, freeCounts, isMine, routeCells }: CampusProps) {
  const currentStep = useGuide((s) => s.currentStep)

  // Todas las celdas blancas de camino del mapa 2D 30x30
  const pathCells = useMemo(() => {
    const list: GridCell[] = []
    for (let r = 0; r < GRID_N; r += 1) {
      for (let c = 0; c < GRID_N; c += 1) {
        if (isPathCell(c, r)) list.push({ c, r })
      }
    }
    return list
  }, [])

  const labels = useMemo(
    () => [
      {
        text: 'Plazoleta',
        position: [14.5 * TILE_3D, 9, 14.5 * TILE_3D] as [number, number, number],
        zone: false,
      },
      ...ORDER.filter((id) => id !== target.zone).map((id) => {
        const zg = ZONE_GRID[id]
        return {
          text: `${ZONE_NAMES[id]} · ${freeCounts[id]} lib`,
          position: [(zg.c0 + zg.w / 2) * TILE_3D, 16, (zg.r0 + zg.h / 2) * TILE_3D] as [number, number, number],
          zone: true,
        }
      }),
      ...CAMPUS_BLOCKS.map((b) => ({
        text: b.label,
        position: [
          (b.c + b.w / 2) * TILE_3D,
          b.kind === 'sport' ? 8 : 20,
          (b.r + b.h / 2) * TILE_3D,
        ] as [number, number, number],
        zone: false,
      })),
    ],
    [freeCounts, target.zone],
  )

  return (
    <group>
      {/* 1. Terreno base verde igual al mapa 2D 30x30 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD_SIZE / 2, -0.1, WORLD_SIZE / 2]}>
        <planeGeometry args={[WORLD_SIZE + 80, WORLD_SIZE + 80]} />
        <meshBasicMaterial color="#DCEFE2" />
      </mesh>
      <gridHelper
        args={[WORLD_SIZE, GRID_N, '#B7D4C1', '#C9E0D0']}
        position={[WORLD_SIZE / 2, 0.02, WORLD_SIZE / 2]}
      />

      {/* 2. Senderos blancos (exactamente las mismas celdas blancas del mapa 2D) */}
      {pathCells.map((cell) => {
        const p = cellCenter3D(cell.c, cell.r)
        return (
          <mesh key={`path-${cell.c}-${cell.r}`} position={[p.x, 0.15, p.z]}>
            <boxGeometry args={[TILE_3D - 0.6, 0.3, TILE_3D - 0.6]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        )
      })}

      {/* 3. Fuente de la Plazoleta Central en (14.5, 14.5) */}
      <group position={[14.5 * TILE_3D, 0.3, 14.5 * TILE_3D]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[6.5, 7, 1.0, 20]} />
          <meshLambertMaterial color="#BAE6FD" />
        </mesh>
        <mesh position={[0, 2.0, 0]}>
          <cylinderGeometry args={[2.0, 2.5, 3.0, 14]} />
          <meshLambertMaterial color="#0284C7" />
        </mesh>
      </group>

      {/* 4. Portería Principal en el borde sur (r = 29) */}
      <group position={[14.5 * TILE_3D, 0.2, 29.5 * TILE_3D]}>
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[5 * TILE_3D, 8, TILE_3D * 0.7]} />
          <meshLambertMaterial color="#22528A" />
        </mesh>
        <mesh position={[0, 8.6, 0]}>
          <boxGeometry args={[5.4 * TILE_3D, 1.4, TILE_3D * 0.9]} />
          <meshLambertMaterial color="#FFC200" />
        </mesh>
      </group>

      {/* 5. Todos los bloques y canchas del mapa 2D en sus mismas coordenadas */}
      {CAMPUS_BLOCKS.map((b) => (
        <Block3D key={b.label} b={b} />
      ))}

      {/* 6. Las 4 zonas de parqueo (P-A, P-B, P-C, P-D) en sus mismas coordenadas */}
      {ORDER.map((id) => (
        <ZoneLot3D key={id} id={id} occupied={occupied[id]} target={target} isMine={isMine} />
      ))}

      {/* 7. Los mismos 27 árboles y 24 arbustos del mapa 2D */}
      {GRID_TREES.map(([tc, tr], i) => {
        const p = cellCenter3D(tc, tr)
        return (
          <group key={`tree-${i}`} position={[p.x, 0.2, p.z]}>
            <Tree scale={0.95} />
          </group>
        )
      })}
      {GRID_BUSHES.map(([bc, br], i) => {
        const p = cellCenter3D(bc, br)
        return (
          <group key={`bush-${i}`} position={[p.x, 0.2, p.z]}>
            <Bush scale={0.95} />
          </group>
        )
      })}

      {/* 8. CUADROS AMARILLOS DELANTE DEL PERSONAJE (desaparecen a medida que el muñeco los pisa) */}
      {routeCells.map((cell, idx) => {
        if (idx <= currentStep) return null
        const p = cellCenter3D(cell.c, cell.r)
        const isLast = idx === routeCells.length - 1
        return (
          <group key={`step-${cell.c}-${cell.r}-${idx}`} position={[p.x, 0.42, p.z]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[TILE_3D - 1.8, 0.35, TILE_3D - 1.8]} />
              <meshBasicMaterial color="#141414" />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <boxGeometry args={[TILE_3D - 3.0, 0.45, TILE_3D - 3.0]} />
              <meshBasicMaterial color={isLast ? '#22A45D' : '#FFC200'} />
            </mesh>
          </group>
        )
      })}

      {labels.map((l) => (
        <FloatingLabel key={l.text} text={l.text} position={l.position} zone={l.zone} />
      ))}
    </group>
  )
}
