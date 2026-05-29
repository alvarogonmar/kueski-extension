// Service Worker — maneja notificaciones y mensajes de fondo


chrome.runtime.onInstalled.addListener(() => {
  console.log('Kueski Pay Assistant instalado')
})


// detecta cuando el usuario navega a otra tienda
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const afiliadas = ['amazon.com.mx', 'elpalaciodehierro.com', 'chedraui.com.mx']
    const esAfiliada = afiliadas.some(d => tab.url.includes(d))

    if (!esAfiliada) {
      // Solo limpiar comercio si NO hay un flujo de CVV/PIN activo
      chrome.storage.session.get(['vistaActiva'], (session) => {
        const vistaEnFlujo = ['pin', 'cvv'].includes(session.vistaActiva)
        if (!vistaEnFlujo) {
          chrome.storage.local.remove(['last_comercio', 'last_monto'])
        }
      })
    }

    chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: tab.url })
      .catch(() => {}) // silencia error si la tab no tiene content script
  }
})


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.tipo === 'COMERCIO') {
    chrome.storage.local.set({ last_comercio: message.comercio })
  }


  if (message.tipo === 'MONTO') {
    chrome.storage.local.set({ last_monto: message.monto })
  }

  if (message.tipo === 'LIMPIAR_MONTO') {
    chrome.storage.local.remove(['last_monto'])
  }


  if (message.tipo === 'ABRIR_POPUP') {
    chrome.action.openPopup()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }


  sendResponse({ ok: true })
  return true
})
