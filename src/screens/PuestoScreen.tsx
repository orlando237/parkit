import { useEffect, useRef, useState } from 'react'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { findSpotInfo, formatDuration, parkedMinutes, zoneLabel } from '../domain/selectors'
import { useVigilanciaLive } from '../lib/vigilanciaStream'
import { BrandHeader, Screen } from '../components/Screen'
import { IconAlert, IconClock, IconGrid, IconMoto, IconPin } from '../components/icons'

export function PuestoScreen() {
  const parked = useParkit((s) => s.parked)
  const zones = useParkit((s) => s.zones)
  const release = useParkit((s) => s.release)
  const openAlertSheet = useParkit((s) => s.openAlertSheet)
  const activeAlert = useParkit((s) => s.activeAlert)
  const lastPatrolAt = useParkit((s) => s.lastPatrolAt)
  const cancelGuardAlert = useParkit((s) => s.cancelGuardAlert)
  const dismissGuardAlert = useParkit((s) => s.dismissGuardAlert)
  const setVigilanteMode = useParkit((s) => s.setVigilanteMode)
  const setMapView = useParkit((s) => s.setMapView)
  const profile = useParkit((s) => s.profile)
  const go = useNav((s) => s.go)

  const remoteStream = useVigilanciaLive((s) => s.remoteStream)
  const fallbackFrame = useVigilanciaLive((s) => s.fallbackFrame)
  const emitAlertUpdate = useVigilanciaLive((s) => s.emitAlertUpdate)
  const requestStream = useVigilanciaLive((s) => s.requestStream)
  const clearLiveMedia = useVigilanciaLive((s) => s.clearLiveMedia)

  const [tick, setTick] = useState(0)
  const [expandedVideo, setExpandedVideo] = useState(false)
  const liveVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (liveVideoRef.current && remoteStream) {
      liveVideoRef.current.srcObject = remoteStream
      void liveVideoRef.current.play().catch(() => {})
    }
  }, [remoteStream, expandedVideo])

  useEffect(() => {
    if (activeAlert?.status === 'en_ronda' && !remoteStream && !fallbackFrame) {
      requestStream(activeAlert.id)
    }
  }, [activeAlert?.id, activeAlert?.status, remoteStream, fallbackFrame, requestStream])

  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const currentAlert = activeAlert && parked && activeAlert.spotId === parked.spotId ? activeAlert : null
  const nowMs = Date.now() + tick * 0
  const since = parked ? formatDuration(parkedMinutes(parked, nowMs)) : ''
  const zone = info?.zone

  const lastPatrolLabel = (() => {
    if (currentAlert?.status === 'en_ronda') return 'En curso'
    if (!lastPatrolAt) return 'Hace 10 min'
    const mins = Math.max(0, Math.round((nowMs - lastPatrolAt) / 60000))
    if (mins < 1) return 'Hace instantes'
    return `Hace ${mins} min`
  })()

  const handleCancelAlert = () => {
    const cancelled = cancelGuardAlert()
    if (cancelled) {
      emitAlertUpdate(cancelled)
      clearLiveMedia()
    }
  }

  const hasLiveFeed = Boolean(remoteStream || fallbackFrame)

  return (
    <Screen label="Mi puesto">
      <BrandHeader subtitle="Mi puesto" />
      <main className="relative z-10 px-4 pt-3">
        {parked && info && zone ? (
          <>
            <section className="lg-card rounded-[28px] px-6 pb-5 pt-6 text-white">
              <div className="flex items-start justify-between">
                <p className="pt-1 text-[14px] font-black tracking-[0.16em] text-white/90">TU CUPO</p>
                <span
                  className={`rounded-full px-3.5 py-1 text-[13px] font-black shadow-[inset_0_1px_1px_rgba(255,255,255,.75)] ${
                    currentAlert?.status === 'en_ronda'
                      ? 'bg-[#22A45D] text-white'
                      : 'bg-sun text-black'
                  }`}
                >
                  {currentAlert?.status === 'en_ronda' ? 'Ronda en vivo' : 'Vigilada'}
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
                {profile ? `${profile.brand} ${profile.model}`.trim() : 'Moto'} · {profile?.plate ?? '—'}
              </p>
            </section>

            {/* Panel de estado y cámara en vivo cuando hay una alerta activa */}
            {currentAlert && (
              <section
                aria-live="polite"
                className="mt-4 overflow-hidden rounded-[24px] border-2 border-white/90 bg-[#0F172A] p-4 text-white shadow-[0_14px_30px_rgba(15,23,42,0.26)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          currentAlert.status === 'en_ronda'
                            ? 'animate-ping bg-[#EF4444]'
                            : currentAlert.status === 'atendida'
                              ? 'bg-[#22A45D]'
                              : 'animate-pulse bg-sun'
                        }`}
                      />
                      <span className="text-[11px] font-black tracking-[0.14em] text-sun">
                        {currentAlert.status === 'pendiente'
                          ? 'REVISIÓN SOLICITADA'
                          : currentAlert.status === 'en_ronda'
                            ? 'GUARDIA EN RONDA · EN VIVO'
                            : 'RONDA COMPLETADA'}
                      </span>
                    </div>
                    <p className="mt-1 text-[14.5px] font-black leading-snug">
                      {currentAlert.status === 'pendiente' &&
                        `Alerta registrada para el cupo ${currentAlert.spotId}`}
                      {currentAlert.status === 'en_ronda' &&
                        `El vigilante está revisando tu cupo ${currentAlert.spotId}`}
                      {currentAlert.status === 'atendida' &&
                        `Cupo ${currentAlert.spotId} verificado por vigilancia`}
                    </p>
                    <p className="mt-0.5 text-[12px] font-bold text-white/75">{currentAlert.reasonLabel}</p>
                  </div>

                  {currentAlert.status === 'en_ronda' && hasLiveFeed && (
                    <button
                      type="button"
                      onClick={() => setExpandedVideo((v) => !v)}
                      className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black text-white"
                    >
                      {expandedVideo ? 'Compactar' : 'Ampliar'}
                    </button>
                  )}
                </div>

                {/* Visor de cámara de la ronda del guardia */}
                {currentAlert.status === 'en_ronda' && (
                  <>
                    <div
                      className={`relative mt-3 w-full overflow-hidden rounded-[18px] border border-white/20 bg-black ${
                        expandedVideo ? 'aspect-[3/4]' : 'aspect-video'
                      }`}
                    >
                      {remoteStream ? (
                        <video
                          ref={liveVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover"
                        />
                      ) : fallbackFrame ? (
                        <img
                          src={fallbackFrame}
                          alt="Cámara en vivo del vigilante en ronda"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                          <span className="h-7 w-7 animate-spin rounded-full border-3 border-sun border-t-transparent" />
                          <p className="text-[12.5px] font-extrabold text-white/85">
                            Conectando con la cámara del vigilante…
                          </p>
                        </div>
                      )}

                      {/* HUD estilo cámara operativa de seguridad */}
                      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626]/90 px-2.5 py-0.5 text-[10.5px] font-black tracking-wider text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          EN VIVO · RONDA
                        </span>
                        <span className="rounded-full bg-black/70 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-sun">
                          {currentAlert.spotId} · {currentAlert.plate}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => requestStream(currentAlert.id)}
                        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold text-white/90"
                      >
                        Reconectar video
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAlert}
                        className="rounded-full bg-[#EF4444]/25 px-3 py-1 text-[11px] font-black text-[#FCA5A5]"
                      >
                        Cancelar alerta
                      </button>
                    </div>
                  </>
                )}

                {currentAlert.status === 'pendiente' && (
                  <div className="mt-3 rounded-[14px] bg-white/10 px-3 py-2.5 text-[11.5px] font-bold text-white/85">
                    <p>
                      Esperando a que el guarda inicie la ronda desde su celular. Para probar la ronda ahora mismo,
                      abre <strong className="text-sun">Modo Vigilante</strong> en tu teléfono.
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVigilanteMode(true)}
                        className="rounded-full bg-sun px-3 py-1 text-[11px] font-black text-black"
                      >
                        Probar Modo Vigilante aquí
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelAlert}
                        className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold text-white/90"
                      >
                        Cancelar alerta
                      </button>
                    </div>
                  </div>
                )}

                {currentAlert.status === 'atendida' && (
                  <div className="mt-3 rounded-[14px] bg-[#22A45D]/20 border border-[#22A45D]/50 px-3 py-2.5">
                    <p className="text-[12.5px] font-extrabold text-white">
                      Reporte del vigilante: {currentAlert.resolutionNote ?? 'Cupo verificado en ronda sin novedad.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearLiveMedia()
                        dismissGuardAlert()
                      }}
                      className="mt-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white"
                    >
                      Entendido · Cerrar aviso
                    </button>
                  </div>
                )}
              </section>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              <article className="lg-btn-sun min-h-[118px] rounded-[22px] px-3.5 pb-4 pt-3.5">
                <p className="text-[13px] font-extrabold">Parqueado hace</p>
                <p className="mt-1 whitespace-nowrap font-display text-[22px] leading-[1.1]">{since}</p>
              </article>
              <article className="lg-btn-sun min-h-[118px] rounded-[22px] px-3.5 pb-4 pt-3.5">
                <p className="text-[13px] font-extrabold">Última ronda</p>
                <p className="mt-1 whitespace-nowrap font-display text-[22px] leading-[1.1]">{lastPatrolLabel}</p>
              </article>
            </div>

            <section className="mt-4 space-y-3.5">
              <button
                type="button"
                onClick={() => {
                  setMapView('moto')
                  go('mapas')
                }}
                className="lg-surface flex h-[60px] w-full items-center justify-center gap-3 rounded-full text-[17px] font-extrabold text-ink"
              >
                <IconPin className="h-[19px] w-[19px]" />
                Cómo llegar a mi moto
              </button>
              <button
                type="button"
                onClick={release}
                className="lg-surface flex h-[60px] w-full items-center justify-center gap-3 rounded-full text-[17px] font-extrabold text-ink"
              >
                Liberar mi cupo
              </button>
              <button
                type="button"
                onClick={currentAlert?.status === 'en_ronda' ? handleCancelAlert : openAlertSheet}
                className="lg-btn-dark flex h-[60px] w-full items-center justify-center gap-3 rounded-full text-[18px] font-extrabold"
              >
                <IconAlert className="h-[19px] w-[19px]" />
                {currentAlert?.status === 'pendiente'
                  ? 'Actualizar motivo de alerta'
                  : currentAlert?.status === 'en_ronda'
                    ? 'Cancelar alerta en ronda'
                    : 'Alerta a vigilancia'}
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
              className="lg-btn-sun mt-5 flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[17px] font-black"
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
