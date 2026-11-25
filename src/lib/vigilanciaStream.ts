import type { RealtimeChannel } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { GuardAlert } from '../domain/types'
import { useParkit } from '../store/useParkit'
import { supabase } from './supabase'

export type VigilanciaSignal =
  | { type: 'alert-new'; alert: GuardAlert; senderId: string }
  | { type: 'alert-update'; alert: GuardAlert; senderId: string }
  | { type: 'guard-hello'; senderId: string }
  | { type: 'student-hello'; alert: GuardAlert; senderId: string }
  | { type: 'webrtc-ready'; alertId: string; senderId: string }
  | { type: 'webrtc-offer'; alertId: string; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: 'webrtc-answer'; alertId: string; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: 'webrtc-ice'; alertId: string; candidate: RTCIceCandidateInit; senderId: string }
  | { type: 'video-frame'; alertId: string; dataUrl: string; ts: number; senderId: string }
  | { type: 'stream-stop'; alertId: string; senderId: string }

const CHANNEL_NAME = 'parkit-vigilancia-v1'
const LOCAL_BC_NAME = 'parkit-vigilancia-local-v1'

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function createClientId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export interface VigilanciaBus {
  clientId: string
  send: (msg: VigilanciaSignal) => void
  close: () => void
}

export function connectVigilanciaBus(
  prefix: 'student' | 'guard',
  onMessage: (msg: VigilanciaSignal) => void,
  onStatus?: (connected: boolean) => void,
): VigilanciaBus {
  const clientId = createClientId(prefix)
  let supaChannel: RealtimeChannel | null = null
  let supaReady = false
  let localBc: BroadcastChannel | null = null
  const pendingOutbox: VigilanciaSignal[] = []

  const seenFrameTs = { last: 0 }

  const handleIncoming = (msg: VigilanciaSignal) => {
    if (!msg || msg.senderId === clientId) return
    if (msg.type === 'video-frame') {
      if (msg.ts <= seenFrameTs.last) return
      seenFrameTs.last = msg.ts
    }
    onMessage(msg)
  }

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      localBc = new BroadcastChannel(LOCAL_BC_NAME)
      localBc.onmessage = (ev: MessageEvent<VigilanciaSignal>) => {
        handleIncoming(ev.data)
      }
    } catch {
      localBc = null
    }
  }

  if (supabase) {
    supaChannel = supabase.channel(CHANNEL_NAME, {
      config: {
        broadcast: { self: false, ack: false },
      },
    })

    supaChannel
      .on('broadcast', { event: 'sig' }, ({ payload }) => {
        handleIncoming(payload as VigilanciaSignal)
      })
      .subscribe((status) => {
        supaReady = status === 'SUBSCRIBED'
        onStatus?.(supaReady || Boolean(localBc))
        if (supaReady && pendingOutbox.length > 0) {
          const copy = pendingOutbox.splice(0, pendingOutbox.length)
          for (const item of copy) {
            void supaChannel?.send({ type: 'broadcast', event: 'sig', payload: item })
          }
        }
      })
  } else {
    onStatus?.(Boolean(localBc))
  }

  const send = (msg: VigilanciaSignal) => {
    try {
      localBc?.postMessage(msg)
    } catch {
      // ignore local broadcast error
    }
    if (supaChannel) {
      if (supaReady) {
        void supaChannel.send({
          type: 'broadcast',
          event: 'sig',
          payload: msg,
        })
      } else if (msg.type !== 'video-frame') {
        pendingOutbox.push(msg)
      }
    }
  }

  const close = () => {
    try {
      localBc?.close()
    } catch {
      // ignore
    }
    if (supaChannel && supabase) {
      void supabase.removeChannel(supaChannel)
    }
  }

  return { clientId, send, close }
}

export function playAlertBeep() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime
    ;[587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.001, now + idx * 0.16)
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.16 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + idx * 0.16)
      osc.stop(now + idx * 0.16 + 0.16)
    })
  } catch {
    // Silencioso si el navegador bloquea autoplay de audio
  }
}

interface StudentLiveState {
  busConnected: boolean
  remoteStream: MediaStream | null
  fallbackFrame: string | null
  webrtcConnected: boolean
  emitNewAlert: (alert: GuardAlert) => void
  emitAlertUpdate: (alert: GuardAlert) => void
  requestStream: (alertId: string) => void
  clearLiveMedia: () => void
  initStudentListener: () => () => void
}

let activeBus: VigilanciaBus | null = null
let studentPc: RTCPeerConnection | null = null
let pendingIce: RTCIceCandidateInit[] = []

function closeStudentPc() {
  if (studentPc) {
    try {
      studentPc.ontrack = null
      studentPc.onicecandidate = null
      studentPc.onconnectionstatechange = null
      studentPc.close()
    } catch {
      // ignore
    }
    studentPc = null
  }
  pendingIce = []
}

export const useVigilanciaLive = create<StudentLiveState>((set) => ({
  busConnected: false,
  remoteStream: null,
  fallbackFrame: null,
  webrtcConnected: false,

  emitNewAlert: (alert) => {
    if (!activeBus) return
    activeBus.send({ type: 'alert-new', alert, senderId: activeBus.clientId })
  },

  emitAlertUpdate: (alert) => {
    if (!activeBus) return
    activeBus.send({ type: 'alert-update', alert, senderId: activeBus.clientId })
  },

  requestStream: (alertId) => {
    if (!activeBus) return
    activeBus.send({ type: 'webrtc-ready', alertId, senderId: activeBus.clientId })
  },

  clearLiveMedia: () => {
    closeStudentPc()
    set({ remoteStream: null, fallbackFrame: null, webrtcConnected: false })
  },

  initStudentListener: () => {
    const bus = connectVigilanciaBus(
      'student',
      async (msg) => {
        const curAlert = useParkit.getState().activeAlert

        if (msg.type === 'guard-hello') {
          if (curAlert && (curAlert.status === 'pendiente' || curAlert.status === 'en_ronda')) {
            bus.send({ type: 'student-hello', alert: curAlert, senderId: bus.clientId })
          }
          return
        }

        if (msg.type === 'alert-update') {
          useParkit.getState().syncGuardAlert(msg.alert)
          if (msg.alert.status === 'atendida' || msg.alert.status === 'cancelada') {
            closeStudentPc()
            set({ remoteStream: null, fallbackFrame: null, webrtcConnected: false })
          }
          return
        }

        if (msg.type === 'stream-stop') {
          if (!curAlert || msg.alertId === curAlert.id) {
            closeStudentPc()
            set({ remoteStream: null, fallbackFrame: null, webrtcConnected: false })
          }
          return
        }

        if (msg.type === 'video-frame') {
          if (curAlert && msg.alertId === curAlert.id) {
            set({ fallbackFrame: msg.dataUrl })
          }
          return
        }

        if (msg.type === 'webrtc-offer') {
          if (!curAlert || msg.alertId !== curAlert.id) return
          try {
            closeStudentPc()
            const pc = new RTCPeerConnection(RTC_CONFIG)
            studentPc = pc

            pc.ontrack = (ev) => {
              const stream = ev.streams?.[0] ?? new MediaStream([ev.track])
              set({ remoteStream: stream, webrtcConnected: true })
            }

            pc.onicecandidate = (ev) => {
              if (ev.candidate) {
                bus.send({
                  type: 'webrtc-ice',
                  alertId: msg.alertId,
                  candidate: ev.candidate.toJSON(),
                  senderId: bus.clientId,
                })
              }
            }

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === 'connected') {
                set({ webrtcConnected: true })
              } else if (
                pc.connectionState === 'failed' ||
                pc.connectionState === 'disconnected' ||
                pc.connectionState === 'closed'
              ) {
                set({ webrtcConnected: false })
              }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            const queued = pendingIce.splice(0, pendingIce.length)
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            bus.send({
              type: 'webrtc-answer',
              alertId: msg.alertId,
              sdp: answer,
              senderId: bus.clientId,
            })
          } catch {
            // Si WebRTC falla, el stream JPEG por Realtime sigue mostrando el video en vivo
          }
          return
        }

        if (msg.type === 'webrtc-ice') {
          if (!curAlert || msg.alertId !== curAlert.id) return
          if (studentPc && studentPc.remoteDescription) {
            await studentPc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
          } else {
            pendingIce.push(msg.candidate)
          }
        }
      },
      (connected) => set({ busConnected: connected }),
    )

    activeBus = bus

    // Si ya había una alerta activa al recargar, anunciarla a cualquier guardia conectado
    const existing = useParkit.getState().activeAlert
    if (existing && (existing.status === 'pendiente' || existing.status === 'en_ronda')) {
      window.setTimeout(() => {
        bus.send({ type: 'student-hello', alert: existing, senderId: bus.clientId })
        if (existing.status === 'en_ronda') {
          bus.send({ type: 'webrtc-ready', alertId: existing.id, senderId: bus.clientId })
        }
      }, 450)
    }

    return () => {
      closeStudentPc()
      bus.close()
      if (activeBus === bus) activeBus = null
    }
  },
}))
