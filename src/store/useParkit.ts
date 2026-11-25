import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { CLASS_TIMES, RESERVATION_MINUTES, SIMULATED_NOW, createZones } from '../domain/data'
import { findSpot, findSpotInfo, nearestZoneId, zoneStats } from '../domain/selectors'
import {
  fetchCupos,
  fetchReportes,
  insertReporteInDb,
  isSupabaseConfigured,
  subscribeRealtime,
  supabase,
  updateCupoInDb,
  type CupoRow,
  type ReporteRow,
} from '../lib/supabase'
import type {
  AlertRecord,
  AuthUser,
  GuardAlert,
  GuardAlertReason,
  GuideSource,
  MapView,
  Parked,
  Pref,
  Profile,
  Report,
  ReportState,
  SpotStatus,
  UserPos,
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
  activeAlert: GuardAlert | null
  alertSheetOpen: boolean
  lastPatrolAt: number | null
  vigilanteMode: boolean
  toast: Toast | null
  sheetOpen: boolean
  authUser: AuthUser | null
  profile: Profile | null
  userPos: UserPos
  realtimeConnected: boolean

  setAuthUser: (user: AuthUser | null) => void
  setProfile: (profile: Profile) => void
  setUserPos: (pos: UserPos) => void
  setVigilanteMode: (enabled: boolean) => void
  logout: () => void
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
  openAlertSheet: () => void
  closeAlertSheet: () => void
  createGuardAlert: (reason: GuardAlertReason, reasonLabel: string, note?: string) => GuardAlert | null
  syncGuardAlert: (alert: GuardAlert) => void
  cancelGuardAlert: () => GuardAlert | null
  dismissGuardAlert: () => void
  sendAlert: () => void
  openSheet: () => void
  closeSheet: () => void
  showToast: (message: string) => void
  hideToast: () => void
  resetDemo: () => void
  initRealtime: () => () => void
  expireReservations: () => void
  setSpotFromCamera: (spotId: string, status: SpotStatus) => Promise<void>
}

const initialParked = (): Parked => ({ zone: 'A', spotId: 'A-03', since: Date.now() - 135 * 60000 })

function withSpotPatch(
  zones: Record<ZoneId, Zone>,
  spotId: string,
  patch: { status: SpotStatus; reservedUntil?: number | null; userId?: string | null },
) {
  const free = patch.status === 'libre'
  const next = { ...zones }
  for (const zid of Object.keys(next) as ZoneId[]) {
    const zone = next[zid]
    if (!zone.spots.some((p) => p.id === spotId)) continue
    const updateSpot = <T extends { id: string }>(p: T) =>
      p.id === spotId
        ? {
            ...p,
            free,
            status: patch.status,
            reservedUntil: patch.reservedUntil ?? null,
            userId: patch.userId ?? null,
          }
        : p
    next[zid] = {
      ...zone,
      spots: zone.spots.map(updateSpot),
      subs: zone.subs.map((sb) => ({
        ...sb,
        spots: sb.spots.map(updateSpot),
      })),
    }
  }
  return next
}

function applyCupoRow(zones: Record<ZoneId, Zone>, row: CupoRow): Record<ZoneId, Zone> {
  const reservedUntil = row.reservado_hasta ? new Date(row.reservado_hasta).getTime() : null
  return withSpotPatch(zones, row.id, {
    status: row.estado,
    reservedUntil,
    userId: row.usuario_id,
  })
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
  const mapSpot = (p: Zone['spots'][number]) => {
    const isFree = freeSet.has(p.id)
    const status: SpotStatus = isFree ? 'libre' : p.status === 'apartado' ? 'apartado' : 'ocupado'
    return { ...p, free: isFree, status }
  }
  return {
    ...zone,
    spots: zone.spots.map(mapSpot),
    subs: zone.subs.map((sb) => ({
      ...sb,
      spots: sb.spots.map(mapSpot),
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
      activeAlert: null,
      alertSheetOpen: false,
      lastPatrolAt: null,
      vigilanteMode: false,
      toast: null,
      sheetOpen: false,
      authUser: null,
      profile: null,
      userPos: { x: 165, y: 175 },
      realtimeConnected: false,

      setAuthUser: (authUser) => set({ authUser, profile: null }),
      setVigilanteMode: (vigilanteMode) => set({ vigilanteMode }),
      setUserPos: (pos) =>
        set({
          userPos: {
            x: Math.max(24, Math.min(326, Math.round(pos.x))),
            y: Math.max(24, Math.min(326, Math.round(pos.y))),
          },
        }),
      setProfile: (profile) =>
        set((s) => ({
          profile,
          authUser: s.authUser ? { ...s.authUser, plate: profile.plate, name: profile.fullName } : s.authUser,
          parked: s.profile ? s.parked : null,
        })),
      logout: () => {
        if (supabase) void supabase.auth.signOut()
        set({ authUser: null, profile: null, vigilanteMode: false })
      },
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
          get().showToast(
            spot.status === 'apartado'
              ? `Cupo ${id} apartado temporalmente. Elige uno verde.`
              : `Cupo ${id} ocupado. Elige uno libre.`,
          )
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
        else if (spot.status === 'apartado') get().showToast(`Minibloque ${id} apartado temporalmente.`)
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
        const { zones, parked, authUser, profile } = get()
        const spot = findSpot(zones, spotId)
        if (!spot || !spot.free) {
          get().showToast('Ese cupo ya no está libre.')
          return
        }
        const reservedUntil = Date.now() + RESERVATION_MINUTES * 60_000
        let next = zones
        if (parked) {
          next = withSpotPatch(next, parked.spotId, { status: 'libre', reservedUntil: null, userId: null })
          void updateCupoInDb(parked.spotId, {
            estado: 'libre',
            reservado_hasta: null,
            usuario_id: null,
            placa: null,
          })
        }
        next = withSpotPatch(next, spotId, {
          status: 'apartado',
          reservedUntil,
          userId: authUser?.id ?? 'local',
        })
        set({
          zones: next,
          parked: { zone: spot.zone, spotId, since: Date.now() },
          chosen: null,
          inspected: spotId,
          activeAlert: null,
          alertSheetOpen: false,
        })
        void updateCupoInDb(spotId, {
          estado: 'apartado',
          reservado_hasta: new Date(reservedUntil).toISOString(),
          usuario_id: authUser?.id ?? null,
          placa: profile?.plate ?? authUser?.plate ?? null,
        })
        get().showToast(`Cupo ${spotId} apartado por ${RESERVATION_MINUTES} minutos.`)
      },

      release: () => {
        const { parked, zones } = get()
        if (!parked) return
        set({
          zones: withSpotPatch(zones, parked.spotId, { status: 'libre', reservedUntil: null, userId: null }),
          parked: null,
          chosen: null,
          inspected: null,
          activeAlert: null,
          alertSheetOpen: false,
        })
        void updateCupoInDb(parked.spotId, {
          estado: 'libre',
          reservado_hasta: null,
          usuario_id: null,
          placa: null,
        })
        get().showToast(`Cupo ${parked.spotId} liberado.`)
      },

      sendReport: (zoneId, state, shade) => {
        const { zones, parked, chosen, authUser } = get()
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
        void insertReporteInDb(zoneId, state, shade, authUser?.id)
        for (const sp of updated.spots) {
          if (sp.id === parked?.spotId) continue
          const prev = zone.spots.find((p) => p.id === sp.id)
          if (prev && prev.status !== sp.status) {
            void updateCupoInDb(sp.id, {
              estado: sp.status,
              reservado_hasta: null,
              usuario_id: null,
            })
          }
        }
        get().showToast(`Gracias. ${zone.name} se actualizó con tu reporte.`)
      },

      openAlertSheet: () => set({ alertSheetOpen: true }),
      closeAlertSheet: () => set({ alertSheetOpen: false }),

      createGuardAlert: (reason, reasonLabel, note) => {
        const { parked, zones, profile, authUser, alerts } = get()
        if (!parked) return null
        const info = findSpotInfo(zones, parked.spotId)
        const now = Date.now()
        const alert: GuardAlert = {
          id: `al-${now}-${Math.random().toString(36).slice(2, 6)}`,
          spotId: parked.spotId,
          zoneId: parked.zone,
          zoneName: info ? `Zona ${info.zone.id} · ${info.zone.name}` : `Zona ${parked.zone}`,
          subTitle: info?.sub.title ?? 'Sub-bloque principal',
          plate: profile?.plate ?? authUser?.plate ?? 'SIN-PLACA',
          studentName: profile?.fullName ?? authUser?.name ?? 'Estudiante Unicórdoba',
          reason,
          reasonLabel,
          note: note?.trim() ? note.trim() : undefined,
          status: 'pendiente',
          createdAt: now,
        }
        set({
          activeAlert: alert,
          alertSheetOpen: false,
          alerts: [
            { id: alert.id, spotId: alert.spotId, at: now, reasonLabel, status: 'pendiente' as const },
            ...alerts,
          ].slice(0, 20),
        })
        get().showToast(`Alerta registrada para el cupo ${alert.spotId} · Revisión solicitada.`)
        return alert
      },

      syncGuardAlert: (incoming) => {
        const { activeAlert, parked } = get()
        if (!activeAlert && parked?.spotId !== incoming.spotId) return
        if (activeAlert && activeAlert.id !== incoming.id) return
        set((s) => ({
          activeAlert: incoming,
          lastPatrolAt: incoming.status === 'atendida' ? incoming.resolvedAt ?? Date.now() : s.lastPatrolAt,
          alerts: s.alerts.map((a) => (a.id === incoming.id ? { ...a, status: incoming.status } : a)),
        }))
        if (incoming.status === 'en_ronda' && activeAlert?.status !== 'en_ronda') {
          get().showToast(`Vigilante en ronda revisando tu cupo ${incoming.spotId} en vivo.`)
        } else if (incoming.status === 'atendida' && activeAlert?.status !== 'atendida') {
          get().showToast(`Ronda finalizada en cupo ${incoming.spotId}.`)
        }
      },

      cancelGuardAlert: () => {
        const { activeAlert } = get()
        if (!activeAlert) return null
        const cancelled: GuardAlert = {
          ...activeAlert,
          status: 'cancelada',
          resolvedAt: Date.now(),
        }
        set((s) => ({
          activeAlert: null,
          alerts: s.alerts.map((a) => (a.id === cancelled.id ? { ...a, status: 'cancelada' as const } : a)),
        }))
        get().showToast(`Alerta del cupo ${cancelled.spotId} cancelada.`)
        return cancelled
      },

      dismissGuardAlert: () => set({ activeAlert: null }),

      sendAlert: () => {
        set({ alertSheetOpen: true })
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

      expireReservations: () => {
        const now = Date.now()
        const { zones, parked } = get()
        let next = zones
        let changed = false
        let expiredMine = false
        for (const zid of Object.keys(zones) as ZoneId[]) {
          for (const sp of zones[zid].spots) {
            if (sp.status === 'apartado' && sp.reservedUntil && sp.reservedUntil <= now) {
              next = withSpotPatch(next, sp.id, { status: 'libre', reservedUntil: null, userId: null })
              changed = true
              if (parked?.spotId === sp.id) expiredMine = true
              void updateCupoInDb(sp.id, {
                estado: 'libre',
                reservado_hasta: null,
                usuario_id: null,
                placa: null,
              })
            }
          }
        }
        if (changed) {
          set({
            zones: next,
            parked: expiredMine ? null : parked,
          })
          if (expiredMine) {
            get().showToast('Tu reserva de 10 minutos expiró y el cupo volvió a estar libre.')
          }
        }
      },

      setSpotFromCamera: async (spotId, status) => {
        const { zones } = get()
        const cur = findSpot(zones, spotId)
        if (!cur || cur.status === status) return
        set({
          zones: withSpotPatch(zones, spotId, {
            status,
            reservedUntil: null,
            userId: status === 'ocupado' ? 'camara-sensor' : null,
          }),
        })
        await updateCupoInDb(spotId, {
          estado: status,
          reservado_hasta: null,
          usuario_id: status === 'ocupado' ? 'camara-sensor' : null,
        })
      },

      initRealtime: () => {
        if (!isSupabaseConfigured || !supabase) return () => {}
        let active = true

        void supabase.auth.getSession().then(({ data }) => {
          if (!active) return
          const user = data.session?.user
          const email = user?.email?.toLowerCase()
          if (user && email && !get().authUser) {
            if (email.endsWith('@correo.unicordoba.edu.co')) {
              const avatarUrl =
                (user.user_metadata?.avatar_url as string | undefined) ??
                (user.user_metadata?.picture as string | undefined)
              set({
                authUser: {
                  id: user.id,
                  role: 'student',
                  email,
                  name: (user.user_metadata?.full_name as string | undefined) ?? email.split('@')[0],
                  avatarUrl,
                },
              })
            } else {
              void supabase?.auth.signOut()
              get().showToast('Solo se permite Google con correo @correo.unicordoba.edu.co.')
            }
          }
        })

        void (async () => {
          const [cupos, reportes] = await Promise.all([fetchCupos(), fetchReportes()])
          if (!active) return
          if (cupos && cupos.length > 0) {
            let next = get().zones
            for (const row of cupos) {
              next = applyCupoRow(next, row)
            }
            set({ zones: next, realtimeConnected: true })
          }
          if (reportes && reportes.length > 0) {
            set({
              reports: reportes.map((r: ReporteRow) => ({
                id: r.id,
                zone: r.zona_id,
                state: r.estado_reportado,
                shade: r.hay_sombra,
                at: new Date(r.creado_en).getTime(),
              })),
            })
          }
        })()

        const unsub = subscribeRealtime(
          (row) => {
            set((s) => ({
              zones: applyCupoRow(s.zones, row),
              realtimeConnected: true,
            }))
          },
          (row) => {
            set((s) => ({
              reports: [
                {
                  id: row.id,
                  zone: row.zona_id,
                  state: row.estado_reportado,
                  shade: row.hay_sombra,
                  at: new Date(row.creado_en).getTime(),
                },
                ...s.reports.filter((r) => r.id !== row.id),
              ].slice(0, 30),
            }))
          },
        )

        const timer = window.setInterval(() => {
          get().expireReservations()
        }, 15_000)

        return () => {
          active = false
          window.clearInterval(timer)
          unsub?.()
        }
      },
    }),
    {
      name: 'parkit-v1',
      version: 3,
      partialize: (s) => ({
        zones: s.zones,
        parked: s.parked,
        pref: s.pref,
        classAt: s.classAt,
        reports: s.reports,
        alerts: s.alerts,
        activeAlert: s.activeAlert,
        lastPatrolAt: s.lastPatrolAt,
        authUser: s.authUser,
        profile: s.profile,
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
