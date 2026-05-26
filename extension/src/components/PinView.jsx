import { useState } from 'react'
import { pinAPI } from '../services/api.js'

export default function PinView({ token, onSuccess, onCancel, monto, quincenas }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!/^\d{4}$/.test(pin)) return setError('El PIN debe tener 4 dígitos')
    setLoading(true)
    setError('')
    try {
      await pinAPI.verificar(token, pin)
      onSuccess(pin)
    } catch (e) {
      setError('PIN incorrecto, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Resumen de compra */}
      <div style={{
        background: 'var(--kueski-blue)', borderRadius: 'var(--radius-md)',
        padding: '20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
          CONFIRMANDO COMPRA
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>
          ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: 13, color: 'var(--kueski-primary)', marginTop: 4 }}>
          en {quincenas} quincenas
        </div>
      </div>

      {/* Input PIN */}
      <div style={{
        background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
        padding: '20px', border: '1px solid var(--kueski-border)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--kueski-text-muted)', marginBottom: 12 }}>
          INGRESA TU PIN DE SEGURIDAD
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            width: '100%', padding: '14px', textAlign: 'center',
            fontSize: 24, letterSpacing: 8,
            background: 'var(--kueski-surface-2)',
            border: '1.5px solid var(--kueski-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--kueski-blue)',
          }}
        />
        {error && (
          <div style={{ color: 'var(--kueski-danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>

      <button className="btn-primary" onClick={handleSubmit} disabled={loading || pin.length !== 4}>
        {loading ? 'Verificando...' : 'Confirmar compra'}
      </button>
      <button className="btn-secondary" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  )
}
