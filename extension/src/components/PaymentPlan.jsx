import React, { useState, useEffect } from 'react'
import { calculadoraAPI } from '../services/api.js'

const OPCIONES = [2, 4, 6, 8, 10, 12]

export default function PaymentPlan({ monto, comercio, token, onPagar }) {
  const [quincenas, setQuincenas] = useState(6)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)

  const montoNum = parseFloat(monto) || 0

  useEffect(() => {
    if (!montoNum) return
    simular()
  }, [quincenas, monto])

  const simular = async () => {
    setLoading(true)
    try {
      const data = await calculadoraAPI.simular(token, montoNum, quincenas)
      setResultado(data)
    } catch {
      // Cálculo local como fallback
      const porQuincena = montoNum / quincenas
      setResultado({ por_quincena: porQuincena, total: montoNum, quincenas })
    } finally {
      setLoading(false)
    }
  }

  if (!montoNum) return (
    <div style={{
      textAlign: 'center', padding: '40px 20px',
      color: 'var(--kueski-text-muted)', fontSize: 14,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
      <div>Visita una tienda afiliada para simular tu plan de pagos</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {OPCIONES.map(q => (
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
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{
          background: 'rgba(0,176,80,0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          border: '1.5px solid rgba(0,176,80,0.3)',
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