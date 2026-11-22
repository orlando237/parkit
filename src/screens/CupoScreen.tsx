import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { formatHour, marginInfo, suggestedId, zoneStats } from '../domain/selectors'
import { BackHeader, Screen } from '../components/Screen'
import { IconClock, IconInfo, IconLayers, IconLock, IconSun, IconTree } from '../components/icons'

export function CupoScreen() {
  const zones = useParkit((s) => s.zones)
  const curZone = useParkit((s) => s.curZone)
  const pref = useParkit((s) => s.pref)
  const setPref = useParkit((s) => s.setPref)
  const chosen = useParkit((s) => s.chosen)
  const selectSpot = useParkit((s) => s.selectSpot)
  const reserve = useParkit((s) => s.reserve)
  const parked = useParkit((s) => s.parked)
  const classAt = useParkit((s) => s.classAt)
  const go = useNav((s) => s.go)
  const back = useNav((s) => s.back)

  const zone = zones[curZone]
  const st = zoneStats(zone)
  const sug = suggestedId(zone, pref)
  const margin = marginInfo(zone, classAt, 461)

  return (
    <Screen label="Selección de cupo">
      <BackHeader eyebrow="ELIGE TU CUPO" title={`Zona ${zone.id} · ${zone.name}`} onBack={() => back('zonas')}>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1 text-[13px] font-black text-black shadow-[inset_0_1px_1px_rgba(255,255,255,.75)]">
          <IconTree className="h-3 w-3" />
          {st.free} libres · {st.shade} con sombra
        </span>
      </BackHeader>

      <main className="relative z-10 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-black tracking-[0.12em] text-card">PREFIERO</span>
          <button type="button" className="seg seg-sm" aria-pressed={pref === 'sombra'} onClick={() => setPref('sombra')}>
            <IconTree className="h-[14px] w-[14px]" />
            Sombra
          </button>
          <button type="button" className="seg seg-sm" aria-pressed={pref === 'sol'} onClick={() => setPref('sol')}>
            <IconSun className="h-[14px] w-[14px]" />
            Sol
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-extrabold">
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-free bg-[#DDF3E4]" />
              Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] bg-busy" />
              Ocupado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] border border-black bg-sun" />
              Elegido
            </span>
          </div>
          <span className="whitespace-nowrap text-[12px] font-black text-[#1B7A44]">{st.free} libres</span>
        </div>

        <section className="lg-panel mt-3 rounded-[28px] p-3" aria-label="Cupos de la zona">
          <div className="lg-surface mb-3 flex items-center justify-center gap-2 rounded-full py-1.5 text-[12px] font-black tracking-[0.12em] text-card">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M12 4v16M6 14l6 6 6-6" />
            </svg>
            ENTRADA
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M12 4v16M6 14l6 6 6-6" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {zone.spots.map((p) => {
              const isMine = parked?.spotId === p.id
              const sel = chosen === p.id
              const isSug = !sel && !chosen && p.id === sug
              const label = sel ? 'Elegido' : isMine ? 'Tu cupo' : p.free ? (p.shade ? 'Sombra' : 'Sol') : 'Ocupado'
              const style: React.CSSProperties = sel
                ? { background: 'linear-gradient(180deg,#FFD026,#FFC200)', boxShadow: '0 4px 0 #141414', color: '#141414', borderColor: '#141414' }
                : isMine
                  ? { background: 'linear-gradient(180deg,#4A87C4,#2F69A6)', boxShadow: '0 4px 0 #141414', color: '#fff', borderColor: '#141414' }
                  : !p.free
                    ? { background: 'linear-gradient(180deg,#EE5A5F,#E5484D)', boxShadow: '0 4px 0 #9E1C20', color: '#fff', borderColor: '#9E1C20' }
                    : isSug
                      ? { background: 'linear-gradient(180deg,#FFF8DC,#FFF3C4)', boxShadow: '0 4px 0 #D9A400', color: '#141414', borderColor: '#FFC200' }
                      : { background: 'linear-gradient(180deg,#E9F8EF,#DDF3E4)', boxShadow: '0 4px 0 #22A45D', color: '#146C3B', borderColor: '#22A45D' }
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectSpot(p.id)}
                  aria-pressed={sel}
                  aria-label={`Cupo ${p.id}, ${label}`}
                  className={`relative flex h-[66px] flex-col items-center justify-center rounded-[14px] border-[3px] ${isSug ? 'pulse-ring' : ''}`}
                  style={style}
                >
                  {(sel || isMine) && (
                    <span className="absolute -top-2 right-1 rounded-full border border-black bg-sun px-1.5 text-[8.5px] font-black text-black">
                      {isMine ? 'TU MOTO' : 'ELEGIDO'}
                    </span>
                  )}
                  {isSug && (
                    <span className="absolute -top-2 right-1 rounded-full bg-black px-1.5 text-[8.5px] font-black text-sun">SUGERIDO</span>
                  )}
                  <span className="font-display text-[20px] leading-none tracking-wide">{p.id}</span>
                  <span className="mt-1 text-[10px] font-black opacity-90">{label}</span>
                  {p.shade && p.free && <IconTree className="absolute left-1.5 top-1.5 h-[11px] w-[11px] opacity-75" />}
                </button>
              )
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={() => go('zona')}
          className="lg-surface mt-3 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-full border-[3px] border-card text-[15px] font-extrabold text-ink"
        >
          <IconLayers className="h-4 w-4" />
          Ver sub-bloques y minibloques
        </button>

        <section className="mt-4">
          <div className="flex min-h-[60px] items-center">
            {chosen ? (
              <button
                type="button"
                onClick={() => reserve(chosen)}
                className="flex h-[60px] w-full items-center justify-center gap-2.5 rounded-full bg-sun text-[18px] font-black text-black shadow-[0_6px_0_#D9A400,inset_0_1.5px_1px_rgba(255,255,255,.8)]"
              >
                <IconLock className="h-[18px] w-[18px]" />
                Apartar {chosen} · 10 min
              </button>
            ) : st.free === 0 ? (
              <div className="w-full text-center">
                <p className="text-[14px] font-extrabold text-ink">Esta zona está llena.</p>
                <button
                  type="button"
                  onClick={() => back('zonas')}
                  className="mt-2 h-[48px] w-full rounded-full bg-button text-[15px] font-extrabold text-white"
                >
                  Ver zonas con cupo
                </button>
              </div>
            ) : (
              <p className="w-full text-center text-[14px] font-extrabold text-card">
                <IconInfo className="mr-1 inline h-[14px] w-[14px]" />
                Toca un cupo libre para elegirlo.
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-[13px] font-extrabold leading-snug" style={{ color: margin.color }}>
            Con Zona {zone.id} ({zone.dm + zone.wc} min hasta clase), {margin.txt}.
          </p>
          <p className="mt-1.5 text-center text-[12.5px] font-bold text-ink/80">
            <IconClock className="mr-1 inline h-[13px] w-[13px]" />
            Te guardamos el cupo 10 minutos mientras llegas. Clase a las {formatHour(classAt)}.
          </p>
        </section>
      </main>
    </Screen>
  )
}
