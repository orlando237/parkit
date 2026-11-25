import { useCallback, useEffect, useRef, useState } from 'react'
import type { GuardAlert } from '../domain/types'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  RTC_CONFIG,
  connectVigilanciaBus,
  playAlertBeep,
  type VigilanciaBus,
} from '../lib/vigilanciaStream'
import { useParkit } from '../store/useParkit'

const QUICK_RESOLUTIONS = [
  'Cupo verificado en ronda, moto sin novedad.',
  'Pasillo despejado, ya puedes retirar tu moto.',
  'Novedad atendida presencialmente en la zona.',
]

export function VigilanteScreen() {
  const setVigilanteMode = useParkit((s) => s.setVigilanteMode)
  const syncGuardAlert = useParkit((s) => s.syncGuardAlert)

  const [connected, setConnected] = useState(false)
  const [currentAlert, setCurrentAlert] = useState<GuardAlert | null>(() => {
    const local = useParkit.getState().activeAlert
    return local && (local.status === 'pendiente' || local.status === 'en_ronda') ? local : null
  })
  const [history, setHistory] = useState<GuardAlert[]>([])
  const [streaming, setStreaming] = useState(false)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [simulatedCam, setSimulatedCam] = useState(false)
  const [webrtcState, setWebrtcState] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [resolutionNote, setResolutionNote] = useState(QUICK_RESOLUTIONS[0])

  const busRef = useRef<VigilanciaBus | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const simAnimRef = useRef<number | null>(null)
  const capturedImgRef = useRef<HTMLImageElement | null>(null)
  const currentAlertRef = useRef<GuardAlert | null>(currentAlert)

  useEffect(() => {
    currentAlertRef.current = currentAlert
  }, [currentAlert])

  useEffect(() => {
    if (streaming && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
      void videoRef.current.play().catch(() => {})
    }
  }, [streaming])

  const stopPeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null
        pcRef.current.onconnectionstatechange = null
        pcRef.current.close()
      } catch {
        // ignore
      }
      pcRef.current = null
    }
    pendingIceRef.current = []
    setWebrtcState('idle')
  }, [])

  const stopMedia = useCallback(() => {
    stopPeerConnection()
    if (simAnimRef.current) {
      window.cancelAnimationFrame(simAnimRef.current)
      simAnimRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreaming(false)
    setSimulatedCam(false)
  }, [stopPeerConnection])

  const startWebRtcOffer = useCallback(
    async (alertId: string, mediaStream: MediaStream) => {
      const bus = busRef.current
      if (!bus || typeof RTCPeerConnection === 'undefined') return
      try {
        stopPeerConnection()
        setWebrtcState('connecting')
        const pc = new RTCPeerConnection(RTC_CONFIG)
        pcRef.current = pc

        mediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStream)
        })

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            bus.send({
              type: 'webrtc-ice',
              alertId,
              candidate: ev.candidate.toJSON(),
              senderId: bus.clientId,
            })
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setWebrtcState('connected')
          } else if (
            pc.connectionState === 'failed' ||
            pc.connectionState === 'disconnected' ||
            pc.connectionState === 'closed'
          ) {
            setWebrtcState('idle')
          }
        }

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        bus.send({
          type: 'webrtc-offer',
          alertId,
          sdp: offer,
          senderId: bus.clientId,
        })
      } catch {
        setWebrtcState('idle')
      }
    },
    [stopPeerConnection],
  )

  useEffect(() => {
    const bus = connectVigilanciaBus(
      'guard',
      async (msg) => {
        if (msg.type === 'alert-new' || msg.type === 'student-hello') {
          const incoming = msg.alert
          setCurrentAlert((prev) => {
            if (!prev || prev.id !== incoming.id) {
              playAlertBeep()
              navigator.vibrate?.([220, 100, 220])
            }
            return incoming
          })
          return
        }

        if (msg.type === 'alert-update') {
          if (msg.alert.status === 'cancelada') {
            stopMedia()
            setCurrentAlert((prev) => (prev?.id === msg.alert.id ? null : prev))
          } else {
            setCurrentAlert(msg.alert)
          }
          return
        }

        if (msg.type === 'webrtc-ready') {
          const cur = currentAlertRef.current
          if (cur && cur.id === msg.alertId && streamRef.current) {
            await startWebRtcOffer(cur.id, streamRef.current)
          }
          return
        }

        if (msg.type === 'webrtc-answer') {
          const cur = currentAlertRef.current
          if (!cur || cur.id !== msg.alertId || !pcRef.current) return
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            const queued = pendingIceRef.current.splice(0, pendingIceRef.current.length)
            for (const cand of queued) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }
          } catch {
            // ignore
          }
          return
        }

        if (msg.type === 'webrtc-ice') {
          const cur = currentAlertRef.current
          if (!cur || cur.id !== msg.alertId || !pcRef.current) return
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
          } else {
            pendingIceRef.current.push(msg.candidate)
          }
        }
      },
      (isConn) => {
        setConnected(isConn)
        if (isConn && busRef.current) {
          busRef.current.send({ type: 'guard-hello', senderId: busRef.current.clientId })
        }
      },
    )

    busRef.current = bus
    const helloTimer = window.setTimeout(() => {
      bus.send({ type: 'guard-hello', senderId: bus.clientId })
    }, 400)

    return () => {
      window.clearTimeout(helloTimer)
      const cur = currentAlertRef.current
      if (cur && cur.status === 'en_ronda') {
        const reverted: GuardAlert = { ...cur, status: 'pendiente' }
        bus.send({ type: 'stream-stop', alertId: cur.id, senderId: bus.clientId })
        bus.send({ type: 'alert-update', alert: reverted, senderId: bus.clientId })
        useParkit.getState().syncGuardAlert(reverted)
      }
      stopMedia()
      bus.close()
      busRef.current = null
    }
  }, [startWebRtcOffer, stopMedia])

  // Envío automático de frames ligeros JPEG por Realtime como respaldo instantáneo
  useEffect(() => {
    if (!streaming || !currentAlert) return
    const alertId = currentAlert.id
    const intervalMs = webrtcState === 'connected' ? 1600 : 280

    const timer = window.setInterval(() => {
      const bus = busRef.current
      const video = videoRef.current
      if (!bus || !video || video.readyState < 2) return

      if (!frameCanvasRef.current) {
        frameCanvasRef.current = document.createElement('canvas')
        frameCanvasRef.current.width = 320
        frameCanvasRef.current.height = 240
      }
      const ctx = frameCanvasRef.current.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, 320, 240)
      const dataUrl = frameCanvasRef.current.toDataURL('image/jpeg', 0.48)
      bus.send({
        type: 'video-frame',
        alertId,
        dataUrl,
        ts: Date.now(),
        senderId: bus.clientId,
      })
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [streaming, currentAlert, webrtcState])

  const activatePatrolWithStream = async (alert: GuardAlert, mediaStream: MediaStream, isSim = false) => {
    streamRef.current = mediaStream
    setSimulatedCam(isSim)
    setCameraError(null)
    setStreaming(true)

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream
      await videoRef.current.play().catch(() => {})
    }

    const updated: GuardAlert = {
      ...alert,
      status: 'en_ronda',
      attendedAt: alert.attendedAt ?? Date.now(),
    }
    setCurrentAlert(updated)
    syncGuardAlert(updated)

    if (busRef.current) {
      busRef.current.send({
        type: 'alert-update',
        alert: updated,
        senderId: busRef.current.clientId,
      })
    }

    await startWebRtcOffer(updated.id, mediaStream)
  }

  const startRealCameraPatrol = async (alert: GuardAlert, nextFacing: 'environment' | 'user' = facing) => {
    setCameraError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'El navegador móvil bloqueó la cámara en vivo por entrar con HTTP sin cifrar. Usa el APK de Android, abre por HTTPS o pulsa "Simular cámara de ronda" / "Capturar foto de ronda" abajo.',
      )
      return
    }
    try {
      stopMedia()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      await activatePatrolWithStream(alert, stream, false)
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `No se pudo abrir la cámara (${err.message}). Puedes usar la cámara nativa por foto o simular la ronda abajo.`
          : 'No se pudo acceder a la cámara.',
      )
    }
  }

  const startSimulatedPatrol = async (alert: GuardAlert) => {
    stopMedia()
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let t = 0
    const draw = () => {
      t += 0.035
      // Fondo estilo recorrido nocturno/diurno de ronda por el parqueadero
      const grad = ctx.createLinearGradient(0, 0, 0, 480)
      grad.addColorStop(0, '#1E3A5F')
      grad.addColorStop(0.45, '#2C5282')
      grad.addColorStop(0.46, '#334155')
      grad.addColorStop(1, '#1E293B')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 640, 480)

      if (capturedImgRef.current) {
        ctx.drawImage(capturedImgRef.current, 0, 0, 640, 480)
      } else {
        // Líneas de perspectiva de cajones de motos simulando caminata
        const swayX = Math.sin(t * 2.1) * 18
        const bobY = Math.abs(Math.cos(t * 4.2)) * 8
        ctx.save()
        ctx.translate(swayX, bobY)

        ctx.strokeStyle = '#FFC200'
        ctx.lineWidth = 5
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath()
          ctx.moveTo(320 + i * 70, 230)
          ctx.lineTo(320 + i * 210, 470)
          ctx.stroke()
        }

        // Silueta del cajón reportado
        ctx.fillStyle = 'rgba(34, 164, 93, 0.32)'
        ctx.fillRect(220, 265, 200, 150)
        ctx.strokeStyle = '#22A45D'
        ctx.lineWidth = 4
        ctx.strokeRect(220, 265, 200, 150)

        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 28px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`CUPO ${alert.spotId}`, 320, 340)
        ctx.font = 'bold 16px system-ui, sans-serif'
        ctx.fillStyle = '#FFC200'
        ctx.fillText(`PLACA ${alert.plate} · VERIFICANDO`, 320, 370)
        ctx.restore()
      }

      // Marca de tiempo de cámara de vigilancia
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
      ctx.fillRect(16, 428, 340, 36)
      ctx.fillStyle = '#FFC200'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`CAM-RONDA · ${new Date().toLocaleTimeString()}`, 28, 451)

      simAnimRef.current = window.requestAnimationFrame(draw)
    }
    draw()

    const stream = canvas.captureStream(15)
    await activatePatrolWithStream(alert, stream, true)
  }

  const handleNativePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>, alert: GuardAlert) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      capturedImgRef.current = img
      void startSimulatedPatrol(alert)
    }
    img.src = url
  }

  const flipCamera = async () => {
    if (!currentAlert || simulatedCam) return
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    await startRealCameraPatrol(currentAlert, next)
  }

  const handleResolvePatrol = () => {
    if (!currentAlert) return
    const resolved: GuardAlert = {
      ...currentAlert,
      status: 'atendida',
      resolvedAt: Date.now(),
      resolutionNote: resolutionNote.trim() || QUICK_RESOLUTIONS[0],
    }

    if (busRef.current) {
      busRef.current.send({
        type: 'stream-stop',
        alertId: resolved.id,
        senderId: busRef.current.clientId,
      })
      busRef.current.send({
        type: 'alert-update',
        alert: resolved,
        senderId: busRef.current.clientId,
      })
    }

    syncGuardAlert(resolved)
    stopMedia()
    capturedImgRef.current = null
    setHistory((prev) => [resolved, ...prev].slice(0, 10))
    setCurrentAlert(null)
  }

  const handleExit = () => {
    if (currentAlert && currentAlert.status === 'en_ronda') {
      const reverted: GuardAlert = { ...currentAlert, status: 'pendiente' }
      if (busRef.current) {
        busRef.current.send({
          type: 'stream-stop',
          alertId: currentAlert.id,
          senderId: busRef.current.clientId,
        })
        busRef.current.send({
          type: 'alert-update',
          alert: reverted,
          senderId: busRef.current.clientId,
        })
      }
      syncGuardAlert(reverted)
      setCurrentAlert(reverted)
    }
    stopMedia()
    setVigilanteMode(false)
    if (window.location.search.includes('modo=vigilante')) {
      window.location.href = window.location.pathname
    }
  }

  return (
    <div className="min-h-full bg-[#0B1324] px-4 pb-10 pt-[calc(20px+env(safe-area-inset-top,0px))] text-white">
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-[#22A45D]' : 'animate-pulse bg-sun'}`}
            />
            <p className="text-[11px] font-black tracking-[0.16em] text-sun">PARKIT · SEGURIDAD CAMPUS</p>
          </div>
          <h1 className="mt-0.5 font-display text-[26px] leading-tight">Modo Vigilante (Ronda)</h1>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold text-white"
        >
          Salir
        </button>
      </header>

      <main className="mx-auto mt-4 max-w-xl space-y-4">
        {/* Estado de red */}
        <div className="flex items-center justify-between rounded-[16px] border border-white/15 bg-white/5 px-3.5 py-2.5 text-[12px] font-bold text-white/80">
          <span>
            {isSupabaseConfigured
              ? 'Canal Realtime activo (PC ↔ Celular)'
              : 'Canal local activo en este navegador'}
          </span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-black text-sun">
            {streaming ? (webrtcState === 'connected' ? 'WebRTC HD' : 'Stream Live') : 'En espera'}
          </span>
        </div>

        {/* Tarjeta principal de alerta entrante o ronda activa */}
        {currentAlert ? (
          <section className="overflow-hidden rounded-[24px] border-2 border-sun/80 bg-[#13203B] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                    streaming ? 'bg-[#DC2626] text-white' : 'bg-sun text-black'
                  }`}
                >
                  {streaming ? '● TRANSMITIENDO RONDA EN VIVO' : 'NUEVA ALERTA DE ESTUDIANTE'}
                </span>
                <p className="mt-2 font-display text-[48px] leading-none text-sun">{currentAlert.spotId}</p>
                <p className="mt-1 text-[15px] font-extrabold text-white">{currentAlert.zoneName}</p>
                <p className="text-[12.5px] font-bold text-white/75">{currentAlert.subTitle}</p>
              </div>
              <div className="rounded-[16px] bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] font-black tracking-wider text-white/70">PLACA</p>
                <p className="font-display text-[20px] leading-tight text-white">{currentAlert.plate}</p>
                <p className="mt-0.5 max-w-[120px] truncate text-[11px] font-bold text-white/75">
                  {currentAlert.studentName}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[16px] bg-black/30 p-3">
              <p className="text-[11px] font-black tracking-wider text-sun">MOTIVO REPORTADO</p>
              <p className="mt-0.5 text-[14px] font-extrabold text-white">{currentAlert.reasonLabel}</p>
              {currentAlert.note && (
                <p className="mt-1 text-[12.5px] font-bold text-white/80">“{currentAlert.note}”</p>
              )}
            </div>

            {/* Visor local de la cámara del guardia */}
            <div
              className={`relative mt-3.5 aspect-[4/3] w-full overflow-hidden rounded-[18px] border-2 border-white/20 bg-black ${
                streaming ? 'block' : 'hidden'
              }`}
            >
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className=" absolute inset-x-3 top-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626]/90 px-2.5 py-1 text-[11px] font-black">
                  <span className="h-2 w-2 animate-ping rounded-full bg-white" />
                  EN VIVO AL ESTUDIANTE
                </span>
                {!simulatedCam && (
                  <button
                    type="button"
                    onClick={flipCamera}
                    className="rounded-full bg-black/75 px-3 py-1 text-[11.5px] font-black text-sun border border-white/20"
                  >
                    Girar cámara
                  </button>
                )}
              </div>
            </div>

            {cameraError && (
              <div className="mt-3 rounded-[16px] border border-[#F87171]/50 bg-[#7F1D1D]/50 p-3 text-[12px] font-bold text-white">
                <p>{cameraError}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-full bg-sun px-3.5 py-1.5 text-[12px] font-black text-black">
                    Abrir cámara nativa (Foto)
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => void handleNativePhotoCapture(e, currentAlert)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void startSimulatedPatrol(currentAlert)}
                    className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-black text-white"
                  >
                    Simular cámara de ronda
                  </button>
                </div>
              </div>
            )}

            {!streaming ? (
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => void startRealCameraPatrol(currentAlert)}
                  className="flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full bg-sun text-[16px] font-black text-black shadow-[0_6px_0_#D9A400]"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                  Atender e iniciar ronda con cámara
                </button>
                <button
                  type="button"
                  onClick={() => void startSimulatedPatrol(currentAlert)}
                  className="h-[42px] w-full rounded-full bg-white/10 text-[12.5px] font-extrabold text-white/85"
                >
                  Iniciar con cámara simulada (si pruebas en PC sin webcam)
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 border-t border-white/15 pt-3.5">
                <p className="text-[11.5px] font-black tracking-wider text-sun">REPORTE DE CIERRE DE RONDA</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_RESOLUTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setResolutionNote(item)}
                      className={`rounded-full px-3 py-1.5 text-left text-[11.5px] font-bold transition ${
                        resolutionNote === item
                          ? 'bg-sun text-black font-black'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleResolvePatrol}
                  className="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#22A45D] text-[15.5px] font-black text-white shadow-[0_5px_0_#15803D]"
                >
                  Marcar cupo {currentAlert.spotId} revisado y finalizar
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-[24px] border border-white/15 bg-white/5 px-5 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sun/15 text-sun">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="mt-3 font-display text-[24px] text-white">Sin alertas pendientes</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] font-bold leading-relaxed text-white/70">
              Mantén esta pantalla abierta en tu celular. En cuanto un estudiante pulse{' '}
              <strong className="text-sun">Alerta a vigilancia</strong> en su PC o teléfono, recibirás el aviso aquí
              para iniciar la ronda con tu cámara.
            </p>
          </section>
        )}

        {history.length > 0 && (
          <section className="rounded-[20px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] font-black tracking-[0.14em] text-white/60">RONDAS ATENDIDAS HOY</p>
            <div className="mt-2.5 space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-[14px] bg-white/5 px-3 py-2 text-[12px]"
                >
                  <div>
                    <p className="font-black text-sun">
                      {h.spotId} · {h.plate}
                    </p>
                    <p className="font-bold text-white/75">{h.resolutionNote}</p>
                  </div>
                  <span className="rounded-full bg-[#22A45D]/25 px-2.5 py-0.5 text-[10.5px] font-black text-[#4ADE80]">
                    Atendida
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
