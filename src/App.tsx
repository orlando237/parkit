import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNav } from './store/useNav'
import { useParkit } from './store/useParkit'
import { useVigilanciaLive } from './lib/vigilanciaStream'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { ReportSheet } from './components/ReportSheet'
import { AlertGuardSheet } from './components/AlertGuardSheet'
import { IconLogo, Wave } from './components/icons'
import { ZonasScreen } from './screens/ZonasScreen'
import { CupoScreen } from './screens/CupoScreen'
import { ZonaScreen } from './screens/ZonaScreen'
import { PuestoScreen } from './screens/PuestoScreen'
import { InicioScreen } from './screens/InicioScreen'
import { MapasScreen } from './screens/MapasScreen'
import { GuiaScreen } from './screens/GuiaScreen'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { CameraSensorScreen } from './screens/CameraSensorScreen'
import { VigilanteScreen } from './screens/VigilanteScreen'

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
  const alertSheetOpen = useParkit((s) => s.alertSheetOpen)
  const closeAlertSheet = useParkit((s) => s.closeAlertSheet)
  const vigilanteMode = useParkit((s) => s.vigilanteMode)
  const authUser = useParkit((s) => s.authUser)
  const profile = useParkit((s) => s.profile)
  const initRealtime = useParkit((s) => s.initRealtime)
  const initStudentListener = useVigilanciaLive((s) => s.initStudentListener)
  const Current = SCREENS[screen]

  const stageKey = !authUser ? 'login' : !profile ? 'onboarding' : 'main'
  const prevStageRef = useRef(stageKey)
  const prevScreenRef = useRef(screen)
  const [beating, setBeating] = useState(false)
  const [tabBeating, setTabBeating] = useState(false)

  useEffect(() => {
    const prev = prevStageRef.current
    prevStageRef.current = stageKey
    if (prev === 'login' && stageKey !== 'login') {
      setBeating(true)
      const timer = window.setTimeout(() => setBeating(false), 2100)
      return () => window.clearTimeout(timer)
    }
    if (prev === 'onboarding' && stageKey === 'main') {
      setTabBeating(true)
      const timer = window.setTimeout(() => setTabBeating(false), 2200)
      return () => window.clearTimeout(timer)
    }
  }, [stageKey])

  useEffect(() => {
    const prev = prevScreenRef.current
    prevScreenRef.current = screen
    const isSubScreen =
      screen === 'guia' ||
      prev === 'guia' ||
      screen === 'cupo' ||
      screen === 'zona' ||
      direction !== 'tab'
    if (prev !== screen && stageKey === 'main' && !beating && !isSubScreen) {
      setTabBeating(true)
      const timer = window.setTimeout(() => setTabBeating(false), 2200)
      return () => window.clearTimeout(timer)
    }
  }, [screen, direction, stageKey, beating])

  const urlModo =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('modo') : null
  const isCameraMode = urlModo === 'camara'
  const isVigilanteMode = urlModo === 'vigilante' || vigilanteMode

  useEffect(() => {
    return initRealtime()
  }, [initRealtime])

  useEffect(() => {
    if (isCameraMode || isVigilanteMode) return
    return initStudentListener()
  }, [isCameraMode, isVigilanteMode, initStudentListener])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sheetOpen) closeSheet()
        if (alertSheetOpen) closeAlertSheet()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen, closeSheet, alertSheetOpen, closeAlertSheet])

  if (isCameraMode) {
    return <CameraSensorScreen />
  }

  if (isVigilanteMode) {
    return <VigilanteScreen />
  }

  const x = direction === 'back' ? '-28%' : direction === 'tab' ? 0 : '100%'
  const exitX = direction === 'back' ? '100%' : direction === 'tab' ? 0 : '-28%'

  return (
    <div className="app-frame flex h-full items-center justify-center">
      <div id="stage" className="app-stage h-full w-full min-w-0">
        <div id="app" className="app-shell relative h-full w-full overflow-clip bg-white">
          <AnimatePresence mode="wait" initial={false}>
            {beating ? (
              <motion.div
                key="stage-heartbeat"
                className="screen-scroll absolute inset-0 z-30 flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Wave />
                <motion.div
                  animate={{
                    scale: [0.88, 1.18, 0.96, 1.12, 1],
                    y: [0, 0, 0, -12, -16],
                  }}
                  transition={{
                    duration: 0.95,
                    times: [0, 0.24, 0.48, 0.74, 1],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative z-10 flex h-[88px] w-[88px] items-center justify-center rounded-[26px] bg-sun shadow-[0_14px_34px_rgba(217,164,0,0.36),inset_0_2px_2px_rgba(255,255,255,0.85)]"
                >
                  <IconLogo className="h-13 w-13" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: -4 }}
                  transition={{ delay: 0.45, duration: 0.35 }}
                  className="mt-2 flex flex-col items-center"
                >
                  <svg
                    viewBox="0 0 320 84"
                    className="h-[72px] w-[280px] overflow-visible"
                    aria-label="Bienvenido"
                  >
                    <motion.text
                      x="160"
                      y="56"
                      textAnchor="middle"
                      fontSize="50"
                      fontWeight="700"
                      fontStyle="italic"
                      fontFamily="'Segoe Script', 'Apple Chancery', 'Brush Script MT', 'Pacifico', cursive"
                      stroke="#22528A"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{
                        strokeDasharray: 520,
                        strokeDashoffset: 520,
                        fill: 'rgba(34, 82, 138, 0)',
                      }}
                      animate={{
                        strokeDashoffset: 0,
                        fill: 'rgba(34, 82, 138, 1)',
                      }}
                      transition={{
                        strokeDashoffset: { delay: 0.48, duration: 1.15, ease: 'easeInOut' },
                        fill: { delay: 1.25, duration: 0.45, ease: 'easeOut' },
                      }}
                    >
                      Bienvenido
                    </motion.text>
                  </svg>
                </motion.div>
              </motion.div>
            ) : !authUser ? (
              <motion.div
                key="stage-login"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <LoginScreen />
              </motion.div>
            ) : !profile ? (
              <motion.div
                key={`stage-onboarding-${authUser.id}`}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <OnboardingScreen key={authUser.id} />
              </motion.div>
            ) : (
              <motion.div
                key="stage-main"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={screen}
                    className="absolute inset-0"
                    initial={{ x, opacity: direction === 'tab' ? 0 : 1 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: exitX, opacity: direction === 'tab' ? 0 : 1 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Current />
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {tabBeating && (
                    <motion.div
                      key="tab-beat-overlay"
                      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/55 backdrop-blur-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: [0.92, 1.16, 0.96, 1.14, 0.92] }}
                        transition={{
                          duration: 1.05,
                          repeat: Infinity,
                          times: [0, 0.25, 0.5, 0.75, 1],
                          ease: 'easeInOut',
                        }}
                        className="relative z-10 flex h-[84px] w-[84px] items-center justify-center rounded-[25px] bg-sun shadow-[0_14px_34px_rgba(217,164,0,0.36),inset_0_2px_2px_rgba(255,255,255,0.85)]"
                      >
                        <IconLogo className="h-12 w-12" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <BottomNav />
                <ReportSheet />
                <AlertGuardSheet />
              </motion.div>
            )}
          </AnimatePresence>
          <Toast />
        </div>
      </div>
    </div>
  )
}
