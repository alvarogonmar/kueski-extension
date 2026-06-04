(function () {
  const COMERCIOS = {
    'amazon.com.mx': {
      nombre: 'Amazon',
      selectores: [
        '#corePriceDisplay_desktop_feature_div .a-price-whole',
        '.a-price .a-offscreen',
        '#price_inside_buybox',
        '#priceblock_ourprice'
      ],
      selectoresCarrito: [
        '#sc-subtotal-amount-activecart .a-offscreen',
        '#sc-subtotal-amount-buybox .a-offscreen',
        '[data-name="Subtotals"] .a-offscreen',
        '.sc-price',
      ]
    },
    'elpalaciodehierro.com': {
      nombre: 'Palacio de Hierro',
      selectores: [
        '.b-product_price-sales .b-product_price-value',
        '.b-product_price-value[content]',
        '[data-js-line-item-price-sales] .b-product_price-value',
      ],
      selectoresCarrito: [
        '[data-js-sub-total]',
        '[data-js-grand-total]',
        '[data-js-order-total]',
        '.b-cart_summary-row.m-total .b-cart_summary-value',
        '.b-cart_summary-row.m-subtotal .b-cart_summary-value',
        '[class*="order" i] [class*="total" i]',
        '[class*="summary" i] [class*="total" i]',
        '[class*="totals" i]',
        '[class*="subtotal" i]',
      ]
    },
    'chedraui.com.mx': {
      nombre: 'Chedraui',
      selectores: [
        '[itemprop="price"]',
        '[data-testid*="price"]',
        '[class*="price"]',
        '[class*="Price"]',
        '.price',
      ]
    },
  }

  const inyectarLauncher = () => {
    if (document.getElementById('kueski-pay-launcher-host')) return

    const host = document.createElement('div')
    host.id = 'kueski-pay-launcher-host'
    host.style.position = 'fixed'
    host.style.bottom = '24px'
    host.style.right = '24px'
    host.style.zIndex = '2147483647'

    const shadow = host.attachShadow({ mode: 'open' })
    const logoUrl = chrome.runtime.getURL('kueski_logo.png')

    shadow.innerHTML = `
      <style>
        .launcher {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          border: 2px solid rgba(8, 116, 255, 0.18);
          background: #ffffff;
          box-shadow: 0 10px 28px rgba(26, 20, 99, 0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease;
          padding: 8px;
        }

        .launcher:hover {
          transform: scale(1.05);
          box-shadow: 0 14px 34px rgba(26, 20, 99, 0.28);
        }

        .launcher:active {
          transform: scale(0.98);
        }

        .launcher img {
          width: 46px;
          height: auto;
          display: block;
          pointer-events: none;
        }

        .hint {
          position: absolute;
          bottom: 70px;
          right: 0;
          background: #1A1463;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
          padding: 7px 10px;
          border-radius: 999px;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 160ms ease, transform 160ms ease;
          pointer-events: none;
        }

        .wrap:hover .hint {
          opacity: 1;
          transform: translateY(0);
        }
      </style>
      <div class="wrap">
        <button class="launcher" type="button" aria-label="Abrir Kueski Pay">
          <img src="${logoUrl}" alt="Kueski Pay" />
        </button>
        <div class="hint">Abrir Kueski Pay</div>
      </div>
    `

    shadow.querySelector('.launcher').addEventListener('click', () => {
      detectarComercioYEnviar()
      chrome.runtime.sendMessage({ tipo: 'ABRIR_POPUP' })
    })

    document.documentElement.appendChild(host)
  }

  const limpiarMonto = () => {
    chrome.runtime.sendMessage({ tipo: 'LIMPIAR_MONTO' })
  }

  const esPaginaHome = () => {
    const path = location.pathname.replace(/\/+$/, '')
    return path === '' || path === '/home' || path === '/inicio'
  }

  const esPaginaProducto = () => {
    if (esPaginaHome()) return false

    if (dominio === 'amazon.com.mx') {
      return /\/(dp|gp\/product)\//.test(location.pathname)
    }

    if (dominio === 'elpalaciodehierro.com') {
      return location.pathname.endsWith('.html') ||
        !!document.querySelector('.b-product_detail, .b-product_name, [data-pid]')
    }

    if (dominio === 'chedraui.com.mx') {
      return /\/p(\/|$)|\/producto\//i.test(location.pathname) ||
        !!document.querySelector('[itemtype*="Product"], [data-testid*="product-detail"], button[class*="add-to-cart" i]')
    }

    return false
  }

  const esPaginaCarrito = () => {
    if (dominio === 'amazon.com.mx') {
      return /\/gp\/cart|\/cart|\/cart\/view/i.test(location.pathname)
    }

    if (dominio === 'elpalaciodehierro.com') {
      return /bolsa|cart|carrito|checkout/i.test(location.pathname)
    }

    if (dominio === 'chedraui.com.mx') {
      return /cart|carrito|checkout/i.test(location.pathname)
    }

    return false
  }

  // Función reutilizable para re-detectar al cambiar de tienda
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
  inyectarLauncher()


  const parsearMonto = (texto) => {
    if (!texto) return null

    const matchesPesos = [...texto.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)]
    if (matchesPesos.length > 0) {
      return parseFloat(matchesPesos[matchesPesos.length - 1][1].replace(/,/g, ''))
    }

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
    if (dominio === 'chedraui.com.mx') {
      const montoChedraui = extraerMontoChedraui()
      if (montoChedraui) return montoChedraui
    }

    for (const selector of comercio.selectores) {
      const el = document.querySelector(selector)
      if (el) {
        const contentMonto = parsearMonto(el.getAttribute('content'))
        if (contentMonto && contentMonto >= 10 && contentMonto <= 500000) return contentMonto

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

  const esVisible = (el) => {
    const rect = el.getBoundingClientRect()
    const style = window.getComputedStyle(el)
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity) !== 0
  }

  const estaTachado = (el) => {
    let actual = el
    let profundidad = 0

    while (actual && actual !== document.body && profundidad < 4) {
      const style = window.getComputedStyle(actual)
      const decoration = `${style.textDecorationLine} ${style.textDecoration}`.toLowerCase()
      const clases = String(actual.className || '').toLowerCase()
      if (decoration.includes('line-through') || clases.includes('old') || clases.includes('strike')) {
        return true
      }
      actual = actual.parentElement
      profundidad += 1
    }

    return false
  }

  const extraerMontoChedraui = () => {
    const candidatos = [...document.querySelectorAll('span, div, p')]
      .map(el => {
        const texto = el.textContent || ''
        const monto = parsearMonto(texto)
        if (!monto || monto < 10 || monto > 500000) return null
        if (!texto.includes('$')) return null
        if (!esVisible(el) || estaTachado(el)) return null

        const style = window.getComputedStyle(el)
        return {
          monto,
          fontSize: parseFloat(style.fontSize) || 0,
          fontWeight: parseInt(style.fontWeight, 10) || 400,
          top: el.getBoundingClientRect().top,
        }
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.fontSize - a.fontSize ||
        b.fontWeight - a.fontWeight ||
        a.top - b.top
      )

    return candidatos[0]?.monto || null
  }

  const extraerMontos = (texto) => {
    if (!texto) return []
    return [...texto.matchAll(/\$\s*([\d,]+(?:\.\d{1,2})?)/g)]
      .map(match => parseFloat(match[1].replace(/,/g, '')))
      .filter(monto => monto >= 10 && monto <= 500000)
  }

  const extraerMontoDesdeTextoCercano = () => {
    const candidatos = [...document.querySelectorAll('span, div, td, p')]
      .map(el => {
        const texto = el.textContent || ''
        if (!/(subtotal|total|resumen|orden|bolsa)/i.test(texto) || !/\$/.test(texto)) return null
        if (!esVisible(el)) return null

        const montos = extraerMontos(texto)
        if (montos.length === 0) return null

        return {
          monto: montos[montos.length - 1],
          texto,
          prioridad: /total/i.test(texto) ? 2 : /subtotal/i.test(texto) ? 1 : 0,
          area: el.getBoundingClientRect().width * el.getBoundingClientRect().height,
        }
      })
      .filter(Boolean)
      .sort((a, b) =>
        b.prioridad - a.prioridad ||
        a.area - b.area ||
        b.monto - a.monto
      )

    return candidatos[0]?.monto || null
  }

  const extraerMontoCarrito = () => {
    const selectores = comercio.selectoresCarrito || []

    for (const selector of selectores) {
      const elementos = [...document.querySelectorAll(selector)]
      for (const el of elementos) {
        const texto = el.textContent || el.getAttribute('content') || ''
        const monto = parsearMonto(texto)
        if (monto && monto >= 10 && monto <= 500000) return monto
      }
    }

    if (dominio === 'elpalaciodehierro.com') {
      const resumen = document.querySelector('.b-cart_summary, [data-component="cart/Totals"]')
      if (resumen) {
        const montoResumen = parsearMonto(resumen.textContent || '')
        if (montoResumen && montoResumen >= 10 && montoResumen <= 500000) return montoResumen
      }
    }

    return extraerMontoDesdeTextoCercano()
  }


  const enviarMonto = () => {
    if (esPaginaCarrito()) {
      const montoCarrito = extraerMontoCarrito()
      if (montoCarrito) {
        chrome.runtime.sendMessage({ tipo: 'MONTO', monto: montoCarrito, origen: 'carrito' })
      } else {
        limpiarMonto()
      }
      return
    }

    if (!esPaginaProducto()) {
      limpiarMonto()
      return
    }

    const monto = extraerMonto()
    if (monto) {
      chrome.runtime.sendMessage({ tipo: 'MONTO', monto, origen: 'producto' })
    } else {
      limpiarMonto()
    }
  }


  enviarMonto()
  new MutationObserver(() => enviarMonto()).observe(document.body, { childList: true, subtree: true })


  let intentos = 0
  const intervalo = setInterval(() => {
    enviarMonto()
    if (++intentos >= 5) clearInterval(intervalo)
  }, 2000)

  // Escucha cuando background.js detecta cambio de URL
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'URL_CHANGED') {
      detectarComercioYEnviar()
      inyectarLauncher()
    }
  })

})()
