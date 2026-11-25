import { useEffect, useMemo } from 'react'
import { useParkit, useGuideTarget } from '../store/useParkit'
import { useGuide } from '../store/useGuide'
import { useNav } from '../store/useNav'
import { BackHeader, Screen } from '../components/Screen'
import {
  METERS_PER_CELL,
  buildGridRoute,
  gridRouteSteps,
  userPosToCell,
} from '../components/CampusMap2D'
import { IconWalk } from '../components/icons'
import { GuideScene } from '../scene/GuideScene'

export function GuiaScreen() {
  const target = useGuideTarget()
  const parked = useParkit((s) => s.parked)
  const userPos = useParkit((s) => s.userPos)
  const running = useGuide((s) => s.running)
  const finished = useGuide((s) => s.finished)
  const meters = useGuide((s) => s.meters)
  const minutes = useGuide((s) => s.minutes)
  const start = useGuide((s) => s.start)
  const reset = useGuide((s) => s.reset)
  const back = useNav((s) => s.back)

  // Reiniciar al entrar para que el muñeco empiece listo para caminar cuadro a cuadro
  useEffect(() => {
    reset()
  }, [target?.spot.id, reset])

  const isMine = Boolean(target && parked?.spotId === target.spot.id)

  // Cantidad exacta de cuadros (1 cuadro = 10 m) desde la posición actual hasta la zona destino
  const totalSteps = useMemo(() => {
    if (!target) return 6
    const cell = userPosToCell(userPos)
    const steps = gridRouteSteps(buildGridRoute(cell, target.zone.id))
    return Math.max(4, steps)
  }, [userPos, target])

  const totalMeters = totalSteps * METERS_PER_CELL
  const totalMinutes = Math.max(1, Math.round(totalMeters / 55))

  if (!target) return null

  const shownMeters = running || finished ? meters : totalMeters
  const shownSteps = Math.round(shownMeters / METERS_PER_CELL)
  const shownMinutes = running || finished ? minutes : totalMinutes
  const stateLabel = finished
    ? '¡Llegaste al destino!'
    : running
      ? `Saltando cuadro a cuadro (${METERS_PER_CELL} m/cuadro)`
      : 'Muñeco listo para caminar'

  return (
    <Screen label="Guía 3D a pie">
      <BackHeader
        eyebrow="GUÍA 3D A PIE (1 CUADRO = 10 M)"
        title={isMine ? 'Hasta tu moto' : `Hasta Zona ${target.zone.id} · ${target.zone.name}`}
        onBack={() => back('mapas')}
        badge={
          <span className="walk-pill mt-1">
            <IconWalk className="h-[13px] w-[13px]" />
            A pie
          </span>
        }
      />

      <main className="relative z-10 px-4 pt-3">
        <section className="hud-panel" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-display text-[25px] leading-none text-sun">{shownMeters} m</span>
              <span className="mt-0.5 text-[11px] font-extrabold text-white/90">
                {shownSteps} {shownSteps === 1 ? 'cuadro' : 'cuadros'}
              </span>
            </div>
            <div className="h-[30px] w-[2px] rounded bg-white/25" aria-hidden />
            <div className="flex flex-col">
              <span className="font-display text-[25px] leading-none text-sun">{shownMinutes} min</span>
              <span className="mt-0.5 text-[11px] font-extrabold text-white/90">A pie</span>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <span className="inline-block rounded-full bg-sun px-2.5 py-[3px] text-[12px] font-black text-black shadow-[inset_0_1px_1px_rgba(255,255,255,.75)]">
              {isMine ? `Moto ${target.spot.id}` : `Zona ${target.zone.id} (${target.spot.id})`}
            </span>
            <span className="mt-1 block text-[11.5px] font-extrabold text-white">{stateLabel}</span>
          </div>
        </section>

        <section className="viewport-wrap mt-3" aria-label="Escena 3D del muñeco caminando cuadro por cuadro">
          <GuideScene
            target={target}
            isMine={isMine}
            totalMeters={totalMeters}
            totalMinutes={totalMinutes}
            onStart={() => start(totalMeters, totalMinutes)}
          />
        </section>

        <footer className="mt-3 flex flex-col gap-2">
          <p className="text-center text-[12px] font-extrabold text-ink/85">
            El muñeco salta de cuadro en cuadro cada {METERS_PER_CELL} metros hasta llegar
          </p>
          <button
            type="button"
            className="lg-btn-sun flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[16.5px] font-black disabled:opacity-60"
            disabled={running}
            onClick={() => {
              reset()
              window.setTimeout(() => start(totalMeters, totalMinutes), 16)
            }}
          >
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
              <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
            </svg>
            {running ? 'Caminando cuadro a cuadro…' : finished ? 'Repetir caminata' : 'Iniciar caminata 3D'}
          </button>
        </footer>
      </main>
    </Screen>
  )
}
