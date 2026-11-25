import { useMemo } from 'react'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { ORDER } from '../domain/data'
import {
  findSpotInfo,
  suggestedId,
  zoneLabel,
  zoneStats,
  zoneStatus,
} from '../domain/selectors'
import { BrandHeader, Screen } from '../components/Screen'
import {
  IconDown,
  IconFlag,
  IconLayers,
  IconLock,
  IconMap,
  IconMoto,
  IconSun,
  IconTree,
} from '../components/icons'
import type { Spot, SubBlock, ZoneId } from '../domain/types'

function miniState(p: Spot, inspected: string | null, chosen: string | null, mineId?: string) {
  if (mineId === p.id) return 'mine'
  if (chosen === p.id || (inspected === p.id && p.free)) return 'selected'
  return p.free ? 'free' : 'busy'
}

// Geometría y orientación distinta de sub-bloques para cada zona de parqueo
const ZONE_LAYOUT_META: Record<ZoneId, { shapeLabel: string; dimsLabel: string }> = {
  A: { shapeLabel: 'Disposición en L · Bahía norte + 2 islas', dimsLabel: '18 m × 16 m' },
  B: { shapeLabel: 'Corredor longitudinal escalonado', dimsLabel: '26 m × 11 m' },
  C: { shapeLabel: 'Patio en U · 2 alas verticales + fondo', dimsLabel: '15 m × 22 m' },
  D: { shapeLabel: 'Islas diagonales + bahía central ancha', dimsLabel: '22 m × 18 m' },
}

interface SubBlockCardProps {
  sb: SubBlock
  colsClass: string
  className?: string
  activeSub?: string
  parkedSpotId?: string
  inspected: string | null
  chosen: string | null
  sug: string | null
  onInspectSub: (id: string) => void
  onInspectSpot: (id: string) => void
}

function SubBlockCard({
  sb,
  colsClass,
  className = '',
  activeSub,
  parkedSpotId,
  inspected,
  chosen,
  sug,
  onInspectSub,
  onInspectSpot,
}: SubBlockCardProps) {
  const hasMineInSub = sb.spots.some((p) => p.id === parkedSpotId)
  const subFree = sb.spots.filter((p) => p.free).length

  return (
    <div data-active={sb.id === activeSub || hasMineInSub} className={`subblock ${className}`}>
      <button
        type="button"
        onClick={() => onInspectSub(sb.id)}
        className="flex flex-wrap items-center justify-between gap-1 text-left"
      >
        <span className="flex items-center gap-1 text-[12px] font-black text-ink">
          <IconLayers className="h-3 w-3 shrink-0 text-card" />
          {sb.title}
        </span>
        <span className="shrink-0 rounded-full border border-card/30 bg-panel px-1.5 py-0.5 text-[9px] font-black text-ink">
          {sb.env} · {subFree}/{sb.spots.length}
        </span>
      </button>

      {hasMineInSub && (
        <span className="rounded-md bg-sun px-2 py-0.5 text-center text-[9.5px] font-black text-black">
          TU MOTO ESTÁ EN ESTE SUB-BLOQUE
        </span>
      )}

      <div className={`grid gap-[7px] ${colsClass}`}>
        {sb.spots.map((p) => {
          const state = miniState(p, inspected, chosen, parkedSpotId)
          const isSug = state === 'free' && p.id === sug && !chosen
          const label =
            state === 'mine'
              ? 'TU MOTO'
              : state === 'selected'
                ? 'Elegido'
                : p.free
                  ? p.shade
                    ? 'Sombra'
                    : 'Sol'
                  : p.status === 'apartado'
                    ? 'Apartado'
                    : 'Ocupado'
          return (
            <button
              key={p.id}
              type="button"
              data-state={state}
              onClick={() => onInspectSpot(p.id)}
              aria-pressed={state === 'selected'}
              aria-label={`Puesto ${p.id}, ${label}`}
              className={`mini ${isSug ? 'pulse-ring' : ''}`}
            >
              <span className="font-display text-[15.5px] leading-none tracking-wide">{p.id}</span>
              <span className="mt-[3px] text-[9px] font-black opacity-95">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ZonasScreen() {
  const zones = useParkit((s) => s.zones)
  const curZone = useParkit((s) => s.curZone)
  const setZone = useParkit((s) => s.setZone)
  const pref = useParkit((s) => s.pref)
  const setPref = useParkit((s) => s.setPref)
  const inspected = useParkit((s) => s.inspected)
  const chosen = useParkit((s) => s.chosen)
  const inspectSpot = useParkit((s) => s.inspectSpot)
  const inspectSub = useParkit((s) => s.inspectSub)
  const reserve = useParkit((s) => s.reserve)
  const parked = useParkit((s) => s.parked)
  const setMapView = useParkit((s) => s.setMapView)
  const openSheet = useParkit((s) => s.openSheet)
  const go = useNav((s) => s.go)

  const zone = zones[curZone]
  const st = zoneStats(zone)
  const status = zoneStatus(zone)
  const sug = suggestedId(zone, pref)
  const parkedInfo = parked ? findSpotInfo(zones, parked.spotId) : null
  const activeId = inspected ?? chosen ?? (parked?.zone === curZone ? parked.spotId : sug)
  const layoutMeta = ZONE_LAYOUT_META[curZone]

  const target = useMemo(() => {
    const active = activeId ? findSpotInfo(zones, activeId) : null
    if (active && active.zone.id === curZone) return active
    const fallback = zone.spots.find((p) => p.free) ?? zone.spots[0]
    return findSpotInfo(zones, fallback.id)
  }, [zones, activeId, curZone, zone])

  const activeSub = target?.sub.id
  const isMine = Boolean(target && parked?.spotId === target.spot.id)

  const commonProps = {
    activeSub,
    parkedSpotId: parked?.spotId,
    inspected,
    chosen,
    sug,
    onInspectSub: inspectSub,
    onInspectSpot: inspectSpot,
  }

  return (
    <Screen label="Zonas de parqueo">
      <BrandHeader subtitle="Interior de la zona de parqueo" />

      <main className="relative z-10 px-4 pt-3">
        {/* Selector de las 4 zonas */}
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Seleccionar zona de parqueo">
          {ORDER.map((id) => {
            const zStats = zoneStats(zones[id])
            const hasMyMoto = parked?.zone === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === curZone}
                onClick={() => setZone(id)}
                className="zone-tab relative flex flex-col items-center justify-center leading-none"
              >
                <span className="text-[13px] font-black">Zona {id}</span>
                <span className="mt-0.5 text-[9.5px] font-extrabold opacity-80">{zStats.free} lib</span>
                {hasMyMoto && (
                  <span
                    title="Tu moto está en esta zona"
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-black bg-sun text-[9px] font-black text-black"
                  >
                    M
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Aviso puntual del sub-bloque donde está la moto */}
        {parked && parkedInfo && (
          parked.zone === curZone ? (
            <div className="mt-3 flex items-center gap-2.5 rounded-[18px] border-2 border-black bg-sun px-3.5 py-2.5 text-black shadow-sm">
              <IconMoto className="h-5 w-5 shrink-0" />
              <p className="text-[12.5px] font-black leading-snug">
                Tu moto está en <span className="underline">{parkedInfo.sub.title}</span> · puesto{' '}
                <span className="font-display text-[15px]">{parked.spotId}</span>
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setZone(parked.zone)}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-[18px] border-2 border-card bg-white/90 px-3.5 py-2 text-left text-[12px] font-extrabold text-ink"
            >
              <span className="flex items-center gap-2">
                <IconMoto className="h-4 w-4 shrink-0 text-card" />
                Tu moto está en Zona {parked.zone} ({parkedInfo.sub.title} · {parked.spotId})
              </span>
              <span className="shrink-0 rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-black text-black">
                Ver aquí
              </span>
            </button>
          )
        )}

        {/* Cabecera de la zona + dimensiones reales + filtro Sombra/Sol */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[22px] leading-none text-ink-deep">{zoneLabel(zone)}</h2>
              <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-black" style={parseStyle(status.st)}>
                {status.t}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-extrabold text-ink/75">
              {layoutMeta.shapeLabel} ({layoutMeta.dimsLabel})
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="seg seg-sm"
              aria-pressed={pref === 'sombra'}
              onClick={() => setPref('sombra')}
            >
              <IconTree className="h-[13px] w-[13px]" />
              Sombra
            </button>
            <button
              type="button"
              className="seg seg-sm"
              aria-pressed={pref === 'sol'}
              onClick={() => setPref('sol')}
            >
              <IconSun className="h-[13px] w-[13px]" />
              Sol
            </button>
          </div>
        </div>

        {/* Leyenda compacta */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11.5px] font-extrabold text-ink">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] border border-free-deep bg-free" />
              Libre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] border border-busy-deep bg-busy" />
              Ocupado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] border border-black bg-mine" />
              Tu moto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-[4px] border border-black bg-sun" />
              Elegido
            </span>
          </div>
          <span className="font-black text-card">{st.free}/{zone.spots.length} libres</span>
        </div>

        {/* PLANO INTERNO CON DISTRIBUCIÓN ÚNICA POR ZONA */}
        {curZone === 'A' && (
          <section className="blueprint mt-2.5" aria-label="Plano en L de Zona A Informática">
            <div className="aisle">
              <IconDown className="h-[12px] w-[12px]" />
              ENTRADA NORTE · PASILLO TRANSVERSAL (18 m)
              <IconDown className="h-[12px] w-[12px]" />
            </div>
            {/* A1 arriba a lo ancho (1x4) */}
            <SubBlockCard sb={zone.subs[0]} colsClass="grid-cols-4" {...commonProps} />
            {/* Abajo en L: A2 (2x2) a la izquierda, pasillo al centro y A3 (2x2) desplazado abajo a la derecha */}
            <div className="grid grid-cols-12 items-start gap-2">
              <div className="col-span-6">
                <SubBlockCard sb={zone.subs[1]} colsClass="grid-cols-2" {...commonProps} />
              </div>
              <div className="col-span-6 mt-4">
                <div className="aisle mb-2">RAMAL SUR</div>
                <SubBlockCard sb={zone.subs[2]} colsClass="grid-cols-2" {...commonProps} />
              </div>
            </div>
          </section>
        )}

        {curZone === 'B' && (
          <section className="blueprint mt-2.5" aria-label="Corredor longitudinal de Zona B Agronomía">
            <div className="aisle">
              ← CORREDOR LONGITUDINAL AGRONOMÍA (26 m × 11 m) →
            </div>
            {/* B1 desplazado a la izquierda (ancho 10/12) */}
            <div className="mr-8">
              <SubBlockCard sb={zone.subs[0]} colsClass="grid-cols-4" {...commonProps} />
            </div>
            <div className="aisle">PASILLO CENTRAL ARBOLADO</div>
            {/* B2 desplazado a la derecha (ancho 10/12) */}
            <div className="ml-8">
              <SubBlockCard sb={zone.subs[1]} colsClass="grid-cols-4" {...commonProps} />
            </div>
            {/* B3 isla compacta 2x2 abajo a la derecha */}
            <div className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-5">
                <div className="aisle">ACCESO SUR</div>
              </div>
              <div className="col-span-7">
                <SubBlockCard sb={zone.subs[2]} colsClass="grid-cols-2" {...commonProps} />
              </div>
            </div>
          </section>
        )}

        {curZone === 'C' && (
          <section className="blueprint mt-2.5" aria-label="Patio en U de Zona C Postgrados">
            {/* C3 cierra la U arriba a lo ancho */}
            <SubBlockCard sb={zone.subs[2]} colsClass="grid-cols-4" {...commonProps} />
            {/* Dos alas verticales largas (1 columna x 4 puestos cada una) con pasillo vertical en medio */}
            <div className="grid grid-cols-12 items-stretch gap-2">
              <div className="col-span-5">
                <SubBlockCard sb={zone.subs[0]} colsClass="grid-cols-1" {...commonProps} />
              </div>
              <div className="col-span-2 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#7FAEDB] bg-white/80 px-1 py-3 text-center text-[9.5px] font-black tracking-widest text-card [writing-mode:vertical-rl]">
                PASILLO CENTRAL EN U (22 m)
              </div>
              <div className="col-span-5">
                <SubBlockCard sb={zone.subs[1]} colsClass="grid-cols-1" {...commonProps} />
              </div>
            </div>
            <div className="aisle">
              ↑ ENTRADA SUR POSTGRADOS ↑
            </div>
          </section>
        )}

        {curZone === 'D' && (
          <section className="blueprint mt-2.5" aria-label="Islas escalonadas de Zona D Bioclimático">
            {/* Isla D1 arriba a la izquierda + entrada oriental a la derecha */}
            <div className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-7">
                <SubBlockCard sb={zone.subs[0]} colsClass="grid-cols-2" {...commonProps} />
              </div>
              <div className="col-span-5">
                <div className="aisle py-4">
                  ENTRADA ORIENTAL
                  <br />
                  (22 m × 18 m)
                </div>
              </div>
            </div>
            {/* Bahía central D2 ancha de 4 puestos */}
            <SubBlockCard sb={zone.subs[1]} colsClass="grid-cols-4" {...commonProps} />
            {/* Isla D3 abajo desplazada a la derecha */}
            <div className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-5">
                <div className="aisle py-3">PASILLO LATERAL</div>
              </div>
              <div className="col-span-7">
                <SubBlockCard sb={zone.subs[2]} colsClass="grid-cols-2" {...commonProps} />
              </div>
            </div>
          </section>
        )}

        {/* Panel del puesto seleccionado o de tu moto */}
        {target && (
          <section className="lg-card mt-3.5 rounded-[22px] p-4 text-white" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[28px] leading-none text-sun">{target.spot.id}</p>
                <p className="mt-1 text-[12.5px] font-extrabold leading-snug text-white/90">
                  {target.sub.title} · {target.spot.shade ? 'Cupo con sombra' : 'Cupo al sol'}
                </p>
              </div>
              <span
                className="whitespace-nowrap rounded-full px-3 py-1 text-[11.5px] font-black"
                style={
                  isMine
                    ? { background: '#FFC200', color: '#141414' }
                    : target.spot.free
                      ? { background: '#22A45D', color: '#fff' }
                      : { background: '#E5484D', color: '#fff' }
                }
              >
                {isMine ? 'Tu moto aquí' : target.spot.free ? 'Libre' : target.spot.status === 'apartado' ? 'Apartado' : 'Ocupado'}
              </span>
            </div>

            <button
              type="button"
              disabled={isMine || !target.spot.free}
              onClick={() => reserve(target.spot.id)}
              className="lg-btn-sun mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-full text-[15.5px] font-black disabled:opacity-60 disabled:shadow-none"
            >
              <IconLock className="h-4 w-4" />
              {isMine
                ? `Tu moto está en ${target.spot.id}`
                : target.spot.free
                  ? `Apartar ${target.spot.id} · 10 min`
                  : `Puesto ${target.spot.id} no disponible`}
            </button>

            <button
              type="button"
              onClick={() => {
                setMapView(isMine ? 'moto' : 'campus')
                go('mapas', 'tab')
              }}
              className="mt-2.5 flex h-[44px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-white/65 bg-white/18 text-[13.5px] font-extrabold text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5)] backdrop-blur-md"
            >
              <IconMap className="h-[15px] w-[15px]" />
              {isMine ? 'Cómo llegar en el mapa del campus' : `Ubicar Zona ${zone.id} en el mapa del campus`}
            </button>
          </section>
        )}

        <button
          type="button"
          onClick={openSheet}
          className="lg-surface mt-3 flex h-[50px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-extrabold text-ink"
        >
          <IconFlag className="h-4 w-4" />
          Reportar estado de una zona
        </button>
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
