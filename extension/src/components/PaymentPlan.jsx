import React, { useState, useEffect } from 'react'
import { calculadoraAPI } from '../services/api.js'

const OPCIONES_COMPLETAS = [2, 4, 6, 8, 10, 12]
const OPCIONES_LIMITADAS = [2, 4, 6]
const OPCIONES_BLOQUEADAS = []

const obtenerPersonalizacion = ({ nivelRiesgo, cuotasVencidas }) => {
  const vencidas = Number(cuotasVencidas) || 0

  if (nivelRiesgo === 'alto' || vencidas >= 3) {
    return {
      opciones: OPCIONES_BLOQUEADAS,
      titulo: 'Cuenta restringida',
      mensaje: 'Tienes pagos pendientes. Ponte al corriente para volver a comprar con Kueski Pay.',
      tono: 'danger',
    }
  }

  if (nivelRiesgo === 'medio' || vencidas > 0) {
    return {
      opciones: OPCIONES_LIMITADAS,
      titulo: 'Opciones ajustadas',
      mensaje: 'Tus opciones de quincenas se ajustaron según tu historial de pago.',
      tono: 'warning',
    }
  }

  return {
    opciones: OPCIONES_COMPLETAS,
    titulo: 'Más flexibilidad disponible',
    mensaje: 'Tu buen historial te permite elegir más quincenas para esta compra.',
    tono: 'success',
  }
}

export default function PaymentPlan({ monto, comercio, token, nivelRiesgo, cuotasVencidas = 0, onPagar }) {
  const personalizacion = obtenerPersonalizacion({ nivelRiesgo, cuotasVencidas })
  const opciones = personalizacion.opciones
  const [quincenas, setQuincenas] = useState(6)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)

  const montoNum = parseFloat(monto) || 0
  const restringido = opciones.length === 0

  useEffect(() => {
    if (!opciones.includes(quincenas)) {
      setQuincenas(opciones[0] || 0)
      setResultado(null)
    }
  }, [opciones, quincenas])

  useEffect(() => {
    if (!montoNum || restringido || !quincenas) return
    simular()
  }, [quincenas, monto, restringido])

  const simular = async () => {
    setLoading(true)
    try {
      const data = await calculadoraAPI.simular(token, montoNum, quincenas)
      setResultado(data)
    } catch {
      // Cálculo local como fallback
      const porQuincena = montoNum / quincenas
      setResultado({ monto_por_quincena: porQuincena, total: montoNum, quincenas })
    } finally {
      setLoading(false)
    }
  }

  const personalizacionStyle = {
    success: {
      background: 'var(--kueski-primary-soft)',
      border: '1.5px solid var(--kueski-primary-border)',
      color: 'var(--kueski-primary)',
    },
    warning: {
      background: 'rgba(255,184,0,0.10)',
      border: '1.5px solid rgba(255,184,0,0.35)',
      color: '#b77900',
    },
    danger: {
      background: 'rgba(239,68,68,0.08)',
      border: '1.5px solid rgba(239,68,68,0.35)',
      color: 'var(--kueski-danger)',
    },
  }[personalizacion.tono]

  if (!montoNum) return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      color: 'var(--kueski-text-muted)', fontSize: 14,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
      <div style={{ fontWeight: 700, color: 'var(--kueski-text)', marginBottom: 6 }}>
        Explora un artículo
      </div>
      <div style={{ lineHeight: 1.45 }}>
        Abre un producto de esta tienda para detectar el monto y ver tus planes de pago.
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Monto */}
      <div style={{
        background: 'var(--kueski-blue)',
        borderRadius: 'var(--radius-md)',
        padding: '20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
          TOTAL DE COMPRA
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>
          ${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </div>
        {comercio && (
          <div style={{ fontSize: 12, color: 'var(--kueski-primary)', marginTop: 4 }}>
            {comercio.nombre}
          </div>
        )}
      </div>

      <div style={{
        ...personalizacionStyle,
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
          {personalizacion.titulo}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--kueski-text-muted)' }}>
          {personalizacion.mensaje}
        </div>
      </div>

      {/* Selector de quincenas */}
      <div style={{
        background: 'var(--kueski-surface)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        border: '1px solid var(--kueski-border)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--kueski-text-muted)', marginBottom: 10 }}>
          NÚMERO DE QUINCENAS
        </div>
        {restringido ? (
          <div style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239,68,68,0.08)',
            color: 'var(--kueski-danger)',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}>
            Opciones pausadas hasta regularizar pagos
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {opciones.map(q => (
              <button key={q} onClick={() => setQuincenas(q)} style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700, fontSize: 14,
                background: quincenas === q ? 'var(--kueski-primary)' : 'var(--kueski-surface-2)',
                color: quincenas === q ? 'white' : 'var(--kueski-text)',
                border: quincenas === q ? 'none' : '1px solid var(--kueski-border)',
                transition: 'all 0.15s',
              }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultado && !restringido && (
        <div style={{
          background: 'var(--kueski-primary-soft)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          border: '1.5px solid var(--kueski-primary-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'var(--kueski-primary)', fontWeight: 600, marginBottom: 6 }}>
            PAGARÍAS CADA QUINCENA
          </div>
        {resultado && (
            <button
                className="btn-primary"
                style={{ marginTop: 8 }}
                onClick={() => onPagar(quincenas)}
            >
                Pagar con Kueski Pay 🔐
            </button>
            )}
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--kueski-blue)' }}>
            {loading ? '...' : `$${Number(resultado.monto_por_quincena).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', marginTop: 6 }}>
            en {quincenas} quincenas
          </div>
        </div>
      )}
    </div>
  )
}
