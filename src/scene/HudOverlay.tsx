import { useGuide } from '../store/useGuide'
import type { SceneTarget } from './GuideScene'

interface HudOverlayProps {
  target: SceneTarget
  zoneName: string
  running: boolean
  finished: boolean
  totalMeters: number
  totalMinutes: number
  onStart: () => void
  onReset: () => void
}

export function HudOverlay({ target, zoneName, running, finished, totalMeters, totalMinutes, onStart, onReset }: HudOverlayProps) {
  const meters = useGuide((s) => s.meters)
  const minutes = useGuide((s) => s.minutes)

  return (
    <>
      <div className="scene-legend" aria-hidden>
        <span>
          <i className="mr-1 inline-block h-[9px] w-[9px] rounded-[3px] bg-free align-[-1px]" />
          Libre
        </span>
        <span>
          <i className="mr-1 inline-block h-[9px] w-[9px] rounded-[3px] bg-busy align-[-1px]" />
          Ocupado
        </span>
        <span>
          <i className="mr-1 inline-block h-[9px] w-[9px] rounded-[3px] border border-black bg-sun align-[-1px]" />
          Tu cupo
        </span>
      </div>
      {finished ? (
        <div className="arrival-banner" role="status">
          <span className="text-[14px] font-black">¡Llegaste a tu cupo {target.id}!</span>
          <span className="text-[12px] font-extrabold text-white/95">{zoneName}</span>
          <button type="button" onClick={onReset} className="mt-1 h-[34px] rounded-full border-2 border-white bg-white/20 text-[13px] font-black text-white">
            Recorrer otra vez
          </button>
        </div>
      ) : (
        !running && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-[16px] border-2 border-white/90 bg-white/88 px-3 py-2 text-center text-[12px] font-extrabold text-ink shadow-[0_6px_16px_rgba(34,82,138,.15)] backdrop-blur-md">
            {target.id} · {zoneName} · {totalMeters} m · {totalMinutes} min
            <button type="button" onClick={onStart} className="pointer-events-auto ml-2 rounded-full bg-black px-2.5 py-1 text-[11px] font-black text-sun">
              Ir
            </button>
          </div>
        )
      )}
      {running && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-[16px] border-2 border-white/90 bg-white/88 px-3 py-2 text-center text-[12px] font-extrabold text-ink shadow-[0_6px_16px_rgba(34,82,138,.15)] backdrop-blur-md">
          En camino · {meters} m · {minutes} min
        </div>
      )}
    </>
  )
}
