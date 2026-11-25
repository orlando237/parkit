import { useCallback, useEffect, useRef, useState } from 'react'
import { ORDER } from '../domain/data'
import type { SpotStatus, ZoneId } from '../domain/types'
import { isSupabaseConfigured } from '../lib/supabase'
import { useParkit } from '../store/useParkit'

interface RoiBox {
  spotId: string
  x: number
  y: number
  w: number
  h: number
}

const STORAGE_KEY = 'parkit-camera-rois-v1'
const SAMPLE_W = 320
const SAMPLE_H = 240

function defaultRoisForZone(spotIds: string[]): RoiBox[] {
  const picks = spotIds.slice(0, 4)
  return picks.map((spotId, idx) => {
    const col = idx % 2
    const row = Math.floor(idx / 2)
    return {
      spotId,
      x: 0.1 + col * 0.44,
      y: 0.14 + row * 0.42,
      w: 0.36,
      h: 0.3,
    }
  })
}

function loadStoredRois(): Partial<Record<ZoneId, RoiBox[]>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<ZoneId, RoiBox[]>>) : {}
  } catch {
    return {}
  }
}

function extractGrayscale(ctx: CanvasRenderingContext2D, w: number, h: number): Uint8Array {
  const img = ctx.getImageData(0, 0, w, h).data
  const gray = new Uint8Array(w * h)
  for (let i = 0, p = 0; i < img.length; i += 4, p += 1) {
    gray[p] = Math.round(0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2])
  }
  return gray
}

function computeRoiDiff(
  refFrame: Uint8Array,
  curFrame: Uint8Array,
  roi: RoiBox,
  w: number,
  h: number,
): number {
  const x0 = Math.max(0, Math.floor(roi.x * w))
  const y0 = Math.max(0, Math.floor(roi.y * h))
  const x1 = Math.min(w - 1, Math.floor((roi.x + roi.w) * w))
  const y1 = Math.min(h - 1, Math.floor((roi.y + roi.h) * h))

  let sum = 0
  let count = 0
  for (let y = y0; y <= y1; y += 2) {
    const rowOffset = y * w
    for (let x = x0; x <= x1; x += 2) {
      const idx = rowOffset + x
      sum += Math.abs(curFrame[idx] - refFrame[idx])
      count += 1
    }
  }
  return count > 0 ? sum / count : 0
}

export function CameraSensorScreen() {
  const zones = useParkit((s) => s.zones)
  const setSpotFromCamera = useParkit((s) => s.setSpotFromCamera)

  const [zoneId, setZoneId] = useState<ZoneId>('A')
  const [roisByZone, setRoisByZone] = useState<Partial<Record<ZoneId, RoiBox[]>>>(() => loadStoredRois())
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasReference, setHasReference] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [threshold, setThreshold] = useState(18)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [calibrating, setCalibrating] = useState(true)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const refFrameRef = useRef<Uint8Array | null>(null)
  const dragRef = useRef<{
    spotId: string
    mode: 'move' | 'resize'
    startX: number
    startY: number
    orig: RoiBox
  } | null>(null)

  const zone = zones[zoneId]
  const zoneSpotIds = zone.spots.map((s) => s.id)
  const rois = roisByZone[zoneId] ?? defaultRoisForZone(zoneSpotIds)

  const saveRois = useCallback(
    (nextForZone: RoiBox[]) => {
      setRoisByZone((prev) => {
        const updated = { ...prev, [zoneId]: nextForZone }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // ignore storage quota errors
        }
        return updated
      })
    },
    [zoneId],
  )

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este navegador no soporta acceso a cámara (requiere HTTPS o localhost).')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
          setCameraError(null)
        }
      } catch (err) {
        setCameraError(
          err instanceof Error
            ? `No se pudo abrir la cámara: ${err.message}`
            : 'No se pudo acceder a la cámara del dispositivo.',
        )
      }
    }

    void startCamera()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const grabFrame = useCallback((): Uint8Array | null => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      canvasRef.current.width = SAMPLE_W
      canvasRef.current.height = SAMPLE_H
    }
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H)
    return extractGrayscale(ctx, SAMPLE_W, SAMPLE_H)
  }, [])

  const captureReference = () => {
    const frame = grabFrame()
    if (!frame) return
    refFrameRef.current = frame
    setHasReference(true)
    setScores({})
  }

  useEffect(() => {
    if (!detecting || !hasReference) return
    const interval = window.setInterval(() => {
      const refFrame = refFrameRef.current
      const curFrame = grabFrame()
      if (!refFrame || !curFrame) return

      const nextScores: Record<string, number> = {}
      for (const roi of rois) {
        const diff = computeRoiDiff(refFrame, curFrame, roi, SAMPLE_W, SAMPLE_H)
        nextScores[roi.spotId] = Math.round(diff)
        const nextStatus: SpotStatus = diff >= threshold ? 'ocupado' : 'libre'
        void setSpotFromCamera(roi.spotId, nextStatus)
      }
      setScores(nextScores)
    }, 2000)

    return () => window.clearInterval(interval)
  }, [detecting, hasReference, rois, threshold, grabFrame, setSpotFromCamera])

  const onPointerDown = (e: React.PointerEvent, roi: RoiBox, mode: 'move' | 'resize') => {
    if (!calibrating) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      spotId: roi.spotId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...roi },
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const box = overlayRef.current
    if (!drag || !box) return
    const rect = box.getBoundingClientRect()
    if (!rect.width || !rect.height) return

    const dx = (e.clientX - drag.startX) / rect.width
    const dy = (e.clientY - drag.startY) / rect.height

    const next = rois.map((r) => {
      if (r.spotId !== drag.spotId) return r
      if (drag.mode === 'move') {
        const x = Math.min(1 - r.w, Math.max(0, drag.orig.x + dx))
        const y = Math.min(1 - r.h, Math.max(0, drag.orig.y + dy))
        return { ...r, x, y }
      }
      const w = Math.min(1 - r.x, Math.max(0.12, drag.orig.w + dx))
      const h = Math.min(1 - r.y, Math.max(0.12, drag.orig.h + dy))
      return { ...r, w, h }
    })
    saveRois(next)
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const toggleSpotInRoi = (spotId: string) => {
    const exists = rois.some((r) => r.spotId === spotId)
    if (exists) {
      saveRois(rois.filter((r) => r.spotId !== spotId))
    } else {
      const idx = rois.length
      saveRois([
        ...rois,
        {
          spotId,
          x: 0.1 + (idx % 2) * 0.42,
          y: 0.14 + (Math.floor(idx / 2) % 2) * 0.4,
          w: 0.34,
          h: 0.28,
        },
      ])
    }
  }

  return (
    <div className="min-h-full bg-[#0F172A] px-4 pb-8 pt-4 text-white">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black tracking-[0.16em] text-sun">PARKIT · NODO DE VISIÓN</p>
          <h1 className="font-display text-[26px] leading-tight">Modo Cámara Sensor</h1>
        </div>
        <a
          href={window.location.pathname}
          className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[12px] font-extrabold text-white"
        >
          Salir a la app
        </a>
      </header>

      <div className="mx-auto mt-3 max-w-2xl space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          {ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setDetecting(false)
                setHasReference(false)
                refFrameRef.current = null
                setZoneId(id)
              }}
              className={`h-10 rounded-full text-[13px] font-black transition ${
                id === zoneId ? 'bg-sun text-black' : 'bg-white/10 text-white/85'
              }`}
            >
              Zona {id}
            </button>
          ))}
        </div>

        <div
          ref={overlayRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] border-2 border-white/25 bg-black"
        >
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[13px] font-bold">
              Iniciando cámara trasera...
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-5 text-center text-[13px] font-bold text-[#FCA5A5]">
              {cameraError}
            </div>
          )}

          {rois.map((roi) => {
            const spot = zone.spots.find((s) => s.id === roi.spotId)
            const busy = spot ? !spot.free : false
            const diffVal = scores[roi.spotId]
            return (
              <div
                key={roi.spotId}
                onPointerDown={(e) => onPointerDown(e, roi, 'move')}
                style={{
                  left: `${roi.x * 100}%`,
                  top: `${roi.y * 100}%`,
                  width: `${roi.w * 100}%`,
                  height: `${roi.h * 100}%`,
                  touchAction: 'none',
                }}
                className={`absolute flex flex-col justify-between rounded-[10px] border-[3px] p-1.5 ${
                  busy ? 'border-busy bg-busy/25' : 'border-free bg-free/20'
                } ${calibrating ? 'cursor-move' : ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="rounded bg-black/80 px-1.5 py-0.5 font-display text-[12px] text-sun">
                    {roi.spotId}
                  </span>
                  <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-black">
                    {busy ? 'OCUPADO' : 'LIBRE'}
                    {diffVal !== undefined ? ` (${diffVal})` : ''}
                  </span>
                </div>
                {calibrating && (
                  <div
                    onPointerDown={(e) => onPointerDown(e, roi, 'resize')}
                    title="Redimensionar cajón"
                    className="ml-auto h-4 w-4 cursor-nwse-resize rounded-sm border border-black bg-sun"
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!cameraReady}
            onClick={captureReference}
            className="h-12 rounded-full bg-white/15 px-4 text-[13.5px] font-black text-white disabled:opacity-50"
          >
            {hasReference ? 'Recapturar fondo vacío' : '1. Capturar fondo vacío'}
          </button>
          <button
            type="button"
            disabled={!cameraReady || !hasReference}
            onClick={() => setDetecting((d) => !d)}
            className={`h-12 rounded-full px-4 text-[13.5px] font-black disabled:opacity-50 ${
              detecting ? 'bg-busy text-white' : 'bg-sun text-black'
            }`}
          >
            {detecting ? 'Pausar detección' : '2. Iniciar detección (2s)'}
          </button>
        </div>

        <div className="rounded-[18px] bg-white/10 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="cam-threshold" className="text-[12.5px] font-extrabold">
              Sensibilidad de contraste (umbral: {threshold})
            </label>
            <button
              type="button"
              onClick={() => setCalibrating((c) => !c)}
              className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black"
            >
              {calibrating ? 'Bloquear cajones' : 'Calibrar cajones'}
            </button>
          </div>
          <input
            id="cam-threshold"
            type="range"
            min={5}
            max={50}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-2 w-full accent-sun"
          />
          <p className="mt-2 text-[11.5px] font-bold text-white/75">
            Cajones activos en Zona {zoneId} ({zone.name}) — toca para activar/desactivar:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {zoneSpotIds.map((id) => {
              const active = rois.some((r) => r.spotId === id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSpotInRoi(id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    active ? 'bg-sun text-black' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {id}
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-center text-[11.5px] font-bold text-white/65">
          {isSupabaseConfigured
            ? 'Sincronización en vivo con Supabase activa'
            : 'Modo local: los cambios se reflejan en este navegador (.env.local pendiente)'}
        </p>
      </div>
    </div>
  )
}
