import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParkit } from '../store/useParkit'
import { IconLogo, Wave } from './icons'

interface ScreenProps {
  children: ReactNode
  label: string
  noNav?: boolean
}

export function Screen({ children, label, noNav }: ScreenProps) {
  return (
    <section className="screen-scroll flex flex-col" aria-label={label}>
      <div className={`${noNav ? 'pb-6' : 'screen-scroll-inner'} relative flex flex-1 flex-col`}>
        <Wave />
        {children}
      </div>
    </section>
  )
}

export function BrandHeader({ subtitle }: { subtitle: string }) {
  const authUser = useParkit((s) => s.authUser)
  const logout = useParkit((s) => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative z-20 px-4 pt-[calc(28px+env(safe-area-inset-top,0px))]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <motion.div
            layoutId="parkit-brand-icon"
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-sun shadow-[inset_0_1.5px_1px_rgba(255,255,255,.75)]"
          >
            <IconLogo className="h-8 w-8" />
          </motion.div>
          <span className="font-display text-[32px] leading-none tracking-wide text-ink-deep">PARKIT</span>
        </div>

        {authUser && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Cuenta de usuario"
              aria-expanded={menuOpen}
              className="lg-surface flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-white/90 text-ink shadow-[0_8px_20px_rgba(34,82,138,0.16),inset_0_1.5px_1px_rgba(255,255,255,0.95)]"
            >
              {authUser.avatarUrl ? (
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.name ?? 'Usuario'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="lg-panel absolute right-0 top-13 z-30 w-52 origin-top-right rounded-[20px] p-3 text-left shadow-[0_14px_30px_rgba(34,82,138,0.2)]"
                >
                  <p className="truncate text-[13px] font-black text-ink">
                    {authUser.name ?? (authUser.role === 'visitor' ? 'Visitante' : 'Estudiante')}
                  </p>
                  <p className="truncate text-[11px] font-bold text-ink/70">
                    {authUser.email ?? 'Sesión visitante'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="mt-2.5 h-8 w-full rounded-full bg-sun text-[12px] font-black text-black"
                  >
                    Cerrar sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <p className="mt-3.5 text-[18px] font-extrabold">{subtitle}</p>
    </header>
  )
}

interface BackHeaderProps {
  eyebrow: string
  title: string
  onBack: () => void
  badge?: ReactNode
  children?: ReactNode
}

export function BackHeader({ eyebrow, title, onBack, badge, children }: BackHeaderProps) {
  return (
    <header className="relative z-10 px-4 pt-[calc(28px+env(safe-area-inset-top,0px))]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="lg-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-card text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black tracking-[0.14em] text-card">{eyebrow}</p>
          <h1 className="font-display text-[26px] leading-[1.05] text-ink-deep">{title}</h1>
          {children}
        </div>
        {badge}
      </div>
    </header>
  )
}
