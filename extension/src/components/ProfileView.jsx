import React, { useState, useEffect } from 'react'
import { pinAPI, preferenciasAPI, favoritosAPI } from '../services/api.js'


export default function ProfileView({ usuario, token, onVerHistorial }) {
  const [seccion, setSeccion] = useState(null) // null | 'cambiarPin' | 'preferencias'
  const [pinActual, setPinActual] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [paso, setPaso] = useState(1)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [favoritos, setFavoritos] = useState([])
  const [tienePin, setTienePin] = useState(true) // asume que sí tiene hasta verificar


  // estado de preferencias
  const [prefs, setPrefs] = useState({ notif_email: true, notif_push: true, dias_antes_recordatorio: 3 })
  const [guardando, setGuardando] = useState(false)
  const [mensajePrefs, setMensajePrefs] = useState('')


    useEffect(() => {
      const cargar = async () => {
        try {
          const [data, favs] = await Promise.all([
            preferenciasAPI.get(token),
            favoritosAPI.getAll(token)
          ])
          if (data) setPrefs(data)
          setFavoritos(favs || [])
        } catch {}

        // Verificar si ya tiene PIN sin contar intentos fallidos
        try {
          const { existe } = await pinAPI.existe(token)
          setTienePin(existe)
        } catch {
          setTienePin(true) // si falla la consulta, asumir que sí tiene
        }
      }
      cargar()
    }, [])


  // NUEVO — si no tiene PIN, saltar directo al paso 2 al abrir cambiarPin
  useEffect(() => {
    if (seccion === 'cambiarPin' && !tienePin) setPaso(2)
  }, [seccion])


  const quitarFavorito = async (dominio) => {
    try {
      await favoritosAPI.remove(token, dominio)
      setFavoritos(favs => favs.filter(f => f.dominio !== dominio))
    } catch {}
  }


  const handlePinActual = async () => {
    if (pinActual.length !== 4 || isNaN(pinActual)) {
      setError('El PIN debe ser de 4 dígitos')
      return
    }
    setLoading(true)
    setError('')
    try {
      await pinAPI.verificar(token, pinActual)
      setPaso(2)
    } catch {
      setError('PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }


  const handlePinNuevo = async () => {
    if (pinNuevo.length !== 4 || isNaN(pinNuevo)) {
      setError('El PIN debe ser de 4 dígitos')
      return
    }
    // Solo validar que sea diferente si tiene PIN previo
    if (tienePin && pinNuevo === pinActual) {
      setError('El PIN nuevo debe ser diferente al actual')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Usar crear o cambiar según si ya tiene PIN
      if (tienePin) {
        await pinAPI.cambiar(token, pinActual, pinNuevo)
      } else {
        await pinAPI.crear(token, pinNuevo)
      }
      setMensaje(tienePin ? '✅ PIN actualizado correctamente' : '✅ PIN creado correctamente')
      setTienePin(true) // ya tiene PIN después de crear
      setSeccion(null)
      setPinActual('')
      setPinNuevo('')
      setPaso(1)
    } catch {
      setError(tienePin ? 'No se pudo cambiar el PIN, intenta de nuevo' : 'No se pudo crear el PIN, intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }


  // guardar preferencias
  const guardarPrefs = async () => {
    setGuardando(true)
    setMensajePrefs('')
    try {
      await preferenciasAPI.update(token, prefs)
      setMensajePrefs('✅ Preferencias guardadas')
      setTimeout(() => setMensajePrefs(''), 2500)
    } catch {
      setMensajePrefs('❌ No se pudieron guardar')
    } finally {
      setGuardando(false)
    }
  }


  const abrirKueski = () => {
    chrome.tabs.create({ url: 'https://preguntas.frecuentes.kueski.com/hc/es/categories/14632860970907-Kueski-Pay' })
  }


  const volverPerfil = () => {
    setSeccion(null)
    setPaso(1)
    setError('')
    setPinActual('')
    setPinNuevo('')
    setMensajePrefs('')
  }


  // — Vista cambiar/crear PIN —
  if (seccion === 'cambiarPin') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={volverPerfil}
        style={{ background: 'none', color: 'var(--kueski-text-muted)', fontSize: 13, textAlign: 'left' }}>
        ← Volver
      </button>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>
          {/* Título dinámico según si tiene PIN y el paso */}
          {!tienePin ? 'Crea tu PIN' : paso === 1 ? 'Ingresa tu PIN actual' : 'Ingresa tu PIN nuevo'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--kueski-text-muted)', marginTop: 4 }}>
          {!tienePin ? 'Elige un PIN de 4 dígitos para tu cuenta' : paso === 1 ? 'Necesitamos verificar tu identidad' : 'Elige un PIN de 4 dígitos'}
        </div>
      </div>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={paso === 1 ? pinActual : pinNuevo}
        onChange={e => paso === 1 ? setPinActual(e.target.value) : setPinNuevo(e.target.value)}
        placeholder="••••"
        style={{
          textAlign: 'center', fontSize: 28, letterSpacing: 12,
          padding: '14px', borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--kueski-border)',
          background: 'var(--kueski-surface)', color: 'var(--kueski-text)',
        }}
      />
      {error && <div style={{ color: 'var(--kueski-danger)', fontSize: 12, textAlign: 'center' }}>{error}</div>}
      <button className="btn-primary" disabled={loading}
        onClick={paso === 1 ? handlePinActual : handlePinNuevo}>
        {loading ? 'Verificando...' : !tienePin ? 'Crear PIN' : paso === 1 ? 'Continuar' : 'Guardar PIN nuevo'}
      </button>
    </div>
  )


  // Vista preferencias
  if (seccion === 'preferencias') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button onClick={volverPerfil}
        style={{ background: 'none', color: 'var(--kueski-text-muted)', fontSize: 13, textAlign: 'left' }}>
        ← Volver
      </button>

      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--kueski-text)' }}>
          Preferencias
        </div>
      </div>

      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>

        {/* Notificaciones email */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--kueski-border)' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--kueski-text)', fontWeight: 500 }}>
              📧 Notificaciones por email
            </div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>
              Recibe recordatorios en tu correo
            </div>
          </div>
          <div onClick={() => setPrefs(p => ({ ...p, notif_email: !p.notif_email }))}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
              background: prefs.notif_email ? 'var(--kueski-primary)' : 'var(--kueski-border)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0
            }}>
            <div style={{
              position: 'absolute', top: 3,
              left: prefs.notif_email ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {/* Notificaciones push */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--kueski-border)' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--kueski-text)', fontWeight: 500 }}>
              🔔 Notificaciones push
            </div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>
              Alertas en el navegador
            </div>
          </div>
          <div onClick={() => setPrefs(p => ({ ...p, notif_push: !p.notif_push }))}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
              background: prefs.notif_push ? 'var(--kueski-primary)' : 'var(--kueski-border)',
              position: 'relative', transition: 'background 0.2s', flexShrink: 0
            }}>
            <div style={{
              position: 'absolute', top: 3,
              left: prefs.notif_push ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {/* Días antes del recordatorio */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 14, color: 'var(--kueski-text)', fontWeight: 500, marginBottom: 10 }}>
            ⏰ Recordar con anticipación
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 3, 5, 7].map(d => (
              <button key={d} onClick={() => setPrefs(p => ({ ...p, dias_antes_recordatorio: d }))}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid',
                  borderColor: prefs.dias_antes_recordatorio === d ? 'var(--kueski-primary)' : 'var(--kueski-border)',
                  background: prefs.dias_antes_recordatorio === d ? 'var(--kueski-primary-soft)' : 'var(--kueski-surface)',
                  color: prefs.dias_antes_recordatorio === d ? 'var(--kueski-primary)' : 'var(--kueski-text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                {d}d
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)', marginTop: 8 }}>
            Días antes del vencimiento para notificarte
          </div>
        </div>
      </div>

      {mensajePrefs && (
        <div style={{
          textAlign: 'center', fontSize: 13, padding: '8px',
          color: mensajePrefs.includes('✅') ? 'var(--kueski-primary)' : 'var(--kueski-danger)'
        }}>
          {mensajePrefs}
        </div>
      )}

      <button className="btn-primary" onClick={guardarPrefs} disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar preferencias'}
      </button>
    </div>
  )


  // — Vista principal del perfil —
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {mensaje && (
        <div style={{ background: 'var(--kueski-success-soft)', border: '1px solid var(--kueski-success-border)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: 'var(--kueski-primary)', fontSize: 13, textAlign: 'center' }}>
          {mensaje}
        </div>
      )}

      {/* Datos del usuario */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Cuenta
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>Nombre</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--kueski-text)' }}>
              {usuario?.nombre} {usuario?.apellido || ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>Correo</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--kueski-text)' }}>
              {usuario?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Seguridad
        </div>
        {/* Texto dinámico según si tiene PIN */}
        <button onClick={() => { setSeccion('cambiarPin'); setMensaje('') }} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
        }}>
          <span>🔒 {tienePin ? 'Cambiar PIN' : 'Crear PIN'}</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
      </div>

      {/* Configuración — Preferencias */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Configuración
        </div>
        <button onClick={() => setSeccion('preferencias')} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
        }}>
          <span>⚙️ Preferencias</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
      </div>

      {/* Mis favoritos (solo si hay alguno) */}
      {favoritos.length > 0 && (
        <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
            color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
            borderBottom: '1px solid var(--kueski-border)' }}>
            Mis favoritos
          </div>
          {favoritos.map((fav, i) => (
            <div key={fav.dominio} style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: i < favoritos.length - 1 ? '1px solid var(--kueski-border)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--kueski-text)' }}>
                    {fav.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--kueski-text-muted)' }}>
                    {fav.dominio}
                  </div>
                </div>
              </div>
              <button onClick={() => quitarFavorito(fav.dominio)} style={{
                background: 'none', fontSize: 16, cursor: 'pointer',
                color: 'var(--kueski-text-muted)'
              }}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <div style={{ background: 'var(--kueski-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--kueski-border)', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700,
          color: 'var(--kueski-text-muted)', textTransform: 'uppercase', letterSpacing: 1,
          borderBottom: '1px solid var(--kueski-border)' }}>
          Accesos rápidos
        </div>
        <button onClick={onVerHistorial} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
          borderBottom: '1px solid var(--kueski-border)',
        }}>
          <span>🧾 Mis compras</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
        <button onClick={abrirKueski} style={{
          width: '100%', padding: '14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none',
          color: 'var(--kueski-text)', fontSize: 14,
        }}>
          <span>❓ Centro de ayuda</span>
          <span style={{ color: 'var(--kueski-text-muted)' }}>→</span>
        </button>
      </div>

    </div>
  )
}
