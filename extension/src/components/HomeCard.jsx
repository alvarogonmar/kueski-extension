// HomeCard.jsx — sección de tokens corregida
import React, { useEffect, useState } from 'react'
import { calculadoraAPI } from '../services/api.js'

export default function HomeCard({ usuario, comercio, monto, onVerPlan, token }) {
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (token) {
      calculadoraAPI.perfil(token)
        .then(data => setPerfil(data))
        .catch(() => setPerfil(null))
    }
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Saludo */}
      <div style={{
        background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
        padding: '16px', border: '1px solid var(--kueski-border)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--kueski-text-muted)', marginBottom: 4 }}>Bienvenido</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--kueski-blue)' }}>
          {usuario?.nombre || 'Usuario'} 👋
        </div>
      </div>

      {/* Comercio detectado */}
      {comercio ? (
        <div style={{
          background: 'rgba(0,176,80,0.08)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1.5px solid rgba(0,176,80,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-primary)', fontWeight: 600, marginBottom: 2 }}>
              COMERCIO DETECTADO
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-blue)' }}>{comercio.nombre}</div>
          </div>
          <span className="tag tag-success">● Activo</span>
        </div>
      ) : (
        <div style={{
          background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1px solid var(--kueski-border)',
          textAlign: 'center', color: 'var(--kueski-text-muted)', fontSize: 13,
        }}>
          Visita Amazon, Liverpool o Walmart para activar Kueski Pay
        </div>
      )}

      {/* Monto detectado */}
      {monto && (
        <div style={{
          background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
          padding: '16px', border: '1px solid var(--kueski-border)',
        }}>
          <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)', fontWeight: 600, marginBottom: 6 }}>
            MONTO DETECTADO
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--kueski-blue)', marginBottom: 12 }}>
            ${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <button className="btn-primary" onClick={onVerPlan}>Ver plan de pagos →</button>
        </div>
      )}

      {/* Crédito disponible (viene de perfil_financiero) */}
      {perfil && (
        <div style={{
          background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1px solid var(--kueski-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: 'var(--kueski-text-muted)' }}>Crédito disponible</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--kueski-primary)' }}>
            ${Number(perfil.credito_disponible).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}