import { useMemo, useRef, useState } from 'react'
import { ORDER } from '../domain/data'
import { zoneStats } from '../domain/selectors'
import type { Parked, UserPos, Zone, ZoneId } from '../domain/types'

export const GRID_N = 30
export const METERS_PER_CELL = 10 // Escala exacta: 1 cuadro = 10 metros (campus 300m x 300m)
const CELL = 18
const VIEW = GRID_N * CELL // 540x540

export interface GridCell {
  c: number
  r: number
}

// Las 4 zonas de parqueo con dimensiones distintas (ancho w x largo h) junto a su facultad
export const ZONE_GRID: Record<ZoneId, { c0: number; r0: number; w: number; h: number; entry: GridCell }> = {
  A: { c0: 7, r0: 2, w: 3, h: 3, entry: { c: 8, r: 5 } },    // Informática (3x3)
  B: { c0: 24, r0: 3, w: 4, h: 2, entry: { c: 25, r: 5 } },  // Agronomía (4x2 alargado horizontal)
  C: { c0: 7, r0: 19, w: 3, h: 4, entry: { c: 8, r: 23 } }, // Postgrados (3x4 patio vertical en U)
  D: { c0: 18, r0: 20, w: 4, h: 3, entry: { c: 20, r: 23 } }, // Bioclimático (4x3 amplio)
}

export const CAMPUS_LANDMARKS: { id: string; label: string; cell: GridCell }[] = [
  { id: 'porteria', label: 'Portería', cell: { c: 14, r: 28 } },
  { id: 'plazoleta', label: 'Plazoleta', cell: { c: 14, r: 14 } },
  { id: 'polideportivo', label: 'Polideportivo', cell: { c: 6, r: 9 } },
  { id: 'biblioteca', label: 'Biblioteca', cell: { c: 14, r: 8 } },
  { id: 'cafeteria', label: 'Cafetería', cell: { c: 14, r: 12 } },
]

export interface CampusBlock {
  c: number
  r: number
  w: number
  h: number
  label: string
  kind: 'building' | 'sport'
}

// Bloques académicos, administrativos y escenarios deportivos a escala de campus
export const CAMPUS_BLOCKS: CampusBlock[] = [
  { c: 1, r: 1, w: 4, h: 3, label: 'Labs', kind: 'building' },
  { c: 10, r: 1, w: 3, h: 3, label: 'Informática', kind: 'building' },
  { c: 16, r: 1, w: 6, h: 3, label: 'Agronomía', kind: 'building' },
  { c: 25, r: 6, w: 4, h: 4, label: 'Granja', kind: 'building' },
  { c: 1, r: 6, w: 4, h: 7, label: 'Polideportivo', kind: 'sport' },
  { c: 7, r: 7, w: 5, h: 2, label: 'Bloque B1', kind: 'building' },
  { c: 7, r: 10, w: 5, h: 2, label: 'Bloque B2', kind: 'building' },
  { c: 16, r: 7, w: 6, h: 3, label: 'Biblioteca', kind: 'building' },
  { c: 16, r: 11, w: 5, h: 2, label: 'Cafetería', kind: 'building' },
  { c: 25, r: 15, w: 4, h: 7, label: 'Cancha Fútbol', kind: 'sport' },
  { c: 1, r: 16, w: 4, h: 4, label: 'Auditorio', kind: 'building' },
  { c: 7, r: 16, w: 5, h: 3, label: 'Postgrados', kind: 'building' },
  { c: 16, r: 16, w: 6, h: 3, label: 'Bioclimático', kind: 'building' },
  { c: 1, r: 25, w: 4, h: 3, label: 'Bienestar', kind: 'building' },
  { c: 16, r: 25, w: 6, h: 3, label: 'Rectoría', kind: 'building' },
]

// Árboles 2D ubicados en celdas verdes junto a los senderos y plazoleta
export const GRID_TREES: [number, number][] = [
  [5, 2], [5, 4], [13, 2], [15, 2], [22, 2], [28, 2],
  [5, 13], [12, 13], [16, 13], [22, 10], [24, 11],
  [5, 15], [12, 15], [15, 12], [22, 15], [24, 13],
  [5, 21], [11, 21], [15, 20], [17, 21], [24, 22],
  [7, 25], [11, 26], [13, 25], [15, 26], [24, 25], [27, 26],
]

// Arbustos / setos 2D decorativos en celdas verdes junto a cruces y edificios
export const GRID_BUSHES: [number, number][] = [
  [6, 1], [13, 4], [15, 4], [22, 4], [27, 4],
  [7, 6], [12, 6], [15, 6], [22, 6], [24, 10],
  [7, 13], [10, 13], [17, 13], [21, 13],
  [7, 15], [12, 19], [15, 15], [22, 19],
  [5, 24], [9, 24], [13, 27], [15, 27], [22, 24], [25, 27],
]

export function isPathCell(c: number, r: number): boolean {
  if (c === 14 && r >= 1 && r <= 28) return true // Av. Principal desde Portería
  if ((c === 6 || c === 23) && r >= 2 && r <= 26) return true // Vías laterales
  if ((r === 5 || r === 14 || r === 23) && c >= 2 && c <= 27) return true // Calles transversales
  if (c >= 13 && c <= 15 && r >= 13 && r <= 15) return true // Plazoleta Central 3x3
  return false
}

const ALL_PATH_CELLS: GridCell[] = []
for (let r = 0; r < GRID_N; r += 1) {
  for (let c = 0; c < GRID_N; c += 1) {
    if (isPathCell(c, r)) ALL_PATH_CELLS.push({ c, r })
  }
}

export function snapToNearestPath(c: number, r: number): GridCell {
  let best = ALL_PATH_CELLS[0]
  let bestD = Infinity
  for (const cell of ALL_PATH_CELLS) {
    const d = Math.hypot(cell.c - c, cell.r - r)
    if (d < bestD) {
      bestD = d
      best = cell
    }
  }
  return best
}

export function userPosToCell(pos: UserPos): GridCell {
  const c = Math.round((pos.x / 350) * (GRID_N - 1))
  const r = Math.round((pos.y / 350) * (GRID_N - 1))
  return snapToNearestPath(c, r)
}

export function cellToUserPos(cell: GridCell): UserPos {
  return {
    x: Math.round((cell.c / (GRID_N - 1)) * 350),
    y: Math.round((cell.r / (GRID_N - 1)) * 350),
  }
}

/** Ruta más corta cuadro por cuadro (BFS) sobre los senderos del campus */
export function buildGridRoute(start: GridCell, targetZone: ZoneId): GridCell[] {
  const goal = ZONE_GRID[targetZone].entry
  const key = (p: GridCell) => `${p.c},${p.r}`
  const queue: GridCell[] = [start]
  const prev = new Map<string, GridCell | null>([[key(start), null]])
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur.c === goal.c && cur.r === goal.r) break
    for (const [dc, dr] of dirs) {
      const next = { c: cur.c + dc, r: cur.r + dr }
      if (next.c < 0 || next.c >= GRID_N || next.r < 0 || next.r >= GRID_N) continue
      if (!isPathCell(next.c, next.r)) continue
      const k = key(next)
      if (!prev.has(k)) {
        prev.set(k, cur)
        queue.push(next)
      }
    }
  }

  const path: GridCell[] = []
  let cur: GridCell | null = goal
  if (!prev.has(key(goal))) return [start]
  while (cur) {
    path.unshift(cur)
    cur = prev.get(key(cur)) ?? null
  }
  return path
}

/** Cada cuadro recorrido equivale exactamente a METERS_PER_CELL metros */
export function gridRouteSteps(cells: GridCell[]): number {
  return Math.max(0, cells.length - 1)
}

export function gridRouteMeters(cells: GridCell[]): number {
  return gridRouteSteps(cells) * METERS_PER_CELL
}

interface CampusMap2DProps {
  zones: Record<ZoneId, Zone>
  userCell: GridCell
  parked: Parked | null
  selectedZone: ZoneId
  routeCells: GridCell[]
  onSelectCell: (cell: GridCell) => void
  onSelectZone: (id: ZoneId) => void
}

export function CampusMap2D({
  zones,
  userCell,
  parked,
  selectedZone,
  routeCells,
  onSelectCell,
  onSelectZone,
}: CampusMap2DProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragModeRef = useRef<'none' | 'user' | 'pan'>('none')
  const lastClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const viewSize = VIEW / zoom
  const viewX = Math.max(0, Math.min(VIEW - viewSize, (VIEW - viewSize) / 2 + pan.x))
  const viewY = Math.max(0, Math.min(VIEW - viewSize, (VIEW - viewSize) / 2 + pan.y))

  const routeSet = useMemo(() => new Set(routeCells.map((p) => `${p.c},${p.r}`)), [routeCells])

  const pointerToCell = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const wx = viewX + ((clientX - rect.left) / rect.width) * viewSize
    const wy = viewY + ((clientY - rect.top) / rect.height) * viewSize
    const c = Math.floor(wx / CELL)
    const r = Math.floor(wy / CELL)
    onSelectCell(snapToNearestPath(c, r))
  }

  const focusOnUser = () => {
    const nextZoom = zoom < 1.4 ? 1.6 : 1
    setZoom(nextZoom)
    if (nextZoom === 1) {
      setPan({ x: 0, y: 0 })
    } else {
      setPan({
        x: userCell.c * CELL - VIEW / 2,
        y: userCell.r * CELL - VIEW / 2,
      })
    }
  }

  return (
    <section
      className="relative overflow-hidden rounded-[22px] border-[3px] border-card/35 bg-[#DCEFE2] p-2 shadow-sm"
      aria-label="Mapa 2D del campus completo en cuadrícula"
    >
      {/* Controles sencillos de escala / zoom */}
      <div className="absolute bottom-3.5 right-3.5 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Acercar campus"
          onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.4).toFixed(1))))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-card/30 bg-white/95 text-[16px] font-black text-ink shadow-sm"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar campus"
          onClick={() => {
            setZoom((z) => {
              const next = Math.max(1, Number((z - 0.4).toFixed(1)))
              if (next === 1) setPan({ x: 0, y: 0 })
              return next
            })
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-card/30 bg-white/95 text-[16px] font-black text-ink shadow-sm"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Enfocar en Tú"
          title="Enfocar en Tú"
          onClick={focusOnUser}
          className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-sun text-[12px] font-black text-black shadow-sm"
        >
          Tú
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewX} ${viewY} ${viewSize} ${viewSize}`}
        className="block aspect-square w-full touch-none select-none rounded-[14px]"
        role="img"
        aria-label="Plano general por cuadros del campus"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-zone-box]')) return
          const isUserHit = Boolean((e.target as HTMLElement).closest('[data-user-box]'))
          e.currentTarget.setPointerCapture(e.pointerId)
          lastClientRef.current = { x: e.clientX, y: e.clientY }
          if (isUserHit || zoom === 1) {
            dragModeRef.current = 'user'
            pointerToCell(e.clientX, e.clientY)
          } else {
            dragModeRef.current = 'pan'
          }
        }}
        onPointerMove={(e) => {
          if (dragModeRef.current === 'none') return
          if (dragModeRef.current === 'user') {
            pointerToCell(e.clientX, e.clientY)
          } else if (dragModeRef.current === 'pan' && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect()
            const dx = ((e.clientX - lastClientRef.current.x) / rect.width) * viewSize
            const dy = ((e.clientY - lastClientRef.current.y) / rect.height) * viewSize
            lastClientRef.current = { x: e.clientX, y: e.clientY }
            setPan((p) => ({ x: p.x - dx, y: p.y - dy }))
          }
        }}
        onPointerUp={() => {
          dragModeRef.current = 'none'
        }}
      >
        {/* 1. Cuadrícula 30x30 (1 cuadro = 10 m) */}
        {Array.from({ length: GRID_N }).map((_, r) =>
          Array.from({ length: GRID_N }).map((__, c) => {
            const path = isPathCell(c, r)
            const inRoute = routeSet.has(`${c},${r}`)
            const fill = inRoute ? '#FFF0A8' : path ? '#FFFFFF' : '#DCEFE2'
            return (
              <rect
                key={`${c}-${r}`}
                x={c * CELL}
                y={r * CELL}
                width={CELL}
                height={CELL}
                fill={fill}
                stroke="#C9E0D0"
                strokeWidth={0.8}
              />
            )
          }),
        )}

        {/* 2. Cuadros del recorrido marcados uno por uno (cada cuadro = 10 m) */}
        {routeCells.map((cell, idx) => (
          <g key={`step-${idx}`} pointerEvents="none">
            <rect
              x={cell.c * CELL + 4.5}
              y={cell.r * CELL + 4.5}
              width={CELL - 9}
              height={CELL - 9}
              rx={2}
              fill="#FFC200"
            />
            {idx > 0 && idx < routeCells.length - 1 && idx % 5 === 0 && (
              <text
                x={cell.c * CELL + CELL / 2}
                y={cell.r * CELL + CELL / 2 + 2.5}
                textAnchor="middle"
                fontSize={6.5}
                fontWeight={900}
                fill="#141414"
              >
                {idx * METERS_PER_CELL}
              </text>
            )}
          </g>
        ))}

        {/* 3. Bloques de edificios y escenarios deportivos (polideportivo / cancha de fútbol) */}
        {CAMPUS_BLOCKS.map((b) => {
          const isSport = b.kind === 'sport'
          const isSoccer = b.label.includes('Fútbol')
          const bx = b.c * CELL + 1.5
          const by = b.r * CELL + 1.5
          const bw = b.w * CELL - 3
          const bh = b.h * CELL - 3
          return (
            <g key={b.label} pointerEvents="none">
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                rx={4}
                fill={isSoccer ? '#74C365' : isSport ? '#93C5FD' : '#CBD8E6'}
                stroke={isSoccer ? '#3B873E' : isSport ? '#3B82F6' : '#9FB6CE'}
                strokeWidth={1.6}
              />
              {isSport && (
                <g stroke="#FFFFFF" strokeWidth={1.3} fill="none" opacity={0.92}>
                  <rect x={bx + 5} y={by + 5} width={bw - 10} height={bh - 10} rx={2} />
                  <line x1={bx + 5} y1={by + bh / 2} x2={bx + bw - 5} y2={by + bh / 2} />
                  <circle cx={bx + bw / 2} cy={by + bh / 2} r={9} />
                  {/* Áreas / arcos de la cancha */}
                  <rect x={bx + bw / 2 - 12} y={by + 5} width={24} height={10} />
                  <rect x={bx + bw / 2 - 12} y={by + bh - 15} width={24} height={10} />
                </g>
              )}
              <rect
                x={bx + 4}
                y={by + bh / 2 - 7}
                width={bw - 8}
                height={14}
                rx={3}
                fill="#FFFFFF"
                fillOpacity={isSport ? 0.88 : 0.65}
              />
              <text
                x={bx + bw / 2}
                y={by + bh / 2 + 3}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={900}
                fill="#1E3A5F"
              >
                {b.label}
              </text>
            </g>
          )
        })}

        {/* 3b. Árboles 2D dentro de los cuadros verdes */}
        {GRID_TREES.map(([tc, tr], idx) => {
          const cx = tc * CELL + CELL / 2
          const cy = tr * CELL + CELL / 2
          return (
            <g key={`tree-${idx}`} pointerEvents="none">
              <circle cx={cx + 1} cy={cy + 1.5} r={6.8} fill="#146C3B" fillOpacity={0.22} />
              <circle cx={cx} cy={cy} r={6.5} fill="#22A45D" stroke="#146C3B" strokeWidth={1} />
              <circle cx={cx - 1.8} cy={cy - 1.8} r={2.8} fill="#52C47E" />
            </g>
          )
        })}

        {/* 3c. Arbustos 2D en los bordes de los caminos */}
        {GRID_BUSHES.map(([bc, br], idx) => {
          const cx = bc * CELL + CELL / 2
          const cy = br * CELL + CELL / 2
          return (
            <g key={`bush-${idx}`} pointerEvents="none">
              <circle cx={cx - 3} cy={cy + 1} r={3.6} fill="#38A169" />
              <circle cx={cx + 3} cy={cy + 1} r={3.4} fill="#2F855A" />
              <circle cx={cx} cy={cy - 1.2} r={4} fill="#48BB78" />
            </g>
          )
        })}

        {/* Fuente y rótulo de Plazoleta Central */}
        <g pointerEvents="none">
          <circle cx={14.5 * CELL} cy={14.5 * CELL} r={11} fill="#BAE6FD" stroke="#38BDF8" strokeWidth={1.5} />
          <circle cx={14.5 * CELL} cy={14.5 * CELL} r={4} fill="#0284C7" />
          <text x={14.5 * CELL} y={13.35 * CELL} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#1E3A5F">
            PLAZOLETA
          </text>
        </g>

        {/* 4. Portería Principal al sur */}
        <g pointerEvents="none">
          <rect x={11.5 * CELL} y={29 * CELL + 1.5} width={6 * CELL} height={CELL - 3} rx={4} fill="#22528A" />
          <text x={14.5 * CELL} y={29 * CELL + 12} textAnchor="middle" fontSize={8.5} fontWeight={900} fill="#FFC200">
            PORTERÍA PRINCIPAL
          </text>
        </g>

        {/* 5. Las 4 Zonas de parqueo con ancho/largo propio dentro del campus */}
        {ORDER.map((id) => {
          const z = zones[id]
          const st = zoneStats(z)
          const zg = ZONE_GRID[id]
          const isSelected = selectedZone === id
          const isMine = parked?.zone === id
          const boxW = zg.w * CELL
          const boxH = zg.h * CELL
          const cx = zg.c0 * CELL + boxW / 2
          const cy = zg.r0 * CELL + boxH / 2
          return (
            <g
              key={id}
              data-zone-box="true"
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                onSelectZone(id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectZone(id)
                }
              }}
            >
              <rect
                x={zg.c0 * CELL + 1.5}
                y={zg.r0 * CELL + 1.5}
                width={boxW - 3}
                height={boxH - 3}
                rx={6}
                fill={isMine ? '#FFF8D6' : '#FFFFFF'}
                stroke={isSelected ? '#FFC200' : '#22528A'}
                strokeWidth={isSelected ? 3.5 : 2}
              />
              <text
                x={cx}
                y={cy - 2}
                textAnchor="middle"
                fontSize={15}
                fontWeight={900}
                fill="#22528A"
                fontFamily="'Lilita One', cursive"
              >
                P-{id}
              </text>
              <rect
                x={cx - 22}
                y={cy + 3}
                width={44}
                height={12}
                rx={3}
                fill={st.free === 0 ? '#E5484D' : '#22A45D'}
              />
              <text
                x={cx}
                y={cy + 11.5}
                textAnchor="middle"
                fontSize={7.5}
                fontWeight={900}
                fill="#FFFFFF"
              >
                {isMine ? parked.spotId : `${st.free} lib`}
              </text>
            </g>
          )
        })}

        {/* 6. Cuadro de llegada a la zona */}
        {routeCells.length > 0 && (
          <rect
            x={routeCells[routeCells.length - 1].c * CELL + 2}
            y={routeCells[routeCells.length - 1].r * CELL + 2}
            width={CELL - 4}
            height={CELL - 4}
            rx={3}
            fill="#FFC200"
            stroke="#141414"
            strokeWidth={1.8}
          />
        )}

        {/* 7. Ficha cuadrada "Tú" */}
        <g
          transform={`translate(${userCell.c * CELL}, ${userCell.r * CELL})`}
          data-user-box="true"
          className="cursor-grab active:cursor-grabbing"
        >
          <rect
            x={1}
            y={1}
            width={CELL - 2}
            height={CELL - 2}
            rx={4}
            fill="#22528A"
            stroke="#FFFFFF"
            strokeWidth={1.8}
          />
          <text x={CELL / 2} y={CELL / 2 + 3} textAnchor="middle" fontSize={7.5} fontWeight={900} fill="#FFFFFF">
            Tú
          </text>
        </g>
      </svg>
    </section>
  )
}
