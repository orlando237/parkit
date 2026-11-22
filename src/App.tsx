import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNav } from './store/useNav'
import { useParkit } from './store/useParkit'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { ReportSheet } from './components/ReportSheet'
import { ZonasScreen } from './screens/ZonasScreen'
import { CupoScreen } from './screens/CupoScreen'
import { ZonaScreen } from './screens/ZonaScreen'
import { PuestoScreen } from './screens/PuestoScreen'
import { InicioScreen } from './screens/InicioScreen'
import { MapasScreen } from './screens/MapasScreen'
import { GuiaScreen } from './screens/GuiaScreen'

const SCREENS = {
  zonas: ZonasScreen,
  cupo: CupoScreen,
  zona: ZonaScreen,
  puesto: PuestoScreen,
  inicio: InicioScreen,
  mapas: MapasScreen,
  guia: GuiaScreen,
} as const

export default function App() {
  const screen = useNav((s) => s.screen)
  const direction = useNav((s) => s.direction)
  const sheetOpen = useParkit((s) => s.sheetOpen)
  const closeSheet = useParkit((s) => s.closeSheet)
  const Current = SCREENS[screen]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sheetOpen) closeSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen, closeSheet])

  const x = direction === 'back' ? '-28%' : direction === 'tab' ? 0 : '100%'
  const exitX = direction === 'back' ? '100%' : direction === 'tab' ? 0 : '-28%'

  return (
    <div className="flex h-full items-center justify-center px-[max(16px,env(safe-area-inset-left,0px))] py-[max(8px,env(safe-area-inset-top,0px))]">
      <div id="stage" className="h-full max-h-[844px] w-full max-w-[390px] min-w-0">
        <div
          id="app"
          className="relative h-full w-full overflow-clip rounded-[32px] bg-white shadow-[0_20px_50px_rgba(34,82,138,.28)]"
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={screen}
              className="absolute inset-0"
              initial={{ x, opacity: direction === 'tab' ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: exitX, opacity: direction === 'tab' ? 0 : 1 }}
              transition={{ duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Current />
            </motion.div>
          </AnimatePresence>
          <BottomNav />
          <Toast />
          <ReportSheet />
        </div>
      </div>
    </div>
  )
}
