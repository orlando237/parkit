import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneTarget } from './GuideScene'

function DestPin({ target, running, finished }: { target: SceneTarget; running: boolean; finished: boolean }) {
  const { camera, size } = useThree()
  const vec = useMemo(() => new THREE.Vector3(target.x, 12.5, target.z), [target.x, target.z])

  const host = useMemo(() => {
    if (typeof document === 'undefined') return null
    const d = document.createElement('div')
    d.className = 'dest-pin'
    d.dataset.visible = 'false'
    d.setAttribute('role', 'status')
    d.innerHTML =
      '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h8l2-5M8 17l3-6h4M14 11l1-4h3"/></svg>'
    const span = document.createElement('span')
    span.textContent = `Tu moto ${target.id}`
    d.appendChild(span)
    return d
  }, [target.id])

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
    host.style.left = `${Math.max(62, Math.min(size.width - 62, x))}px`
    host.style.top = `${Math.max(48, Math.min(size.height - 64, y))}px`
    host.dataset.visible = v.z < 1 && (running || finished) ? 'true' : 'false'
  })

  return null
}

export function DestPinBridge({ target, running, finished }: { target: SceneTarget; running: boolean; finished: boolean }) {
  const ref = useRef<THREE.Group>(null)
  return (
    <group ref={ref} visible={false}>
      <DestPin target={target} running={running} finished={finished} />
    </group>
  )
}
