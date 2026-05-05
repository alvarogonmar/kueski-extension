import React, { useState } from 'react'
import { API } from '../services/api.js'

export default function LoginView({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', nombre: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'var(--kueski-surface)',
    border: '1.5px solid var(--kueski-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--kueski-text)',
    fontSize: 14, marginBottom: 10,
    outline: 'none',
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register'
      const body = tab === 'login'
        ? { email: form.email, password: form.password }
        : { nombre: form.nombre, email: form.email, password: form.password }

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
    <div style={{ background: 'var(--kueski-bg)', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{ background: 'var(--kueski-blue)', padding: '36px 24px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 4 }}>
          kueski <span style={{ color: 'var(--kueski-primary)' }}>pay</span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Compra hoy, paga en quincenas
        </div>
      </div>

      <div style={{ padding: '24px 20px', flex: 1 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--kueski-surface)', borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 20 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px', borderRadius: 6, fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--kueski-blue)' : 'transparent',
              color: tab === t ? 'white' : 'var(--kueski-text-muted)',
              transition: 'all 0.15s',
            }}>
              {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {tab === 'register' && (
          <input style={inputStyle} placeholder="Nombre completo"
            value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
        )}
        <input style={inputStyle} type="email" placeholder="Correo electrónico"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input style={inputStyle} type="password" placeholder="Contraseña"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

        {error && (
          <div style={{ color: error.includes('creada') ? 'var(--kueski-success)' : 'var(--kueski-danger)', fontSize: 12, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Cargando...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </div>
    </div>
  )
}