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
    'elpalaciodehierro.com': {
      nombre: 'Palacio de Hierro',
      selectores: [
        '.b-product_price-sales .b-product_price-value',
        '.b-product_price-value[content]',
        '[data-js-line-item-price-sales] .b-product_price-value',
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
  inyectarLauncher()


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
      inyectarLauncher()
    }
  })

})()
