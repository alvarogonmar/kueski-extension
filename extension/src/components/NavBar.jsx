import React from 'react'


const tabs = [
  { id: 'home', label: 'Inicio', icon: '⊙' },
  { id: 'plan', label: 'Plan', icon: '◈' },
  { id: 'alertas', label: 'Alertas', icon: '🔔' },
  { id: 'history', label: 'Historial', icon: '☰' },
  { id: 'profile', label: 'Perfil', icon: '◉' },
]


export default function NavBar({ view, setView, alertasPendientes = 0 }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--kueski-surface)',
      borderTop: '1px solid var(--kueski-border)',
      padding: '4px 8px',
    }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setView(tab.id)} style={{
          flex: 1, padding: '10px 4px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 3, background: 'none',
          color: view === tab.id ? 'var(--kueski-primary)' : 'var(--kueski-text-muted)',
          fontSize: 18, fontWeight: view === tab.id ? 700 : 400,
          borderTop: view === tab.id ? '2px solid var(--kueski-primary)' : '2px solid transparent',
          transition: 'all 0.15s', position: 'relative'
        }}>
          <span style={{ position: 'relative' }}>
            {tab.icon}
            {/* Badge rojo en Alertas si hay vencimientos pendientes */}
            {tab.id === 'alertas' && alertasPendientes > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: '#ef4444', color: 'white',
                fontSize: 9, fontWeight: 800,
                width: 14, height: 14, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {alertasPendientes > 9 ? '9+' : alertasPendientes}
              </span>
            )}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}