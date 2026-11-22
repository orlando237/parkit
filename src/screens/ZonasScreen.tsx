import { motion } from 'framer-motion'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { CLASS_TIMES, ORDER } from '../domain/data'
import {
  formatHour,
  marginInfo,
  nearestZoneId,
  sortedZones,
  zoneLabel,
  zoneStats,
  zoneStatus,
} from '../domain/selectors'
import { BrandHeader, Screen } from '../components/Screen'
import { IconChevron, IconClock, IconDown, IconFlag, IconInfo, IconSun, IconTree } from '../components/icons'
import type { ZoneId } from '../domain/types'

export function ZonasScreen() {
  const zones = useParkit((s) => s.zones)
  const pref = useParkit((s) => s.pref)
  const setPref = useParkit((s) => s.setPref)
  const classAt = useParkit((s) => s.classAt)
  const setClassAt = useParkit((s) => s.setClassAt)
  const parked = useParkit((s) => s.parked)
  const setZone = useParkit((s) => s.setZone)
  const openSheet = useParkit((s) => s.openSheet)
  const reports = useParkit((s) => s.reports)
  const go = useNav((s) => s.go)

  const ids = sortedZones(zones, pref)
  const best = zones[ids[0]]
  const near = zones[nearestZoneId(zones)]
  const bestStats = zoneStats(best)
  const nearStats = zoneStats(near)
  const margin = marginInfo(best, classAt, 461)
  const hourLabel = formatHour(classAt)
  const fresh = reports.length
    ? `Actualizado ahora · incluye ${reports.length} reporte${reports.length === 1 ? '' : 's'} de la comunidad`
    : 'Actualizado hace 1 min · datos de ejemplo'

  const banner =
    bestStats.free === 0
      ? null
      : pref === 'sombra' && nearStats.shade === 0 && bestStats.shade > 0 && best.id !== near.id
        ? `Sombra llena en ${near.name}, la zona más cercana. ${best.name} tiene ${bestStats.shade} cupos con sombra para tu clase de las ${hourLabel}.`
        : `Zona ${best.id} (${best.name}) tiene ${pref === 'sombra' ? `${bestStats.shade} cupos con sombra` : `${bestStats.sun} cupos al sol`}. Es tu mejor opción para la clase de las ${hourLabel}.`

  const openZone = (id: ZoneId) => {
    setZone(id)
    go('cupo')
  }

  return (
    <Screen label="Zonas">
      <BrandHeader subtitle="Zonas de parqueo cerca de ti" />
      <main className="relative z-10 px-4 pt-3">
        <section
          className="relative rounded-[28px] border border-white/90 bg-panel/75 p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,.95)] backdrop-blur-md"
          aria-label="Mapa de zonas"
        >
          <div className="grid grid-cols-2 gap-3.5">
            {ORDER.map((id) => {
              const z = zones[id]
              const st = zoneStats(z)
              const s = zoneStatus(z)
              const rec = id === best.id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openZone(id)}
                  aria-label={`${zoneLabel(z)}, ${st.free} cupos libres${rec ? ', recomendada' : ''}`}
                  className={`lg-surface relative flex min-h-[164px] flex-col justify-between rounded-[22px] border-[3px] p-2.5 text-left text-black ${
                    rec ? 'ring-[3px] ring-sun ring-offset-1' : ''
                  }`}
                  style={{
                    borderColor: z.border,
                    background:
                      id === 'B'
                        ? 'linear-gradient(160deg,rgba(234,242,250,.95) 0%,rgba(255,255,255,.92) 65%)'
                        : `linear-gradient(160deg,${z.tf}26 0%,rgba(255,255,255,.92) 65%)`,
                  }}
                >
                  <div>
                    <span className="flex items-center justify-between gap-1">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-black font-display text-[20px]"
                        style={{ background: z.tf, color: z.tt }}
                      >
                        {id}
                      </span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-black" style={parseStyle(s.st)}>
                        {s.t}
                      </span>
                    </span>
                    {rec ? (
                      <span className="mt-1 inline-block rounded-full bg-black px-2 py-0.5 text-[8.5px] font-black tracking-wider text-sun">
                        RECOMENDADA
                      </span>
                    ) : (
                      <span className="mt-1 inline-block h-[15px]" />
                    )}
                    <span className="mt-0.5 block text-[13px] font-black leading-tight text-ink">{z.name}</span>
                    <span className="block text-[10.5px] font-extrabold text-ink/80">
                      {st.free} libres · {pref === 'sombra' ? `${st.shade} sombra` : `${st.sun} sol`}
                    </span>
                  </div>
                  <span className="mt-2 grid grid-cols-2 gap-1">
                    {z.subs.map((sb) => (
                      <div
                        key={sb.id}
                        className={`flex items-center gap-1 rounded-md border border-card/15 bg-white/90 px-1.5 py-1 ${sb.wide ? 'col-span-2' : ''}`}
                      >
                        <span className="text-[9px] font-black text-ink">{sb.id}</span>
                        <span className="ml-auto flex gap-[2px]">
                          {sb.spots.map((p) => (
                            <i
                              key={p.id}
                              className="block h-[9px] w-[5px] rounded-[2px]"
                              style={{ background: parked?.spotId === p.id ? '#FFC200' : p.free ? '#22A45D' : '#E5484D' }}
                            />
                          ))}
                        </span>
                      </div>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <span className="lg-you pointer-events-none absolute left-1/2 top-1/2 flex h-[34px] w-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-black text-white ring-[3.5px] ring-white/95">
            Tú
          </span>
        </section>

        <p className="mb-2 mt-4 text-[12px] font-black tracking-[0.14em] text-card">BUSCO CUPO CON</p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="seg" aria-pressed={pref === 'sombra'} onClick={() => setPref('sombra')}>
            <IconTree className="h-[17px] w-[17px]" />
            Sombra
          </button>
          <button type="button" className="seg" aria-pressed={pref === 'sol'} onClick={() => setPref('sol')}>
            <IconSun className="h-[17px] w-[17px]" />
            Sol
          </button>
        </div>

        <section className="lg-panel mt-4 rounded-[22px] px-4 py-3.5" aria-label="Tu clase">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="class-time" className="flex items-center gap-2 text-[14px] font-extrabold">
              <IconClock className="h-4 w-4 text-card" />
              Tu clase empieza a las
            </label>
            <select
              id="class-time"
              value={classAt}
              onChange={(e) => setClassAt(Number(e.target.value))}
              className="lg-surface h-[40px] rounded-full border-[3px] border-card px-3 text-[14px] font-black text-ink"
            >
              {CLASS_TIMES.map((t) => (
                <option key={t} value={t}>
                  {formatHour(t)}
                </option>
              ))}
            </select>
          </div>
          {bestStats.free === 0 ? (
            <>
              <p className="mt-2 text-[13.5px] font-extrabold leading-snug text-[#B42318]">
                Todas las zonas están llenas ahora.
              </p>
              <p className="mt-1 text-[11.5px] font-bold leading-snug text-ink/75">
                Prueba reportar cambios o revisa de nuevo en unos minutos.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13.5px] font-extrabold leading-snug" style={{ color: margin.color }}>
                Con {best.name} {margin.txt}.
              </p>
              <p className="mt-1 text-[11.5px] font-bold leading-snug text-ink/75">
                {best.dm} min para parquear + {best.wc} min a pie hasta tu clase · Hora simulada: 7:41 a. m.
              </p>
            </>
          )}
        </section>

        {banner && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-[20px] border-[3px] border-sun bg-[#FFF3C4]/92 p-3.5 text-[#5B4300] shadow-[inset_0_1.5px_1px_rgba(255,255,255,.85)] backdrop-blur-md"
          >
            <p className="flex gap-2.5 text-[13.5px] font-extrabold leading-snug">
              <IconSun className="mt-0.5 h-[17px] w-[17px] shrink-0" />
              <span>{banner}</span>
            </p>
            <button
              type="button"
              onClick={() => openZone(best.id)}
              className="mt-3 h-[42px] w-full rounded-full bg-black text-[14px] font-black text-sun"
            >
              {pref === 'sombra' && nearStats.shade === 0 && bestStats.shade > 0 && best.id !== near.id
                ? `Ir a Zona ${best.id} · ${best.name}`
                : `Ver cupos de la Zona ${best.id}`}
            </button>
          </motion.div>
        )}

        <details className="group mt-4">
          <summary className="lg-surface flex h-[48px] cursor-pointer list-none items-center justify-between rounded-full border-[3px] border-card px-4 text-[14px] font-extrabold text-ink [&::-webkit-details-marker]:hidden">
            Ver lista ordenada
            <IconChevron className="h-[14px] w-[14px] transition-transform group-open:rotate-90" />
          </summary>
          <p className="mb-2 mt-3 text-[12px] font-black tracking-[0.12em] text-card">
            {pref === 'sombra' ? 'ORDENADAS POR SOMBRA Y CERCANÍA' : 'ORDENADAS POR CUPOS AL SOL Y CERCANÍA'}
          </p>
          <section className="space-y-3" aria-label="Lista de zonas">
            {ids.map((id, i) => {
              const z = zones[id]
              const st = zoneStats(z)
              const s = zoneStatus(z)
              const m = marginInfo(z, classAt, 461)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openZone(id)}
                  className={`lg-surface flex w-full items-center gap-3 rounded-[20px] border-[3px] border-card p-3 text-left ${
                    i === 0 ? 'ring-[3px] ring-sun ring-offset-1' : ''
                  }`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border-2 border-black font-display text-[24px]"
                    style={{ background: z.tf, color: z.tt }}
                  >
                    {id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black text-ink">{z.name}</span>
                    <span className="block text-[12px] font-extrabold text-ink/75">
                      {st.free} libres · {st.shade} con sombra · {z.dm} min
                    </span>
                    <span className="mt-1 block text-[11.5px] font-black" style={{ color: m.color }}>
                      {m.txt}
                    </span>
                  </span>
                  <span className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black" style={parseStyle(s.st)}>
                    {s.t}
                  </span>
                </button>
              )
            })}
          </section>
        </details>

        <p className="mt-3 text-center text-[12px] font-bold text-ink/75">{fresh}</p>
        <button
          type="button"
          onClick={openSheet}
          className="lg-surface mt-3 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border-[3px] border-card text-[16px] font-extrabold text-ink"
        >
          <IconFlag className="h-[17px] w-[17px]" />
          Reportar estado de una zona
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] font-bold text-ink/60">
          <IconInfo className="h-[13px] w-[13px]" />
          Toca una zona para ver sus cupos.
          <IconDown className="h-[13px] w-[13px]" />
        </p>
      </main>
    </Screen>
  )
}

export function parseStyle(style: string): React.CSSProperties {
  return Object.fromEntries(
    style
      .split(';')
      .filter(Boolean)
      .map((rule) => {
        const [k, v] = rule.split(':')
        const key = k.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        return [key, v.trim()]
      }),
  ) as React.CSSProperties
}
