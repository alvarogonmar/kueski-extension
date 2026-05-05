import React, { useEffect, useState } from 'react'
import LoginView from './components/LoginView.jsx'
import HomeCard from './components/HomeCard.jsx'
import PaymentPlan from './components/PaymentPlan.jsx'
import PurchaseHistory from './components/PurchaseHistory.jsx'
import NavBar from './components/NavBar.jsx'
import PinView from './components/PinView.jsx'
import CvvView from './components/CvvView.jsx'
import NoComercioView from './components/NoComercioView.jsx'
import ProfileView from './components/ProfileView.jsx'


export default function App() {
  const [token, setToken] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [view, setView] = useState('home')
  const [monto, setMonto] = useState(null)
  const [comercio, setComercio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pinConfirmado, setPinConfirmado] = useState(null)
  const [quincenasSeleccionadas, setQuincenasSeleccionadas] = useState(null)


  // ✅ NUEVO — función centralizada para cambiar de vista y persistirla
  const navegarA = (vista, extras = {}) => {
    setView(vista)
    if (extras.pin !== undefined) setPinConfirmado(extras.pin)
    if (extras.quincenas !== undefined) setQuincenasSeleccionadas(extras.quincenas)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.session.set({ vistaActiva: vista, datosVista: extras })
    }
  }


  // ✅ NUEVO — limpiar vista guardada al terminar flujo
  const limpiarVista = () => {
    setView('home')
    setPinConfirmado(null)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.session.remove(['vistaActiva', 'datosVista'])
    }
  }



  useEffect(() => {
    const restore = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // ✅ Leer sesión + comercio y monto guardados por background.js
          chrome.storage.local.get(['jwt', 'usuario', 'last_comercio', 'last_monto'], (result) => {
            if (result.jwt) {
              setToken(result.jwt)
              setUsuario(result.usuario)
            }
            if (result.last_comercio) setComercio(result.last_comercio)
            if (result.last_monto) setMonto(result.last_monto)


            // ✅ NUEVO — restaurar vista si el popup se cerró a la mitad
            chrome.storage.session.get(['vistaActiva', 'datosVista'], (session) => {
              if (session.vistaActiva && session.vistaActiva !== 'home') {
                setView(session.vistaActiva)
                if (session.datosVista?.pin) setPinConfirmado(session.datosVista.pin)
                if (session.datosVista?.quincenas) setQuincenasSeleccionadas(session.datosVista.quincenas)
              }
              setLoading(false)
            })
          })
        } else {
          const jwt = localStorage.getItem('kueski_jwt')
          if (jwt) {
            setToken(jwt)
            setUsuario(JSON.parse(localStorage.getItem('kueski_usuario') || 'null'))
          }
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }
    restore()



    // ✅ Escuchar mensajes en tiempo real si el popup está abierto
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.tipo === 'MONTO') {
          setMonto(msg.monto)
          chrome.storage.local.set({ last_monto: msg.monto })
        }
        if (msg.tipo === 'COMERCIO') {
          setComercio(msg.comercio)
          chrome.storage.local.set({ last_comercio: msg.comercio })
        }
        // ✅ NUEVO — limpiar comercio si salió de tienda afiliada
        if (msg.tipo === 'SIN_COMERCIO') {
          setComercio(null)
          setMonto(null)
        }
      })
    }
  }, [])



  const handleLogin = (jwt, user) => {
    setToken(jwt)
    setUsuario(user)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ jwt, usuario: user })
    } else {
      localStorage.setItem('kueski_jwt', jwt)
      localStorage.setItem('kueski_usuario', JSON.stringify(user))
    }
  }



  const handleLogout = () => {
    setToken(null)
    setUsuario(null)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // ✅ Al salir también limpia comercio y monto
      chrome.storage.local.remove(['jwt', 'usuario', 'last_comercio', 'last_monto'])
    } else {
      localStorage.removeItem('kueski_jwt')
      localStorage.removeItem('kueski_usuario')
    }
    setComercio(null)
    setMonto(null)
    limpiarVista() // ✅ NUEVO — también limpia la vista guardada
  }



  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, background: 'var(--kueski-bg)' }}>
      <div style={{ color: 'var(--kueski-primary)', fontSize: 32 }}>⬡</div>
    </div>
  )



  if (!token) return <LoginView onLogin={handleLogin} />



    const renderView = () => {
      switch (view) {
        case 'pin': return (
        <PinView
            token={token}
            monto={monto}
            quincenas={quincenasSeleccionadas}
            onSuccess={(pin) => navegarA('cvv', { pin, quincenas: quincenasSeleccionadas })} // ✅
            onCancel={() => navegarA('plan')} // ✅
        />
        )
        case 'cvv': return (
        <CvvView
            token={token}
            pin={pinConfirmado}
            comercio={comercio}
            monto={monto}
            quincenas={quincenasSeleccionadas}
            onDone={() => limpiarVista()} // ✅
        />
        )
        case 'plan': return (
        <PaymentPlan
            monto={monto}
            comercio={comercio}
            token={token}
            onPagar={(q) => navegarA('pin', { quincenas: q })} // ✅
        />
        )
        case 'history': return <PurchaseHistory token={token} />
        case 'profile': return (
        <ProfileView
            usuario={usuario}
            token={token}
            onVerHistorial={() => navegarA('history')}
        />
        )
        default: return comercio ? ( // ✅ NUEVO — solo muestra HomeCard si hay comercio
        <HomeCard
            usuario={usuario} comercio={comercio} monto={monto}
            onVerPlan={() => navegarA('plan')} token={token}
        />
        ) : (
        <NoComercioView /> // ✅ NUEVO — si no hay tienda afiliada
        )
    }
    }



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--kueski-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--kueski-blue)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>kueski</span>
          <span style={{ fontSize: 11, color: 'var(--kueski-primary)', fontWeight: 700, background: 'rgba(0,176,80,0.2)', padding: '2px 6px', borderRadius: 4 }}>pay</span>
        </div>
        {comercio && <span className="tag tag-success">● {comercio.nombre}</span>}
        <button onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, background: 'none' }}>
          Salir
        </button>
      </div>



      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {renderView()}
      </div>



      {/* NavBar */}
      <NavBar view={view} setView={setView} />
    </div>
  )
}