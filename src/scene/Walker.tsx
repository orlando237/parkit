import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { GridCell } from '../components/CampusMap2D'
import { useGuide } from '../store/useGuide'
import { cellCenter3D } from './Campus'

const STEP_DURATION = 0.46 // Segundos por cada salto de cuadro (10 m)
const HOP_PORTION = 0.76   // Fracción del paso en el aire

function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a
  while (diff < -Math.PI) diff += Math.PI * 2
  while (diff > Math.PI) diff -= Math.PI * 2
  return a + diff * t
}

interface PersonRefs {
  leftLeg: THREE.Group | null
  rightLeg: THREE.Group | null
  leftArm: THREE.Group | null
  rightArm: THREE.Group | null
}

function StylizedPerson({
  limbRefs,
}: {
  limbRefs: React.MutableRefObject<PersonRefs>
}) {
  return (
    <group scale={0.85}>
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8, 16]} />
        <meshBasicMaterial color="#141414" transparent opacity={0.28} />
      </mesh>

      <group
        position={[-1.05, 4.2, 0]}
        ref={(el) => {
          limbRefs.current.leftLeg = el
        }}
      >
        <mesh position={[0, -1.8, 0]}>
          <boxGeometry args={[1.5, 3.8, 1.6]} />
          <meshLambertMaterial color="#1E3A5F" />
        </mesh>
        <mesh position={[0, -3.7, 0.35]}>
          <boxGeometry args={[1.6, 0.9, 2.3]} />
          <meshLambertMaterial color="#141414" />
        </mesh>
      </group>

      <group
        position={[1.05, 4.2, 0]}
        ref={(el) => {
          limbRefs.current.rightLeg = el
        }}
      >
        <mesh position={[0, -1.8, 0]}>
          <boxGeometry args={[1.5, 3.8, 1.6]} />
          <meshLambertMaterial color="#1E3A5F" />
        </mesh>
        <mesh position={[0, -3.7, 0.35]}>
          <boxGeometry args={[1.6, 0.9, 2.3]} />
          <meshLambertMaterial color="#141414" />
        </mesh>
      </group>

      <mesh position={[0, 6.8, 0]}>
        <boxGeometry args={[4.2, 4.8, 2.4]} />
        <meshLambertMaterial color="#2F69A6" />
      </mesh>

      <mesh position={[0, 6.9, -1.55]}>
        <boxGeometry args={[3.1, 3.6, 1.3]} />
        <meshLambertMaterial color="#FFC200" />
      </mesh>

      <group
        position={[-2.75, 8.6, 0]}
        ref={(el) => {
          limbRefs.current.leftArm = el
        }}
      >
        <mesh position={[0, -1.7, 0]}>
          <boxGeometry args={[1.25, 3.6, 1.35]} />
          <meshLambertMaterial color="#3B76B1" />
        </mesh>
        <mesh position={[0, -3.7, 0]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshLambertMaterial color="#F4C29F" />
        </mesh>
      </group>

      <group
        position={[2.75, 8.6, 0]}
        ref={(el) => {
          limbRefs.current.rightArm = el
        }}
      >
        <mesh position={[0, -1.7, 0]}>
          <boxGeometry args={[1.25, 3.6, 1.35]} />
          <meshLambertMaterial color="#3B76B1" />
        </mesh>
        <mesh position={[0, -3.7, 0]}>
          <sphereGeometry args={[0.7, 8, 8]} />
          <meshLambertMaterial color="#F4C29F" />
        </mesh>
      </group>

      <mesh position={[0, 11.1, 0]}>
        <sphereGeometry args={[2.0, 14, 12]} />
        <meshLambertMaterial color="#F4C29F" />
      </mesh>

      <mesh position={[0, 12.1, 0]}>
        <cylinderGeometry args={[2.05, 2.05, 1.1, 14]} />
        <meshLambertMaterial color="#FFC200" />
      </mesh>
      <mesh position={[0, 11.75, 1.55]}>
        <boxGeometry args={[3.2, 0.45, 1.8]} />
        <meshLambertMaterial color="#D9A400" />
      </mesh>
    </group>
  )
}

export function Walker({
  routeCells,
  running,
  finished,
  totalMeters,
  totalMinutes,
}: {
  routeCells: GridCell[]
  running: boolean
  finished: boolean
  totalMeters: number
  totalMinutes: number
}) {
  const group = useRef<THREE.Group>(null)
  const limbRefs = useRef<PersonRefs>({
    leftLeg: null,
    rightLeg: null,
    leftArm: null,
    rightArm: null,
  })
  const camera = useThree((s) => s.camera)
  const update = useGuide((s) => s.update)
  const finish = useGuide((s) => s.finish)
  const elapsedRef = useRef(0)
  const lastStepHud = useRef(-1)
  const camAngleRef = useRef(0)
  const camInitRef = useRef(false)
  const lookAtRef = useRef(new THREE.Vector3())
  const camPosGoalRef = useRef(new THREE.Vector3())

  const waypoints3D = useMemo(
    () => routeCells.map((c) => cellCenter3D(c.c, c.r)),
    [routeCells],
  )
  const totalSteps = Math.max(1, waypoints3D.length - 1)

  useEffect(() => {
    elapsedRef.current = 0
    lastStepHud.current = -1
    camInitRef.current = false
  }, [waypoints3D])

  useEffect(() => {
    if (running || !finished) {
      elapsedRef.current = 0
      lastStepHud.current = -1
    }
  }, [running, finished])

  useFrame((_, delta) => {
    if (!group.current || waypoints3D.length === 0) return

    if (running) {
      elapsedRef.current += delta
      const rawStep = elapsedRef.current / STEP_DURATION
      if (rawStep >= totalSteps) {
        elapsedRef.current = totalSteps * STEP_DURATION
        finish(totalSteps)
      }
    } else if (!finished) {
      elapsedRef.current = 0
    }

    const rawStep = finished ? totalSteps : Math.min(totalSteps, elapsedRef.current / STEP_DURATION)
    const stepIdx = Math.min(totalSteps - 1, Math.floor(rawStep))
    const stepFrac = finished ? 1 : rawStep - stepIdx
    const jumpPhase = finished ? 1 : Math.min(1, stepFrac / HOP_PORTION)

    const fromPt = waypoints3D[stepIdx] ?? waypoints3D[0]
    const toPt = waypoints3D[Math.min(waypoints3D.length - 1, stepIdx + 1)] ?? fromPt

    const curX = fromPt.x + (toPt.x - fromPt.x) * jumpPhase
    const curZ = fromPt.z + (toPt.z - fromPt.z) * jumpPhase

    // Salto parabólico entre un cuadro de 10m y el siguiente
    const hopHeight = running && jumpPhase > 0 && jumpPhase < 1 ? Math.sin(jumpPhase * Math.PI) * 4.6 : 0

    // Brazos y piernas al saltar
    const swing =
      running && jumpPhase > 0 && jumpPhase < 1
        ? Math.sin(jumpPhase * Math.PI) * 0.78 * (stepIdx % 2 === 0 ? 1 : -1)
        : 0
    if (limbRefs.current.leftLeg) limbRefs.current.leftLeg.rotation.x = swing
    if (limbRefs.current.rightLeg) limbRefs.current.rightLeg.rotation.x = -swing
    if (limbRefs.current.leftArm) limbRefs.current.leftArm.rotation.x = -swing * 0.9
    if (limbRefs.current.rightArm) limbRefs.current.rightArm.rotation.x = swing * 0.9

    // Orientación anticipada y suave en las esquinas
    const lookNext = waypoints3D[Math.min(waypoints3D.length - 1, stepIdx + 1)] ?? fromPt
    const lookAfter = waypoints3D[Math.min(waypoints3D.length - 1, stepIdx + 2)] ?? lookNext
    const dx1 = lookNext.x - fromPt.x
    const dz1 = lookNext.z - fromPt.z
    const dx2 = lookAfter.x - lookNext.x
    const dz2 = lookAfter.z - lookNext.z

    const segAngle = Math.hypot(dx1, dz1) > 0.1 ? Math.atan2(dx1, dz1) : camAngleRef.current
    const nextSegAngle = Math.hypot(dx2, dz2) > 0.1 ? Math.atan2(dx2, dz2) : segAngle
    // Anticipa suavemente el giro durante la segunda mitad del salto antes de una esquina
    const cornerBlend = Math.max(0, (jumpPhase - 0.45) / 0.55) * 0.45
    const desiredAngle = lerpAngle(segAngle, nextSegAngle, cornerBlend)

    if (!camInitRef.current) {
      camInitRef.current = true
      camAngleRef.current = segAngle
      group.current.rotation.y = segAngle
      lookAtRef.current.set(curX + Math.sin(segAngle) * 14, 4.5, curZ + Math.cos(segAngle) * 14)
    }

    const charSmooth = 1 - Math.exp(-delta * 10)
    const camAngleSmooth = 1 - Math.exp(-delta * 3.4)
    const camPosSmooth = 1 - Math.exp(-delta * 5.2)
    const camLookSmooth = 1 - Math.exp(-delta * 6.5)

    group.current.position.set(curX, 0.45 + hopHeight, curZ)
    group.current.rotation.y = lerpAngle(group.current.rotation.y, desiredAngle, charSmooth)
    camAngleRef.current = lerpAngle(camAngleRef.current, desiredAngle, camAngleSmooth)

    // Cámara orbital suave detrás del muñeco sin tirones en giros de 90°
    const back = 33
    const height = 26
    const ahead = 14
    const ca = camAngleRef.current
    camPosGoalRef.current.set(curX - Math.sin(ca) * back, height, curZ - Math.cos(ca) * back)
    camera.position.lerp(camPosGoalRef.current, camPosSmooth)

    const desiredLook = new THREE.Vector3(curX + Math.sin(ca) * ahead, 4.5, curZ + Math.cos(ca) * ahead)
    lookAtRef.current.lerp(desiredLook, camLookSmooth)
    camera.lookAt(lookAtRef.current)

    // Tan pronto aterriza en el cuadro (jumpPhase >= 0.85), ese cuadro amarillo desaparece
    const landedStep = finished ? totalSteps : jumpPhase >= 0.85 ? stepIdx + 1 : stepIdx
    if (landedStep !== lastStepHud.current && running) {
      lastStepHud.current = landedStep
      const remSteps = Math.max(0, totalSteps - landedStep)
      const remMeters = remSteps * 10
      const remMins = remMeters === 0 ? 0 : Math.max(1, Math.ceil((remMeters / Math.max(10, totalMeters)) * totalMinutes))
      update(landedStep / totalSteps, remMeters, remMins, landedStep)
    }
  })

  return (
    <group ref={group}>
      <StylizedPerson limbRefs={limbRefs} />
    </group>
  )
}
