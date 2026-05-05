import React, { useEffect, useState } from 'react'
import { comprasAPI, preferenciasAPI } from '../services/api.js'


export default function AlertasView({ token }) {
  const [cuotas, setCuotas] = useState([])
  const [historial, setHistorial] = useState([])
  const [notifActivas, setNotifActivas] = useState(true)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
  const cargar = async () => {
    try {
      const [compras, prefs] = await Promise.all([
        comprasAPI.getAll(token),
        preferenciasAPI.get(token)
      ])

      const pendientes = []
      const enviadas = []
      const hoy = new Date()
      const en30dias = new Date()
      en30dias.setDate(hoy.getDate() + 30)

      compras.forEach(compra => {
        // ✅ Ignorar compras ya completadas o canceladas
        if (compra.estado === 'completada' || compra.estado === 'cancelada') return
        if (!compra.cuotas) return

        compra.cuotas.forEach(cuota => {
          const fechaVence = new Date(cuota.fecha_vencimiento)
          const item = {
            id: cuota.id,
            comercio: compra.comercio,
            monto: cuota.monto,
            fecha_vencimiento: cuota.fecha_vencimiento,
            numero_cuota: cuota.numero_cuota,
            estado: cuota.estado,
          }

          if (cuota.estado === 'pagada') {
            enviadas.push(item)
          } else if (cuota.estado === 'pendiente') {
            // ✅ Solo cuotas que vencen en los próximos 30 días
            if (fechaVence >= hoy && fechaVence <= en30dias) {
              pendientes.push(item)
            }
            // ✅ También incluir vencidas (fecha pasada, sin pagar)
            if (fechaVence < hoy) {
              pendientes.push(item)
            }
          }
        })
      })

      pendientes.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
      enviadas.sort((a, b) => new Date(b.fecha_vencimiento) - new Date(a.fecha_vencimiento))

      setCuotas(pendientes)
      setHistorial(enviadas.slice(0, 5))
      setNotifActivas(prefs?.notif_push ?? true)
      if (onCargado) onCargado(pendientes.filter(c => diasRestantes(c.fecha_vencimiento) <= 7).length)
    } catch {
    } finally {
      setLoading(false)
    }
  }
  cargar()
}, [])


  const toggleNotif = async () => {
    try {
      await preferenciasAPI.update(token, { notif_push: !notifActivas })
      setNotifActivas(n => !n)
    } catch {}
  }


  const diasRestantes = (fecha) => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const vence = new Date(fecha)
    vence.setHours(0, 0, 0, 0)
    return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
  }


  const badgeColor = (dias) => {
    if (dias <= 0) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    if (dias <= 7) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    return { bg: 'rgba(251,146,60,0.15)', color: '#f97316' }
  }


  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }


  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ color: 'var(--kueski-primary)', fontSize: 32 }}>⬡</div>
    </div>
  )


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Próximos vencimientos */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>
            Próximos vencimientos
          </span>
          <button onClick={toggleNotif} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: notifActivas ? 'var(--kueski-primary)' : 'var(--kueski-surface)',
            color: notifActivas ? 'white' : 'var(--kueski-text-muted)',
            border: notifActivas ? 'none' : '1px solid var(--kueski-border)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}>
            {notifActivas ? 'Notif. activas' : 'Notif. inactivas'}
          </button>
        </div>

        {cuotas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0',
            color: 'var(--kueski-text-muted)', fontSize: 13 }}>
            🎉 No tienes vencimientos próximos
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cuotas.map(cuota => {
              const dias = diasRestantes(cuota.fecha_vencimiento)
              const badge = badgeColor(dias)
              const dotColor = dias <= 7 ? '#ef4444' : '#f97316'
              return (
                <div key={cuota.id} style={{
                  background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--kueski-border)',
                  padding: '14px 16px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%',
                      background: dotColor, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--kueski-text)' }}>
                        {cuota.comercio}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)' }}>
                        Vence {formatFecha(cuota.fecha_vencimiento)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--kueski-text)' }}>
                      ${Number(cuota.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{
                      marginTop: 4, padding: '2px 10px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      background: badge.bg, color: badge.color
                    }}>
                      {dias <= 0 ? 'Vencida' : `en ${dias} día${dias === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial de alertas */}
      {historial.length > 0 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)', marginBottom: 12 }}>
            Historial de alertas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map(cuota => (
              <div key={cuota.id} style={{
                background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--kueski-border)',
                padding: '14px 16px', display: 'flex',
                alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--kueski-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13
                }}>✓</div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--kueski-text)' }}>
                  Pago de {cuota.comercio} registrado
                </div>
                <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)', flexShrink: 0 }}>
                  {formatFecha(cuota.fecha_vencimiento)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}