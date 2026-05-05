import React, { useEffect, useState } from 'react'
import { comprasAPI } from '../services/api.js'

export default function PurchaseHistory({ token }) {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    comprasAPI.getAll(token)
      .then(data => setCompras(data))
      .catch(() => setCompras([]))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 72,
          borderRadius: 'var(--radius-md)',
          background: 'var(--kueski-surface)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
    </div>
  )

  if (compras.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--kueski-text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontWeight: 600, color: 'var(--kueski-blue)', marginBottom: 6 }}>
        Sin compras aún
      </div>
      <div style={{ fontSize: 13 }}>
        Tus compras con Kueski Pay aparecerán aquí
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kueski-blue)', marginBottom: 4 }}>
        Mis compras ({compras.length})
      </div>
      {compras.map(compra => (
        <div key={compra.id} style={{
          background: 'var(--kueski-surface)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          border: '1px solid var(--kueski-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--kueski-blue)', fontSize: 14, marginBottom: 3 }}>
              {compra.comercio || 'Comercio'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)' }}>
              {compra.num_quincenas} quincenas · {new Date(compra.fecha_compra).toLocaleDateString('es-MX')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--kueski-blue)' }}>
              ${Number(compra.monto_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <span className={`tag ${compra.estado === 'activa' ? 'tag-success' : 'tag-blue'}`}>
              {compra.estado}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}