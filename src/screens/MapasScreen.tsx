import { useEffect, useMemo, useState } from 'react'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { findSpotInfo, walkMinutesFromMeters, zoneLabel, zoneStats } from '../domain/selectors'
import { BrandHeader, Screen } from '../components/Screen'
import {
  CAMPUS_LANDMARKS,
  CampusMap2D,
  METERS_PER_CELL,
  ZONE_GRID,
  buildGridRoute,
  cellToUserPos,
  gridRouteMeters,
  gridRouteSteps,
  userPosToCell,
  type GridCell,
} from '../components/CampusMap2D'
import { IconMap, IconMoto, IconPlay, IconRuler, IconWalk } from '../components/icons'
import type { ZoneId } from '../domain/types'

export function MapasScreen() {
  const zones = useParkit((s) => s.zones)
  const parked = useParkit((s) => s.parked)
  const curZone = useParkit((s) => s.curZone)
  const mapView = useParkit((s) => s.mapView)
  const userPosStore = useParkit((s) => s.userPos)
  const setUserPos = useParkit((s) => s.setUserPos)
  const setMapView = useParkit((s) => s.setMapView)
  const setZone = useParkit((s) => s.setZone)
  const setGuideSource = useParkit((s) => s.setGuideSource)
  const go = useNav((s) => s.go)

  const [walking, setWalking] = useState(false)
  const [focusedZone, setFocusedZone] = useState<ZoneId>(curZone)

  const userCell = useMemo(() => userPosToCell(userPosStore), [userPosStore])
  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const activeZoneId: ZoneId = mapView === 'moto' && parked ? parked.zone : focusedZone
  const activeZone = zones[activeZoneId]

  const routeCells = useMemo(() => buildGridRoute(userCell, activeZoneId), [userCell, activeZoneId])
  const steps = useMemo(() => gridRouteSteps(routeCells), [routeCells])
  const distMeters = useMemo(() => gridRouteMeters(routeCells), [routeCells])

  const entryCell = ZONE_GRID[activeZoneId].entry
  const arrived =
    mapView === 'moto' &&
    parked !== null &&
    userCell.c === entryCell.c &&
    userCell.r === entryCell.r

  // Avanza cuadro por cuadro (10 m por paso) sobre los senderos del campus
  useEffect(() => {
    if (!walking) return
    const timer = window.setInterval(() => {
      const curCell = userPosToCell(useParkit.getState().userPos)
      const path = buildGridRoute(curCell, activeZoneId)
      if (path.length < 2) {
        setWalking(false)
        return
      }
      setUserPos(cellToUserPos(path[1]))
      if (path.length === 2) setWalking(false)
    }, 150)
    return () => window.clearInterval(timer)
  }, [walking, activeZoneId, setUserPos])

  const handleSelectCell = (cell: GridCell) => {
    setWalking(false)
    setUserPos(cellToUserPos(cell))
  }

  return (
    <Screen label="Mapas">
      <BrandHeader subtitle="Mapa general del campus" />
      <main className="relative z-10 px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="seg"
            aria-pressed={mapView === 'moto'}
            onClick={() => {
              setWalking(false)
              setMapView('moto')
            }}
          >
            <IconMoto className="h-[17px] w-[17px]" />
            Mi moto
          </button>
          <button
            type="button"
            className="seg"
            aria-pressed={mapView === 'campus'}
            onClick={() => {
              setWalking(false)
              setMapView('campus')
            }}
          >
            <IconMap className="h-[17px] w-[17px]" />
            Campus
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {CAMPUS_LANDMARKS.map((lm) => {
            const active = userCell.c === lm.cell.c && userCell.r === lm.cell.r
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => handleSelectCell(lm.cell)}
                className={`rounded-full px-3 py-1 text-[11px] font-black transition ${
                  active ? 'lg-btn-blue' : 'lg-surface text-ink'
                }`}
              >
                {lm.label}
              </button>
            )
          })}
        </div>

        {mapView === 'moto' && (!parked || !info) ? (
          <section className="lg-card mt-3 rounded-[28px] px-6 py-7 text-white">
            <p className="font-display text-[28px] leading-[1.05]">Aún no tienes una moto parqueada</p>
            <p className="mt-2 text-[15px] font-bold leading-snug text-white/90">
              Usa la pestaña Campus para explorar los bloques y guiarte hacia una zona de parqueo.
            </p>
            <button
              type="button"
              onClick={() => setMapView('campus')}
              className="lg-btn-sun mt-5 flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[17px] font-black"
            >
              <IconMap className="h-[17px] w-[17px]" />
              Ver mapa del campus
            </button>
          </section>
        ) : (
          <div className="mt-2">
            <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[12px] font-extrabold text-ink">
              <span>1 cuadro = {METERS_PER_CELL} m</span>
              <span className="rounded-full bg-sun px-2.5 py-0.5 text-[11.5px] font-black text-black">
                {steps} {steps === 1 ? 'cuadro' : 'cuadros'} = {distMeters} m
              </span>
            </div>

            <CampusMap2D
              zones={zones}
              userCell={userCell}
              parked={parked}
              selectedZone={activeZoneId}
              routeCells={routeCells}
              onSelectCell={handleSelectCell}
              onSelectZone={(id) => {
                setWalking(false)
                setFocusedZone(id)
                setZone(id)
                go('zonas', 'tab')
              }}
            />

            {arrived && parked && (
              <p className="mt-3 rounded-full bg-free px-4 py-2 text-center text-[13px] font-black text-white">
                ¡Llegaste a la Zona {parked.zone} ({parked.spotId})!
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (arrived || steps === 0) handleSelectCell(CAMPUS_LANDMARKS[0].cell)
                  setWalking((w) => !w)
                }}
                className="lg-btn-sun flex h-[48px] items-center justify-center gap-2 rounded-full text-[14px] font-black"
              >
                <IconPlay className="h-[14px] w-[14px]" />
                {walking ? 'Pausar' : steps === 0 ? 'Desde Portería' : 'Caminar ruta'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapView === 'moto' && parked) {
                    setGuideSource('parked')
                  } else {
                    setZone(activeZoneId)
                    setGuideSource('zona')
                  }
                  go('guia')
                }}
                className="lg-btn-blue flex h-[48px] items-center justify-center gap-2 rounded-full text-[14px] font-extrabold"
              >
                <IconWalk className="h-[15px] w-[15px]" />
                Guía 3D
              </button>
            </div>

            <article className="lg-card mt-3 flex items-center gap-4 rounded-[22px] p-4 text-white">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-sun text-black">
                <IconMoto className="h-[22px] w-[22px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[15.5px] font-extrabold leading-tight">
                  {mapView === 'moto' && parked ? `${parked.spotId} · ` : ''}
                  {zoneLabel(activeZone)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-black">
                  <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1">
                    <IconRuler className="mr-1 inline h-[13px] w-[13px]" />
                    {steps} cuadros · {distMeters} m
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1">
                    <IconWalk className="mr-1 inline h-[13px] w-[13px]" />
                    {walkMinutesFromMeters(Math.max(10, distMeters))} min a pie
                  </span>
                  {mapView === 'campus' && (
                    <span className="whitespace-nowrap rounded-full bg-sun px-2.5 py-1 text-black">
                      {zoneStats(activeZone).free} libres
                    </span>
                  )}
                </div>
              </div>
            </article>
          </div>
        )}
      </main>
    </Screen>
  )
}
