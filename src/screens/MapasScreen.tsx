import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { GEO, ORDER } from '../domain/data'
import { findSpotInfo, miniPos, spotIndex, zoneLabel, zoneStats } from '../domain/selectors'
import { BrandHeader, Screen } from '../components/Screen'
import { IconDown, IconGrid, IconMap, IconMoto, IconRuler, IconWalk } from '../components/icons'

export function MapasScreen() {
  const zones = useParkit((s) => s.zones)
  const parked = useParkit((s) => s.parked)
  const curZone = useParkit((s) => s.curZone)
  const mapView = useParkit((s) => s.mapView)
  const setMapView = useParkit((s) => s.setMapView)
  const setZone = useParkit((s) => s.setZone)
  const setGuideSource = useParkit((s) => s.setGuideSource)
  const go = useNav((s) => s.go)

  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const zone = info?.zone ?? zones[curZone]
  const idx = parked && info ? spotIndex(zone, parked.spotId) : 0
  const p = miniPos(zone.id, Math.max(0, idx))
  const g = GEO[zone.id]
  const route = `M165 175 L165 ${g.cy} L${p.x} ${g.cy} L${p.x} ${p.z}`

  return (
    <Screen label="Mapas">
      <BrandHeader subtitle="Mapas" />
      <main className="relative z-10 px-4 pt-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="seg" aria-pressed={mapView === 'moto'} onClick={() => setMapView('moto')}>
            <IconMoto className="h-[17px] w-[17px]" />
            Mi moto
          </button>
          <button type="button" className="seg" aria-pressed={mapView === 'campus'} onClick={() => setMapView('campus')}>
            <IconMap className="h-[17px] w-[17px]" />
            Campus
          </button>
        </div>

        {mapView === 'moto' ? (
          parked && info ? (
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-bold text-ink/75">Ruta a pie desde tu ubicación hasta tu moto</p>
              <section className="lg-panel overflow-hidden rounded-[28px]" aria-label="Ruta hasta tu moto">
                <svg viewBox="0 0 350 350" className="block h-auto w-full" role="img" aria-label="Ruta desde tu ubicación hasta tu moto">
                  <rect x="0" y="160" width="350" height="30" fill="#fff" />
                  <rect x="150" y="0" width="30" height="350" fill="#fff" />
                  <path d={route} fill="none" stroke="#141414" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                  <path d={route} fill="none" stroke="#FFC200" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="9 7" className="route-dash" />
                  <circle cx="165" cy="175" r="13" fill="#3B76B1" stroke="#fff" strokeWidth={4} />
                  <circle cx={p.x} cy={p.z} r="9" fill="#FFC200" stroke="#141414" strokeWidth={3} />
                </svg>
              </section>
              <article className="lg-card mt-4 flex items-center gap-4 rounded-[22px] p-4 text-white">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[16px] bg-sun text-black">
                  <IconMoto className="h-[22px] w-[22px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-extrabold leading-tight">
                    {parked.spotId} · {zoneLabel(zone)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-black">
                    <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1">
                      <IconRuler className="mr-1 inline h-[13px] w-[13px]" />~{zone.m} metros
                    </span>
                    <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1">
                      <IconWalk className="mr-1 inline h-[13px] w-[13px]" />
                      {Math.max(1, Math.round(zone.m / 60))} min caminando
                    </span>
                  </div>
                </div>
              </article>
              <button
                type="button"
                onClick={() => {
                  setGuideSource('parked')
                  go('guia')
                }}
                className="mt-3 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full bg-button text-[16px] font-extrabold text-white shadow-[0_5px_0_#1E4C7C,inset_0_1.5px_1px_rgba(255,255,255,.35)]"
              >
                <IconWalk className="h-[17px] w-[17px]" />
                Abrir guía 3D a pie
              </button>
              <p className="mb-2 mt-5 text-[12px] font-black tracking-[0.14em] text-card">TU CELDA EN LA ZONA</p>
              <section className="lg-panel rounded-[22px] p-3" aria-label="Zoom de la zona con tu celda">
                <div className="mb-2 flex items-center justify-center gap-2 rounded-full bg-white py-1 text-[11px] font-black tracking-[0.12em] text-card">
                  <IconDown className="h-[11px] w-[11px]" />
                  ENTRADA
                  <IconDown className="h-[11px] w-[11px]" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {zone.spots.map((sp) => {
                    const on = parked.spotId === sp.id
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => {
                          setZone(zone.id)
                          go('cupo')
                        }}
                        aria-label={`Cupo ${sp.id}`}
                        className={`h-[40px] rounded-[10px] border-[2.5px] font-display text-[15px] ${
                          on ? 'border-black bg-sun text-black' : 'border-[#A9CAE8] bg-white text-ink'
                        }`}
                      >
                        {sp.n}
                      </button>
                    )
                  })}
                </div>
              </section>
              <p className="mt-2 text-center text-[13px] font-extrabold text-[#8A6A00]">
                Tu celda {parked.spotId} está marcada en amarillo.
              </p>
            </div>
          ) : (
            <section className="lg-card mt-4 rounded-[28px] px-6 py-7 text-white">
              <p className="font-display text-[28px] leading-[1.05]">Aún no tienes una moto parqueada</p>
              <p className="mt-2 text-[15px] font-bold leading-snug text-white/90">
                Elige un cupo y aquí verás la ruta hasta tu moto.
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
          )
        ) : (
          <div className="mt-4">
            <section className="lg-panel overflow-hidden rounded-[28px]" aria-label="Mapa del campus">
              <svg viewBox="0 0 350 392" className="block h-auto w-full" role="group" aria-label="Zonas de parqueo del campus">
                <rect x="0" y="160" width="350" height="30" fill="#fff" />
                <rect x="150" y="0" width="30" height="350" fill="#fff" />
                {ORDER.map((id) => {
                  const z = zones[id]
                  const gz = GEO[id]
                  const st = zoneStats(z)
                  const rec = parked?.zone === id
                  return (
                    <g
                      key={id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${zoneLabel(z)}, ${st.free} libres`}
                      className="cursor-pointer"
                      onClick={() => {
                        setZone(id)
                        go('cupo')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setZone(id)
                          go('cupo')
                        }
                      }}
                    >
                      <rect
                        x={gz.x}
                        y={gz.y}
                        width={gz.w}
                        height={gz.h}
                        rx={18}
                        fill={z.tf}
                        fillOpacity={0.22}
                        stroke={rec ? '#FFC200' : z.tf}
                        strokeWidth={rec ? 7 : 4}
                      />
                      <text x={gz.cx} y={gz.cy - 6} textAnchor="middle" fontSize={26} fontWeight={900} fill="#22528A" fontFamily="'Lilita One', cursive">
                        {id}
                      </text>
                      <text x={gz.cx} y={gz.cy + 14} textAnchor="middle" fontSize={12} fontWeight={900} fill="#22528A">
                        {st.free} libres
                      </text>
                    </g>
                  )
                })}
                <circle cx="165" cy="175" r="16" fill="#3B76B1" stroke="#fff" strokeWidth={5} />
                <rect x="110" y="165" width="32" height="20" rx="10" fill="#fff" />
                <text x="126" y="179" textAnchor="middle" fontSize={12} fontWeight={900} fill="#22528A">
                  Tú
                </text>
              </svg>
            </section>
            <p className="mt-3 text-center text-[12.5px] font-bold text-ink/80">
              Vista del campus. Toca una zona para ver sus cupos.
            </p>
          </div>
        )}
      </main>
    </Screen>
  )
}
