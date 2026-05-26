export default function CreditPendingView({ usuario }) {
  return (
    <div style={{
      minHeight: 500,
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '26px 30px 24px',
      color: '#242733',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img
          src="/kueski_logo.png"
          alt="Kueski"
          style={{ width: 128, height: 'auto', marginBottom: 26 }}
        />

        <h1 style={{
          color: '#242733',
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
          color: '#686b76',
          lineHeight: 1.55,
        }}>
          Hola {usuario?.nombre || 'Usuario'}, estamos revisando tu información para determinar si podemos ofrecerte una línea de crédito.
        </div>

        <div style={{
          background: '#f6f8fb',
          border: '1.5px solid #e0e3ea',
          borderRadius: 13,
          padding: '15px 16px',
          fontSize: 13,
          color: '#686b76',
          lineHeight: 1.5,
        }}>
          Te notificaremos cuando tu crédito esté disponible.
        </div>

        <div style={{
          color: '#0874ff',
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
