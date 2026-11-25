import { useState } from 'react'
import { Screen } from '../components/Screen'
import { IconLogo } from '../components/icons'
import {
  checkAuthorizedStudent,
  isSupabaseConfigured,
  sendInstitutionalOtp,
  signInAnonymouslyInSupabase,
  signInWithGoogleInstitutional,
  signInWithPasswordInSupabase,
  verifyInstitutionalOtp,
} from '../lib/supabase'
import { useParkit } from '../store/useParkit'

const INSTITUTIONAL_DOMAIN = '@correo.unicordoba.edu.co'

const inputCls =
  'h-[50px] w-full rounded-[16px] border-2 border-white/40 bg-white/95 px-4 text-[15px] font-extrabold text-ink placeholder:text-ink/40'

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

export function LoginScreen() {
  const setAuthUser = useParkit((s) => s.setAuthUser)
  const showToast = useParkit((s) => s.showToast)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [studentName, setStudentName] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedEmail = email.trim().toLowerCase()

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!normalizedEmail.endsWith(INSTITUTIONAL_DOMAIN)) {
      setError(`Usa tu correo ${INSTITUTIONAL_DOMAIN}`)
      return
    }
    if (password.length < 6) {
      setError('Contraseña de mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const student = await checkAuthorizedStudent(normalizedEmail)
        if (!student) {
          setError('Correo no autorizado')
          return
        }
        setStudentName(student.nombre)

        const passRes = await signInWithPasswordInSupabase(normalizedEmail, password)
        if (!passRes.ok) {
          setError(passRes.error)
          return
        }

        const otpRes = await sendInstitutionalOtp(normalizedEmail)
        if (!otpRes.ok) {
          setError(otpRes.error ?? 'No se pudo enviar el código')
          return
        }
      } else {
        setStudentName('Estudiante Demo')
        showToast('Modo local: el código es 123456')
      }
      setOtpStep(true)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const token = otpCode.trim()
    if (token.length !== 6) {
      setError('El código tiene 6 dígitos')
      return
    }

    setLoading(true)
    try {
      let userId = normalizedEmail
      if (isSupabaseConfigured) {
        const res = await verifyInstitutionalOtp(normalizedEmail, token)
        if (!res.ok) {
          setError('Código incorrecto o vencido')
          return
        }
        userId = res.userId ?? normalizedEmail
      } else if (token !== '123456') {
        setError('Código incorrecto')
        return
      }
      setAuthUser({ id: userId, role: 'student', email: normalizedEmail, name: studentName })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Google no disponible en modo local')
      return
    }
    setLoading(true)
    try {
      const res = await signInWithGoogleInstitutional()
      if (!res.ok) setError(res.error ?? 'No se pudo iniciar con Google')
    } finally {
      setLoading(false)
    }
  }

  const handleVisitor = async () => {
    setLoading(true)
    setError(null)
    try {
      const anonId = isSupabaseConfigured ? await signInAnonymouslyInSupabase() : null
      setAuthUser({ id: anonId ?? `visitante-${Date.now()}`, role: 'visitor', name: 'Visitante' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen label="Acceso a PARKIT" noNav>
      <div className="relative z-10 flex flex-1 flex-col justify-center px-5 py-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[22px] bg-sun shadow-[0_8px_20px_rgba(217,164,0,0.32),inset_0_2px_1px_rgba(255,255,255,.8)]">
            <IconLogo className="h-12 w-12" />
          </div>
          <h1 className="mt-3 font-display text-[40px] leading-none tracking-wide text-ink-deep">PARKIT</h1>
          <p className="mt-1 text-[13.5px] font-extrabold text-ink/75">
            Tu moto en su lugar, antes de llegar.
          </p>
        </div>

        <section className="lg-card mt-5 rounded-[28px] p-5 text-white">
          {!otpStep ? (
            <form onSubmit={handleCredentials} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                aria-label="Correo institucional"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@correo.unicordoba.edu.co"
                className={inputCls}
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                aria-label="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className={inputCls}
              />
              {error && (
                <p className="rounded-[12px] bg-[#9E1C20]/90 px-3 py-2 text-[12.5px] font-extrabold text-white">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="lg-btn-sun flex h-[52px] w-full items-center justify-center rounded-full text-[16px] font-black disabled:opacity-60"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>

              <div className="flex items-center gap-3 py-0.5">
                <span className="h-px flex-1 bg-white/30" />
                <span className="text-[12px] font-black text-white/75">o</span>
                <span className="h-px flex-1 bg-white/30" />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogle}
                className="lg-surface flex h-[50px] w-full items-center justify-center gap-3 rounded-full text-[15px] font-black text-ink disabled:opacity-60"
              >
                <GoogleLogo className="h-5 w-5" />
                Continuar con Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-center text-[13px] font-extrabold text-white/90">Código enviado a {normalizedEmail}</p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                aria-label="Código de 6 dígitos"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-[60px] w-full rounded-[16px] border-2 border-white/40 bg-white/95 text-center font-display text-[30px] tracking-[0.4em] text-ink placeholder:text-ink/30"
              />
              {error && (
                <p className="rounded-[12px] bg-[#9E1C20]/90 px-3 py-2 text-[12.5px] font-extrabold text-white">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="lg-btn-sun flex h-[52px] w-full items-center justify-center rounded-full text-[16px] font-black disabled:opacity-60"
              >
                {loading ? 'Verificando…' : 'Verificar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpStep(false)
                  setOtpCode('')
                  setError(null)
                }}
                className="h-[36px] w-full text-[13px] font-extrabold text-white/85 underline"
              >
                Volver
              </button>
            </form>
          )}
        </section>

        <button
          type="button"
          disabled={loading}
          onClick={handleVisitor}
          className="lg-surface mt-5 flex h-[52px] w-full items-center justify-center rounded-full text-[15px] font-black text-ink disabled:opacity-60"
        >
          Soy visitante
        </button>
      </div>
    </Screen>
  )
}
