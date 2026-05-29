// HomeCard.jsx — sección de tokens corregida
import { useEffect, useState } from 'react'
import { calculadoraAPI, favoritosAPI } from '../services/api.js'


export default function HomeCard({ usuario, comercio, monto, onVerPlan, token, nivelRiesgo, cuotasVencidas }) {
  const [perfil, setPerfil] = useState(null)
  const [esFavorito, setEsFavorito] = useState(false)
  const [loadingFav, setLoadingFav] = useState(false)

  const creditoDisponible = Number(perfil?.credito_disponible)
  const perfilEnEvaluacion = !!perfil && !Number.isFinite(creditoDisponible)
  const cuentaRestringida = cuotasVencidas > 0 && nivelRiesgo === 'alto'
  const puedeVerPlan = !cuentaRestringida && !perfilEnEvaluacion


  useEffect(() => {
    if (token) {
      calculadoraAPI.perfil(token)
        .then(data => setPerfil(data))
        .catch(() => setPerfil(null))
    }
  }, [token])


  // ✅ verificar si el comercio actual ya es favorito
  useEffect(() => {
    if (!token || !comercio?.dominio) return
    favoritosAPI.getAll(token)
      .then(favs => {
        const existe = favs.some(f => f.dominio === comercio.dominio)
        setEsFavorito(existe)
      })
      .catch(() => setEsFavorito(false))
  }, [token, comercio])


  // ✅ toggle favorito
  const toggleFavorito = async () => {
    if (!comercio?.dominio || loadingFav) return
    setLoadingFav(true)
    try {
      if (esFavorito) {
        await favoritosAPI.remove(token, comercio.dominio)
        setEsFavorito(false)
      } else {
        await favoritosAPI.add(token, comercio.dominio)
        setEsFavorito(true)
      }
    } catch {
      setEsFavorito(esFavorito)
    }
    setLoadingFav(false)
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ✅ NUEVO — Banner de moroso */}
      {cuotasVencidas > 0 && (
        <div style={{
          background: nivelRiesgo === 'alto' ? 'rgba(239,68,68,0.1)' : 'rgba(251,146,60,0.1)',
          border: `1.5px solid ${nivelRiesgo === 'alto' ? 'rgba(239,68,68,0.4)' : 'rgba(251,146,60,0.4)'}`,
          borderRadius: 'var(--radius-md)', padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{nivelRiesgo === 'alto' ? '🔴' : '🟠'}</span>
            <span style={{ fontSize: 13, fontWeight: 700,
              color: nivelRiesgo === 'alto' ? '#ef4444' : '#f97316' }}>
              {nivelRiesgo === 'alto' ? 'Cuenta restringida' : 'Tienes pagos pendientes'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', lineHeight: 1.5 }}>
            Tienes {cuotasVencidas} cuota{cuotasVencidas > 1 ? 's' : ''} vencida{cuotasVencidas > 1 ? 's' : ''}.
            {nivelRiesgo === 'alto'
              ? ' No puedes generar nuevos CVV hasta ponerte al corriente.'
              : ' Ponte al corriente para evitar restricciones.'}
          </div>
        </div>
      )}

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
          background: 'var(--kueski-primary-soft)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1.5px solid var(--kueski-primary-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-primary)', fontWeight: 600, marginBottom: 2 }}>
              COMERCIO DETECTADO
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-blue)' }}>{comercio.nombre}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* ✅ botón de favorito */}
            <button
              onClick={toggleFavorito}
              disabled={loadingFav}
              title={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{
                background: 'none', fontSize: 20, cursor: 'pointer',
                opacity: loadingFav ? 0.5 : 1, transition: 'transform 0.15s',
                transform: loadingFav ? 'scale(0.9)' : 'scale(1)'
              }}>
              {esFavorito ? '⭐' : '☆'}
            </button>
            <span className="tag tag-success">● Activo</span>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1px solid var(--kueski-border)',
          textAlign: 'center', color: 'var(--kueski-text-muted)', fontSize: 13,
        }}>
          Visita Amazon, Palacio de Hierro o Chedraui para activar Kueski Pay
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
          {/* ✅ NUEVO — deshabilitar botón si tiene cuenta restringida */}
          <button
            className={!puedeVerPlan ? 'btn-secondary' : 'btn-primary'}
            onClick={puedeVerPlan ? onVerPlan : undefined}
            disabled={!puedeVerPlan}
            style={{ opacity: !puedeVerPlan ? 0.5 : 1 }}
          >
            {cuentaRestringida
              ? '🔒 Cuenta restringida'
              : perfilEnEvaluacion
                ? 'Perfil en evaluación'
                : 'Ver plan de pagos →'}
          </button>
        </div>
      )}


      {/* Crédito disponible (viene de perfil_financiero) */}
      {perfil && !perfilEnEvaluacion && (
        <div style={{
          background: 'var(--kueski-surface)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1px solid var(--kueski-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: 'var(--kueski-text-muted)' }}>Crédito disponible</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--kueski-primary)' }}>
            ${creditoDisponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {perfilEnEvaluacion && (
        <div style={{
          background: 'rgba(255,184,0,0.08)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          border: '1.5px solid rgba(255,184,0,0.35)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 13, color: 'var(--kueski-text-muted)' }}>
              Crédito disponible
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 20,
              background: 'rgba(255,184,0,0.18)',
              color: '#b77900',
            }}>
              En evaluación
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--kueski-blue)', marginBottom: 4 }}>
            Kueski está evaluando tu perfil
          </div>
          <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', lineHeight: 1.5 }}>
            Te notificaremos cuando tu línea de crédito esté disponible.
          </div>
        </div>
      )}
    </div>
  )
}
