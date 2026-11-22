import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import { ORDER } from '../domain/data'
import type { ReportState, ZoneId } from '../domain/types'
import { IconTree, IconX } from './icons'

const STATES: { id: ReportState; label: string }[] = [
  { id: 'libre', label: 'Libre' },
  { id: 'pocos', label: 'Pocos' },
  { id: 'lleno', label: 'Lleno' },
]

export function ReportSheet() {
  const open = useParkit((s) => s.sheetOpen)
  const close = useParkit((s) => s.closeSheet)
  const send = useParkit((s) => s.sendReport)
  const zones = useParkit((s) => s.zones)
  const curZone = useParkit((s) => s.curZone)
  const screen = useNav((s) => s.screen)
  const [zone, setZone] = useState<ZoneId>(curZone)
  const [state, setState] = useState<ReportState | null>(null)
  const [shade, setShade] = useState(true)

  const zoneOptions = useMemo(() => ORDER.map((id) => ({ id, name: zones[id].name })), [zones])

  const reset = () => {
    setZone(curZone)
    setState(null)
    setShade(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet"
          className="absolute inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => {
              close()
              reset()
            }}
            className="lg-backdrop absolute inset-0 h-full w-full"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="lg-sheet absolute inset-x-0 bottom-0 max-h-full overflow-y-auto rounded-t-[28px] px-4 pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-card/30" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="sheet-title" className="font-display text-[24px] leading-none text-ink-deep">
                  Reportar una zona
                </h2>
                <p className="mt-1.5 text-[13px] font-bold leading-snug text-ink/80">
                  Cuéntales a otros motociclistas lo que ves ahora.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => {
                  close()
                  reset()
                }}
                className="lg-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-card text-ink"
              >
                <IconX className="h-[15px] w-[15px]" />
              </button>
            </div>

            <p className="mt-4 text-[12px] font-black tracking-[0.14em] text-card">ZONA</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {zoneOptions.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className="chip"
                  aria-pressed={zone === z.id}
                  onClick={() => setZone(z.id)}
                >
                  {z.id} · {z.name}
                </button>
              ))}
            </div>

            <p className="mt-4 text-[12px] font-black tracking-[0.14em] text-card">¿CÓMO ESTÁ?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STATES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chip"
                  aria-pressed={state === s.id}
                  onClick={() => setState(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {state !== 'lleno' && (
              <div className="lg-panel mt-4 flex items-center justify-between gap-3 rounded-[16px] px-4 py-3">
                <span className="flex items-center gap-2 text-[14px] font-extrabold">
                  <IconTree className="h-4 w-4 text-card" />
                  Hay cupos con sombra
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shade}
                  aria-label="Hay cupos con sombra"
                  className="sw"
                  onClick={() => setShade((v) => !v)}
                />
              </div>
            )}

            <button
              type="button"
              disabled={!state}
              onClick={() => {
                if (!state) return
                send(zone, state, shade)
                reset()
              }}
              className="mt-5 h-[58px] w-full rounded-full bg-sun text-[17px] font-black text-black shadow-[0_6px_0_#D9A400,inset_0_1.5px_1px_rgba(255,255,255,.8)] disabled:opacity-50 disabled:shadow-none"
            >
              Enviar reporte
            </button>
            <p className="mt-3 text-center text-[11.5px] font-bold text-ink/60">
              {screen === 'cupo' || screen === 'zona' ? 'Sugerimos la zona que estás viendo.' : 'Elige la zona que tienes cerca.'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
