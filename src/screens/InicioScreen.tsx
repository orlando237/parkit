import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { findSpotInfo, marginInfo, sortedZones, zoneLabel, zoneStats, zoneStatus } from '../domain/selectors'
import { parseStyle } from './ZonasScreen'
import { BrandHeader, Screen } from '../components/Screen'
import { IconChevron, IconClock, IconFlag, IconGrid } from '../components/icons'

export function InicioScreen() {
  const zones = useParkit((s) => s.zones)
  const parked = useParkit((s) => s.parked)
  const pref = useParkit((s) => s.pref)
  const classAt = useParkit((s) => s.classAt)
  const setZone = useParkit((s) => s.setZone)
  const openSheet = useParkit((s) => s.openSheet)
  const reports = useParkit((s) => s.reports)
  const go = useNav((s) => s.go)

  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const bestId = sortedZones(zones, pref)[0]
  const best = zones[bestId]
  const bestStats = zoneStats(best)
  const bestStatus = zoneStatus(best)
  const bestMargin = marginInfo(best, classAt, 461)
  const fresh = reports.length
    ? `Actualizado ahora · ${reports.length} reporte${reports.length === 1 ? '' : 's'} de la comunidad`
    : 'Actualizado hace 1 min · datos de ejemplo'

  return (
    <Screen label="Inicio">
      <BrandHeader subtitle="¿Dónde parqueas hoy?" />
      <main className="relative z-10 px-4 pt-3">
        {parked && info ? (
          <section className="lg-card rounded-[28px] px-5 pb-5 pt-5 text-white">
            <div className="flex items-start justify-between gap-2">
              <p className="pt-1 text-[13px] font-black tracking-[0.16em] text-white/90">TU CUPO ACTIVO</p>
              <span className="rounded-full bg-sun px-3 py-1 text-[13px] font-black text-black">Vigilada</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="font-display text-[58px] leading-[0.95] tracking-wide">{parked.spotId}</p>
              <p className="pb-1 text-right text-[13px] font-extrabold leading-snug text-white/90">
                Zona {info.zone.id}
                <br />
                {info.zone.name}
              </p>
            </div>
            <div className="my-3.5 h-[2px] bg-white/40" />
            <p className="flex items-center gap-2.5 text-[14px] font-extrabold">Moto 125 cc · ABC123</p>
            <button
              type="button"
              onClick={() => go('puesto', 'tab')}
              className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-sun text-[16px] font-black text-black"
            >
              Ver mi puesto
              <IconChevron className="h-[15px] w-[15px]" />
            </button>
          </section>
        ) : (
          <section className="lg-card rounded-[28px] px-5 py-6 text-white">
            <p className="text-[13px] font-black tracking-[0.16em] text-white/90">SIN CUPO ACTIVO</p>
            <p className="mt-2 font-display text-[26px] leading-[1.1]">Encuentra tu cupo antes de entrar al campus</p>
          </section>
        )}

        <h2 className="mb-2 mt-5 text-[13px] font-black tracking-[0.14em] text-card">MEJOR OPCIÓN AHORA</h2>
        <button
          type="button"
          onClick={() => {
            setZone(bestId)
            go('cupo')
          }}
          className="lg-card flex w-full items-center gap-3.5 rounded-[24px] p-4 text-left text-white"
        >
          <span
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] border-2 border-black font-display text-[30px]"
            style={{ background: best.tf, color: best.tt }}
          >
            {bestId}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-black leading-tight">{best.name}</span>
            <span className="block text-[12.5px] font-extrabold text-white/85">
              {bestStats.free} libres · {bestStats.shade} con sombra
            </span>
            <span className="mt-1 block text-[12px] font-black text-sun">{bestMargin.txt}</span>
          </span>
          <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black" style={parseStyle(bestStatus.st)}>
            {bestStatus.t}
          </span>
        </button>
        <p className="mt-2 text-center text-[12px] font-bold text-ink/75">{fresh}</p>

        <button
          type="button"
          onClick={() => go('zonas', 'tab')}
          className="mt-4 flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-sun text-[18px] font-black text-black shadow-[0_6px_0_#D9A400,inset_0_1.5px_1px_rgba(255,255,255,.8)]"
        >
          <IconGrid className="h-[18px] w-[18px]" />
          Buscar cupo cerca
        </button>
        <button
          type="button"
          onClick={openSheet}
          className="lg-surface mt-4 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full border-[3px] border-card text-[16px] font-extrabold text-ink"
        >
          <IconFlag className="h-[17px] w-[17px]" />
          Reportar estado de una zona
        </button>
        <p className="lg-panel mt-5 flex items-center gap-3 rounded-[18px] px-4 py-3 text-[13px] font-extrabold">
          <IconClock className="h-[17px] w-[17px] text-card" />
          Última ronda de vigilancia: hace 10 min
        </p>
        <p className="mt-3 text-center text-[11.5px] font-bold text-ink/60">
          {parked ? `Tu moto está en ${zoneLabel(info!.zone)}.` : 'Elige un cupo y aparecerá aquí.'}
        </p>
      </main>
    </Screen>
  )
}
