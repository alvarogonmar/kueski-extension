export default function CreditPendingView({ usuario }) {
  return (
    <div style={{
      minHeight: 500,
      background: 'var(--kueski-surface)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '26px 30px 24px',
      color: 'var(--kueski-text)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img
          src="/kueski_logo.png"
          alt="Kueski"
          style={{ width: 128, height: 'auto', marginBottom: 26 }}
        />

        <h1 style={{
          color: 'var(--kueski-text)',
          fontSize: 26,
          lineHeight: 1.14,
          fontWeight: 800,
          margin: 0,
        }}>
          Estamos evaluando tu perfil
        </h1>
      </div>

      <div style={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <div style={{
          fontSize: 15,
          color: 'var(--kueski-text-muted)',
          lineHeight: 1.55,
        }}>
          Hola {usuario?.nombre || 'Usuario'}, estamos revisando tu información para determinar si podemos ofrecerte una línea de crédito.
        </div>

        <div style={{
          background: 'var(--kueski-surface-2)',
          border: '1.5px solid var(--kueski-border)',
          borderRadius: 13,
          padding: '15px 16px',
          fontSize: 13,
          color: 'var(--kueski-text-muted)',
          lineHeight: 1.5,
        }}>
          Te notificaremos cuando tu crédito esté disponible.
        </div>

        <div style={{
          color: 'var(--kueski-primary)',
          fontSize: 12,
          fontWeight: 800,
          marginTop: 2,
        }}>
          Las funciones de compra se activarán al aprobarse tu perfil.
        </div>
      </div>
    </div>
  )
}
