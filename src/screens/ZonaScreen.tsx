import { useMemo } from 'react'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { ORDER } from '../domain/data'
import { findSpotInfo, zoneStats } from '../domain/selectors'
import { BackHeader, Screen } from '../components/Screen'
import { IconDown, IconLayers, IconWalk } from '../components/icons'
import type { Spot } from '../domain/types'

function miniState(p: Spot, inspected: string | null, chosen: string | null, mineId?: string) {
  if (chosen === p.id) return 'selected'
  if (inspected === p.id && p.free) return 'selected'
  if (mineId === p.id) return 'mine'
  return p.free ? 'free' : 'busy'
}

export function ZonaScreen() {
  const zones = useParkit((s) => s.zones)
  const curZone = useParkit((s) => s.curZone)
  const setZone = useParkit((s) => s.setZone)
  const inspected = useParkit((s) => s.inspected)
  const chosen = useParkit((s) => s.chosen)
  const inspectSpot = useParkit((s) => s.inspectSpot)
  const inspectSub = useParkit((s) => s.inspectSub)
  const reserve = useParkit((s) => s.reserve)
  const parked = useParkit((s) => s.parked)
  const setGuideSource = useParkit((s) => s.setGuideSource)
  const go = useNav((s) => s.go)
  const back = useNav((s) => s.back)

  const zone = zones[curZone]
  const st = zoneStats(zone)
  const activeId = inspected ?? chosen

  const target = useMemo(() => {
    const active = activeId ? findSpotInfo(zones, activeId) : null
    if (active && active.zone.id === curZone) return active
    const free = zone.spots.find((p) => p.free) ?? zone.spots[0]
    return findSpotInfo(zones, free.id)
  }, [zones, activeId, curZone, zone])

  const activeSub = target?.sub.id
  const isMine = target && parked?.spotId === target.spot.id

  return (
    <Screen label="Sub-bloques de la zona">
      <BackHeader
        eyebrow="MAPA INTERNO"
        title={`Zona ${zone.id} · ${zone.name}`}
        onBack={() => back('cupo')}
        badge={
          <span className="mt-1 whitespace-nowrap rounded-full bg-card px-3 py-1 text-[11px] font-black tracking-[0.08em] text-white">
            ZONA {zone.id}
          </span>
        }
      >
        <p className="mt-1 text-[12.5px] font-extrabold text-ink/80">
          {zone.subs.length} sub-bloques · {zone.spots.length} minibloques
        </p>
      </BackHeader>

      <main className="relative z-10 px-4 pt-4">
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Cambiar zona">
          {ORDER.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === curZone} className="zone-tab" onClick={() => setZone(id)}>
              Zona {id}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-3 text-[12px] font-extrabold">
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-free-deep bg-free" />
              Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-busy-deep bg-busy" />
              Ocupado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-black bg-sun" />
              Elegido
            </span>
          </div>
          <span className="whitespace-nowrap text-[12px] font-black text-ink">
            {st.free} libres de {zone.spots.length}
          </span>
        </div>

        <section className="blueprint mt-3" aria-label="Plano de sub-bloques y minibloques">
          <div className="aisle">
            <IconDown className="h-[11px] w-[11px]" />
            ENTRADA Y PASILLO DE CIRCULACIÓN
            <IconDown className="h-[11px] w-[11px]" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {zone.subs.map((sb) => (
              <div key={sb.id} data-active={sb.id === activeSub} className={`subblock ${sb.wide ? 'col-span-2' : ''}`}>
                <button type="button" onClick={() => inspectSub(sb.id)} className="flex min-w-0 items-center justify-between gap-1 text-left">
                  <span className="flex min-w-0 items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-black text-ink">
                    <IconLayers className="h-3 w-3 shrink-0 text-card" />
                    {sb.title}
                  </span>
                  <span className="shrink-0 whitespace-nowrap rounded-full border border-card/30 bg-panel px-1.5 py-0.5 text-[9.5px] font-black text-ink">
                    {sb.env}
                  </span>
                </button>
                <div className={`grid gap-[7px] ${sb.wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
                  {sb.spots.map((p) => {
                    const state = miniState(p, inspected, chosen, parked?.spotId)
                    const label =
                      state === 'selected' ? 'Elegido' : state === 'mine' ? 'Tu moto' : p.free ? (p.shade ? 'Sombra' : 'Sol') : 'Ocupado'
                    return (
                      <button
                        key={p.id}
                        type="button"
                        data-state={state}
                        className="mini"
                        aria-pressed={state === 'selected'}
                        aria-label={`Minibloque ${p.id}, ${label}`}
                        onClick={() => inspectSpot(p.id)}
                      >
                        <span className="font-display text-[16px] leading-none tracking-wide">{p.id}</span>
                        <span className="mt-[3px] text-[9.5px] font-black opacity-95">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {target && (
          <section className="lg-card mt-4 rounded-[22px] p-4 text-white" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[30px] leading-none text-sun">{target.spot.id}</p>
                <p className="mt-1 text-[12.5px] font-extrabold leading-snug text-white/90">
                  {target.sub.title} · Cupo {target.spot.shade ? 'con sombra' : 'al sol'}
                </p>
              </div>
              <span
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-black"
                style={
                  isMine
                    ? { background: '#FFC200', color: '#141414' }
                    : target.spot.free
                      ? { background: '#22A45D', color: '#fff' }
                      : { background: '#E5484D', color: '#fff' }
                }
              >
                {isMine ? 'Tu cupo activo' : target.spot.free ? 'Libre · Verde' : 'Ocupado · Rojo'}
              </span>
            </div>
            <button
              type="button"
              disabled={isMine || !target.spot.free}
              onClick={() => reserve(target.spot.id)}
              className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-sun text-[16px] font-black text-black shadow-[0_5px_0_#D9A400,inset_0_1.5px_1px_rgba(255,255,255,.8)] disabled:opacity-60 disabled:shadow-none"
            >
              {isMine
                ? `Tu moto ya está en ${target.spot.id}`
                : target.spot.free
                  ? `Apartar cupo ${target.spot.id} · 10 min`
                  : `Cupo ${target.spot.id} ocupado · Elige uno verde`}
            </button>
            <button
              type="button"
              onClick={() => {
                setGuideSource('zona')
                go('guia')
              }}
              className="mt-2.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-full border-2 border-white/45 bg-white/10 text-[14px] font-extrabold text-white"
            >
              <IconWalk className="h-[15px] w-[15px]" />
              Ver ruta 3D a pie hasta este cupo
            </button>
          </section>
        )}
        <p className="mt-3 text-center text-[12px] font-bold text-ink/80">
          Toca un minibloque para inspeccionarlo. Verde = libre, rojo = ocupado.
        </p>
      </main>
    </Screen>
  )
}
