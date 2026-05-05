// services/api.js — COMPLETO CORREGIDO
export const API = 'http://localhost:3001/api'

const request = async (endpoint, options = {}, token = null) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(`${API}${endpoint}`, { ...options, headers })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'Error en la solicitud')
  return data
}

export const authAPI = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (nombre, apellido, email, password) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ nombre, apellido, email, password }) }),
}

export const comerciosAPI = {
  getAll: (token) => request('/comercios', {}, token),
  porDominio: (dominio) => request(`/comercios/dominio/${dominio}`),
}

export const comprasAPI = {
  getAll: (token) => request('/compras', {}, token),
  getById: (token, id) => request(`/compras/${id}`, {}, token),
}

export const calculadoraAPI = {
  // ✅ Corrección: /calculadora/simular y campo num_quincenas
  simular: (token, monto, num_quincenas) =>
    request('/calculadora/simular', {
      method: 'POST',
      body: JSON.stringify({ monto, num_quincenas })
    }, token),
  perfil: (token) => request('/calculadora/perfil', {}, token),
  config: () => request('/calculadora/config'),
}

export const pinAPI = {
  crear: (token, pin) =>
    request('/pin/crear', { method: 'POST', body: JSON.stringify({ pin }) }, token),
  verificar: (token, pin) =>
    request('/pin/verificar', { method: 'POST', body: JSON.stringify({ pin }) }, token),
}

export const tokensAPI = {
  // ✅ Ahora genera el CVV, no pide saldo
  generar: (token, pin, comercio_id, monto, num_quincenas) =>
    request('/tokens/generar', {
      method: 'POST',
      body: JSON.stringify({ pin, comercio_id, monto, num_quincenas })
    }, token),
  canjear: (token, token_id) =>
    request('/tokens/canjear', {
      method: 'POST',
      body: JSON.stringify({ token_id })
    }, token),
}

export const preferenciasAPI = {
  get: (token) => request('/preferencias', {}, token),
  update: (token, body) =>
    request('/preferencias', { method: 'PUT', body: JSON.stringify(body) }, token),
}

export const recordatoriosAPI = {
  getPendientes: (token) => request('/recordatorios/pendientes', {}, token),
  marcarEnviado: (token, id) =>
    request(`/recordatorios/${id}/enviado`, { method: 'PUT' }, token),
}