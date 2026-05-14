import { useState } from 'react'
import { API } from '../services/api.js'

export default function LoginView({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', nombre: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const inputStyle = {
    width: '100%',
    height: 48,
    padding: '0 14px',
    background: '#fff',
    border: '1.5px solid #c9ccd3',
    borderRadius: 13,
    color: '#242733',
    fontSize: 15,
    fontWeight: 400,
    outline: 'none',
  }

  const validarFormulario = () => {
    const email = form.email.trim()
    const password = form.password.trim()
    const nombre = form.nombre.trim()

    if (tab === 'register' && nombre.length < 3) {
      return 'Ingresa tu nombre completo'
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
        : { nombre: form.nombre.trim(), email: form.email.trim(), password: form.password.trim() }

      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Error')

      if (tab === 'login') {
        onLogin(data.token, data.usuario)
      } else {
        setTab('login')
        setError('Cuenta creada, inicia sesión')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: 500,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '26px 30px 24px',
      color: '#242733',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img
          src="/kueski_logo.png"
          alt="Kueski"
          style={{ width: 128, height: 'auto', marginBottom: 26 }}
        />

        <h1 style={{
          color: '#242733',
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
          <input
            style={inputStyle}
            placeholder="Nombre completo*"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
          />
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
              color: '#686b76',
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
            background: '#0874ff',
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
          color: '#242733',
          fontSize: 14,
          marginTop: 9,
        }}>
          <span>{tab === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}</span>
          <button
            type="button"
            onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError('') }}
            style={{
              background: 'transparent',
              color: '#0874ff',
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
