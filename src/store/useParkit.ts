import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { CLASS_TIMES, RESERVATION_MINUTES, SIMULATED_NOW, createZones } from '../domain/data'
import { findSpot, findSpotInfo, nearestZoneId, zoneStats } from '../domain/selectors'
import type {
  AlertRecord,
  GuideSource,
  MapView,
  Parked,
  Pref,
  Report,
  ReportState,
  Zone,
  ZoneId,
} from '../domain/types'

export interface Toast {
  id: number
  message: string
}

interface ParkitState {
  zones: Record<ZoneId, Zone>
  parked: Parked | null
  chosen: string | null
  inspected: string | null
  curZone: ZoneId
  pref: Pref
  classAt: number
  mapView: MapView
  guideSource: GuideSource
  reports: Report[]
  alerts: AlertRecord[]
  toast: Toast | null
  sheetOpen: boolean

  setZone: (id: ZoneId) => void
  setPref: (pref: Pref) => void
  setClassAt: (mins: number) => void
  setMapView: (view: MapView) => void
  setGuideSource: (source: GuideSource) => void
  selectSpot: (id: string) => void
  inspectSpot: (id: string) => void
  inspectSub: (subId: string) => void
  reserve: (spotId: string) => void
  release: () => void
  sendReport: (zone: ZoneId, state: ReportState, shade: boolean) => void
  sendAlert: () => void
  openSheet: () => void
  closeSheet: () => void
  showToast: (message: string) => void
  hideToast: () => void
  resetDemo: () => void
}

const initialParked = (): Parked => ({ zone: 'A', spotId: 'A-03', since: Date.now() - 135 * 60000 })

function withSpotFree(zones: Record<ZoneId, Zone>, spotId: string, free: boolean) {
  const next = { ...zones }
  for (const zid of Object.keys(next) as ZoneId[]) {
    const zone = next[zid]
    if (!zone.spots.some((p) => p.id === spotId)) continue
    next[zid] = {
      ...zone,
      spots: zone.spots.map((p) => (p.id === spotId ? { ...p, free } : p)),
      subs: zone.subs.map((sb) => ({
        ...sb,
        spots: sb.spots.map((p) => (p.id === spotId ? { ...p, free } : p)),
      })),
    }
  }
  return next
}

function applyReportToZone(zone: Zone, state: ReportState, shade: boolean, mineId?: string): Zone {
  const freeTarget = state === 'lleno' ? 0 : state === 'pocos' ? 3 : Math.max(6, zoneStats(zone).free)
  const mine = (p: { id: string }) => p.id === mineId
  const shaded = zone.spots.filter((p) => p.shade && !mine(p))
  const sunny = zone.spots.filter((p) => !p.shade && !mine(p))
  let s = freeTarget === 0 || !shade ? 0 : Math.min(shaded.length, Math.max(1, Math.round(freeTarget / 2)))
  let u = Math.min(sunny.length, freeTarget - s)
  if (freeTarget - s > u) s = Math.min(shaded.length, freeTarget - u)
  const freeSet = new Set<string>([
    ...shaded.slice(0, s).map((p) => p.id),
    ...sunny.slice(0, u).map((p) => p.id),
    ...(mineId ? [mineId] : []),
  ])
  return {
    ...zone,
    spots: zone.spots.map((p) => ({ ...p, free: freeSet.has(p.id) })),
    subs: zone.subs.map((sb) => ({
      ...sb,
      spots: sb.spots.map((p) => ({ ...p, free: freeSet.has(p.id) })),
    })),
  }
}

let toastSeq = 0

export const useParkit = create<ParkitState>()(
  persist(
    (set, get) => ({
      zones: createZones(),
      parked: initialParked(),
      chosen: null,
      inspected: null,
      curZone: 'A',
      pref: 'sombra',
      classAt: CLASS_TIMES[1],
      mapView: 'moto',
      guideSource: 'parked',
      reports: [],
      alerts: [],
      toast: null,
      sheetOpen: false,

      setZone: (id) => set({ curZone: id, chosen: null, inspected: null }),
      setPref: (pref) => set({ pref, chosen: null }),
      setClassAt: (mins) => set({ classAt: mins }),
      setMapView: (mapView) => set({ mapView }),
      setGuideSource: (guideSource) => set({ guideSource }),

      selectSpot: (id) => {
        const { zones, parked } = get()
        const spot = findSpot(zones, id)
        if (!spot) return
        if (parked?.spotId === id) {
          get().showToast(`Tu moto ya está en ${id}.`)
          return
        }
        if (!spot.free) {
          get().showToast(`Cupo ${id} ocupado. Elige uno libre.`)
          return
        }
        set((s) => ({ chosen: s.chosen === id ? null : id, inspected: id }))
      },

      inspectSpot: (id) => {
        const { zones, parked } = get()
        const spot = findSpot(zones, id)
        if (!spot) return
        if (spot.free) {
          set({ inspected: id, chosen: id, curZone: spot.zone })
          return
        }
        set({ inspected: id, chosen: null, curZone: spot.zone })
        if (parked?.spotId === id) get().showToast(`Tu moto ya está en ${id}.`)
        else get().showToast(`Minibloque ${id} ocupado. Elige uno verde.`)
      },

      inspectSub: (subId) => {
        const { zones, curZone } = get()
        const sub = zones[curZone].subs.find((s) => s.id === subId)
        if (!sub) return
        const picked = sub.spots.find((p) => p.free) ?? sub.spots[0]
        set({ inspected: picked.id, chosen: picked.free ? picked.id : null })
      },

      reserve: (spotId) => {
        const { zones, parked } = get()
        const spot = findSpot(zones, spotId)
        if (!spot || !spot.free) {
          get().showToast('Ese cupo ya no está libre.')
          return
        }
        let next = zones
        if (parked) next = withSpotFree(next, parked.spotId, true)
        next = withSpotFree(next, spotId, false)
        set({
          zones: next,
          parked: { zone: spot.zone, spotId, since: Date.now() },
          chosen: null,
          inspected: spotId,
        })
        get().showToast(`Cupo ${spotId} apartado por ${RESERVATION_MINUTES} minutos.`)
      },

      release: () => {
        const { parked, zones } = get()
        if (!parked) return
        set({
          zones: withSpotFree(zones, parked.spotId, true),
          parked: null,
          chosen: null,
          inspected: null,
        })
        get().showToast(`Cupo ${parked.spotId} liberado.`)
      },

      sendReport: (zoneId, state, shade) => {
        const { zones, parked, chosen } = get()
        const zone = zones[zoneId]
        const updated = applyReportToZone(zone, state, shade, parked?.spotId)
        const stillFree = (id: string | null) => (id ? findSpot({ ...zones, [zoneId]: updated }, id)?.free ?? false : false)
        set({
          zones: { ...zones, [zoneId]: updated },
          reports: [
            { id: `r-${Date.now()}`, zone: zoneId, state, shade, at: Date.now() },
            ...get().reports,
          ].slice(0, 30),
          chosen: stillFree(chosen) ? chosen : null,
          sheetOpen: false,
        })
        get().showToast(`Gracias. ${zone.name} se actualizó con tu reporte.`)
      },

      sendAlert: () => {
        const { parked, alerts } = get()
        if (!parked) return
        set({
          alerts: [{ id: `a-${Date.now()}`, spotId: parked.spotId, at: Date.now() }, ...alerts].slice(0, 20),
        })
        get().showToast(`Alerta enviada. Vigilancia revisará tu cupo ${parked.spotId}.`)
      },

      openSheet: () => set({ sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),

      showToast: (message) => set({ toast: { id: ++toastSeq, message } }),
      hideToast: () => set({ toast: null }),

      resetDemo: () =>
        set({
          zones: createZones(),
          parked: initialParked(),
          chosen: null,
          inspected: null,
          reports: [],
          alerts: [],
          toast: null,
        }),
    }),
    {
      name: 'parkit-v1',
      version: 1,
      partialize: (s) => ({
        zones: s.zones,
        parked: s.parked,
        pref: s.pref,
        classAt: s.classAt,
        reports: s.reports,
        alerts: s.alerts,
      }),
    },
  ),
)

export const useNow = () => SIMULATED_NOW

export function useGuideTarget() {
  return useParkit(useShallow((s) => {
    if (s.guideSource === 'zona') {
      const pick = s.inspected ?? s.chosen
      if (pick) {
        const info = findSpotInfo(s.zones, pick)
        if (info) return info
      }
    }
    if (s.parked) {
      const info = findSpotInfo(s.zones, s.parked.spotId)
      if (info) return info
    }
    const zone = s.zones[s.curZone]
    const pick = s.chosen ? findSpotInfo(s.zones, s.chosen) : null
    if (pick) return pick
    const free = zone.spots.find((p) => p.free)
    return findSpotInfo(s.zones, (free ?? zone.spots[0]).id)
  }))
}

export function useNearestZone() {
  return useParkit((s) => nearestZoneId(s.zones))
}
