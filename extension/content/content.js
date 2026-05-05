(function () {
  const COMERCIOS = {
    'amazon.com.mx': {
      nombre: 'Amazon',
      selectores: [
        '#corePriceDisplay_desktop_feature_div .a-price-whole',
        '.a-price .a-offscreen',
        '#price_inside_buybox',
        '#priceblock_ourprice'
      ]
    },
    'liverpool.com.mx': {
      nombre: 'Liverpool',
      selectores: [
        '.a-product__paragraphDiscountPrice',
        '.a-product__paragraphRegularPrice',
      ]
    },
    'walmart.com.mx': {
      nombre: 'Walmart',
      selectores: [
        '[itemprop="price"]',
        '.price-characteristic',
        '[class*="price-group"]'
      ]
    },
  }

  // ✅ NUEVO — función reutilizable para re-detectar al cambiar de tienda
  const detectarComercioYEnviar = () => {
    const dominio = Object.keys(COMERCIOS).find(d => location.hostname.includes(d))
    if (!dominio) return

    const comercio = COMERCIOS[dominio]

    chrome.runtime.sendMessage({ tipo: 'COMERCIO', comercio: { nombre: comercio.nombre, dominio } })
    enviarMonto()
  }

  const dominio = Object.keys(COMERCIOS).find(d => location.hostname.includes(d))
  if (!dominio) return


  const comercio = COMERCIOS[dominio]


  chrome.runtime.sendMessage({ tipo: 'COMERCIO', comercio: { nombre: comercio.nombre, dominio } })


  const parsearMonto = (texto) => {
    if (!texto) return null


    let limpio = texto.trim().replace(/[^0-9.,]/g, '')
    if (!limpio) return null


    // Formato mexicano: "1,399.00" → 1399.00
    if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(limpio)) {
      return parseFloat(limpio.replace(/,/g, ''))
    }


    // Solo dígitos con punto decimal: "1399.00" → 1399.00
    if (/^\d+(\.\d{1,2})?$/.test(limpio)) {
      return parseFloat(limpio)
    }


    // Formato europeo: "1.399,00" → 1399.00
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(limpio)) {
      return parseFloat(limpio.replace(/\./g, '').replace(',', '.'))
    }


    // Fallback: buscar primer $xxx válido en el texto
    const match = texto.match(/\$[\s]?([\d,]+\.?\d{0,2})/)
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''))
    }


    return null
  }


  const extraerMonto = () => {
    for (const selector of comercio.selectores) {
      const el = document.querySelector(selector)
      if (el) {
        // Clonar y remover superíndices antes de leer el texto
        const clon = el.cloneNode(true)
        clon.querySelectorAll('sup, .superindex, [class*="super"]').forEach(e => e.remove())


        const texto = clon.textContent || el.getAttribute('content') || ''
        const monto = parsearMonto(texto)
        if (monto && monto >= 10 && monto <= 500000) return monto
      }
    }
    return null
  }


  const enviarMonto = () => {
    const monto = extraerMonto()
    if (monto) chrome.runtime.sendMessage({ tipo: 'MONTO', monto })
  }


  enviarMonto()
  new MutationObserver(() => enviarMonto()).observe(document.body, { childList: true, subtree: true })


  let intentos = 0
  const intervalo = setInterval(() => {
    enviarMonto()
    if (++intentos >= 5) clearInterval(intervalo)
  }, 2000)

  // ✅ NUEVO — escucha cuando background.js detecta cambio de URL
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'URL_CHANGED') {
      detectarComercioYEnviar()
    }
  })

})()