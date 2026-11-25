import { GEO, ORDER } from './data'
import type { Parked, Pref, Spot, SpotInfo, UserPos, Zone, ZoneId } from './types'

export const DEFAULT_USER_POS: UserPos = { x: 165, y: 175 }

export function distanceMeters(from: UserPos, to: { x: number; y: number }): number {
  const dx = from.x - to.x
  const dy = from.y - to.y
  return Math.max(5, Math.round(Math.hypot(dx, dy) * 0.45))
}

export function zoneDistanceMeters(zoneId: ZoneId, userPos: UserPos = DEFAULT_USER_POS): number {
  const g = GEO[zoneId]
  return distanceMeters(userPos, { x: g.cx, y: g.cy })
}

export function walkMinutesFromMeters(meters: number): number {
  return Math.max(1, Math.round(meters / 55))
}

export interface Stats {
  free: number
  shade: number
  sun: number
}

export interface MarginInfo {
  m: number
  color: string
  txt: string
}

export function zoneStats(zone: Zone): Stats {
  let free = 0
  let shade = 0
  zone.spots.forEach((p) => {
    if (!p.free) return
    free += 1
    if (p.shade) shade += 1
  })
  return { free, shade, sun: free - shade }
}

export function zoneStatus(zone: Zone) {
  const { free } = zoneStats(zone)
  if (free === 0) return { t: 'Lleno', st: 'background:#141414;color:#fff' }
  if (free <= 3) return { t: 'Pocos', st: 'background:#FFC200;color:#141414' }
  return { t: 'Libre', st: 'background:#22A45D;color:#fff' }
}

export function zoneMetric(zone: Zone, pref: Pref) {
  const s = zoneStats(zone)
  return pref === 'sombra' ? s.shade : s.sun
}

export function sortedZones(zones: Record<ZoneId, Zone>, pref: Pref, userPos?: UserPos): ZoneId[] {
  const rank = (id: ZoneId) => {
    const z = zones[id]
    if (zoneMetric(z, pref) > 0) return 0
    return zoneStats(z).free > 0 ? 1 : 2
  }
  return [...ORDER].sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    if (userPos) return zoneDistanceMeters(a, userPos) - zoneDistanceMeters(b, userPos)
    return zones[a].dm - zones[b].dm
  })
}

export function nearestZoneId(zones: Record<ZoneId, Zone>, userPos?: UserPos): ZoneId {
  if (userPos) {
    return [...ORDER].sort((a, b) => zoneDistanceMeters(a, userPos) - zoneDistanceMeters(b, userPos))[0]
  }
  return [...ORDER].sort((a, b) => zones[a].dm - zones[b].dm)[0]
}

export function marginInfo(zone: Zone, classAt: number, now: number): MarginInfo {
  const m = classAt - now - (zone.dm + zone.wc)
  if (m >= 8) return { m, color: '#1B7A44', txt: `llegas con ${m} min de margen` }
  if (m >= 0) return { m, color: '#8A6A00', txt: `llegas justo, con ${m} min de margen` }
  return { m, color: '#B42318', txt: `llegarías tarde: faltan ${-m} min` }
}

export function formatHour(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}:${String(m).padStart(2, '0')} a. m.`
}

export function zoneLabel(zone: Zone) {
  return `Zona ${zone.id} · ${zone.name}`
}

export function findSpot(zones: Record<ZoneId, Zone>, id: string): Spot | null {
  for (const zid of ORDER) {
    const found = zones[zid].spots.find((p) => p.id === id)
    if (found) return found
  }
  return null
}

export function findSpotInfo(zones: Record<ZoneId, Zone>, id: string): SpotInfo | null {
  for (const zid of ORDER) {
    const zone = zones[zid]
    for (const sub of zone.subs) {
      const spot = sub.spots.find((p) => p.id === id)
      if (spot) return { zone, sub, spot, index: zone.spots.indexOf(spot) }
    }
  }
  return null
}

export function spotIndex(zone: Zone, spotId: string) {
  return zone.spots.findIndex((p) => p.id === spotId)
}

export function suggestedId(zone: Zone, pref: Pref): string | null {
  const free = zone.spots.filter((p) => p.free)
  if (!free.length) return null
  const match = free.find((p) => (pref === 'sombra') === p.shade)
  return (match ?? free[0]).id
}

export function miniPos(zoneId: ZoneId, idx: number) {
  const g = GEO[zoneId]
  const w = g.w
  let xStart: number
  let i: number
  let dz: number
  if (idx < 3) {
    xStart = -w / 2 + 16
    i = idx
    dz = -29
  } else if (idx < 6) {
    xStart = 8
    i = idx - 3
    dz = -29
  } else {
    xStart = -w / 2 + 16
    i = idx - 6
    dz = 29
  }
  return { x: g.cx + xStart + i * 15.5, z: g.cy + dz }
}

export function parkedMinutes(parked: Parked, now: number) {
  return Math.max(0, Math.floor((now - parked.since) / 60000))
}

export function formatDuration(minutes: number) {
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
