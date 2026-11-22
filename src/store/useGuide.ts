import { create } from 'zustand'

interface GuideState {
  running: boolean
  finished: boolean
  progress: number
  meters: number
  minutes: number
  start: (meters: number, minutes: number) => void
  update: (progress: number, meters: number, minutes: number) => void
  setTotals: (meters: number, minutes: number) => void
  finish: () => void
  reset: () => void
}

export const useGuide = create<GuideState>((set) => ({
  running: false,
  finished: false,
  progress: 0,
  meters: 0,
  minutes: 0,
  start: (meters, minutes) => set({ running: true, finished: false, progress: 0, meters, minutes }),
  update: (progress, meters, minutes) => set({ progress, meters, minutes }),
  setTotals: (meters, minutes) => set({ meters, minutes }),
  finish: () => set({ running: false, finished: true, progress: 1, meters: 0, minutes: 0 }),
  reset: () => set({ running: false, finished: false, progress: 0 }),
}))
