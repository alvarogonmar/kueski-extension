import React, { useEffect, useState } from 'react'
import { tokensAPI, comerciosAPI } from '../services/api.js'

export default function CvvView({ token, pin, comercio, monto, quincenas, onDone }) {
  const [cvv, setCvv] = useState(null)
  const [tokenId, setTokenId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [segundos, setSegundos] = useState(120)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const generar = async () => {
      try {
        let comercio_id = 1
        if (comercio?.dominio) {
          try {
            const comercioData = await comerciosAPI.porDominio(comercio.dominio)
            comercio_id = comercioData.id
          } catch {}
        }

        const data = await tokensAPI.generar(token, pin, comercio_id, monto, quincenas)
        const cvvGenerado = String(data.token_pago.id).padStart(6, '0')
        setCvv(cvvGenerado)
        setTokenId(data.token_pago.id)
      } catch (e) {
        setError('No se pudo generar el CVV, intenta de nuevo')
      } finally {
        setLoading(false)
      }
    }
    generar()
  }, [])

  // Countdown 2 minutos
  useEffect(() => {
    if (!cvv) return
    const interval = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [cvv])

  const handleConfirmar = async () => {
    try {
      await tokensAPI.canjear(token, tokenId)
    } catch {}
    onDone()
  }

  const copiarCvv = () => {
    navigator.clipboard.writeText(cvv)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const minutos = Math.floor(segundos / 60)
  const segs = segundos % 60

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ color: 'var(--kueski-primary)', fontSize: 32 }}>⬡</div>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
      <div style={{ color: 'var(--kueski-danger)', fontWeight: 600 }}>{error}</div>
      <button className="btn-secondary" style={{ marginTop: 16 }} onClick={onDone}>Volver</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Estado del CVV — sin mostrar el número */}
      <div style={{
        background: segundos > 30 ? 'rgba(0,176,80,0.08)' : 'rgba(239,68,68,0.08)',
        borderRadius: 'var(--radius-md)', padding: '28px 20px',
        border: `1.5px solid ${segundos > 30 ? 'rgba(0,176,80,0.3)' : 'rgba(239,68,68,0.4)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--kueski-blue)', marginBottom: 6 }}>
          CVV Virtual generado
        </div>
        <div style={{ fontSize: 13, color: 'var(--kueski-text-muted)', marginBottom: 12 }}>
          Cópialo y úsalo al pagar con tu tarjeta Kueski Pay
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: segundos > 30 ? 'var(--kueski-primary)' : 'var(--kueski-danger)'
        }}>
          ⏱ Expira en {minutos}:{segs.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Resumen de compra */}
      <div style={{
        background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
        padding: '14px 16px', border: '1px solid var(--kueski-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, color: 'var(--kueski-text-muted)' }}>
          ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} · {quincenas} quincenas
        </span>
        <span className="tag tag-success">{comercio?.nombre || 'Tienda'}</span>
      </div>

      {/* Instrucciones */}
      <div style={{
        background: 'var(--kueski-surface-2)', borderRadius: 'var(--radius-md)',
        padding: '14px 16px', border: '1px solid var(--kueski-border)',
        fontSize: 12, color: 'var(--kueski-text-muted)', lineHeight: 1.8,
      }}>
        1. Copia el CVV con el botón de abajo<br />
        2. Úsalo al pagar con tu tarjeta Kueski Pay<br />
        3. Regresa y confirma tu compra
      </div>

      <button className="btn-secondary" onClick={copiarCvv} disabled={segundos === 0}>
        {copiado ? '✅ CVV copiado!' : '📋 Copiar CVV'}
      </button>

      <button className="btn-primary" onClick={handleConfirmar} disabled={segundos === 0}>
        {segundos === 0 ? 'CVV expirado' : 'Ya pagué — Confirmar compra ✅'}
      </button>

    </div>
  )
}