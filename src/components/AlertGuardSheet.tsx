import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { GuardAlertReason } from '../domain/types'
import { findSpotInfo, zoneLabel } from '../domain/selectors'
import { useVigilanciaLive } from '../lib/vigilanciaStream'
import { useParkit } from '../store/useParkit'
import { IconAlert, IconMoto, IconX } from './icons'

const REASONS: { id: GuardAlertReason; label: string; desc: string }[] = [
  {
    id: 'bloqueada',
    label: 'Moto bloqueada · No puedo salir',
    desc: 'Otra motocicleta impide retirar mi vehículo del cupo.',
  },
  {
    id: 'dano',
    label: 'Posible daño o golpe en mi moto',
    desc: 'Necesito verificación presencial del estado de mi moto.',
  },
  {
    id: 'pasillo',
    label: 'Desorden u obstáculo en pasillo',
    desc: 'Motos mal ubicadas bloqueando la circulación de la zona.',
  },
  {
    id: 'sospechoso',
    label: 'Actividad inusual cerca del cupo',
    desc: 'Solicito ronda preventiva del vigilante en mi sector.',
  },
]

export function AlertGuardSheet() {
  const open = useParkit((s) => s.alertSheetOpen)
  const close = useParkit((s) => s.closeAlertSheet)
  const parked = useParkit((s) => s.parked)
  const zones = useParkit((s) => s.zones)
  const profile = useParkit((s) => s.profile)
  const authUser = useParkit((s) => s.authUser)
  const createGuardAlert = useParkit((s) => s.createGuardAlert)
  const emitNewAlert = useVigilanciaLive((s) => s.emitNewAlert)

  const [reason, setReason] = useState<GuardAlertReason | null>('bloqueada')
  const [note, setNote] = useState('')

  const info = parked ? findSpotInfo(zones, parked.spotId) : null
  const plate = profile?.plate ?? authUser?.plate ?? 'SIN-PLACA'

  const handleClose = () => {
    close()
    setNote('')
  }

  const handleConfirm = () => {
    if (!reason || !parked) return
    const picked = REASONS.find((r) => r.id === reason)
    if (!picked) return
    const created = createGuardAlert(reason, picked.label, note)
    if (created) {
      emitNewAlert(created)
    }
    setNote('')
  }

  return (
    <AnimatePresence>
      {open && parked && info && (
        <motion.div
          key="alert-guard-sheet"
          className="absolute inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={handleClose}
            className="lg-backdrop absolute inset-0 h-full w-full"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-sheet-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="lg-sheet absolute inset-x-0 bottom-0 max-h-[92%] overflow-y-auto rounded-t-[28px] px-4 pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-card/30" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sun/90 px-2.5 py-0.5 text-[11px] font-black text-black">
                  <IconAlert className="h-3.5 w-3.5" />
                  SOLICITUD DE RONDA
                </span>
                <h2 id="alert-sheet-title" className="mt-1.5 font-display text-[24px] leading-none text-ink-deep">
                  Alertar a vigilancia
                </h2>
                <p className="mt-1 text-[13px] font-bold leading-snug text-ink/80">
                  Elige el motivo para que el guarda acuda a revisar tu cupo en vivo.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={handleClose}
                className="lg-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-card text-ink"
              >
                <IconX className="h-[15px] w-[15px]" />
              </button>
            </div>

            {/* Resumen automático del cupo, zona y placa */}
            <div className="lg-card mt-3.5 flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-black tracking-[0.14em] text-white/80">CUPO REPORTADO</p>
                <p className="font-display text-[28px] leading-none text-sun">{parked.spotId}</p>
                <p className="mt-0.5 text-[12.5px] font-extrabold text-white/95">{zoneLabel(info.zone)}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-black text-white">
                  <IconMoto className="h-3.5 w-3.5" />
                  {plate}
                </span>
                <p className="mt-1.5 text-[11.5px] font-bold text-white/80">{info.sub.title}</p>
              </div>
            </div>

            <p className="mt-4 text-[12px] font-black tracking-[0.14em] text-card">MOTIVO DE LA ALERTA</p>
            <div className="mt-2 space-y-2">
              {REASONS.map((r) => {
                const selected = reason === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReason(r.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-[18px] border-2 px-3.5 py-2.5 text-left transition ${
                      selected
                        ? 'border-ink bg-sun/95 text-black shadow-[0_4px_12px_rgba(217,164,0,0.28)]'
                        : 'border-white/80 bg-white/80 text-ink hover:bg-white'
                    }`}
                  >
                    <p className="text-[14px] font-black leading-snug">{r.label}</p>
                    <p className={`mt-0.5 text-[11.5px] font-bold leading-snug ${selected ? 'text-black/80' : 'text-ink/70'}`}>
                      {r.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-3">
              <input
                type="text"
                maxLength={90}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detalle opcional (ej. moto roja sin seguro al lado)"
                aria-label="Detalle adicional opcional"
                className="h-[44px] w-full rounded-[14px] border-2 border-card/30 bg-white/90 px-3.5 text-[13px] font-bold text-ink placeholder:text-ink/45"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={!reason}
                onClick={handleConfirm}
                className="lg-btn-dark flex h-[56px] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-black disabled:opacity-50"
              >
                <IconAlert className="h-[18px] w-[18px] text-sun" />
                Confirmar alerta para {parked.spotId}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-[40px] w-full rounded-full text-[13px] font-extrabold text-ink/75"
              >
                Cancelar (evitar falsa alarma)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
