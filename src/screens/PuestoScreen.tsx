import { useEffect, useState } from 'react'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { findSpotInfo, formatDuration, parkedMinutes, zoneLabel } from '../domain/selectors'
import { BrandHeader, Screen } from '../components/Screen'
import { IconAlert, IconClock, IconGrid, IconMoto, IconPin, IconWalk } from '../components/icons'

export function PuestoScreen() {
  const parked = useParkit((s) => s.parked)
  const zones = useParkit((s) => s.zones)
  const release = useParkit((s) => s.release)
  const sendAlert = useParkit((s) => s.sendAlert)
  const setMapView = useParkit((s) => s.setMapView)
  const setGuideSource = useParkit((s) => s.setGuideSource)
  const go = useNav((s) => s.go)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const since = parked ? formatDuration(parkedMinutes(parked, Date.now() + tick * 0)) : ''
  const zone = info?.zone

  return (
    <Screen label="Mi puesto">
      <BrandHeader subtitle="Mi puesto" />
      <main className="relative z-10 px-4 pt-3">
        {parked && info && zone ? (
          <>
            <section className="lg-card rounded-[28px] px-6 pb-5 pt-6 text-white">
              <div className="flex items-start justify-between">
                <p className="pt-1 text-[14px] font-black tracking-[0.16em] text-white/90">TU CUPO</p>
                <span className="rounded-full bg-sun px-3.5 py-1 text-[14px] font-black text-black shadow-[inset_0_1px_1px_rgba(255,255,255,.75)]">
                  Vigilada
                </span>
              </div>
              <p className="mt-2 font-display text-[84px] leading-[0.95] tracking-wide">{parked.spotId}</p>
              <p className="mt-3 text-[17px] font-extrabold">{zoneLabel(zone)}</p>
              <p className="mt-1 text-[13px] font-extrabold text-white/85">
                {info.sub.title} · {info.spot.shade ? 'Sombra' : 'Al sol'}
              </p>
              <div className="my-4 h-[2px] bg-white/40" />
              <p className="flex items-center gap-3 text-[16px] font-extrabold">
                <IconMoto className="h-[18px] w-[18px]" />
                Moto 125 cc · ABC123
              </p>
            </section>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <article className="min-h-[118px] rounded-[22px] bg-sun px-3.5 pb-4 pt-3.5 text-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,.75)]">
                <p className="text-[13px] font-extrabold">Parqueado hace</p>
                <p className="mt-1 whitespace-nowrap font-display text-[22px] leading-[1.1]">{since}</p>
              </article>
              <article className="min-h-[118px] rounded-[22px] bg-sun px-3.5 pb-4 pt-3.5 text-black shadow-[inset_0_1.5px_1px_rgba(255,255,255,.75)]">
                <p className="text-[13px] font-extrabold">Última ronda</p>
                <p className="mt-1 whitespace-nowrap font-display text-[22px] leading-[1.1]">Hace 10 min</p>
              </article>
            </div>
            <section className="mt-4 space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  setGuideSource('parked')
                  go('guia')
                }}
                className="flex h-[64px] w-full items-center justify-center gap-3 rounded-full bg-button text-[18px] font-extrabold text-white shadow-[0_5px_0_#1E4C7C,inset_0_1.5px_1px_rgba(255,255,255,.35)]"
              >
                <IconWalk className="h-[19px] w-[19px]" />
                Ruta 3D a pie
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapView('moto')
                  go('mapas')
                }}
                className="lg-surface flex h-[60px] w-full items-center justify-center gap-3 rounded-full border-[3px] border-card text-[17px] font-extrabold text-ink"
              >
                <IconPin className="h-[19px] w-[19px]" />
                Cómo llegar a mi moto
              </button>
              <button
                type="button"
                onClick={release}
                className="lg-surface flex h-[60px] w-full items-center justify-center gap-3 rounded-full border-[3px] border-card text-[17px] font-extrabold text-ink"
              >
                Liberar mi cupo
              </button>
              <button
                type="button"
                onClick={sendAlert}
                className="flex h-[60px] w-full items-center justify-center gap-3 rounded-full bg-black text-[18px] font-extrabold text-sun"
              >
                <IconAlert className="h-[19px] w-[19px]" />
                Alerta a vigilancia
              </button>
            </section>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] font-bold text-ink/70">
              <IconClock className="h-[13px] w-[13px]" />
              Cupo vigilado por la ronda del campus.
            </p>
          </>
        ) : (
          <section className="lg-card rounded-[28px] px-6 py-7 text-white">
            <p className="font-display text-[30px] leading-[1.05]">Aún no tienes un cupo</p>
            <p className="mt-2 text-[15px] font-bold leading-snug text-white/90">
              Busca una zona con sombra o al sol y elige tu cupo antes de llegar.
            </p>
            <button
              type="button"
              onClick={() => go('zonas', 'tab')}
              className="mt-5 flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-sun text-[17px] font-black text-black"
            >
              <IconGrid className="h-[17px] w-[17px]" />
              Buscar cupo
            </button>
          </section>
        )}
      </main>
    </Screen>
  )
}
