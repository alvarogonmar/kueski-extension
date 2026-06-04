# Kueski Pay Assistant

Extensión de Chrome que lleva una experiencia Kueski Pay directamente a tiendas en línea afiliadas. La extensión detecta el comercio actual, lee precios de producto o totales de carrito, muestra crédito disponible, muestra planes de pago, genera un flujo de CVV virtual, registra compras y permite administrar pagos pendientes desde el popup.

Este repositorio fue construido como proyecto académico de construcción de software y está pensado como una demo funcional de producto y tecnología para revisores de Kueski.

## Propósito

En muchas compras en línea, las opciones de financiamiento aparecen tarde dentro del flujo de checkout. Este prototipo explora una experiencia de asistente en navegador que mantiene Kueski Pay visible durante la compra, detecta montos elegibles y ayuda al usuario a entender sus planes de pago antes de finalizar la compra.

El proyecto busca demostrar:

- Una experiencia ligera de extensión Chrome para comercios afiliados.
- Detección de precios de producto y totales de carrito en páginas reales de ecommerce.
- Simulación de pagos conectada a un backend propio.
- Flujo de autorización con PIN y CVV virtual.
- Seguimiento de pagos con alertas, cuotas vencidas y pago múltiple de cuotas.

## Tiendas Soportadas

La extensión reconoce actualmente:

- Amazon México: `amazon.com.mx`
- El Palacio de Hierro: `elpalaciodehierro.com`
- Chedraui México: `chedraui.com.mx`

## Funcionalidades Principales

- Detección automática del comercio mediante content script.
- Detección de precio en páginas de producto.
- Detección de subtotal o total en páginas de carrito, incluyendo carrito de Amazon y bolsa de Palacio de Hierro.
- Parseo de precios con descuento, especialmente en casos como Chedraui.
- Launcher flotante de Kueski dentro de tiendas afiliadas.
- Login y registro con verificación SMS simulada.
- Perfil financiero y crédito disponible.
- Simulación de planes de pago por quincenas.
- Verificación de PIN antes de generar CVV virtual.
- Generación temporal de CVV y confirmación de compra.
- Historial de compras con desglose de cuotas.
- Alertas de pagos próximos y vencidos.
- Pago individual de cuotas.
- Pago múltiple de cuotas seleccionadas en una sola confirmación.
- Perfil de usuario, preferencias, administración de PIN y comercios favoritos.

## Flujo De Demo

1. Abrir una tienda afiliada.
2. Entrar a una página de producto o carrito.
3. Abrir el popup de la extensión.
4. Confirmar que se detecta el comercio y el monto.
5. Revisar crédito disponible.
6. Entrar al simulador de plan de pagos.
7. Seleccionar número de quincenas.
8. Confirmar PIN.
9. Generar y copiar CVV virtual.
10. Confirmar la compra.
11. Revisar historial de compras.
12. Abrir Alertas y pagar una o varias cuotas pendientes.

## Arquitectura

```text
kueski-extension/
|-- backend/       API Express, conexión PostgreSQL/Supabase, auth y compras
|-- extension/     Extensión Chrome con React, Vite y Manifest V3
|-- README.md      Presentación del proyecto
```

### Backend

El backend expone una API REST para:

- Autenticación
- Consulta de comercios
- Perfil financiero y simulación de quincenas
- Verificación de PIN
- Generación de CVV virtual
- Confirmación de compras
- Historial de compras
- Actualización de estado de cuotas
- Alertas de pago
- Preferencias del usuario
- Comercios favoritos

### Extensión

La extensión incluye:

- `content/content.js`: detecta comercio, monto de producto, total de carrito e inyecta el launcher flotante.
- `background/background.js`: guarda último comercio/monto detectado y maneja apertura del popup.
- `src/App.jsx`: estado global y navegación del popup.
- `src/components/`: pantallas de home, plan, PIN, CVV, alertas, historial, perfil, login y perfil en evaluación.
- `src/services/api.js`: cliente para consumir la API.

## Stack Técnico

Backend:

- Node.js
- Express
- PostgreSQL mediante `pg`
- JWT para autenticación
- bcryptjs
- dotenv
- CORS

Extensión:

- React
- Vite
- Manifest V3
- `@crxjs/vite-plugin`
- APIs de Chrome:
  - `chrome.storage.local`
  - `chrome.storage.session`
  - `chrome.runtime`
  - `chrome.tabs`
  - `chrome.action.openPopup`

## Ejecución Local

### 1. Backend

Crear un archivo local `.env` dentro de `backend/` usando valores propios:

```env
PORT=3001
DB_HOST=tu_host_de_base_de_datos
DB_PORT=5432
DB_NAME=tu_base_de_datos
DB_USER=tu_usuario_de_base_de_datos
DB_PASSWORD=tu_password_de_base_de_datos
JWT_SECRET=tu_secreto_local_para_jwt
```

Después ejecutar:

```bash
cd backend
npm install
npm run dev
```

URL esperada de la API:

```text
http://localhost:3001
```

### 2. Extensión

```bash
cd extension
npm install
npm run build
```

Luego cargar la extensión en Chrome:

1. Abrir `chrome://extensions`.
2. Activar modo desarrollador.
3. Seleccionar "Cargar sin empaquetar".
4. Elegir la carpeta `extension/dist`.

## Validación

Comandos útiles:

```bash
cd extension
npm run build
```

```bash
node --check extension/content/content.js
node --check extension/background/background.js
node --check backend/routes/compras.js
```

El backend actualmente no incluye un script automatizado de pruebas.

## Notas De Datos Y Seguridad

- El archivo `.env` debe mantenerse fuera de control de versiones.
- El flujo de CVV es una simulación de prototipo y no está conectado a una red bancaria real.
- Los métodos de pago del modal son simulados para fines de demo.
- El proyecto está diseñado para demostración local y evaluación académica, no para despliegue productivo.

## Uso Y Permisos

Este proyecto fue desarrollado con fines académicos y de demostración. El código, documentación, diseño de flujo y estructura del repositorio no deben copiarse, redistribuirse, publicarse como trabajo propio ni reutilizarse en otros proyectos sin autorización previa de sus autores.

Para usar, compartir, adaptar o tomar partes de este repositorio, se debe solicitar permiso explícito.

## Estado Actual

Implementado y funcionando dentro del prototipo:

- Detección de comercios afiliados.
- Detección de monto en producto y carrito.
- Simulación de quincenas.
- Login/registro con verificación simulada.
- Flujo de PIN y CVV virtual.
- Creación de compras y cuotas.
- Historial de compras.
- Alertas de cuotas pendientes o vencidas.
- Pago individual y pago múltiple de cuotas.
- Perfil, preferencias y comercios favoritos.

Limitaciones conocidas del prototipo:

- Los selectores del DOM de ecommerce pueden cambiar y requerir mantenimiento.
- El procesamiento externo de pagos está simulado.
- Las reglas de notificación y riesgo están simplificadas para demo.
- El backend todavía no cuenta con pruebas automatizadas.

## Propósito Del Repositorio

Este proyecto es una prueba funcional de concepto sobre cómo un asistente en navegador podría hacer que Kueski Pay sea más visible y accionable durante el recorrido de compra. El enfoque está en experiencia de usuario, viabilidad técnica y claridad para demo.

# English Version

Chrome extension prototype that brings a Kueski Pay-like financing experience directly into affiliated online stores. The extension detects the current store, reads product or cart totals, shows available credit, simulates installment plans, generates a virtual CVV flow, records purchases, and lets users manage pending payments from the popup.

This repository was built as an academic software construction project and is intended as a product/technical demo for Kueski reviewers.

## Why This Exists

Online shoppers often discover financing options late in the purchase journey. This prototype explores a browser-based assistant that keeps Kueski Pay visible during the shopping experience, detects eligible purchases, and helps users understand payment plans before checkout.

The goal is to demonstrate:

- A lightweight Chrome extension experience for affiliated merchants.
- Product and cart total detection from real ecommerce pages.
- Installment simulation connected to a backend API.
- A secure-feeling purchase authorization flow with PIN and virtual CVV.
- Payment follow-up with alerts, overdue-state handling, and batch payment of quotas.

## Supported Demo Stores

The extension currently recognizes:

- Amazon Mexico: `amazon.com.mx`
- El Palacio de Hierro: `elpalaciodehierro.com`
- Chedraui Mexico: `chedraui.com.mx`

## Core Features

- Store detection through a content script.
- Product price detection on product pages.
- Cart/subtotal detection on cart pages, including Amazon cart and Palacio de Hierro `bolsa`.
- Discount-aware price parsing for stores such as Chedraui.
- Floating Kueski launcher injected into affiliated stores.
- Login/register flow with simulated SMS verification.
- Financial profile and available credit display.
- Installment plan simulation by number of quincenas.
- PIN verification before generating a virtual CVV.
- Temporary CVV generation and purchase confirmation.
- Purchase history with installment breakdown.
- Payment alerts for upcoming and overdue quotas.
- Individual quota payment.
- Multi-select quota payment with one combined payment confirmation.
- User profile, preferences, PIN management, and favorite stores.

## Demo Flow

1. Open an affiliated store.
2. Visit a product page or cart page.
3. Open the extension popup.
4. Confirm that the commerce and detected amount appear.
5. Review available credit.
6. Open the payment plan simulator.
7. Select a quincena plan.
8. Confirm PIN.
9. Generate and copy a virtual CVV.
10. Confirm the purchase.
11. Review the purchase history.
12. Open alerts and pay one or multiple pending quotas.

## Architecture

```text
kueski-extension/
|-- backend/       Express API, PostgreSQL/Supabase connection, auth, purchases
|-- extension/     Chrome extension with React, Vite, Manifest V3
|-- README.md      Project presentation
```

### Backend

The backend exposes a REST API for:

- Authentication
- Commerce lookup
- Financial profile and installment simulation
- PIN verification
- Virtual CVV generation
- Purchase confirmation
- Purchase history
- Quota status updates
- Payment alerts
- User preferences
- Favorite stores

### Extension

The extension includes:

- `content/content.js`: detects store, product amount, cart total, and injects the floating launcher.
- `background/background.js`: stores last detected commerce/amount and handles popup opening.
- `src/App.jsx`: popup state and navigation.
- `src/components/`: UI screens for home, plan, PIN, CVV, alerts, history, profile, login, and pending credit.
- `src/services/api.js`: frontend API client.

## Tech Stack

Backend:

- Node.js
- Express
- PostgreSQL via `pg`
- JWT authentication
- bcryptjs
- dotenv
- CORS

Extension:

- React
- Vite
- Manifest V3
- `@crxjs/vite-plugin`
- Chrome Extension APIs:
  - `chrome.storage.local`
  - `chrome.storage.session`
  - `chrome.runtime`
  - `chrome.tabs`
  - `chrome.action.openPopup`

## Local Setup

### 1. Backend

Create a local `.env` file inside `backend/` using placeholder values like these:

```env
PORT=3001
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_local_jwt_secret
```

Then run:

```bash
cd backend
npm install
npm run dev
```

Expected API URL:

```text
http://localhost:3001
```

### 2. Extension

```bash
cd extension
npm install
npm run build
```

Then load the built extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select `extension/dist`.

## Validation

Useful checks:

```bash
cd extension
npm run build
```

```bash
node --check extension/content/content.js
node --check extension/background/background.js
node --check backend/routes/compras.js
```

The backend currently does not include an automated test script.

## Data And Security Notes

- This repository should not include real database credentials, production secrets, or private user data.
- The `.env` file is intentionally excluded from version control.
- The CVV flow is a prototype simulation and is not connected to a real card network.
- Payment methods in the modal are simulated for demo purposes.
- The project is designed for local demonstration and academic evaluation, not production deployment.

## Current Status

Implemented and working in the prototype:

- Commerce detection
- Product and cart amount detection
- Installment simulation
- Login/register with simulated verification
- PIN and virtual CVV flow
- Purchase creation and quota generation
- Purchase history
- Alerts for pending/overdue quotas
- Individual and batch quota payment
- Profile, preferences, and favorite stores

Known prototype limitations:

- Ecommerce DOM selectors can change over time and may require maintenance.
- External payment processing is simulated.
- Notification and risk rules are simplified for demo use.
- Backend test coverage is not yet automated.

## Repository Purpose

This project is a functional proof of concept for how a browser assistant could make Kueski Pay more discoverable and actionable during the shopping journey. It focuses on end-to-end experience, technical feasibility, and demo clarity.
