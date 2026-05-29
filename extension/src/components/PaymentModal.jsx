import { useMemo, useState } from 'react'

const generarReferencia = () => {
  const length = Math.floor(Math.random() * 5) + 10
  let ref = ''
  for (let i = 0; i < length; i++) ref += Math.floor(Math.random() * 10)
  return ref
}

const limpiarNumeros = (value, maxLength) =>
  value.replace(/\D/g, '').slice(0, maxLength)

const formatearVencimiento = (value) => {
  const numeros = limpiarNumeros(value, 4)
  if (numeros.length <= 2) return numeros
  return `${numeros.slice(0, 2)}/${numeros.slice(2)}`
}

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })

export default function PaymentModal({ cuota, desglose, onClose, onConfirm }) {
  const [metodo, setMetodo] = useState('tarjeta')
  const [form, setForm] = useState({
    titular: '',
    numero: '',
    vencimiento: '',
    cvv: '',
  })
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const referencia = useMemo(() => generarReferencia(), [])

  const setField = (field, value) => {
    const nextValue = {
      titular: value,
      numero: limpiarNumeros(value, 19),
      vencimiento: formatearVencimiento(value),
      cvv: limpiarNumeros(value, 4),
    }[field]

    setForm(prev => ({ ...prev, [field]: nextValue }))
    setError('')
  }

  const validarTarjeta = () => {
    const titular = form.titular.trim()
    const numero = form.numero.trim()
    const vencimiento = form.vencimiento.trim()
    const cvv = form.cvv.trim()

    if (!titular || !numero || !vencimiento || !cvv) {
      return 'Completa todos los campos de la tarjeta'
    }

    if (titular.length < 3) {
      return 'El nombre del titular debe tener al menos 3 caracteres'
    }

    if (!/^\d{16,19}$/.test(numero)) {
      return 'El número de tarjeta debe tener entre 16 y 19 dígitos'
    }

    const fechaValida = /^(0[1-9]|1[0-2])\/\d{2}$/.test(vencimiento)
    if (!fechaValida) {
      return 'La fecha de vencimiento debe tener formato MM/AA'
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return 'El CVV debe tener 3 o 4 dígitos'
    }

    return ''
  }

  const confirmar = async () => {
    if (metodo === 'tarjeta') {
      const errorTarjeta = validarTarjeta()
      if (errorTarjeta) {
        setError(errorTarjeta)
        return
      }
    }

    setConfirmando(true)
    setError('')
    try {
      await onConfirm({
        ...cuota,
        estado: 'pagada',
        metodo_pago: metodo,
        referencia_pago: metodo === 'oxxo' ? referencia : null,
        pagada_en: new Date().toISOString(),
      })
    } catch (e) {
      setError(e.message || 'No se pudo registrar el pago')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,72,248,0.28)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, maxHeight: '92vh', overflow: 'auto',
        background: 'var(--kueski-bg)',
        borderRadius: '18px 18px 0 0',
        padding: '18px 16px 16px',
        boxShadow: '0 -8px 30px rgba(0,72,248,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--kueski-text)' }}>
              Elegir método de pago
            </div>
            <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', marginTop: 2 }}>
              {cuota?.comercio} · Cuota {cuota?.numero_cuota}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--kueski-surface)', color: 'var(--kueski-text-muted)',
            fontSize: 18,
          }}>
            ×
          </button>
        </div>

        {desglose && (
          <div style={{
            background: 'var(--kueski-surface)',
            border: '1px solid var(--kueski-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--kueski-text)',
              marginBottom: 10,
            }}>
              Desglose del pago
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <DetallePago label="Monto original" value={desglose.monto_original} />
              <DetallePago label="Multa acumulada" value={desglose.multa_acumulada} />
              <DetallePago label="Interés acumulado" value={desglose.interes_acumulado} />
              <div style={{
                borderTop: '1px solid var(--kueski-border)',
                paddingTop: 9,
                marginTop: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--kueski-text)' }}>
                  Total a pagar
                </span>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--kueski-blue)' }}>
                  ${formatMoney(desglose.total_a_pagar)}
                </span>
              </div>
            </div>

            {desglose.dias_vencida > 0 && (
              <div style={{
                marginTop: 10,
                fontSize: 11,
                color: 'var(--kueski-text-muted)',
                lineHeight: 1.4,
              }}>
                {desglose.dias_vencida} día{desglose.dias_vencida === 1 ? '' : 's'} de atraso.
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button onClick={() => { setMetodo('tarjeta'); setError('') }} style={{
            padding: '11px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700,
            background: metodo === 'tarjeta' ? 'var(--kueski-primary)' : 'var(--kueski-surface)',
            color: metodo === 'tarjeta' ? 'white' : 'var(--kueski-text)',
            border: metodo === 'tarjeta' ? 'none' : '1px solid var(--kueski-border)',
          }}>
            Tarjeta
          </button>
          <button onClick={() => { setMetodo('oxxo'); setError('') }} style={{
            padding: '11px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700,
            background: metodo === 'oxxo' ? 'var(--kueski-primary)' : 'var(--kueski-surface)',
            color: metodo === 'oxxo' ? 'white' : 'var(--kueski-text)',
            border: metodo === 'oxxo' ? 'none' : '1px solid var(--kueski-border)',
          }}>
            Depósito en OXXO
          </button>
        </div>

        {metodo === 'tarjeta' ? (
          <div style={{
            background: 'var(--kueski-surface)', border: '1px solid var(--kueski-border)',
            borderRadius: 'var(--radius-md)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <input placeholder="Nombre del titular" value={form.titular}
              onChange={e => setField('titular', e.target.value)} style={inputStyle} />
            <input placeholder="Número de tarjeta" inputMode="numeric" value={form.numero}
              onChange={e => setField('numero', e.target.value)} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
              <input placeholder="MM/AA" inputMode="numeric" value={form.vencimiento}
                onChange={e => setField('vencimiento', e.target.value)} style={inputStyle} />
              <input placeholder="CVV" inputMode="numeric" value={form.cvv}
                onChange={e => setField('cvv', e.target.value)} style={inputStyle} />
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--kueski-primary-soft)', border: '1.5px solid var(--kueski-primary-border)',
            borderRadius: 'var(--radius-md)', padding: '18px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--kueski-primary)', fontWeight: 700, marginBottom: 8 }}>
              REFERENCIA DE PAGO
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--kueski-blue)', letterSpacing: 1 }}>
              {referencia}
            </div>
            <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', marginTop: 8 }}>
              Usa esta referencia para realizar tu depósito.
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--kueski-danger)', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            {error}
          </div>
        )}

        <button className="btn-primary" onClick={confirmar} disabled={confirmando} style={{ marginTop: 14 }}>
          {confirmando ? 'Registrando pago...' : 'Confirmar pago'}
        </button>
        <button className="btn-secondary" onClick={onClose} disabled={confirmando} style={{ marginTop: 8 }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--kueski-border)',
  background: 'var(--kueski-surface-2)',
  color: 'var(--kueski-text)',
  fontSize: 13,
  outline: 'none',
}

function DetallePago({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      fontSize: 12,
    }}>
      <span style={{ color: 'var(--kueski-text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--kueski-text)', fontWeight: 700 }}>
        ${formatMoney(value)}
      </span>
    </div>
  )
}
