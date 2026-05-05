export default function NoComercioView() {
  const tiendas = [
    { nombre: 'Amazon', url: 'https://amazon.com.mx', logo: '📦' },
    { nombre: 'Liverpool', url: 'https://liverpool.com.mx', logo: '🛍️' },
    { nombre: 'Walmart', url: 'https://walmart.com.mx', logo: '🛒' },
  ]

  return (
    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛍️</div>
      <h3 style={{ color: 'var(--kueski-text)', marginBottom: 8, fontSize: 16 }}>
        No estás en una tienda afiliada
      </h3>
      <p style={{ color: 'var(--kueski-text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
        Visita una de nuestras tiendas afiliadas para pagar a quincenas con Kueski Pay
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tiendas.map(t => (
          <a
            key={t.nombre}
            href={t.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--kueski-card)',
              borderRadius: 10,
              textDecoration: 'none',
              border: '1px solid var(--kueski-border)',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <span style={{ fontSize: 24 }}>{t.logo}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: 'var(--kueski-text)', fontWeight: 600, fontSize: 14 }}>
                {t.nombre}
              </div>
              <div style={{ color: 'var(--kueski-text-muted)', fontSize: 11 }}>
                {t.url}
              </div>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--kueski-primary)', fontSize: 18 }}>→</span>
          </a>
        ))}
      </div>
    </div>
  )
}