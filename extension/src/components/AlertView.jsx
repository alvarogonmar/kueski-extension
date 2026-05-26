import { useEffect, useState } from 'react'
import { comprasAPI, preferenciasAPI } from '../services/api.js'
import PaymentModal from './PaymentModal.jsx'

const MAX_HISTORIAL_ALERTAS = 5

const diasRestantes = (fecha) => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const vence = new Date(fecha)
  vence.setHours(0, 0, 0, 0)
  return Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
}

const fechaHistorial = (cuota) => new Date(cuota.pagada_en || cuota.fecha_vencimiento)

export default function AlertasView({ token, onCargado }) {
  const [vencidas, setVencidas] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [historial, setHistorial] = useState([])
  const [notifActivas, setNotifActivas] = useState(true)
  const [loading, setLoading] = useState(true)
  const [cuotaPago, setCuotaPago] = useState(null)
  const [desglosePago, setDesglosePago] = useState(null)
  const [cargandoDesgloseId, setCargandoDesgloseId] = useState(null)
  const [mensajePago, setMensajePago] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const [compras, prefs] = await Promise.all([
          comprasAPI.getAll(token),
          preferenciasAPI.get(token)
        ])

        const vencidasArr = []
        const proximasArr = []
        const enviadas = []
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const en30dias = new Date()
        en30dias.setDate(hoy.getDate() + 30)

        compras.forEach(compra => {
          const compraCerrada = compra.estado === 'completada' || compra.estado === 'cancelada'
          if (!compra.cuotas) return

          compra.cuotas.forEach(cuota => {
            const fechaVence = new Date(cuota.fecha_vencimiento)
            fechaVence.setHours(0, 0, 0, 0)

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
            } else if (!compraCerrada && (cuota.estado === 'vencida' || fechaVence < hoy)) {
              vencidasArr.push(item)
            } else if (!compraCerrada && cuota.estado === 'pendiente' && fechaVence <= en30dias) {
              proximasArr.push(item)
            }
          })
        })

        vencidasArr.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
        proximasArr.sort((a, b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))
        enviadas.sort((a, b) => fechaHistorial(b) - fechaHistorial(a))

        setVencidas(vencidasArr)
        setCuotas(proximasArr)
        setHistorial(enviadas.slice(0, MAX_HISTORIAL_ALERTAS))
        setNotifActivas(prefs?.notif_push ?? true)

        if (onCargado) onCargado(
          vencidasArr.length + proximasArr.filter(c => diasRestantes(c.fecha_vencimiento) <= 7).length
        )
      } catch (e) {
        console.error(e)
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
    } catch (e) {
      console.error(e)
    }
  }

  const abrirPago = async (cuota) => {
    setCargandoDesgloseId(cuota.id)
    setMensajePago('')
    try {
      const desglose = await comprasAPI.getDesgloseCuota(token, cuota.id)
      setCuotaPago(cuota)
      setDesglosePago(desglose)
    } catch (e) {
      setMensajePago(e.message || 'No se pudo cargar el desglose del pago')
    } finally {
      setCargandoDesgloseId(null)
    }
  }

  const actualizarBadge = (vencidasActuales, proximasActuales) => {
    if (onCargado) {
      onCargado(
        vencidasActuales.length + proximasActuales.filter(c => diasRestantes(c.fecha_vencimiento) <= 7).length
      )
    }
  }

  const confirmarPago = async (cuotaPagada) => {
    await comprasAPI.pagarCuota(token, cuotaPagada.id, {
      metodo_pago: cuotaPagada.metodo_pago,
      referencia_pago: cuotaPagada.referencia_pago,
    })

    const quitarCuota = cuota => cuota.id !== cuotaPagada.id
    const nuevasVencidas = vencidas.filter(quitarCuota)
    const nuevasCuotas = cuotas.filter(quitarCuota)

    setVencidas(nuevasVencidas)
    setCuotas(nuevasCuotas)
    setHistorial(prev =>
      [cuotaPagada, ...prev.filter(c => c.id !== cuotaPagada.id)]
        .sort((a, b) => fechaHistorial(b) - fechaHistorial(a))
        .slice(0, MAX_HISTORIAL_ALERTAS)
    )
    setCuotaPago(null)
    setDesglosePago(null)
    setMensajePago('Pago realizado con éxito')
    actualizarBadge(nuevasVencidas, nuevasCuotas)
    setTimeout(() => setMensajePago(''), 3000)
  }

  const badgeColor = (dias) => {
    if (dias < 0) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    if (dias <= 7) return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }
    return { bg: 'rgba(251,146,60,0.15)', color: '#f97316' }
  }

  const formatFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ color: 'var(--kueski-primary)', fontSize: 32 }}>⏳</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {cuotaPago && (
        <PaymentModal
          cuota={cuotaPago}
          desglose={desglosePago}
          onClose={() => { setCuotaPago(null); setDesglosePago(null) }}
          onConfirm={confirmarPago}
        />
      )}

      {/* Toggle notificaciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>Alertas</span>
        <button
          onClick={toggleNotif}
          style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: notifActivas ? 'var(--kueski-primary)' : 'var(--kueski-surface)',
            color: notifActivas ? 'white' : 'var(--kueski-text-muted)',
            border: notifActivas ? 'none' : '1px solid var(--kueski-border)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          {notifActivas ? 'Notif. activas' : 'Notif. inactivas'}
        </button>
      </div>

      {mensajePago && (
        <div style={{
          background: 'rgba(0,176,80,0.1)',
          border: '1.5px solid rgba(0,176,80,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          color: 'var(--kueski-primary)',
          fontSize: 13,
          fontWeight: 700,
          textAlign: 'center',
        }}>
          {mensajePago}
        </div>
      )}

      {/* ===== SECCIÓN: Pagos vencidos ===== */}
      {vencidas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444' }}>
              ⚠️ Pagos vencidos
            </span>
            <span style={{
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20
            }}>
              {vencidas.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {vencidas.map(cuota => (
              <div key={cuota.id} style={{
                background: 'rgba(239,68,68,0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid rgba(239,68,68,0.35)',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--kueski-text)' }}>
                      {cuota.comercio}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)' }}>
                      Cuota {cuota.numero_cuota} · Venció {formatFecha(cuota.fecha_vencimiento)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444' }}>
                    ${Number(cuota.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{
                    marginTop: 4, padding: '2px 10px', borderRadius: 20,
                    fontSize: 11, fontWeight: 700,
                    background: 'rgba(239,68,68,0.15)', color: '#ef4444'
                  }}>
                    Vencida
                  </div>
                  <button onClick={() => abrirPago(cuota)} disabled={cargandoDesgloseId === cuota.id} style={{
                    marginTop: 8, padding: '6px 12px', borderRadius: 8,
                    background: 'var(--kueski-primary)', color: 'white',
                    fontSize: 11, fontWeight: 800,
                    opacity: cargandoDesgloseId === cuota.id ? 0.7 : 1,
                  }}>
                    {cargandoDesgloseId === cuota.id ? 'Cargando...' : 'Pagar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== SECCIÓN: Próximos vencimientos ===== */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>
            Próximos vencimientos
          </span>
        </div>

        {cuotas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--kueski-text-muted)', fontSize: 13 }}>
            No tienes vencimientos próximos
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cuotas.map(cuota => {
              const dias = diasRestantes(cuota.fecha_vencimiento)
              const badge = badgeColor(dias)
              const dotColor = dias <= 7 ? '#ef4444' : '#f97316'
              return (
                <div key={cuota.id} style={{
                  background: 'var(--kueski-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--kueski-border)',
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
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
                      {dias < 0 ? 'Vencida' : `en ${dias} día${dias === 1 ? '' : 's'}`}
                    </div>
                    <button onClick={() => abrirPago(cuota)} disabled={cargandoDesgloseId === cuota.id} style={{
                      marginTop: 8, padding: '6px 12px', borderRadius: 8,
                      background: 'var(--kueski-primary)', color: 'white',
                      fontSize: 11, fontWeight: 800,
                      opacity: cargandoDesgloseId === cuota.id ? 0.7 : 1,
                    }}>
                      {cargandoDesgloseId === cuota.id ? 'Cargando...' : 'Pagar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== SECCIÓN: Historial de alertas ===== */}
      {historial.length > 0 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)', marginBottom: 12 }}>
            Historial de alertas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map(cuota => (
              <div key={cuota.id} style={{
                background: 'var(--kueski-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--kueski-border)',
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--kueski-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13
                }}>✓</div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--kueski-text)' }}>
                  Pago de <strong>{cuota.comercio}</strong> registrado
                  {cuota.metodo_pago && (
                    <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)', marginTop: 2 }}>
                      {cuota.metodo_pago === 'oxxo' ? 'Depósito en OXXO' : 'Tarjeta'}
                      {cuota.referencia_pago ? ` · Ref. ${cuota.referencia_pago}` : ''}
                    </div>
                  )}
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
