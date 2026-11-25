import { useEffect, useState } from 'react'
import { Screen } from '../components/Screen'
import { IconLogo } from '../components/icons'
import { fetchPerfil, isSupabaseConfigured, upsertPerfil, uploadComprobante, type PerfilRow } from '../lib/supabase'
import { useParkit } from '../store/useParkit'
import { useNav } from '../store/useNav'
import type { DocType, Ownership, Profile } from '../domain/types'

const BRANDS = ['Honda', 'Yamaha', 'Suzuki', 'AKT', 'Bajaj', 'TVS', 'Hero', 'Kawasaki', 'Victory', 'Otra']
const STEPS = ['Tus datos', 'Tu moto', 'Comprobantes'] as const

type DocKind = 'propiedad' | 'soat' | 'foto'
const DOC_ITEMS: { kind: DocKind; label: string }[] = [
  { kind: 'propiedad', label: 'Tarjeta de propiedad' },
  { kind: 'soat', label: 'SOAT vigente' },
  { kind: 'foto', label: 'Foto de la moto con placa' },
]

const baseFieldCls =
  'h-[50px] rounded-[16px] border-[3px] border-card/25 bg-white px-4 text-[15px] font-extrabold text-ink placeholder:text-ink/40 focus:border-card'
const inputCls = `w-full ${baseFieldCls}`

function rowToProfile(row: PerfilRow): Profile {
  return {
    fullName: row.nombre_completo,
    docType: row.tipo_documento as DocType,
    docNumber: row.numero_documento,
    phone: row.celular,
    plate: row.placa,
    brand: row.marca,
    model: row.modelo ?? '',
    color: row.color,
    ownership: row.relacion_vehiculo,
    docs: { propiedad: row.comprobante_propiedad, soat: row.comprobante_soat, foto: row.foto_moto },
    verification: row.estado_verificacion,
  }
}

export function OnboardingScreen() {
  const authUser = useParkit((s) => s.authUser)
  const setProfile = useParkit((s) => s.setProfile)
  const showToast = useParkit((s) => s.showToast)
  const logout = useParkit((s) => s.logout)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState(authUser?.role === 'student' ? (authUser.name ?? '') : '')
  const [docType, setDocType] = useState<DocType>('CC')
  const [docNumber, setDocNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('Honda')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [ownership, setOwnership] = useState<Ownership>('propia')
  const [files, setFiles] = useState<Record<DocKind, File | null>>({ propiedad: null, soat: null, foto: null })

  useEffect(() => {
    if (!isSupabaseConfigured || !authUser) return
    let alive = true
    void fetchPerfil(authUser.id)
      .then((row) => {
        if (alive && row) setProfile(rowToProfile(row))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [authUser, setProfile])

  const validateStep = (): string | null => {
    if (step === 0) {
      if (fullName.trim().split(/\s+/).length < 2) return 'Escribe nombre y apellido'
      if (!/^\d{5,12}$/.test(docNumber.trim()) && docType !== 'PAS') return 'Número de documento inválido'
      if (!/^3\d{9}$/.test(phone.replace(/\D/g, ''))) return 'Celular de 10 dígitos (3XX…)'
    }
    if (step === 1) {
      if (!/^[A-Z]{3}\d{2}[A-Z]?$/.test(plate)) return 'Placa inválida (ej. ABC12D)'
      if (!color.trim()) return 'Indica el color'
    }
    return null
  }

  const next = () => {
    const err = validateStep()
    setError(err)
    if (!err) setStep((s) => s + 1)
  }

  const finish = async () => {
    if (!authUser) return
    setSaving(true)
    setError(null)
    try {
      const docs: Profile['docs'] = { propiedad: null, soat: null, foto: null }
      for (const { kind } of DOC_ITEMS) {
        const file = files[kind]
        if (!file) continue
        const path = isSupabaseConfigured ? await uploadComprobante(authUser.id, kind, file) : null
        docs[kind] = path ?? file.name
      }

      const profile: Profile = {
        fullName: fullName.trim(),
        docType,
        docNumber: docNumber.trim(),
        phone: phone.replace(/\D/g, ''),
        plate,
        brand,
        model: model.trim(),
        color: color.trim(),
        ownership,
        docs,
        verification: 'pendiente',
      }

      if (isSupabaseConfigured) {
        const ok = await upsertPerfil({
          usuario_id: authUser.id,
          rol: authUser.role,
          email: authUser.email ?? null,
          nombre_completo: profile.fullName,
          tipo_documento: profile.docType,
          numero_documento: profile.docNumber,
          celular: profile.phone,
          placa: profile.plate,
          marca: profile.brand,
          modelo: profile.model || null,
          color: profile.color,
          relacion_vehiculo: profile.ownership,
          comprobante_propiedad: docs.propiedad,
          comprobante_soat: docs.soat,
          foto_moto: docs.foto,
          estado_verificacion: 'pendiente',
        })
        if (!ok) {
          showToast('Perfil guardado en este dispositivo (falta ejecutar 002_perfiles.sql en Supabase).')
        }
      }
      useNav.getState().go('inicio', 'tab')
      setProfile(profile)
    } finally {
      setSaving(false)
    }
  }

  if (!authUser) return null

  return (
    <Screen label="Registro" noNav>
      <div className="relative z-10 flex min-h-full flex-col px-5 pb-10 pt-[calc(32px+env(safe-area-inset-top,0px))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-sun shadow-[inset_0_1.5px_1px_rgba(255,255,255,.75)]">
              <IconLogo className="h-7 w-7" />
            </div>
            <span className="font-display text-[28px] leading-none tracking-wide text-ink-deep">PARKIT</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="lg-surface flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-black text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>
        </div>

        <div className="mt-6 flex gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span key={i} className={`h-[6px] flex-1 rounded-full ${i <= step ? 'bg-sun' : 'bg-card/20'}`} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-display text-[28px] leading-none text-ink-deep">{STEPS[step]}</h1>
          {step === 2 && (
            <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-black tracking-wider text-sun">BETA</span>
          )}
        </div>

        <section className="lg-panel mt-4 space-y-3 rounded-[24px] p-4">
          {step === 0 && (
            <>
              <input
                aria-label="Nombre completo"
                placeholder="Nombre completo"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputCls}
              />
              <div className="flex gap-2">
                <select
                  aria-label="Tipo de documento"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                  className={`${baseFieldCls} w-[84px] shrink-0 px-2.5`}
                >
                  <option value="CC">CC</option>
                  <option value="TI">TI</option>
                  <option value="CE">CE</option>
                  <option value="PAS">PAS</option>
                </select>
                <input
                  aria-label="Número de documento"
                  placeholder="Número de documento"
                  inputMode="numeric"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value.replace(/[^\dA-Za-z]/g, ''))}
                  className={`${baseFieldCls} min-w-0 flex-1`}
                />
              </div>
              <input
                aria-label="Celular"
                placeholder="Celular"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className={inputCls}
              />
            </>
          )}

          {step === 1 && (
            <>
              <input
                aria-label="Placa"
                placeholder="Placa (ABC12D)"
                maxLength={6}
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className={`${inputCls} text-center font-display text-[24px] tracking-[0.2em]`}
              />
              <div className="flex gap-2">
                <select
                  aria-label="Marca"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={`${baseFieldCls} w-[132px] shrink-0 px-3`}
                >
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Modelo"
                  placeholder="Modelo"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={`${baseFieldCls} min-w-0 flex-1`}
                />
              </div>
              <input
                aria-label="Color"
                placeholder="Color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={inputCls}
              />
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="La moto es">
                {(['propia', 'familiar', 'prestada'] as Ownership[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={ownership === o}
                    onClick={() => setOwnership(o)}
                    className="seg seg-sm capitalize"
                    aria-pressed={ownership === o}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 &&
            DOC_ITEMS.map(({ kind, label }) => {
              const file = files[kind]
              return (
                <label
                  key={kind}
                  className={`flex h-[58px] cursor-pointer items-center gap-3 rounded-[16px] border-[3px] px-4 ${
                    file ? 'border-free bg-[#E9F8EF]' : 'border-dashed border-card/40 bg-white'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-black ${
                      file ? 'bg-free text-white' : 'bg-card/15 text-card'
                    }`}
                  >
                    {file ? '✓' : '+'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-black text-ink">{label}</span>
                    {file && <span className="block truncate text-[11.5px] font-bold text-free-deep">{file.name}</span>}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture={kind === 'foto' ? 'environment' : undefined}
                    className="sr-only"
                    onChange={(e) => setFiles((f) => ({ ...f, [kind]: e.target.files?.[0] ?? null }))}
                  />
                </label>
              )
            })}
        </section>

        {error && (
          <p className="mt-3 rounded-[12px] bg-[#9E1C20] px-3 py-2 text-[12.5px] font-extrabold text-white">{error}</p>
        )}

        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setError(null)
                setStep((s) => s - 1)
              }}
              className="lg-surface h-[54px] w-[110px] shrink-0 rounded-full text-[15px] font-black text-ink"
            >
              Atrás
            </button>
          )}
          {step < 2 ? (
            <button
              type="button"
              onClick={next}
              className="lg-btn-sun h-[54px] flex-1 rounded-full text-[16px] font-black"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={finish}
              className="lg-btn-sun h-[54px] flex-1 rounded-full text-[16px] font-black disabled:opacity-60"
            >
              {saving ? 'Guardando…' : Object.values(files).some(Boolean) ? 'Finalizar' : 'Omitir y finalizar'}
            </button>
          )}
        </div>
      </div>
    </Screen>
  )
}
