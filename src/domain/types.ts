export type ZoneId = 'A' | 'B' | 'C' | 'D'
export type Pref = 'sombra' | 'sol'
export type MapView = 'moto' | 'campus'
export type GuideSource = 'parked' | 'zona'
export type ReportState = 'libre' | 'pocos' | 'lleno'

export interface Spot {
  id: string
  n: number
  zone: ZoneId
  sub: string
  free: boolean
  shade: boolean
}

export interface SubBlock {
  id: string
  title: string
  env: 'Sombra' | 'Sol'
  wide: boolean
  spots: Spot[]
}

export interface Zone {
  id: ZoneId
  name: string
  dm: number
  wc: number
  m: number
  tf: string
  tt: string
  border: string
  subs: SubBlock[]
  spots: Spot[]
}

export interface Parked {
  zone: ZoneId
  spotId: string
  since: number
}

export interface Report {
  id: string
  zone: ZoneId
  state: ReportState
  shade: boolean
  at: number
}

export interface AlertRecord {
  id: string
  spotId: string
  at: number
}

export interface Geo {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
}

export interface SpotInfo {
  zone: Zone
  sub: SubBlock
  spot: Spot
  index: number
}
