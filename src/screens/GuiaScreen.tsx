import { useParkit, useGuideTarget } from '../store/useParkit'
import { useGuide } from '../store/useGuide'
import { useNav } from '../store/useNav'
import { BackHeader, Screen } from '../components/Screen'
import { IconWalk } from '../components/icons'
import { GuideScene } from '../scene/GuideScene'

export function GuiaScreen() {
  const target = useGuideTarget()
  const parked = useParkit((s) => s.parked)
  const running = useGuide((s) => s.running)
  const finished = useGuide((s) => s.finished)
  const meters = useGuide((s) => s.meters)
  const minutes = useGuide((s) => s.minutes)
  const start = useGuide((s) => s.start)
  const back = useNav((s) => s.back)

  const isMine = parked?.spotId === target.spot.id
  const totalMeters = target.zone.m
  const totalMinutes = Math.max(1, Math.round(target.zone.m / 60))
  const stateLabel = finished ? 'Llegaste a tu cupo' : running ? 'En camino' : 'Listo para salir'
  const shownMeters = running || finished ? meters : totalMeters
  const shownMinutes = running || finished ? minutes : totalMinutes

  return (
    <Screen label="Guía 3D a pie hasta tu moto">
      <BackHeader eyebrow="GUÍA A PIE" title="Hasta tu moto" onBack={() => back('puesto')} badge={
        <span className="walk-pill mt-1">
          <IconWalk className="h-[13px] w-[13px]" />
          Ruta a pie
        </span>
      } />

      <main className="relative z-10 px-4 pt-4">
        <section className="hud-panel" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-3.5">
            <div className="flex flex-col">
              <span className="font-display text-[26px] leading-none text-sun">{shownMeters} m</span>
              <span className="mt-0.5 text-[11px] font-extrabold text-white/90">Restantes</span>
            </div>
            <div className="h-[30px] w-[2px] rounded bg-white/25" aria-hidden />
            <div className="flex flex-col">
              <span className="font-display text-[26px] leading-none text-sun">{shownMinutes} min</span>
              <span className="mt-0.5 text-[11px] font-extrabold text-white/90">Caminando</span>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <span className="inline-block rounded-full bg-sun px-2.5 py-[3px] text-[12px] font-black text-black shadow-[inset_0_1px_1px_rgba(255,255,255,.75)]">
              Cupo {target.spot.id}
            </span>
            <span className="mt-1 block text-[12px] font-extrabold text-white">{stateLabel}</span>
          </div>
        </section>

        <section className="viewport-wrap mt-3" aria-label="Escena 3D del recorrido por el campus">
          <GuideScene
            target={target}
            isMine={isMine}
            totalMeters={totalMeters}
            totalMinutes={totalMinutes}
            onStart={() => start(totalMeters, totalMinutes)}
          />
        </section>

        <footer className="mt-3 flex flex-col gap-2">
          <p className="text-center text-[12px] font-extrabold text-ink/85">Guía peatonal desde tu ubicación · No usar mientras conduces</p>
          <button
            type="button"
            className="btn-primary"
            disabled={running}
            onClick={() => start(totalMeters, totalMinutes)}
          >
            <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" aria-hidden>
              <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" />
            </svg>
            {running ? 'Recorriendo…' : finished ? 'Repetir' : 'Iniciar recorrido'}
          </button>
        </footer>
      </main>
    </Screen>
  )
}
