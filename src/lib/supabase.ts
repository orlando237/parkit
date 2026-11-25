import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { ReportState, SpotStatus, ZoneId } from '../domain/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('tu-proyecto') &&
    !SUPABASE_ANON_KEY.includes('tu-anon-key'),
)

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

export interface CupoRow {
  id: string
  zona_id: ZoneId
  subbloque: string
  sombra: boolean
  estado: SpotStatus
  reservado_hasta: string | null
  usuario_id: string | null
  placa: string | null
  updated_at: string
}

export interface ReporteRow {
  id: string
  zona_id: ZoneId
  estado_reportado: ReportState
  hay_sombra: boolean
  usuario_id: string | null
  creado_en: string
}

export interface EstudianteAutorizadoRow {
  email: string
  nombre: string
  programa: string
  activo: boolean
}

export async function expireRemoteReservations() {
  if (!supabase) return
  try {
    await supabase.rpc('liberar_cupos_expirados')
  } catch {
    // Silencioso si aún no existe la función RPC
  }
}

export async function fetchCupos(): Promise<CupoRow[] | null> {
  if (!supabase) return null
  await expireRemoteReservations()
  const { data, error } = await supabase.from('cupos').select('*').order('id')
  if (error || !data) return null
  return data as CupoRow[]
}

export async function fetchReportes(): Promise<ReporteRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('reportes')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(30)
  if (error || !data) return null
  return data as ReporteRow[]
}

export async function updateCupoInDb(
  spotId: string,
  patch: {
    estado: SpotStatus
    reservado_hasta?: string | null
    usuario_id?: string | null
    placa?: string | null
  },
) {
  if (!supabase) return false
  const { error } = await supabase
    .from('cupos')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', spotId)
  return !error
}

export async function insertReporteInDb(
  zonaId: ZoneId,
  estado: ReportState,
  haySombra: boolean,
  usuarioId?: string,
) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('reportes')
    .insert({
      zona_id: zonaId,
      estado_reportado: estado,
      hay_sombra: haySombra,
      usuario_id: usuarioId ?? null,
    })
    .select()
    .single()
  if (error || !data) return null
  return data as ReporteRow
}

export async function checkAuthorizedStudent(email: string): Promise<EstudianteAutorizadoRow | null> {
  if (!supabase) return null
  const clean = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('estudiantes_autorizados')
    .select('*')
    .eq('email', clean)
    .eq('activo', true)
    .maybeSingle()
  if (error || !data) return null
  return data as EstudianteAutorizadoRow
}

export async function signInWithPasswordInSupabase(email: string, password: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase no configurado' }
  const clean = email.trim().toLowerCase()
  const { error } = await supabase.auth.signInWithPassword({ email: clean, password })
  if (!error) return { ok: true as const }
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    const signUpRes = await supabase.auth.signUp({ email: clean, password })
    if (!signUpRes.error) return { ok: true as const }
    return { ok: false as const, error: 'Correo o contraseña incorrectos.' }
  }
  return { ok: false as const, error: error.message }
}

export async function isGoogleProviderEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY! },
    })
    if (!res.ok) return false
    const json = (await res.json()) as { external?: { google?: boolean } }
    return Boolean(json.external?.google)
  } catch {
    return false
  }
}

export interface PerfilRow {
  usuario_id: string
  rol: 'student' | 'visitor'
  email: string | null
  nombre_completo: string
  tipo_documento: string
  numero_documento: string
  celular: string
  placa: string
  marca: string
  modelo: string | null
  color: string
  relacion_vehiculo: 'propia' | 'familiar' | 'prestada'
  comprobante_propiedad: string | null
  comprobante_soat: string | null
  foto_moto: string | null
  estado_verificacion: 'pendiente' | 'verificado' | 'rechazado'
}

export async function fetchPerfil(userId: string): Promise<PerfilRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('perfiles').select('*').eq('usuario_id', userId).maybeSingle()
  if (error || !data) return null
  return data as PerfilRow
}

export async function upsertPerfil(row: PerfilRow): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('perfiles')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'usuario_id' })
  return !error
}

export async function uploadComprobante(
  userId: string,
  kind: 'propiedad' | 'soat' | 'foto',
  file: File,
): Promise<string | null> {
  if (!supabase) return null
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${userId}/${kind}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('comprobantes').upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  })
  return error ? null : path
}

export async function signInWithGoogleInstitutional() {
  if (!supabase) return { ok: false as const, error: 'Supabase no configurado' }
  const enabled = await isGoogleProviderEnabled()
  if (!enabled) {
    return { ok: false as const, error: 'El acceso con Google aún no está habilitado.' }
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: { hd: 'correo.unicordoba.edu.co' },
      redirectTo: window.location.origin,
    },
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function sendInstitutionalOtp(email: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase no configurado' }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function verifyInstitutionalOtp(email: string, token: string) {
  if (!supabase) return { ok: false as const, error: 'Supabase no configurado', userId: null }
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  })
  if (error) return { ok: false as const, error: error.message, userId: null }
  return { ok: true as const, userId: data.user?.id ?? null }
}

export async function signInAnonymouslyInSupabase() {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}

export function subscribeRealtime(
  onCupoChange: (row: CupoRow) => void,
  onReporteInsert: (row: ReporteRow) => void,
): (() => void) | null {
  if (!supabase) return null
  const channel: RealtimeChannel = supabase
    .channel('parkit-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cupos' },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onCupoChange(payload.new as CupoRow)
        }
      },
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reportes' },
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          onReporteInsert(payload.new as ReporteRow)
        }
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
