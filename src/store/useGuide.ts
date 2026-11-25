import { create } from 'zustand'

interface GuideState {
  running: boolean
  finished: boolean
  progress: number
  currentStep: number
  meters: number
  minutes: number
  start: (meters: number, minutes: number) => void
  update: (progress: number, meters: number, minutes: number, currentStep?: number) => void
  setTotals: (meters: number, minutes: number) => void
  finish: (totalSteps?: number) => void
  reset: () => void
}

export const useGuide = create<GuideState>((set) => ({
  running: false,
  finished: false,
  progress: 0,
  currentStep: 0,
  meters: 0,
  minutes: 0,
  start: (meters, minutes) =>
    set({ running: true, finished: false, progress: 0, currentStep: 0, meters, minutes }),
  update: (progress, meters, minutes, currentStep) =>
    set((s) => ({
      progress,
      meters,
      minutes,
      currentStep: currentStep ?? s.currentStep,
    })),
  setTotals: (meters, minutes) => set({ meters, minutes }),
  finish: (totalSteps) =>
    set((s) => ({
      running: false,
      finished: true,
      progress: 1,
      currentStep: totalSteps ?? s.currentStep + 1,
      meters: 0,
      minutes: 0,
    })),
  reset: () => set({ running: false, finished: false, progress: 0, currentStep: 0 }),
}))
