import type { Geo, SubBlock, Zone, ZoneId } from './types'

export const ORDER: ZoneId[] = ['A', 'B', 'C', 'D']

export const GEO: Record<ZoneId, Geo> = {
  A: { x: 16, y: 16, w: 120, h: 130, cx: 76, cy: 81 },
  B: { x: 194, y: 16, w: 140, h: 130, cx: 264, cy: 81 },
  C: { x: 16, y: 204, w: 120, h: 130, cx: 76, cy: 269 },
  D: { x: 194, y: 204, w: 140, h: 130, cx: 264, cy: 269 },
}

type SpotSeed = [n: number, free: 0 | 1, shade: 0 | 1]

interface SubSeed {
  id: string
  title: string
  env: 'Sombra' | 'Sol'
  wide: boolean
  spots: SpotSeed[]
}

interface ZoneSeed {
  name: string
  dm: number
  wc: number
  m: number
  tf: string
  tt: string
  border: string
  subs: SubSeed[]
}

const SEED: Record<ZoneId, ZoneSeed> = {
  A: {
    name: 'Informática', dm: 2, wc: 3, m: 45, tf: '#FFC200', tt: '#141414', border: '#D9A400',
    subs: [
      { id: 'A1', title: 'Bloque A1', env: 'Sombra', wide: false, spots: [[1, 1, 1], [2, 1, 1], [3, 0, 1], [4, 0, 1]] },
      { id: 'A2', title: 'Bloque A2', env: 'Sombra', wide: false, spots: [[5, 0, 1], [6, 1, 1], [7, 1, 1], [8, 0, 1]] },
      { id: 'A3', title: 'Bloque A3 · Pasillo Sur', env: 'Sol', wide: true, spots: [[9, 1, 0], [10, 1, 0], [11, 0, 0], [12, 1, 0]] },
    ],
  },
  B: {
    name: 'Agronomía', dm: 1, wc: 5, m: 60, tf: '#FFFFFF', tt: '#22528A', border: '#3B76B1',
    subs: [
      { id: 'B1', title: 'Bloque B1', env: 'Sombra', wide: false, spots: [[1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 1, 1]] },
      { id: 'B2', title: 'Bloque B2', env: 'Sombra', wide: false, spots: [[5, 0, 1], [6, 0, 1], [7, 1, 1], [8, 0, 1]] },
      { id: 'B3', title: 'Bloque B3 · Exterior', env: 'Sol', wide: true, spots: [[9, 0, 0], [10, 1, 0], [11, 0, 0], [12, 0, 0]] },
    ],
  },
  C: {
    name: 'Postgrados', dm: 3, wc: 6, m: 90, tf: '#141414', tt: '#FFFFFF', border: '#141414',
    subs: [
      { id: 'C1', title: 'Bloque C1', env: 'Sombra', wide: false, spots: [[1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1]] },
      { id: 'C2', title: 'Bloque C2', env: 'Sombra', wide: false, spots: [[5, 0, 1], [6, 0, 1], [7, 0, 1], [8, 0, 1]] },
      { id: 'C3', title: 'Bloque C3 · Fondo', env: 'Sol', wide: true, spots: [[9, 0, 0], [10, 0, 0], [11, 0, 0], [12, 0, 0]] },
    ],
  },
  D: {
    name: 'Bioclimático', dm: 4, wc: 4, m: 75, tf: '#7FAEDB', tt: '#123B6B', border: '#3B76B1',
    subs: [
      { id: 'D1', title: 'Bloque D1', env: 'Sombra', wide: false, spots: [[1, 1, 1], [2, 0, 1], [3, 1, 1], [4, 1, 1]] },
      { id: 'D2', title: 'Bloque D2', env: 'Sombra', wide: false, spots: [[5, 0, 1], [6, 1, 1], [7, 1, 1], [8, 1, 1]] },
      { id: 'D3', title: 'Bloque D3 · Lateral', env: 'Sol', wide: true, spots: [[9, 0, 0], [10, 1, 0], [11, 1, 0], [12, 1, 0]] },
    ],
  },
}

export const pad = (n: number) => String(n).padStart(2, '0')

export function buildZone(id: ZoneId, seed: ZoneSeed): Zone {
  const subs: SubBlock[] = seed.subs.map((sb) => ({
    id: sb.id,
    title: sb.title,
    env: sb.env,
    wide: sb.wide,
    spots: sb.spots.map(([n, free, shade]) => ({
      id: `${id}-${pad(n)}`,
      n,
      zone: id,
      sub: sb.id,
      free: free === 1,
      shade: shade === 1,
    })),
  }))
  return {
    id,
    name: seed.name,
    dm: seed.dm,
    wc: seed.wc,
    m: seed.m,
    tf: seed.tf,
    tt: seed.tt,
    border: seed.border,
    subs,
    spots: subs.flatMap((sb) => sb.spots),
  }
}

export function createZones(): Record<ZoneId, Zone> {
  return ORDER.reduce(
    (acc, id) => ({ ...acc, [id]: buildZone(id, SEED[id]) }),
    {} as Record<ZoneId, Zone>,
  )
}

export const CLASS_TIMES = [470, 480, 510, 540, 600]

export const SIMULATED_NOW = 461

export const RESERVATION_MINUTES = 10
