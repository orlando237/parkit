import type { ReactNode } from 'react'
import { IconLogo, Wave } from './icons'

interface ScreenProps {
  children: ReactNode
  label: string
}

export function Screen({ children, label }: ScreenProps) {
  return (
    <section className="screen-scroll" aria-label={label}>
      <div className="relative min-h-full">
        <Wave />
        {children}
      </div>
    </section>
  )
}

export function BrandHeader({ subtitle }: { subtitle: string }) {
  return (
    <header className="relative z-10 px-4 pt-7">
      <div className="flex items-center gap-4">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-sun shadow-[inset_0_1.5px_1px_rgba(255,255,255,.75)]">
          <IconLogo className="h-8 w-8" />
        </div>
        <span className="font-display text-[32px] leading-none tracking-wide text-ink-deep">PARKIT</span>
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
    <header className="relative z-10 px-4 pt-7">
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
