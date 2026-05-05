import React, { useState } from 'react'
import { pinAPI } from '../services/api.js'


export default function ProfileView({ usuario, token, onVerHistorial }) {
  const [seccion, setSeccion] = useState(null) // null | 'cambiarPin'
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [paso, setPaso] = useState(1) // 1 = pin actual, 2 = pin nuevo
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)


  const handlePinActual = async () => {
    if (pinActual.length !== 4 || isNaN(pinActual)) {
      setError('El PIN debe ser de 4 dígitos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await pinAPI.verificar(token, pinActual)
      setPaso(2)
    } catch {
      setError('PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }


  const handlePinNuevo = async () => {
    if (pinNuevo.length !== 4 || isNaN(pinNuevo)) {
      setError('El PIN debe ser de 4 dígitos')
      return
    }
    if (pinNuevo === pinActual) {
      setError('El PIN nuevo debe ser diferente al actual')
      return
    }
    setLoading(true)
    setError('')
    try {
      await pinAPI.cambiar(token, pinActual, pinNuevo)
      setMensaje('✅ PIN actualizado correctamente')
      setSeccion(null)
      setPinActual('')
      setPinNuevo('')
      setPaso(1)
    } catch {
      setError('No se pudo cambiar el PIN, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }


  const abrirKueski = () => {
    chrome.tabs.create({ url: 'https://preguntas.frecuentes.kueski.com/hc/es/categories/14632860970907-Kueski-Pay' })
  }


  // — Vista cambiar PIN —
  if (seccion === 'cambiarPin') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={() => { setSeccion(null); setPaso(1); setError(''); setPinActual(''); setPinNuevo('') }}
        style={{ background: 'none', color: 'var(--kueski-text-muted)', fontSize: 13, textAlign: 'left' }}>
        ← Volver
      </button>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>
          {paso === 1 ? 'Ingresa tu PIN actual' : 'Ingresa tu PIN nuevo'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', marginTop: 4 }}>
          {paso === 1 ? 'Necesitamos verificar tu identidad' : 'Elige un PIN de 4 dígitos'}
        </div>
      </div>

      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={paso === 1 ? pinActual : pinNuevo}
        onChange={e => paso === 1 ? setPinActual(e.target.value) : setPinNuevo(e.target.value)}
        placeholder="••••"
        style={{
          textAlign: 'center', fontSize: 28, letterSpacing: 12,
          padding: '14px', borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--kueski-border)',
          background: 'var(--kueski-surface)', color: 'var(--kueski-text)',
        }}
      />

      {error && <div style={{ color: 'var(--kueski-danger)', fontSize: 12, textAlign: 'center' }}>{error}</div>}

      <button className="btn-primary" disabled={loading}
        onClick={paso === 1 ? handlePinActual : handlePinNuevo}>
        {loading ? 'Verificando...' : paso === 1 ? 'Continuar' : 'Guardar PIN nuevo'}
      </button>
    </div>
  )


  // — Vista principal del perfil —
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {mensaje && (
        <div style={{ background: 'rgba(0,176,80,0.1)', border: '1px solid rgba(0,176,80,0.3)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: 'var(--kueski-primary)', fontSize: 13, textAlign: 'center' }}>
          {mensaje}
        </div>
      )}

      {/* Datos del usuario */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Cuenta
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>Nombre</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--kueski-text)' }}>
              {usuario?.nombre} {usuario?.apellido || ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>Correo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--kueski-text)' }}>
              {usuario?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Seguridad
        </div>
        <button onClick={() => { setSeccion('cambiarPin'); setMensaje('') }} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
        }}>
          <span>🔒 Cambiar PIN</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
      </div>

      {/* Accesos rápidos */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Accesos rápidos
        </div>
        <button onClick={onVerHistorial} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
          borderBottom: '1px solid var(--kueski-border)',
        }}>
          <span>🧾 Mis compras</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
        <button onClick={abrirKueski} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
        }}>
          <span>❓ Centro de ayuda</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
      </div>

    </div>
  )
}