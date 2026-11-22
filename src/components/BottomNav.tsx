import { useNav, type ScreenName } from '../store/useNav'
import { useParkit } from '../store/useParkit'
import { IconGrid, IconHome, IconMoto, IconPin } from './icons'

const TABS: { id: ScreenName; label: string; Icon: typeof IconHome; wide?: boolean }[] = [
  { id: 'inicio', label: 'INICIO', Icon: IconHome },
  { id: 'zonas', label: 'ZONAS', Icon: IconGrid },
  { id: 'mapas', label: 'MAPAS', Icon: IconPin },
  { id: 'puesto', label: 'MI PUESTO', Icon: IconMoto, wide: true },
]

export function BottomNav() {
  const screen = useNav((s) => s.screen)
  const go = useNav((s) => s.go)
  const parked = useParkit((s) => s.parked)
  const setMapView = useParkit((s) => s.setMapView)

  return (
    <nav
      className="lg-nav absolute inset-x-4 bottom-[calc(20px+env(safe-area-inset-bottom,0px))] z-20 flex items-center gap-1 rounded-full p-2 max-[480px]:inset-x-3 max-[480px]:bottom-[calc(10px+env(safe-area-inset-bottom,0px))]"
      aria-label="Navegación principal"
    >
      {TABS.map(({ id, label, Icon, wide }) => {
        const active = screen === id || (id === 'zonas' && (screen === 'cupo' || screen === 'zona')) || (id === 'mapas' && screen === 'guia')
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === 'mapas') setMapView(parked ? 'moto' : 'campus')
              go(id, 'tab')
            }}
            aria-current={active ? 'page' : undefined}
            className={`nav-btn flex h-[60px] flex-col items-center justify-center gap-1 rounded-full ${wide ? 'flex-[1.25]' : 'flex-1'}`}
          >
            <Icon className="h-[19px] w-[19px]" />
            <span className="text-[11px] font-black tracking-wide">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
