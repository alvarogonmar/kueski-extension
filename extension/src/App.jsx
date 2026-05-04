import React, { useEffect, useState } from 'react'
import LoginView from './components/LoginView.jsx'
import HomeCard from './components/HomeCard.jsx'
import PaymentPlan from './components/PaymentPlan.jsx'
import PurchaseHistory from './components/PurchaseHistory.jsx'
import NavBar from './components/NavBar.jsx'

export default function App() {
  const [token, setToken] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [view, setView] = useState('home')
  const [monto, setMonto] = useState(null)
  const [comercio, setComercio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restaurar sesión
    const restore = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['jwt', 'usuario'], (result) => {
            if (result.jwt) {
              setToken(result.jwt)
              setUsuario(result.usuario)
            }
            setLoading(false)
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

    // Escuchar mensajes del content script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.tipo === 'MONTO') setMonto(msg.monto)
        if (msg.tipo === 'COMERCIO') setComercio(msg.comercio)
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
      chrome.storage.local.remove(['jwt', 'usuario'])
    } else {
      localStorage.removeItem('kueski_jwt')
      localStorage.removeItem('kueski_usuario')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 500, background: 'var(--kueski-bg)' }}>
      <div style={{ color: 'var(--kueski-primary)', fontSize: 32 }}>⬡</div>
    </div>
  )

  if (!token) return <LoginView onLogin={handleLogin} />

  const renderView = () => {
    switch (view) {
      case 'plan': return <PaymentPlan monto={monto} comercio={comercio} token={token} />
      case 'history': return <PurchaseHistory token={token} />
      default: return <HomeCard usuario={usuario} comercio={comercio} monto={monto} onVerPlan={() => setView('plan')} />
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