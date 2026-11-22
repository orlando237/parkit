import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GEO, ORDER } from '../domain/data'
import type { ZoneId } from '../domain/types'
import type { SceneTarget } from './GuideScene'

interface CampusProps {
  target: SceneTarget
  occupied: Record<ZoneId, number[]>
  freeCounts: Record<ZoneId, number>
  isMine: boolean
}

const ZONE_STYLE: Record<ZoneId, { name: string; roof: string }> = {
  A: { name: 'Zona A · Informática', roof: '#FFC200' },
  B: { name: 'Zona B · Agronomía', roof: '#FFFFFF' },
  C: { name: 'Zona C · Postgrados', roof: '#141414' },
  D: { name: 'Zona D · Bioclimático', roof: '#7FAEDB' },
}

const BUILDINGS = [
  { name: 'Lab. Molecular (B43)', x: 34, z: 18, w: 32, d: 20, h: 18, roof: '#7FAEDB' },
  { name: 'Lab. Fotointerpretación', x: 115, z: 18, w: 34, d: 20, h: 16, roof: '#7FAEDB' },
  { name: 'Bloque 26', x: 212, z: 148, w: 50, d: 18, h: 21, roof: '#22A45D' },
  { name: 'Bienestar Universitario', x: 42, z: 198, w: 38, d: 20, h: 17, roof: '#7FAEDB' },
  { name: 'Edificio Azul', x: 222, z: 200, w: 44, d: 22, h: 23, roof: '#2F69A6' },
  { name: 'Edificio Administrativo', x: 112, z: 228, w: 38, d: 22, h: 22, roof: '#7FAEDB' },
  { name: 'CINTIA', x: 112, z: 310, w: 36, d: 20, h: 17, roof: '#7FAEDB' },
]

const KIOSKS = [
  { name: 'Zona de Estudio #3', x: 312, z: 148 },
  { name: 'Zona de Estudio #5', x: 206, z: 336 },
  { name: 'Zona de Estudio #2', x: 18, z: 270 },
]

const TREES = [
  { x: 144, z: 120, s: 0.9 },
  { x: 186, z: 115, s: 1 },
  { x: 186, z: 220, s: 0.9 },
  { x: 144, z: 245, s: 0.85 },
]

function Tree({ scale = 1 }: { scale?: number }) {
  return (
    <group>
      <mesh position={[0, 3.5 * scale, 0]}>
        <cylinderGeometry args={[1.1 * scale, 1.5 * scale, 7 * scale, 7]} />
        <meshLambertMaterial color="#6D4C3D" />
      </mesh>
      <mesh position={[0, 8.5 * scale, 0]} scale={[1, 0.82, 1]}>
        <sphereGeometry args={[5.2 * scale, 9, 7]} />
        <meshLambertMaterial color="#22A45D" />
      </mesh>
      <mesh position={[0.8 * scale, 12.2 * scale, -0.5 * scale]}>
        <sphereGeometry args={[3.8 * scale, 8, 6]} />
        <meshLambertMaterial color="#47B876" />
      </mesh>
    </group>
  )
}

function ParkedBike({ color = '#141414' }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 2.2, -3.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.2, 2.2, 1.6, 10]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 2.2, 3.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[2.2, 2.2, 1.6, 10]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[3, 3, 8.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 6.1, -1]}>
        <boxGeometry args={[2.6, 1.2, 4.2]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
    </group>
  )
}

function ParkingZone({ id, occupied, target, isMine }: { id: ZoneId; occupied: number[]; target: SceneTarget; isMine: boolean }) {
  const g = GEO[id]
  const w = g.w
  const d = g.h
  const isTargetZone = target.zone === id
  const layout = [
    { zCenter: -29, xStart: -w / 2 + 16, count: 3, shaded: true },
    { zCenter: -29, xStart: 8, count: 3, shaded: true },
    { zCenter: 29, xStart: -w / 2 + 16, count: 6, shaded: false },
  ]
  const entranceSide = g.cx < 165 ? w / 2 - 3 : -w / 2 + 3
  let counter = 0

  return (
    <group position={[g.cx, 0, g.cy]}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[w, 1.2, d]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[w - 4, 1.3, d - 4]} />
        <meshLambertMaterial color="#BFD6EC" />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <boxGeometry args={[w - 8, 1.36, 18]} />
        <meshBasicMaterial color="#EAF2FA" />
      </mesh>
      {Array.from({ length: Math.floor((w - 28) / 14) + 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 14 + i * 14, 0.7, 0]}>
          <boxGeometry args={[6, 1.4, 1.6]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
      <mesh position={[entranceSide, 9, -10.5]}>
        <boxGeometry args={[2.6, 17, 2.6]} />
        <meshLambertMaterial color="#22528A" />
      </mesh>
      <mesh position={[entranceSide, 9, 10.5]}>
        <boxGeometry args={[2.6, 17, 2.6]} />
        <meshLambertMaterial color="#22528A" />
      </mesh>
      <mesh position={[entranceSide, 18.2, 0]}>
        <boxGeometry args={[3.6, 3.6, 25]} />
        <meshLambertMaterial color={ZONE_STYLE[id].roof} />
      </mesh>

      {layout.map((sb, sbi) => {
        const spacing = 15.5
        const sbWidth = sb.count * spacing + 4
        const sbCenterX = sb.xStart + ((sb.count - 1) * spacing) / 2
        return (
          <group key={sbi}>
            <mesh position={[sbCenterX, 0.85, sb.zCenter]}>
              <boxGeometry args={[sbWidth, 1.5, 25]} />
              <meshLambertMaterial color="#FFFFFF" />
            </mesh>
            {sb.shaded && (
              <>
                <mesh position={[sbCenterX - sbWidth / 2 + 3, 9.5, sb.zCenter - 9.5]}>
                  <cylinderGeometry args={[0.9, 0.9, 17.5, 6]} />
                  <meshLambertMaterial color="#22528A" />
                </mesh>
                <mesh position={[sbCenterX + sbWidth / 2 - 3, 9.5, sb.zCenter - 9.5]}>
                  <cylinderGeometry args={[0.9, 0.9, 17.5, 6]} />
                  <meshLambertMaterial color="#22528A" />
                </mesh>
                <mesh position={[sbCenterX, 18.5, sb.zCenter]} rotation={[0.05, 0, 0]}>
                  <boxGeometry args={[sbWidth + 1, 1.2, 25]} />
                  <meshLambertMaterial color="#3B76B1" transparent opacity={0.9} />
                </mesh>
              </>
            )}
            {Array.from({ length: sb.count }).map((_, i) => {
              const idx = counter++
              const miniX = sb.xStart + i * spacing
              const isTarget = isTargetZone && idx === target.index
              const isOccupied = !isTarget && occupied.includes(idx)
              return (
                <group key={idx} position={[miniX, 0, sb.zCenter]}>
                  {isTarget ? (
                    <>
                      <mesh position={[0, 0.95, 0]}>
                        <boxGeometry args={[13.4, 1.65, 21.8]} />
                        <meshBasicMaterial color="#141414" />
                      </mesh>
                      <mesh position={[0, 1.02, 0]}>
                        <boxGeometry args={[11.6, 1.8, 19.8]} />
                        <meshBasicMaterial color="#FFC200" />
                      </mesh>
                      <mesh position={[0, 2, -7.2]}>
                        <boxGeometry args={[7.8, 0.8, 1.6]} />
                        <meshBasicMaterial color="#141414" />
                      </mesh>
                      {isMine && (
                        <group position={[0, 1.7, 0]}>
                          <ParkedBike color="#22528A" />
                        </group>
                      )}
                    </>
                  ) : (
                    <>
                      <mesh position={[0, 0.95, 0]}>
                        <boxGeometry args={[11.8, 1.7, 19.5]} />
                        <meshLambertMaterial color={isOccupied ? '#E5484D' : '#22A45D'} />
                      </mesh>
                      <mesh position={[0, 1.9, -6.5]}>
                        <boxGeometry args={[7.5, 0.7, 1.5]} />
                        <meshLambertMaterial color="#FFFFFF" />
                      </mesh>
                      {isOccupied && idx % 2 === 0 && (
                        <group position={[0, 1.7, 0]}>
                          <ParkedBike />
                        </group>
                      )}
                    </>
                  )}
                </group>
              )
            })}
          </group>
        )
      })}
      <group position={[-w / 2 + 5, 0.5, -d / 2 + 6]}>
        <Tree scale={0.95} />
      </group>
      <group position={[w / 2 - 5, 0.5, -d / 2 + 6]}>
        <Tree scale={0.85} />
      </group>
    </group>
  )
}

function Building({ b }: { b: (typeof BUILDINGS)[number] }) {
  const floors = b.h >= 20 ? 3 : 2
  const step = (b.h - 4) / floors
  return (
    <group position={[b.x, 0.2, b.z]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[b.w + 2.4, 2.2, b.d + 2.4]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, b.h / 2 + 1.5, 0]}>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshLambertMaterial color="#A9CAE8" />
      </mesh>
      {Array.from({ length: floors }).map((_, f) => (
        <mesh key={f} position={[0, 5.2 + f * step, 0]}>
          <boxGeometry args={[b.w + 0.6, 2.1, b.d + 0.6]} />
          <meshLambertMaterial color="#22528A" />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[5.5, 4.2, b.d + 1]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 5.6, 0]}>
        <boxGeometry args={[9, 1.2, b.d + 3.6]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, b.h + 2, 0]}>
        <boxGeometry args={[b.w + 2.2, 1.4, b.d + 2.2]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, b.h + 3.4, 0]}>
        <boxGeometry args={[b.w - 1.5, 2.2, b.d - 1.5]} />
        <meshLambertMaterial color={b.roof} />
      </mesh>
      <mesh position={[b.w * 0.18, b.h + 5.2, 0]}>
        <boxGeometry args={[b.w * 0.32, 3.2, b.d * 0.4]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
    </group>
  )
}

function Kiosk({ k }: { k: (typeof KIOSKS)[number] }) {
  const w = 26
  const d = 24
  return (
    <group position={[k.x, 0.2, k.z]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[w, 2, d]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      {[
        [-w / 2 + 3.5, -d / 2 + 3.5],
        [w / 2 - 3.5, -d / 2 + 3.5],
        [-w / 2 + 3.5, d / 2 - 3.5],
        [w / 2 - 3.5, d / 2 - 3.5],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 6, z]}>
          <cylinderGeometry args={[1.1, 1.1, 10, 8]} />
          <meshLambertMaterial color="#FFFFFF" />
        </mesh>
      ))}
      <mesh position={[0, 3.1, 0]}>
        <boxGeometry args={[w * 0.45, 2.2, d * 0.45]} />
        <meshLambertMaterial color="#22528A" />
      </mesh>
      <mesh position={[0, 15.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[Math.hypot(w, d) * 0.58, 7, 4]} />
        <meshLambertMaterial color="#7FAEDB" />
      </mesh>
    </group>
  )
}

function FloatingLabel({ text, position, zone }: { text: string; position: [number, number, number]; zone?: boolean }) {
  const { camera, size } = useThree()
  const vec = useMemo(() => new THREE.Vector3(...position), [position])
  const last = useRef({ x: -1, y: -1, z: -1 })

  const host = useMemo(() => {
    if (typeof document === 'undefined') return null
    const d = document.createElement('div')
    d.className = 'b-label'
    d.dataset.zone = zone ? 'true' : 'false'
    d.style.opacity = '0'
    d.textContent = text
    return d
  }, [text, zone])

  useEffect(() => {
    if (!host) return
    const parent = document.querySelector('.viewport-wrap')
    parent?.appendChild(host)
    return () => host.remove()
  }, [host])

  useFrame(() => {
    if (!host) return
    const v = vec.clone().project(camera)
    const x = (v.x * 0.5 + 0.5) * size.width
    const y = (-v.y * 0.5 + 0.5) * size.height
    const visible = v.z < 1 && x > 16 && x < size.width - 16 && y > 36 && y < size.height - 16
    const prev = last.current
    if (prev.x !== x || prev.y !== y) {
      host.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
      prev.x = x
      prev.y = y
    }
    if (prev.z !== v.z) {
      host.style.zIndex = visible ? String(Math.round(1000 - v.z * 1000)) : '0'
      prev.z = v.z
    }
    const opacity = visible ? '1' : '0'
    if (host.style.opacity !== opacity) host.style.opacity = opacity
  })

  return null
}

function LabelBridge({ text, position, zone }: { text: string; position: [number, number, number]; zone?: boolean }) {
  return <FloatingLabel text={text} position={position} zone={zone} />
}

export function Campus({ target, occupied, freeCounts, isMine }: CampusProps) {
  const labels = useMemo(
    () => [
      { text: 'Rotonda UniCórdoba', position: [140, 10, 175] as [number, number, number], zone: false },
      ...ORDER.map((id) => ({
        text: `${ZONE_STYLE[id].name} · ${freeCounts[id]} libres`,
        position: [GEO[id].cx, 20, GEO[id].cy] as [number, number, number],
        zone: true,
      })),
      ...BUILDINGS.map((b) => ({ text: b.name, position: [b.x, b.h + 8, b.z] as [number, number, number], zone: false })),
      ...KIOSKS.map((k) => ({ text: k.name, position: [k.x, 20, k.z] as [number, number, number], zone: false })),
    ],
    [freeCounts],
  )

  const dashes = useMemo(() => {
    const pts = [
      new THREE.Vector3(165, 0, 175),
      new THREE.Vector3(165, 0, target.zoneZ),
      new THREE.Vector3(target.x, 0, target.zoneZ),
      new THREE.Vector3(target.x, 0, target.z),
    ]
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.02)
    const len = curve.getLength()
    const list: { pos: THREE.Vector3; angle: number }[] = []
    for (let d = 4; d < len - 5; d += 7.5) {
      const t = d / len
      const p = curve.getPointAt(t)
      const tan = curve.getTangentAt(t)
      list.push({ pos: p, angle: Math.atan2(tan.x, tan.z) })
    }
    return list
  }, [target])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[175, -0.2, 175]}>
        <planeGeometry args={[540, 540]} />
        <meshBasicMaterial color="#D9E6F2" />
      </mesh>
      {[
        { x: 75, z: 80, w: 142, d: 145 },
        { x: 265, z: 80, w: 155, d: 145 },
        { x: 75, z: 270, w: 142, d: 145 },
        { x: 265, z: 270, w: 155, d: 145 },
      ].map((g, i) => (
        <mesh key={i} position={[g.x, 0, g.z]}>
          <boxGeometry args={[g.w, 0.3, g.d]} />
          <meshBasicMaterial color="#CFE3D5" />
        </mesh>
      ))}
      <mesh position={[175, 0.05, 175]}>
        <boxGeometry args={[390, 0.4, 34]} />
        <meshLambertMaterial color="#C6D9EC" />
      </mesh>
      <mesh position={[175, 0.12, 175]}>
        <boxGeometry args={[390, 0.55, 28]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[165, 0.05, 175]}>
        <boxGeometry args={[34, 0.4, 390]} />
        <meshLambertMaterial color="#C6D9EC" />
      </mesh>
      <mesh position={[165, 0.12, 175]}>
        <boxGeometry args={[28, 0.55, 390]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      <group position={[140, 0.2, 175]}>
        <mesh>
          <cylinderGeometry args={[20, 20, 0.5, 24]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[10, 10.5, 1.4, 20]} />
          <meshBasicMaterial color="#CFE3D5" />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[3.2, 4.2, 4.5, 12]} />
          <meshLambertMaterial color="#3B76B1" />
        </mesh>
        <mesh position={[0, 6.2, 0]}>
          <sphereGeometry args={[2.6, 12, 10]} />
          <meshLambertMaterial color="#FFC200" />
        </mesh>
      </group>
      <FloatingLabel text="Rotonda UniCórdoba" position={[140, 10, 175]} />

      {ORDER.map((id) => (
        <ParkingZone key={id} id={id} occupied={occupied[id]} target={target} isMine={isMine} />
      ))}

      {BUILDINGS.map((b) => (
        <Building key={b.name} b={b} />
      ))}
      {KIOSKS.map((k) => (
        <Kiosk key={k.name} k={k} />
      ))}

      {TREES.map((t, i) => (
        <group key={i} position={[t.x, 0.2, t.z]}>
          <Tree scale={t.s} />
        </group>
      ))}

      {dashes.map((d, i) => (
        <group key={i} position={[d.pos.x, 0, d.pos.z]} rotation={[0, d.angle, 0]}>
          <mesh position={[0, 0.76, 0]}>
            <boxGeometry args={[3.4, 0.5, 4.8]} />
            <meshBasicMaterial color="#141414" />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <boxGeometry args={[2.6, 0.65, 4]} />
            <meshBasicMaterial color="#FFC200" />
          </mesh>
        </group>
      ))}

      {labels.map((l) => (
        <LabelBridge key={l.text} text={l.text} position={l.position} zone={l.zone} />
      ))}
    </group>
  )
}
