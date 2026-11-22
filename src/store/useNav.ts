import { create } from 'zustand'

export type ScreenName = 'inicio' | 'zonas' | 'cupo' | 'zona' | 'mapas' | 'puesto' | 'guia'
export type Direction = 'fwd' | 'back' | 'tab'

export const TAB_OF: Record<ScreenName, ScreenName> = {
  inicio: 'inicio',
  zonas: 'zonas',
  cupo: 'zonas',
  zona: 'zonas',
  mapas: 'mapas',
  guia: 'mapas',
  puesto: 'puesto',
}

interface NavState {
  screen: ScreenName
  direction: Direction
  stack: ScreenName[]
  go: (screen: ScreenName, direction?: Direction) => void
  back: (fallback?: ScreenName) => void
}

export const useNav = create<NavState>((set, get) => ({
  screen: 'zonas',
  direction: 'tab',
  stack: [],
  go: (screen, direction = 'fwd') => {
    const { screen: current, stack } = get()
    if (screen === current) return
    const nextStack = direction === 'fwd' ? [...stack, current] : direction === 'tab' ? [] : stack
    set({ screen, direction, stack: nextStack })
  },
  back: (fallback = 'zonas') => {
    const { stack } = get()
    const target = stack.length ? stack[stack.length - 1] : fallback
    set({ screen: target, direction: 'back', stack: stack.slice(0, -1) })
  },
}))
