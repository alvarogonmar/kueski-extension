// Service Worker — maneja notificaciones y mensajes de fondo

chrome.runtime.onInstalled.addListener(() => {
  console.log('Kueski Pay Assistant instalado')
})

// Relay de mensajes del content script al popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.tipo === 'COMERCIO' || message.tipo === 'MONTO') {
    // Guardar en storage para que el popup lo lea al abrirse
    chrome.storage.local.set({ 
      [`last_${message.tipo.toLowerCase()}`]: message.tipo === 'COMERCIO' 
        ? message.comercio 
        : message.monto 
    })
  }
  sendResponse({ ok: true })
  return true
})