import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNav } from '../store/useNav'
import { useParkit } from '../store/useParkit'
import { IconInfo } from './icons'

export function Toast() {
  const toast = useParkit((s) => s.toast)
  const hideToast = useParkit((s) => s.hideToast)
  const [visible, setVisible] = useState(toast)

  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const timer = setTimeout(() => {
      setVisible(null)
      hideToast()
    }, 2800)
    return () => clearTimeout(timer)
  }, [toast, hideToast])

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[calc(104px+env(safe-area-inset-bottom,0px))] z-30">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={visible.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="lg-toast flex items-center gap-3 rounded-[20px] px-4 py-3 text-[14px] font-extrabold text-white"
          >
            <IconInfo className="h-[18px] w-[18px] shrink-0 text-sun" />
            <span>{visible.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function useScreenMotion() {
  const direction = useNav((s) => s.direction)
  const variants = {
    enter: (dir: string) => ({
      x: dir === 'back' ? '-28%' : dir === 'tab' ? 0 : '100%',
      opacity: dir === 'tab' ? 0 : 1,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: string) => ({
      x: dir === 'back' ? '100%' : dir === 'tab' ? 0 : '-28%',
      opacity: dir === 'tab' ? 0 : 1,
    }),
  }
  return { variants, direction }
}
