import { useRef, useState } from 'react'
import { API } from '../services/api.js'

const PENDING_2FA_KEY = 'kueski_pending_2fa'
const PENDING_2FA_TTL = 5 * 60 * 1000

const obtenerSesionPendiente = () => {
  const raw = localStorage.getItem(PENDING_2FA_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw)
    const expirada = Date.now() - Number(session.createdAt) > PENDING_2FA_TTL

    if (expirada) {
      localStorage.removeItem(PENDING_2FA_KEY)
      return null
    }

    return session
  } catch {
    localStorage.removeItem(PENDING_2FA_KEY)
    return null
  }
}

export default function LoginView({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', nombre: '', telefono: '' })
  const [smsCode, setSmsCode] = useState('')
  const [pendingSession, setPendingSession] = useState(obtenerSesionPendiente)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const smsInputRef = useRef(null)
  const verificationCode = '123456'

  const guardarSesionPendiente = (session) => {
    const payload = { ...session, createdAt: Date.now() }
    localStorage.setItem(PENDING_2FA_KEY, JSON.stringify(payload))
    setPendingSession(payload)
  }

  const borrarSesionPendiente = () => {
    localStorage.removeItem(PENDING_2FA_KEY)
    setPendingSession(null)
  }

  const inputStyle = {
    width: '100%',
    height: 48,
    padding: '0 14px',
    background: 'var(--kueski-surface)',
    border: '1.5px solid var(--kueski-border)',
    borderRadius: 13,
    color: 'var(--kueski-text)',
    fontSize: 15,
    fontWeight: 400,
    outline: 'none',
  }

  const validarFormulario = () => {
    const email = form.email.trim()
    const password = form.password.trim()
    const nombre = form.nombre.trim()
    const telefono = form.telefono.trim()

    if (tab === 'register' && nombre.length < 3) {
      return 'Ingresa tu nombre completo'
    }

    if (tab === 'register' && !/^\d{10}$/.test(telefono)) {
      return 'Ingresa un teléfono válido de 10 dígitos'
    }

    if (!email) {
      return 'Ingresa tu correo electrónico'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Ingresa un correo electrónico válido'
    }

    if (!password) {
      return 'Ingresa tu contraseña'
    }

    if (tab === 'register' && password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres'
    }

    return ''
  }

  const handleSubmit = async () => {
    const errorValidacion = validarFormulario()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setLoading(true); setError('')
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const body = tab === 'login'
        ? { email: form.email.trim(), password: form.password.trim() }
        : {
            nombre: form.nombre.trim(),
            telefono: form.telefono.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
          }

      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error')

      if (tab === 'login') {
        guardarSesionPendiente({ tipo: 'login', ...data })
        setSmsCode('')
        setError('')
      } else {
        guardarSesionPendiente({
          tipo: 'register',
          usuario: data.usuario,
          email: form.email.trim(),
          password: form.password.trim(),
        })
        setSmsCode('')
        setError('')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const verificarCodigo = async () => {
    if (!/^\d{6}$/.test(smsCode)) {
      setError('Ingresa el código de 6 dígitos')
      return
    }

    if (smsCode !== verificationCode) {
      setError('Código incorrecto')
      return
    }

    if (pendingSession.tipo === 'login') {
      localStorage.removeItem(PENDING_2FA_KEY)
      onLogin(pendingSession.token, pendingSession.usuario)
      return
    }

    setLoading(true)
    setError('')
    try {
      const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingSession.email,
          password: pendingSession.password,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error')
      localStorage.removeItem(PENDING_2FA_KEY)
      onLogin(data.token, data.usuario)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const regresarLogin = () => {
    borrarSesionPendiente()
    setSmsCode('')
    setError('')
  }

  const actualizarSmsCode = (value) => {
    setSmsCode(value.replace(/\D/g, '').slice(0, 6))
    if (error && !error.includes('reenviado')) setError('')
  }

  const focusSmsInput = () => {
    smsInputRef.current?.focus()
  }

  if (pendingSession) {
    const smsDigits = smsCode.padEnd(6, ' ').split('')
    const activeDigitIndex = Math.min(smsCode.length, 5)
    const isComplete = smsCode.length === 6

    return (
      <div style={{
        minHeight: 500,
        background: 'var(--kueski-surface)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '26px 30px 24px',
        color: 'var(--kueski-text)',
      }}>
        <div className="sms-verify-hero" style={{ textAlign: 'center', marginBottom: 22 }}>
          <img
            src="/kueski_logo.png"
            alt="Kueski"
            style={{ width: 116, height: 'auto', marginBottom: 18 }}
          />

          <div className="sms-phone-visual" aria-hidden="true">
            <div className="sms-phone">
              <span className="sms-phone-dot sms-phone-dot-a" />
              <span className="sms-phone-dot sms-phone-dot-b" />
              <span className="sms-phone-dot sms-phone-dot-c" />
              <div className="sms-bubble">
                <span />
                <span />
                <span />
              </div>
              <div className="sms-check">✓</div>
            </div>
          </div>

          <h1 style={{
            color: 'var(--kueski-text)',
            fontSize: 25,
            lineHeight: 1.1,
            fontWeight: 800,
            margin: 0,
          }}>
            Verifica tu identidad
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{
            color: 'var(--kueski-text-muted)',
            fontSize: 14,
            lineHeight: 1.5,
            textAlign: 'center',
            marginBottom: 4,
          }}>
            Enviamos un código de 6 dígitos por SMS. Se verificará automáticamente al completarlo.
          </div>

          <div
            className={`otp-group ${isComplete ? 'otp-complete' : ''}`}
            onClick={focusSmsInput}
            role="group"
            aria-label="Código SMS de 6 dígitos"
          >
            <input
              ref={smsInputRef}
              className="otp-hidden-input"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              aria-label="Código SMS"
              value={smsCode}
              onChange={e => actualizarSmsCode(e.target.value)}
            />
            {smsDigits.map((digit, index) => (
              <button
                key={index}
                type="button"
                className={`otp-box ${index === activeDigitIndex && !isComplete ? 'otp-active' : ''} ${digit.trim() ? 'otp-filled' : ''}`}
                onClick={focusSmsInput}
                aria-label={`Dígito ${index + 1}`}
              >
                {digit.trim() || (index === activeDigitIndex && <span className="otp-cursor" />)}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              color: error.includes('reenviado') ? 'var(--kueski-success)' : 'var(--kueski-danger)',
              fontSize: 12,
              lineHeight: 1.4,
              fontWeight: 600,
              padding: '0 4px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={verificarCodigo}
            disabled={loading || smsCode.length < 6}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 28,
              background: 'var(--kueski-primary)',
              color: 'white',
              fontSize: 17,
              fontWeight: 500,
              marginTop: 4,
              opacity: loading || smsCode.length < 6 ? 0.72 : 1,
            }}
          >
            {loading ? 'Verificando...' : 'Confirmar código'}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            color: 'var(--kueski-text)',
            fontSize: 14,
            marginTop: 9,
          }}>
            <button
              type="button"
              onClick={() => { setSmsCode(''); setError('Código reenviado') }}
              style={{
                background: 'transparent',
                color: 'var(--kueski-primary)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Reenviar código
            </button>
            <span style={{ color: 'var(--kueski-border)' }}>·</span>
            <button
              type="button"
              onClick={regresarLogin}
              style={{
                background: 'transparent',
                color: 'var(--kueski-primary)',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Cambiar cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: 500,
      background: 'var(--kueski-surface)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '26px 30px 24px',
      color: 'var(--kueski-text)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img
          src="/kueski_logo.png"
          alt="Kueski"
          style={{ width: 128, height: 'auto', marginBottom: 26 }}
        />

        <h1 style={{
          color: 'var(--kueski-text)',
          fontSize: 27,
          lineHeight: 1.1,
          fontWeight: 800,
          margin: 0,
        }}>
          {tab === 'login' ? 'Inicia sesión' : 'Crear cuenta'}
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {tab === 'register' && (
          <>
            <input
              style={inputStyle}
              placeholder="Nombre completo*"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
            <input
              style={inputStyle}
              inputMode="numeric"
              maxLength={10}
              placeholder="Teléfono*"
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </>
        )}

        <input
          style={inputStyle}
          type="email"
          placeholder="Correo electrónico*"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <div style={{ position: 'relative' }}>
          <input
            style={{ ...inputStyle, paddingRight: 44 }}
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña*"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              color: 'var(--kueski-text-muted)',
              width: 26,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            ◉
          </button>
        </div>

        {error && (
          <div style={{
            color: error.includes('creada') ? 'var(--kueski-success)' : 'var(--kueski-danger)',
            fontSize: 12,
            lineHeight: 1.4,
            fontWeight: 600,
            padding: '0 4px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 28,
            background: 'var(--kueski-primary)',
            color: 'white',
            fontSize: 17,
            fontWeight: 500,
            marginTop: 4,
            opacity: loading ? 0.75 : 1,
          }}
        >
          {loading ? 'Cargando...' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
          color: 'var(--kueski-text)',
          fontSize: 14,
          marginTop: 9,
        }}>
          <span>{tab === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
          <button
            type="button"
            onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); setSmsCode(''); borrarSesionPendiente() }}
            style={{
              background: 'transparent',
              color: 'var(--kueski-primary)',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {tab === 'login' ? 'Crear una cuenta' : 'Iniciar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
