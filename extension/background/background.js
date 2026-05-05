// Service Worker — maneja notificaciones y mensajes de fondo

chrome.runtime.onInstalled.addListener(() => {
  console.log('Kueski Pay Assistant instalado')
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ✅ Guardar con claves separadas y explícitas
  if (message.tipo === 'COMERCIO') {
    chrome.storage.local.set({ last_comercio: message.comercio })
  }

  if (message.tipo === 'MONTO') {
    chrome.storage.local.set({ last_monto: message.monto })
  }

  sendResponse({ ok: true })
  return true
})