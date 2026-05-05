# Reporte de Avance — Kueski Pay Chrome Extension

**Proyecto:** Chrome Widget para Impulsar el Uso de Kueski Pay  
**Desarrollador:** Álvaro González  
**Fecha:** Mayo 2026  
**Stack:** Node.js + Express + PostgreSQL (Supabase) + React + Vite + Manifest V3

---

## Resumen Ejecutivo

Se construyó desde cero una extensión de Chrome funcional que detecta automáticamente el precio de productos en tiendas afiliadas (Amazon, Liverpool, Walmart), simula planes de pago en quincenas conectando con un backend REST propio, y gestiona sesiones de usuario con autenticación JWT. El proyecto cubre tanto el backend completo como el frontend React del popup.

---

## Lo que se construyó

### Backend (Node.js + Express + Supabase)

Se implementó una API REST completa con las siguientes rutas:

| Endpoint                          | Método  | Descripción                          |
| --------------------------------- | ------- | ------------------------------------ |
| `/api/auth/register`              | POST    | Registro de usuario con hash bcrypt  |
| `/api/auth/login`                 | POST    | Login con JWT (7 días de expiración) |
| `/api/comercios`                  | GET     | Lista de comercios afiliados         |
| `/api/comercios/dominio/:dominio` | GET     | Buscar comercio por dominio          |
| `/api/calculadora/simular`        | POST    | Simular plan de quincenas            |
| `/api/calculadora/perfil`         | GET     | Perfil financiero del usuario        |
| `/api/pin/crear`                  | POST    | Crear PIN de seguridad               |
| `/api/pin/verificar`              | POST    | Verificar PIN                        |
| `/api/tokens/generar`             | POST    | Generar CVV virtual                  |
| `/api/tokens/canjear`             | POST    | Confirmar compra y crear cuotas      |
| `/api/compras`                    | GET     | Historial de compras                 |
| `/api/preferencias`               | GET/PUT | Preferencias del usuario             |
| `/api/recordatorios/pendientes`   | GET     | Recordatorios de pago                |

**Estructura de archivos del backend:**

```
backend/
├── server.js
├── routes/
│   ├── auth.js
│   ├── comercios.js
│   ├── calculadora.js
│   ├── pin.js
│   ├── tokens.js
│   ├── compras.js
│   ├── preferencias.js
│   └── recordatorios.js
├── middleware/
│   └── auth.js (verificación JWT)
├── db/
│   ├── db.js (pool de conexiones)
│   └── schema.sql
└── .env
```

### Base de datos (Supabase / PostgreSQL)

Se ejecutó el schema completo con las siguientes tablas relevantes:

- `usuarios` — datos de cuenta y contraseña hasheada
- `perfil_financiero` — límite de crédito y crédito disponible (columna calculada automáticamente)
- `comercios` — tiendas afiliadas con dominio y logo
- `compras` — historial de compras con quincenas y estado
- `cuotas` — desglose de pagos por compra
- `tokens_pago` — CVV virtuales generados
- `preferencias` — configuración del usuario
- `recordatorios` — alertas de pago pendientes
- `favoritos` — comercios favoritos del usuario

### Extensión Chrome (React + Vite + Manifest V3)

Se construyó el popup completo con los siguientes componentes:

| Componente            | Función                                                  |
| --------------------- | -------------------------------------------------------- |
| `LoginView.jsx`       | Pantalla de login y registro                             |
| `HomeCard.jsx`        | Vista principal con comercio, monto y crédito disponible |
| `PaymentPlan.jsx`     | Simulador de quincenas con selector visual               |
| `PurchaseHistory.jsx` | Historial de compras del usuario                         |
| `NavBar.jsx`          | Barra de navegación inferior                             |

**Scripts adicionales:**

- `content/content.js` — detecta comercio y precio en la página activa usando MutationObserver
- `background/background.js` — service worker que persiste datos en `chrome.storage.local`

---

## Errores encontrados y soluciones

### 1. Estructura de carpetas incorrecta

**Problema:** Al inicializar el proyecto, `package.json` y `node_modules` quedaron en la raíz en lugar de dentro de `backend/`.  
**Solución:** Se movieron manualmente con `mv` desde la terminal y se corrigió el campo `name` del `package.json`.

### 2. Endpoints incorrectos en `api.js`

**Problema:** El frontend llamaba a `/calculadora` pero el backend espera `/calculadora/simular`. También el campo enviado era `quincenas` en lugar de `num_quincenas`.  
**Solución:** Se corrigió el archivo `services/api.js` con todos los endpoints y parámetros correctos.

### 3. `$NaN` en crédito disponible

**Problema:** El componente `HomeCard` leía `perfil.credito_disponible` pero la tabla `perfil_financiero` estaba vacía en Supabase.  
**Solución:** Se insertó el registro inicial con `INSERT INTO perfil_financiero` y se agregó fallback con `?? 0` para evitar `NaN` si no hay datos.

### 4. Nombres de columnas incorrectos en `PurchaseHistory`

**Problema:** El componente usaba `compra.monto`, `compra.quincenas`, `compra.estatus`, `compra.fecha`, pero el backend devuelve `monto_total`, `num_quincenas`, `estado`, `fecha_compra`.  
**Solución:** Se actualizaron todos los campos del componente para coincidir con el schema real de la base de datos.

### 5. Comercio y monto no se mostraban al abrir el popup

**Problema:** El content script mandaba el mensaje `COMERCIO` y `MONTO` cuando la página cargaba, pero si el popup estaba cerrado en ese momento, nadie escuchaba el mensaje y se perdía.  
**Solución:** Se configuró `background.js` para guardar `last_comercio` y `last_monto` en `chrome.storage.local`, y `App.jsx` los lee al montarse, garantizando que el popup siempre tenga los datos aunque se abra después.

### 6. Precios de Liverpool mal parseados

**Problema:** El selector agarraba el texto completo del contenedor, que incluía centavos como superíndice (`<sup>`) y en productos con descuento tomaba ambos precios concatenados, generando números como `$32,630,003,099,850.00`.  
**Solución:**

- Se clona el elemento DOM antes de leer el texto y se eliminan todos los `<sup>` con `querySelectorAll('sup').forEach(e => e.remove())`.
- Se reemplazaron los selectores genéricos de Liverpool por las clases exactas del sitio: `.a-product__paragraphDiscountPrice` (precio con descuento) y `.a-product__paragraphRegularPrice` (precio normal), priorizando el precio con descuento.
- Se agregó validación de rango `>= 10 && <= 500,000` para descartar números inválidos.

### 7. `tokensAPI.get()` ya no existe

**Problema:** `HomeCard` llamaba a `tokensAPI.get(token)` para mostrar saldo, pero ese endpoint fue reemplazado en el backend por el flujo de generación de CVV.  
**Solución:** Se reemplazó por `calculadoraAPI.perfil(token)` que devuelve el crédito disponible del usuario desde `perfil_financiero`.

### 8. Columna `score` no existe en `perfil_financiero`

**Problema:** Al intentar insertar datos de prueba en Supabase, el SQL incluía la columna `score` que no existe en el schema real.  
**Solución:** Se corrigió el INSERT para usar solo las columnas reales: `usuario_id`, `limite_credito`, `credito_usado`, `nivel_riesgo`. La columna `credito_disponible` es calculada automáticamente por PostgreSQL.

---

## Estado actual del proyecto

| Módulo                            | Estado                                   |
| --------------------------------- | ---------------------------------------- |
| Backend API REST                  | ✅ Completo y funcionando                |
| Autenticación JWT                 | ✅ Funcionando                           |
| Base de datos Supabase            | ✅ Conectada con datos de prueba         |
| Popup React                       | ✅ Compilado y cargado en Chrome         |
| Detección de comercio (Amazon)    | ✅ Funcionando                           |
| Detección de comercio (Liverpool) | ✅ Funcionando con selectores corregidos |
| Detección de comercio (Walmart)   | ✅ Funcionando                           |
| Detección de precio con descuento | ✅ Corregido (toma precio final)         |
| Simulador de quincenas            | ✅ Conectado al backend real             |
| Historial de compras              | ✅ Funcionando                           |
| Crédito disponible                | ✅ Funcionando con datos en Supabase     |
| Persistencia de sesión            | ✅ Via chrome.storage.local              |

---

## Pendiente / Próximos pasos

- Implementar flujo completo de compra con PIN y generación de CVV virtual en el popup
- Agregar vista de Preferencias
- Conectar recordatorios de pago con notificaciones de Chrome
- Agregar comercios favoritos desde el popup
- Pruebas en Chrome con usuario real en Amazon, Liverpool y Walmart
- Preparar demo para entrega del ciclo

## Actualizacion 2

Lo que se construyó
Flujo completo de compra PIN + CVV
Se crearon 2 componentes nuevos y se conectaron al router del popup:

PaymentPlan → [Pagar con Kueski]
→ PinView → CvvView → HomeCard ✅
PinView.jsx — pantalla de ingreso de PIN con bloqueo tras 3 intentos fallidos

CvvView.jsx — muestra 🔐 "CVV generado" con countdown de 2 min y botón copiar (el número NO se muestra en pantalla, va directo al portapapeles)

Crédito disponible real
Se actualizó backend/routes/tokens.js para que el crédito sea funcional:

Al generar CVV → valida que el monto no supere el crédito disponible

Al confirmar compra → descuenta el monto de credito_usado en Supabase

### 5 Bugs corregidos

| #   | Bug                                      | Solución                                                                   |
| --- | ---------------------------------------- | -------------------------------------------------------------------------- |
| 1   | CVV copiaba undefined                    | El backend devuelve token_pago.id, se usa ese como CVV con padStart(6,'0') |
| 2   | Siempre guardaba Amazon como comercio    | Se busca el id real con comerciosAPI.porDominio() antes de generar el CVV  |
| 3   | CVV ocupaba toda la pantalla             | Se rediseñó para ocultar el número y solo mostrar botón copiar             |
| 4   | Validación de crédito nunca se ejecutaba | Se reubicó al inicio del try, antes del res.json()                         |
| 5   | Crédito no se descontaba al comprar      | Se agregó UPDATE perfil_financiero en el endpoint /canjear                 |

### Estado actual

| Módulo                            | Estado       |
| --------------------------------- | ------------ |
| Detección de comercio y precio    | ✅           |
| Simulador de quincenas            | ✅           |
| Flujo PIN → CVV → Confirmación    | ✅           |
| Validación y descuento de crédito | ✅           |
| Historial de compras              | ✅           |
| Preferencias                      | ⏳ Pendiente |
| Favoritos                         | ⏳ Pendiente |
| Recordatorios                     | ⏳ Pendiente |
