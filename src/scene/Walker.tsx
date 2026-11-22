import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGuide } from '../store/useGuide'
import type { SceneTarget } from './GuideScene'

const SPEED = 1 / 6

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a
  while (diff < -Math.PI) diff += Math.PI * 2
  while (diff > Math.PI) diff -= Math.PI * 2
  return a + diff * t
}

function StylizedMoto() {
  return (
    <group scale={0.76}>
      <mesh position={[0, 3, -4.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[3, 3, 2, 12]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 3, 5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[3, 3, 2, 12]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 5.4, 0]}>
        <boxGeometry args={[3.8, 3.8, 10.8]} />
        <meshLambertMaterial color="#FFC200" />
      </mesh>
      <mesh position={[0, 7.6, -1.4]}>
        <boxGeometry args={[3.2, 1.4, 5.4]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 7.8, 3.9]}>
        <boxGeometry args={[2.8, 4.8, 2]} />
        <meshLambertMaterial color="#FFC200" />
      </mesh>
      <mesh position={[0, 10, 3.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.5, 0.5, 6.4, 8]} />
        <meshLambertMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 8.6, 5]}>
        <boxGeometry args={[2, 1.2, 0.8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 9.5, -1.2]}>
        <cylinderGeometry args={[1.3, 1.5, 3.3, 10]} />
        <meshLambertMaterial color="#3B76B1" />
      </mesh>
      <mesh position={[0, 12.1, -0.9]}>
        <sphereGeometry args={[1.5, 12, 10]} />
        <meshLambertMaterial color="#FFC200" />
      </mesh>
    </group>
  )
}

export function Walker({ target, running, finished }: { target: SceneTarget; running: boolean; finished: boolean }) {
  const group = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const update = useGuide((s) => s.update)
  const finish = useGuide((s) => s.finish)
  const progress = useRef(0)
  const lastHud = useRef(-1)
  const totals = useRef({ meters: 45, minutes: 1 })

  useEffect(() => {
    const { meters, minutes } = useGuide.getState()
    if (meters > 0) totals.current = { meters, minutes }
  }, [running])

  const route = useRef<{ curve: THREE.CatmullRomCurve3; length: number } | null>(null)
  useEffect(() => {
    const points = [
      new THREE.Vector3(165, 0, 175),
      new THREE.Vector3(165, 0, target.zoneZ),
      new THREE.Vector3(target.x, 0, target.zoneZ),
      new THREE.Vector3(target.x, 0, target.z),
    ]
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.02)
    route.current = { curve, length: curve.getLength() }
    progress.current = 0
    lastHud.current = -1
  }, [target])

  useFrame((_, delta) => {
    if (!group.current || !route.current) return
    if (running) {
      progress.current = Math.min(1, progress.current + delta * SPEED)
      if (progress.current >= 1) finish()
    } else if (!finished) {
      progress.current = 0
    }
    const t = finished ? 1 : progress.current
    const pos = route.current.curve.getPointAt(Math.min(0.999, t))
    const tangent = route.current.curve.getTangentAt(Math.min(0.999, t))
    const angle = Math.atan2(tangent.x, tangent.z)
    const inBay = Math.max(0, (t - 0.86) / 0.14)
    group.current.position.set(pos.x, 0.7 + inBay * 1.05, pos.z)
    group.current.rotation.y = lerpAngle(group.current.rotation.y, angle, 0.25)

    const entering = Math.max(0, (t - 0.72) / 0.28)
    const back = 33 - entering * 6
    const height = 21 + entering * 22
    const ahead = 22 - entering * 20
    const camX = pos.x - Math.sin(angle) * back
    const camZ = pos.z - Math.cos(angle) * back
    camera.position.lerp(new THREE.Vector3(camX, height, camZ), 0.14)
    camera.lookAt(pos.x + Math.sin(angle) * ahead, 4.2 + entering * 2, pos.z + Math.cos(angle) * ahead)

    const remaining = Math.max(0, 1 - t)
    const hudKey = Math.round(remaining * 100)
    if (hudKey !== lastHud.current) {
      lastHud.current = hudKey
      update(t, Math.round(totals.current.meters * remaining), Math.ceil(totals.current.minutes * remaining))
    }
  })

  return (
    <group ref={group}>
      <StylizedMoto />
    </group>
  )
}
