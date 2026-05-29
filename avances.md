# Reporte de Avance — Kueski Pay Chrome Extension

**Proyecto:** Chrome Widget para Impulsar el Uso de Kueski Pay  
**Desarrollador:** Álvaro González  
**Fecha:** Mayo 2026  
**Stack:** Node.js + Express + PostgreSQL (Supabase) + React + Vite + Manifest V3

---

## Resumen Ejecutivo

Se construyó desde cero una extensión de Chrome funcional que detecta automáticamente el precio de productos en tiendas afiliadas (Amazon, Palacio de Hierro, Chedraui), simula planes de pago en quincenas conectando con un backend REST propio, y gestiona sesiones de usuario con autenticación JWT. El proyecto cubre tanto el backend completo como el frontend React del popup.

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

### 6. Precios de tienda afiliada mal parseados

**Problema:** El selector agarraba el texto completo del contenedor, que incluía centavos como superíndice (`<sup>`) y en productos con descuento podía tomar varios valores concatenados.  
**Solución:**

- Se clona el elemento DOM antes de leer el texto y se eliminan todos los `<sup>` con `querySelectorAll('sup').forEach(e => e.remove())`.
- Se reemplazaron selectores genéricos por selectores específicos de precio final cuando el comercio lo requiere.
- Se agregó validación de rango `>= 10 && <= 500,000` para descartar números inválidos.

### 7. `tokensAPI.get()` ya no existe

**Problema:** `HomeCard` llamaba a `tokensAPI.get(token)` para mostrar saldo, pero ese endpoint fue reemplazado en el backend por el flujo de generación de CVV.  
**Solución:** Se reemplazó por `calculadoraAPI.perfil(token)` que devuelve el crédito disponible del usuario desde `perfil_financiero`.

### 8. Columna `score` no existe en `perfil_financiero`

**Problema:** Al intentar insertar datos de prueba en Supabase, el SQL incluía la columna `score` que no existe en el schema real.  
**Solución:** Se corrigió el INSERT para usar solo las columnas reales: `usuario_id`, `limite_credito`, `credito_usado`, `nivel_riesgo`. La columna `credito_disponible` es calculada automáticamente por PostgreSQL.

---

## Estado actual del proyecto

| Módulo                                    | Estado                                   |
| ----------------------------------------- | ---------------------------------------- |
| Backend API REST                          | ✅ Completo y funcionando                |
| Autenticación JWT                         | ✅ Funcionando                           |
| Base de datos Supabase                    | ✅ Conectada con datos de prueba         |
| Popup React                               | ✅ Compilado y cargado en Chrome         |
| Detección de comercio (Amazon)            | ✅ Funcionando                           |
| Detección de comercio (Palacio de Hierro) | ✅ Funcionando con selectores corregidos |
| Detección de comercio (Chedraui)          | ✅ Funcionando                           |
| Detección de precio con descuento         | ✅ Corregido (toma precio final)         |
| Simulador de quincenas                    | ✅ Conectado al backend real             |
| Historial de compras                      | ✅ Funcionando                           |
| Crédito disponible                        | ✅ Funcionando con datos en Supabase     |
| Persistencia de sesión                    | ✅ Via chrome.storage.local              |

---

## Pendiente / Próximos pasos

- Implementar flujo completo de compra con PIN y generación de CVV virtual en el popup
- Agregar vista de Preferencias
- Conectar recordatorios de pago con notificaciones de Chrome
- Agregar comercios favoritos desde el popup
- Pruebas en Chrome con usuario real en Amazon, Palacio de Hierro y Chedraui
- Preparar demo para entrega del ciclo

## Reporte Sesión 2

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

# Reporte de Avance — Sesión 3

## Kueski Pay Chrome Extension

**Fecha:** 5 de Mayo 2026
**Continuación de:** Reporte Sesión 2

---

## Lo que se implementó en esta sesión

### 1. Sección Perfil en el Navbar

Se creó una nueva sección completa de perfil accesible desde el navbar.

**Archivos creados:**

- `src/components/ProfileView.jsx` — vista completa de perfil

**Archivos modificados:**

- `src/components/NavBar.jsx` — agregado tab "Perfil" con ícono ◉
- `src/App.jsx` — import + case `'profile'` en `renderView()`
- `src/services/api.js` — agregado método `pinAPI.cambiar()`
- `backend/routes/pin.js` — agregado endpoint `POST /api/pin/cambiar`

**Contenido de ProfileView:**

- **Cuenta** — muestra nombre, apellido y correo del usuario (solo lectura)
- **Seguridad** — botón "Cambiar PIN" con flujo de 2 pasos
- **Accesos rápidos** — botón "Mis compras" que navega al historial, botón "Centro de ayuda" que abre kueski.com en nueva pestaña

---

### 2. Flujo de Cambio de PIN (2 pasos)

Dentro de ProfileView se implementó el flujo completo:

```
Paso 1 → Ingresa PIN actual (verificación de identidad)
Paso 2 → Ingresa PIN nuevo (diferente al actual)
         → Mensaje de éxito ✅
```

El backend valida el PIN actual, respeta el bloqueo de 3 intentos fallidos y guarda el nuevo hash con bcrypt.

---

### 3. Vista NoComercioView

Cuando el usuario abre el popup estando en una página no afiliada (Google, YouTube, etc.), en lugar de mostrar HomeCard vacío, se muestra una pantalla con mensaje y links directos a las 3 tiendas afiliadas.

**Archivo creado:**

- `src/components/NoComercioView.jsx`

**Comportamiento:**

- Si `comercio === null` → muestra NoComercioView
- Si `comercio` tiene valor → muestra HomeCard normal

---

### 4. Sección Alertas en el Navbar

Se creó una vista de alertas similar al mockup del proyecto con 2 secciones.

**Archivo creado:**

- `src/components/AlertasView.jsx`

**Archivos modificados:**

- `src/components/NavBar.jsx` — tab 🔔 Alertas con badge rojo de conteo
- `src/App.jsx` — import + case `'alertas'` + estado `alertasPendientes`

**Contenido de AlertasView:**

- **Próximos vencimientos** — cuotas pendientes que vencen en los próximos 30 días, ordenadas por fecha, con badge de días restantes (rojo ≤7 días, naranja 8-30 días)
- **Historial de alertas** — últimas 5 cuotas pagadas con fecha
- **Botón Notif. activas/inactivas** — toggle que llama a `PUT /api/preferencias`

**Navbar con badge:**
El tab de Alertas muestra un badge rojo con el número de cuotas que vencen en 7 días o menos.

---

## Bugs encontrados y corregidos

### Bug 1 — "No se pudo cambiar el PIN" siempre

**Causa:** `pinAPI.cambiar()` no existía en `api.js`. El método no estaba definido.
**Solución:** Se agregó `cambiar: (token, pin_actual, pin_nuevo)` en `pinAPI` dentro de `api.js`.

### Bug 2 — Alertas mostraba TODAS las cuotas de todas las quincenas

**Causa:** El `forEach` aplanaba todas las cuotas sin filtrar por fecha, resultando en 80+ items listados.
**Solución:** Se agregó filtro `fechaVence <= en30dias` para mostrar solo cuotas del próximo mes. Las cuotas vencidas sin pagar (fecha pasada) sí se incluyen como alerta urgente.

### Bug 3 — Compras completadas seguían apareciendo en Alertas

**Causa:** El código no revisaba el `estado` de la compra padre, solo el estado de cada cuota individual.
**Solución:** Se agregó `if (compra.estado === 'completada' || compra.estado === 'cancelada') return` antes de iterar las cuotas.

---

## Estado del Navbar

| Tab       | Ícono | Estado         |
| --------- | ----- | -------------- |
| Inicio    | ⊙     | ✅             |
| Plan      | ◈     | ✅             |
| Alertas   | 🔔    | ✅ (con badge) |
| Historial | ☰    | ✅             |
| Perfil    | ◉     | ✅             |

---

## Estado actual del proyecto

| Módulo                                   | Estado       |
| ---------------------------------------- | ------------ |
| Backend API REST completo                | ✅           |
| Autenticación JWT                        | ✅           |
| Base de datos Supabase (12 tablas)       | ✅           |
| Detección de comercio y precio           | ✅           |
| Simulador de quincenas                   | ✅           |
| Flujo PIN → CVV → Confirmación           | ✅           |
| Validación y descuento de crédito        | ✅           |
| Historial de compras                     | ✅           |
| Cambio de tienda sin recargar            | ✅           |
| Persistencia de vista al cerrar popup    | ✅           |
| CVV no reinicia countdown al reabrir     | ✅           |
| NoComercioView para páginas no afiliadas | ✅           |
| Sección Perfil con cambio de PIN         | ✅           |
| Sección Alertas con vencimientos         | ✅           |
| Preferencias                             | ⏳ Pendiente |
| Favoritos                                | ⏳ Pendiente |
| Recordatorios con notificaciones Chrome  | ⏳ Pendiente |
| Pruebas finales y demo                   | ⏳ Pendiente |

# Reporte de Avance — Sesión 4

## **Continuación de:** Reporte Sesión 3

## Lo que se implementó en esta sesión

### 1. Preferencias

Vista accesible desde Perfil → Configuración → Preferencias:

- Toggle **Notificaciones email** (notif_email)
- Toggle **Notificaciones push** (notif_push)
- Selector de días de anticipación: **1d / 3d / 5d / 7d** (dias_antes_recordatorio)
- Botón "Guardar preferencias" → `PUT /api/preferencias`
- Carga los valores actuales desde la BD al abrir

---

### 2. Favoritos

**En HomeCard:**

- Botón ☆/⭐ junto al tag "Activo" cuando hay comercio detectado
- ☆ = no es favorito → click agrega
- ⭐ = ya es favorito → click quita
- Verifica si es favorito al cargar consultando `GET /api/favoritos`

**En ProfileView:**

- Sección "Mis favoritos" muestra la lista de tiendas guardadas
- Cada item tiene nombre, dominio y botón ✕ para eliminar
- La sección no aparece si no hay favoritos

**Backend (`routes/favoritos.js`):**

- `GET /api/favoritos` — lista favoritos con nombre, dominio y logo_url
- `POST /api/favoritos` — agrega por dominio
- `DELETE /api/favoritos/:dominio` — elimina por dominio

---

## Estado del Navbar

| Tab       | Ícono | Estado         |
| --------- | ----- | -------------- |
| Inicio    | ⊙     | ✅             |
| Plan      | ◈     | ✅             |
| Alertas   | 🔔    | ✅ (con badge) |
| Historial | ☰    | ✅             |
| Perfil    | ◉     | ✅             |

---

## Estado actual del proyecto

| Módulo                                   | Estado       |
| ---------------------------------------- | ------------ |
| Backend API REST completo                | ✅           |
| Autenticación JWT                        | ✅           |
| Base de datos Supabase (12 tablas)       | ✅           |
| Detección de comercio y precio           | ✅           |
| Simulador de quincenas                   | ✅           |
| Flujo PIN → CVV → Confirmación           | ✅           |
| Validación y descuento de crédito        | ✅           |
| Historial de compras                     | ✅           |
| Cambio de tienda sin recargar            | ✅           |
| Persistencia de vista al cerrar popup    | ✅           |
| CVV no reinicia countdown al reabrir     | ✅           |
| NoComercioView para páginas no afiliadas | ✅           |
| Sección Alertas con vencimientos         | ✅           |
| Sección Perfil completa                  | ✅           |
| Cambio de PIN (2 pasos)                  | ✅           |
| Preferencias (email, push, días)         | ✅           |
| Favoritos (agregar, quitar, ver)         | ✅           |
| Recordatorios con notificaciones Chrome  | ⏳ Pendiente |
| Pruebas finales y demo                   | ⏳ Pendiente |

# Reporte de Avance — Sesión 5

**Continuación de:** Reporte Sesión 4

---

## Lo que se implementó en esta sesión

### 1. Perfil de Moroso (Detección y bloqueo)

Se implementó el sistema completo de detección de usuarios morosos en 4 partes:

**Archivos modificados:**

- `backend/routes/compras.js` — endpoint `POST /api/compras/actualizar-vencidas`
- `backend/routes/tokens.js` — validación de cuotas vencidas antes de generar CVV
- `src/services/api.js` — método `comprasAPI.actualizarVencidas()`
- `src/App.jsx` — `useEffect` que llama `actualizarVencidas` al iniciar sesión
- `src/components/HomeCard.jsx` — banner visual de moroso

**Flujo implementado:**

```
Al abrir popup con sesión activa:
  → POST /api/compras/actualizar-vencidas
    → Marca cuotas vencidas en BD
    → Calcula nivel_riesgo (bajo / medio / alto)
    → App.jsx guarda nivelRiesgo + cuotasVencidas en estado
      → HomeCard muestra banner según nivel
      → Botón "Ver plan de pagos" se bloquea si nivel = 'alto'
```

**Regla de nivel de riesgo:**
| Cuotas vencidas | Nivel | Efecto |
|---|---|---|
| 0 | `bajo` | Sin restricciones |
| 1-2 | `medio` | Banner naranja 🟠, puede seguir comprando |
| 3+ | `alto` | Banner rojo 🔴, CVV bloqueado |

**Bloqueo en backend:**
En `POST /api/tokens/generar` se verifica si el usuario tiene cuotas vencidas antes de continuar. Si tiene 1 o más → regresa `403` con mensaje `"Tienes pagos vencidos"`.

---

### 2. Crear PIN para usuarios sin PIN registrado

Se detectó que usuarios nuevos o creados directamente en BD no podían acceder al flujo de "Cambiar PIN" porque éste pedía el PIN actual primero.

**Solución implementada:**

**Archivo nuevo — endpoint:**

- `GET /api/pin/existe` — verifica si el usuario tiene PIN sin contar intentos fallidos

**Archivos modificados:**

- `backend/routes/pin.js` — endpoint `GET /api/pin/existe`
- `src/services/api.js` — método `pinAPI.existe(token)`
- `src/components/ProfileView.jsx` — lógica dinámica según `tienePin`

**Flujo:**

```
Al abrir Perfil:
  → GET /api/pin/existe
    → tienePin = true  → muestra "Cambiar PIN" (2 pasos: actual → nuevo)
    → tienePin = false → muestra "Crear PIN"   (1 paso: directo al nuevo)
```

---

## Bugs encontrados y corregidos

### Bug 1 — Intento falso de PIN contaba como intento fallido

**Causa:** Para saber si el usuario tenía PIN, se llamaba `pinAPI.verificar(token, '____')` con un valor falso. Esto sumaba al contador de intentos fallidos y podía bloquear la cuenta tras 3 verificaciones de perfil.
**Solución:** Se creó el endpoint `GET /api/pin/existe` que solo consulta si existe la fila en la tabla `pins` sin tocar el contador de intentos.

### Bug 2 — Usuario sin PIN no podía crearlo desde Perfil

**Causa:** El botón "Cambiar PIN" siempre pedía el PIN actual en el Paso 1, lo que bloqueaba a usuarios que nunca habían configurado uno.
**Solución:** Se agregó estado `tienePin` que al ser `false` salta directo al Paso 2 y usa `pinAPI.crear()` en lugar de `pinAPI.cambiar()`. El texto del botón y los títulos también cambian dinámicamente.

---

## Estado actual del proyecto

| Módulo                                   | Estado       |
| ---------------------------------------- | ------------ |
| Backend API REST completo                | ✅           |
| Autenticación JWT                        | ✅           |
| Base de datos Supabase (12 tablas)       | ✅           |
| Detección de comercio y precio           | ✅           |
| Simulador de quincenas                   | ✅           |
| Flujo PIN → CVV → Confirmación           | ✅           |
| Validación y descuento de crédito        | ✅           |
| Historial de compras                     | ✅           |
| Cambio de tienda sin recargar            | ✅           |
| Persistencia de vista al cerrar popup    | ✅           |
| CVV no reinicia countdown al reabrir     | ✅           |
| NoComercioView para páginas no afiliadas | ✅           |
| Sección Alertas con vencimientos         | ✅           |
| Sección Perfil completa                  | ✅           |
| Cambio de PIN (2 pasos)                  | ✅           |
| Crear PIN para usuarios nuevos           | ✅           |
| Preferencias (email, push, días)         | ✅           |
| Favoritos (agregar, quitar, ver)         | ✅           |
| Perfil de moroso (detección y bloqueo)   | ✅           |
| Recordatorios con notificaciones Chrome  | ⏳ Pendiente |
| Pruebas finales y demo                   | ⏳ Pendiente |

# Reporte de Avance — Sesión 5 (Parte 2)

**Continuación de:** Sesión 5 Parte 1 (Perfil Moroso + Crear PIN)

---

## Lo que se implementó en esta parte

### 1. Cuotas vencidas en sección de Alertas

Se modificó `AlertView.jsx` para separar visualmente las cuotas vencidas de las próximas a vencer.

**Archivo modificado:**

- `src/components/AlertView.jsx`

**Cambios:**

- Se agregó estado `vencidas` separado de `cuotas` (próximas)
- Nueva sección **"⚠️ Pagos vencidos"** con fondo rojo que aparece arriba de todo
- Badge de conteo rojo con número de cuotas vencidas
- `onCargado` ahora suma vencidas + próximas en 7 días para el badge del NavBar
- Corrección de `hoy.setHours(0,0,0,0)` para evitar falsos positivos por zona horaria

**Lógica de separación:**

```
compras.forEach → cuotas.forEach
  cuota.estado === 'pagada'           → historial
  cuota.estado === 'vencida'
    || fechaVence < hoy               → vencidasArr (sección roja)
  cuota.estado === 'pendiente'
    && fechaVence <= en30dias         → proximasArr
```

**`App.jsx` — sin cambios**, el `onCargado` ya estaba correcto:

```jsx
<AlertasView token={token} onCargado={(n) => setAlertasPendientes(n)} />
```

---

### 2. Fix de fechas de quincenas

Se detectó que la lógica en `tokens.js` sumaba **+15 días fijos** en lugar de calcular quincenas reales del calendario (día 1 y día 15 de cada mes).

**Causa:**

```js
fecha.setDate(fecha.getDate() + i * 15); // ❌ incorrecto
```

**Solución — función `siguienteQuincena`:**

```js
const siguienteQuincena = (fecha) => {
  const d = new Date(fecha);
  if (d.getDate() < 15) {
    d.setDate(15);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  return d;
};
```

---

## Perfiles para la Demo

Se crearon 3 perfiles para presentar al equipo de Kueski:

| Usuario        | Email               | Perfil                         | Nivel   |
| -------------- | ------------------- | ------------------------------ | ------- |
| Tu cuenta      | alvaro@test.com     | Crédito disponible, sin deudas | `bajo`  |
| Carlos Moroso  | moroso@kueski.mx    | 2-3 cuotas vencidas            | `medio` |
| Roberto Moroso | muymoroso@kueski.mx | 5+ cuotas vencidas, bloqueado  | `alto`  |

---

### Perfil: Carlos Moroso — Nivel MEDIO (id: 3)

**Compra:** $2,400 en 6 quincenas de $400 en Amazon  
**Cuotas:**

| #   | Fecha      | Estado             |
| --- | ---------- | ------------------ |
| 1   | 2026-03-15 | vencida            |
| 2   | 2026-04-01 | vencida            |
| 3   | 2026-04-15 | vencida / pagada\* |
| 4   | 2026-05-01 | pendiente          |
| 5   | 2026-05-15 | pendiente          |
| 6   | 2026-06-01 | pendiente          |

> \*Cuota 3 marcada como `pagada` si se quiere mantener nivel `medio` (2 vencidas), o `vencida` para subir a `alto` (3 vencidas).

**Lo que se ve en la demo:**

- Banner 🟠 naranja en HomeCard
- Sección "⚠️ Pagos vencidos" en Alertas
- Puede intentar comprar pero el CVV se bloquea con error 403

---

### Perfil: Roberto Moroso — Nivel ALTO (id: 4)

**Compra:** $4,800 en 8 quincenas de $600 en Amazon  
**Cuotas:**

| #   | Fecha      | Estado      |
| --- | ---------- | ----------- |
| 1   | 2026-01-15 | vencida     |
| 2   | 2026-02-01 | vencida     |
| 3   | 2026-02-15 | vencida     |
| 4   | 2026-03-01 | vencida     |
| 5   | 2026-03-15 | vencida     |
| 6   | 2026-04-01 | pendiente\* |
| 7   | 2026-04-15 | pendiente\* |
| 8   | 2026-05-01 | pendiente\* |

> \*Cuotas 6, 7, 8 también están vencidas por fecha — el sistema las detecta y marca como `vencida` automáticamente al abrir sesión con `actualizar-vencidas`.

**Lo que se ve en la demo:**

- Banner 🔴 rojo en HomeCard
- 5+ cuotas en sección "⚠️ Pagos vencidos" en Alertas
- CVV **completamente bloqueado** (error 403 antes de pedir PIN)
- Botón "Ver plan de pagos" deshabilitado

---

## SQL de corrección aplicado en BD

```sql
-- Corregir fechas cuotas Carlos (id: 3)
UPDATE cuotas SET fecha_vencimiento = '2026-04-15' WHERE compra_id = 'UUID_CARLOS' AND numero_cuota = 3;
UPDATE cuotas SET fecha_vencimiento = '2026-05-01' WHERE compra_id = 'UUID_CARLOS' AND numero_cuota = 4;
UPDATE cuotas SET fecha_vencimiento = '2026-05-15' WHERE compra_id = 'UUID_CARLOS' AND numero_cuota = 5;
UPDATE cuotas SET fecha_vencimiento = '2026-06-01' WHERE compra_id = 'UUID_CARLOS' AND numero_cuota = 6;

-- Corregir fechas cuotas Roberto (id: 4)
UPDATE cuotas SET fecha_vencimiento = '2026-04-01' WHERE compra_id = 'UUID_ROBERTO' AND numero_cuota = 6;
UPDATE cuotas SET fecha_vencimiento = '2026-04-15' WHERE compra_id = 'UUID_ROBERTO' AND numero_cuota = 7;
UPDATE cuotas SET fecha_vencimiento = '2026-05-01' WHERE compra_id = 'UUID_ROBERTO' AND numero_cuota = 8;
```

---

## Estado actual del proyecto

| Módulo                                   | Estado       |
| ---------------------------------------- | ------------ |
| Backend API REST completo                | ✅           |
| Autenticación JWT                        | ✅           |
| Base de datos Supabase (12 tablas)       | ✅           |
| Detección de comercio y precio           | ✅           |
| Simulador de quincenas                   | ✅           |
| Flujo PIN → CVV → Confirmación           | ✅           |
| Validación y descuento de crédito        | ✅           |
| Historial de compras                     | ✅           |
| Cambio de tienda sin recargar            | ✅           |
| Persistencia de vista al cerrar popup    | ✅           |
| CVV no reinicia countdown al reabrir     | ✅           |
| NoComercioView para páginas no afiliadas | ✅           |
| Sección Alertas con vencimientos         | ✅           |
| Cuotas vencidas separadas en Alertas     | ✅           |
| Sección Perfil completa                  | ✅           |
| Cambio de PIN (2 pasos)                  | ✅           |
| Crear PIN para usuarios nuevos           | ✅           |
| Preferencias (email, push, días)         | ✅           |
| Favoritos (agregar, quitar, ver)         | ✅           |
| Perfil de moroso (detección y bloqueo)   | ✅           |
| Perfiles de demo configurados en BD      | ✅           |
| Fix quincenas reales en tokens.js        | ✅           |
| Recordatorios con notificaciones Chrome  | ⏳ Pendiente |
| Pruebas finales y demo                   | ⏳ Pendiente |

# Reporte de Avance — Sesión 6

## **Continuación de:** Reporte Sesión 5 (Parte 2)

**Fecha:** Mayo 2026

---

## Lo que se implementó en esta sesión

### 1. Documentación completa del proyecto

Se creó un archivo nuevo de documentación general del proyecto.

**Archivo creado:**

- `documentacion.md`

**Contenido agregado:**

- Resumen general del proyecto
- Stack tecnológico
- Estructura completa de carpetas
- Configuración del backend
- Configuración de la extensión
- Arquitectura funcional
- Flujo principal de compra
- Componentes del frontend
- Servicio de API
- Endpoints REST
- Modelo de datos esperado
- Autenticación y seguridad
- Persistencia con `chrome.storage.local` y `chrome.storage.session`
- Estados de riesgo
- Diseño visual
- Pendientes y brechas conocidas
- Guía rápida para correr el proyecto
- Criterios de entrega
- Archivos clave

---

### 2. Botón Pagar en cuotas pendientes y vencidas

Se agregó un botón **Pagar** dentro de la sección de Alertas para cada cuota pendiente o vencida.

**Archivos modificados:**

- `extension/src/components/AlertView.jsx`
- `extension/src/services/api.js`
- `backend/routes/compras.js`

**Archivo creado:**

- `extension/src/components/PaymentModal.jsx`

**Comportamiento implementado:**

```
Alertas
  → Cuota pendiente/vencida
    → [Pagar]
      → Modal "Elegir método de pago"
        → Tarjeta
        → Depósito en OXXO
          → Confirmar pago
            → Backend actualiza cuota en BD
            → UI se actualiza inmediatamente
            → Historial muestra el pago
```

---

### 3. Modal de pago

Se creó `PaymentModal.jsx` para manejar el flujo de pago dentro de la extensión.

**Opciones disponibles:**

- Tarjeta
- Depósito en OXXO

**Tarjeta — campos solicitados:**

- Nombre del titular
- Número de tarjeta
- Fecha de vencimiento
- CVV

**Depósito en OXXO:**

- Genera una referencia numérica aleatoria de 10 a 14 dígitos.
- Muestra la referencia en pantalla.

**Validaciones agregadas:**

| Campo             | Validación                             |
| ----------------- | -------------------------------------- |
| Nombre titular    | Mínimo 3 caracteres                    |
| Número de tarjeta | Solo números, entre 16 y 19 dígitos    |
| Fecha             | Formato `MM/AA`, mes entre `01` y `12` |
| CVV               | Solo números, 3 o 4 dígitos            |

**Nota:** No se conecta una pasarela bancaria externa; el flujo registra el pago en la base de datos del proyecto.

---

### 4. Persistencia del pago en base de datos

Se agregó un endpoint para que el pago de una cuota no sea solo visual, sino que también quede persistido en PostgreSQL/Supabase.

**Endpoint creado:**

```http
POST /api/compras/cuotas/:id/pagar
```

**Qué hace el backend:**

- Valida que la cuota pertenezca al usuario autenticado.
- Rechaza cuotas inexistentes.
- Rechaza cuotas ya pagadas.
- Cambia `cuotas.estado` a `pagada`.
- Si todas las cuotas de una compra quedan pagadas, cambia `compras.estado` a `completada`.
- Recalcula cuotas vencidas del usuario.
- Actualiza `perfil_financiero.nivel_riesgo`.

**Respuesta esperada:**

```json
{
  "mensaje": "Pago registrado correctamente",
  "cuota": {},
  "compra_completada": true,
  "cuotas_vencidas": 0,
  "nivel_riesgo": "bajo"
}
```

---

### 5. Historial de alertas persistente

Se corrigió el problema donde un pago aparecía en el historial solo mientras el popup seguía abierto, pero desaparecía al cerrar y abrir la extensión.

**Causa:**

`AlertView.jsx` ignoraba por completo las compras con estado `completada`, por lo que al reabrir la extensión no procesaba sus cuotas pagadas.

**Solución:**

- Las compras `completada` y `cancelada` ya no generan alertas pendientes/vencidas.
- Pero sus cuotas `pagada` sí se agregan al historial de alertas.

**Resultado:**

El historial de pagos se mantiene al cerrar y volver a abrir la extensión.

---

### 6. Máximo 5 alertas recientes en historial

Se ajustó el historial de alertas para mostrar máximo 5 registros.

**Cambios:**

- Se agregó `MAX_HISTORIAL_ALERTAS = 5`.
- Al cargar datos desde BD, el historial se ordena y limita a 5.
- Al pagar una cuota en la sesión actual, también se mantiene el límite de 5.
- Se prioriza la fecha más reciente usando:

```js
cuota.pagada_en || cuota.fecha_vencimiento;
```

---

### 7. Limpieza de cuenta de prueba

Se documentó el SQL necesario para limpiar una cuenta de pruebas y dejarla como nueva.

**Objetivo:**

- Sin compras
- Sin cuotas
- Sin tokens de pago
- Sin recordatorios
- Crédito de $15,000
- `credito_usado = 0`
- `nivel_riesgo = 'bajo'`

**SQL recomendado:**

```sql
BEGIN;

DELETE FROM recordatorios
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'TU_EMAIL_AQUI'
);

DELETE FROM cuotas
WHERE compra_id IN (
  SELECT id
  FROM compras
  WHERE usuario_id = (
    SELECT id FROM usuarios WHERE email = 'TU_EMAIL_AQUI'
  )
);

DELETE FROM compras
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'TU_EMAIL_AQUI'
);

DELETE FROM tokens_pago
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'TU_EMAIL_AQUI'
);

UPDATE perfil_financiero
SET
  limite_credito = 15000,
  credito_usado = 0,
  nivel_riesgo = 'bajo',
  updated_at = NOW()
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE email = 'TU_EMAIL_AQUI'
);

COMMIT;
```

---

### 8. Rediseño de Login y Registro

Se rediseñó la pantalla de inicio de sesión y registro para acercarla al estilo visual de Kueski.

**Archivo modificado:**

- `extension/src/components/LoginView.jsx`

**Asset usado:**

- `extension/public/kueski_logo.png`

**Cambios visuales:**

- Fondo blanco
- Logo real de Kueski como imagen
- Interfaz más minimalista
- Inputs más compactos
- Botón azul redondeado
- Cambio entre login y registro con link inferior
- Se eliminó el link "¿Olvidaste tu contraseña?"

**Validaciones agregadas:**

| Campo      | Validación                                 |
| ---------- | ------------------------------------------ |
| Nombre     | Requerido en registro, mínimo 3 caracteres |
| Email      | Requerido y con formato válido             |
| Contraseña | Requerida                                  |
| Contraseña | En registro, mínimo 6 caracteres           |

**Resultado:**

Ya no permite crear cuentas ni iniciar sesión con campos vacíos o inválidos.

---

## Bugs encontrados y corregidos

### Bug 1 — Pago solo visual

**Problema:** Al pagar una cuota desde Alertas, el cambio solo ocurría en estado local de React. Al cerrar y abrir la extensión se perdía.

**Solución:** Se creó `POST /api/compras/cuotas/:id/pagar` y se conectó desde `comprasAPI.pagarCuota()`.

---

### Bug 2 — Historial desaparecía al reabrir extensión

**Problema:** Las compras `completada` se omitían por completo al reconstruir alertas.

**Solución:** Se siguieron excluyendo de pendientes/vencidas, pero se conservaron sus cuotas pagadas para el historial.

---

### Bug 3 — Registro permitía campos vacíos

**Problema:** El frontend permitía llamar `/api/auth/register` aunque faltaran datos.

**Solución:** Se agregaron validaciones locales en `LoginView.jsx`.

---

### Bug 4 — Textos visibles de simulación

**Problema:** El modal mostraba palabras como "simulado", aunque el flujo debía sentirse como pago real dentro de la demo.

**Solución:** Se eliminaron textos visibles de simulación y se renombró el componente a `PaymentModal.jsx`.

---

## Estado actual del proyecto

| Módulo                                      | Estado       |
| ------------------------------------------- | ------------ |
| Backend API REST completo                   | ✅           |
| Autenticación JWT                           | ✅           |
| Base de datos Supabase                      | ✅           |
| Detección de comercio y precio              | ✅           |
| Simulador de quincenas                      | ✅           |
| Flujo PIN → CVV → Confirmación              | ✅           |
| Validación y descuento de crédito           | ✅           |
| Historial de compras                        | ✅           |
| Sección Alertas                             | ✅           |
| Pagos de cuotas desde Alertas               | ✅           |
| Persistencia de pagos en BD                 | ✅           |
| Historial de alertas persistente            | ✅           |
| Historial limitado a 5 alertas recientes    | ✅           |
| Modal de pago con Tarjeta/OXXO              | ✅           |
| Validaciones de tarjeta                     | ✅           |
| Login/Register rediseñado                   | ✅           |
| Validaciones de Login/Register              | ✅           |
| Preferencias                                | ✅           |
| Favoritos                                   | ✅           |
| Perfil de moroso                            | ✅           |
| Documentación completa (`documentacion.md`) | ✅           |
| Pruebas finales y demo                      | ⏳ Pendiente |

# Reporte de Avance — Sesión 7

## **Continuación de:** Reporte Sesión 6

**Fecha:** Mayo 2026

---

## Lo que se implementó en esta sesión

### 1. Cambio de comercios afiliados

Se actualizó la extensión para manejar como comercios afiliados principales a Amazon, Palacio de Hierro y Chedraui.

**Dominios actuales:**

| Comercio          | Dominio                 |
| ----------------- | ----------------------- |
| Amazon            | `amazon.com.mx`         |
| Palacio de Hierro | `elpalaciodehierro.com` |
| Chedraui          | `chedraui.com.mx`       |

**Archivos modificados:**

- `extension/manifest.json`
- `extension/content/content.js`
- `extension/background/background.js`
- `extension/src/components/NoComercioView.jsx`
- `extension/src/components/HomeCard.jsx`

---

### 2. Actualización de permisos de la extensión

Se actualizaron los `matches`, `host_permissions` y `web_accessible_resources` en `manifest.json` para que la extensión funcione en:

```json
"*://*.amazon.com.mx/*"
"*://*.elpalaciodehierro.com/*"
"*://*.chedraui.com.mx/*"
```

---

### 3. Launcher flotante dentro de la tienda

Se agregó un botón circular flotante con el logo de Kueski dentro de las tiendas afiliadas.

**Archivo modificado:**

- `extension/content/content.js`

**Comportamiento:**

- Aparece en la parte superior derecha de la tienda.
- Usa `kueski_logo.png`.
- Se inyecta con Shadow DOM para evitar conflictos con estilos de la tienda.
- Al hacer click, manda el mensaje `ABRIR_POPUP`.
- `background.js` recibe el mensaje y ejecuta `chrome.action.openPopup()`.

**Archivos relacionados:**

- `extension/content/content.js`
- `extension/background/background.js`
- `extension/manifest.json`

---

### 4. Fix de precio con descuento en Palacio de Hierro

Se detectó que Palacio de Hierro muestra dos precios cuando hay descuento: precio original y precio de venta.

**Problema inicial:**

El selector genérico tomaba información equivocada del DOM. En una primera corrección se intentó tomar el menor precio válido, pero eso podía capturar el porcentaje de descuento desde:

```html
class="b-discount_badge-copy"
```

**Solución final:**

Se quitaron los selectores genéricos para Palacio y se apuntó directamente al precio de venta:

```js
".b-product_price-sales .b-product_price-value";
".b-product_price-value[content]";
"[data-js-line-item-price-sales] .b-product_price-value";
```

Además, el extractor ahora lee primero el atributo `content`, por ejemplo:

```html
content="19600.00"
```

Esto permite tomar correctamente `$19,600.00` como precio final con descuento.

---

### 5. Actualización de textos visibles

Se actualizaron textos dentro de la extensión:

- `NoComercioView.jsx`
- `HomeCard.jsx`

Ahora el mensaje de tiendas afiliadas queda como:

```text
Amazon, Palacio de Hierro o Chedraui
```

---

### 6. SQL para actualizar base de datos

Se preparó el SQL para actualizar la tabla `comercios` en Supabase.

```sql
UPDATE comercios
SET
  nombre = 'Palacio de Hierro',
  dominio = 'elpalaciodehierro.com',
  logo_url = NULL,
  activo = true
WHERE id = ID_DEL_COMERCIO_A_REEMPLAZAR;

UPDATE comercios
SET
  nombre = 'Chedraui',
  dominio = 'chedraui.com.mx',
  logo_url = NULL,
  activo = true
WHERE id = ID_DEL_COMERCIO_A_REEMPLAZAR;
```

> Nota: primero se recomienda consultar `SELECT id, nombre, dominio FROM comercios ORDER BY id;` y actualizar por `id` para evitar tocar registros incorrectos.

---

## Bugs encontrados y corregidos

### Bug 1 — Palacio tomaba porcentaje de descuento como precio

**Problema:** El extractor podía leer el porcentaje de descuento en lugar del precio final.

**Solución:** Se eliminaron selectores genéricos para Palacio y se usaron selectores específicos del precio de venta.

---

### Bug 2 — Precio con descuento no se priorizaba

**Problema:** En productos con descuento, se podía tomar el precio original.

**Solución:** Se priorizó `.b-product_price-sales .b-product_price-value` y el atributo `content`.

---

## Estado actual del proyecto

| Módulo                                    | Estado |
| ----------------------------------------- | ------ |
| Amazon como comercio afiliado             | ✅     |
| Palacio de Hierro como comercio afiliado  | ✅     |
| Chedraui como comercio afiliado           | ✅     |
| Launcher flotante dentro de tienda        | ✅     |
| Apertura del popup desde launcher         | ✅     |
| Precio con descuento en Palacio de Hierro | ✅     |
| Manifest actualizado                      | ✅     |
| Textos visibles actualizados              | ✅     |
| Build de extensión                        | ✅     |

---

# Reporte de Avance — Sesión 8

## Kueski Pay Chrome Extension

**Fecha:** 25 de Mayo 2026  
**Continuación de:** Reporte Sesión 3

---

## Lo que se implementó en esta sesión

### 1. Vista para usuarios sin crédito aprobado

Se agregó una vista especial para usuarios que todavía no tienen perfil financiero aprobado.

**Archivo nuevo:**

- `extension/src/components/CreditPendingView.jsx`

**Archivos modificados:**

- `extension/src/App.jsx`

**Comportamiento:**

- Si el usuario inicia sesión pero no existe `perfil_financiero` válido, no se muestran las funciones de compra.
- Se oculta la navegación inferior.
- Se muestra una pantalla minimalista con el logo de Kueski y mensaje de evaluación de perfil.
- El usuario ve que Kueski está revisando su información y que se le notificará cuando el crédito esté disponible.

---

### 2. Segundo factor de autenticación por SMS

Se agregó una verificación adicional después de iniciar sesión.

**Archivo modificado:**

- `extension/src/components/LoginView.jsx`

**Comportamiento:**

- Después de validar correo y contraseña, aparece la pantalla `Verifica tu identidad`.
- Se solicita un código SMS de 6 dígitos.
- Para la demo, el código interno es `123456`, pero ya no se muestra en pantalla.
- Solo al ingresar el código correcto se guarda la sesión y se entra a la extensión.
- Se agregó opción para reenviar código y cambiar cuenta.

---

### 3. Registro con teléfono y verificación SMS

Se actualizó la pantalla de registro para pedir teléfono.

**Campos actuales de registro:**

- Nombre completo
- Teléfono
- Correo electrónico
- Contraseña

**Validaciones agregadas:**

- Nombre mínimo de 3 caracteres.
- Teléfono obligatorio de 10 dígitos.
- Correo con formato válido.
- Contraseña mínima de 6 caracteres.

Después de crear una cuenta, también se pide el código SMS antes de entrar a la extensión.

---

### 4. Persistencia de la pantalla SMS

Se corrigió el bug donde, si el usuario cerraba el widget en la pantalla de código SMS, al abrirlo de nuevo regresaba al login.

**Solución:**

- Se guarda temporalmente la sesión pendiente de 2FA en `localStorage`.
- La sesión pendiente expira después de 5 minutos.
- Si el usuario vuelve a abrir el widget dentro de ese tiempo, regresa directo a la pantalla de verificación.
- Se limpia al confirmar código, cambiar cuenta o expirar.

---

### 5. Corrección de expiración del CVV virtual

Se corrigió el bug donde un CVV expirado podía volver a mostrarse como activo al cerrar y abrir la extensión.

**Archivo modificado:**

- `extension/src/components/CvvView.jsx`

**Solución:**

- El CVV ahora se guarda con `cvv_expira_en`.
- Al llegar a cero segundos, se elimina la sesión del CVV.
- Se marca la sesión como expirada para que no se regenere automáticamente.
- Al reabrir el widget después de expirar, se muestra el mensaje de expiración y no el CVV activo.
- Al confirmar compra o volver, se limpia la sesión temporal.

---

### 6. Corrección de PIN de compra

Se corrigió el bug donde el input del PIN permitía hasta 6 dígitos.

**Archivo modificado:**

- `extension/src/components/PinView.jsx`

**Solución:**

- El PIN vuelve a aceptar máximo 4 dígitos.
- Solo permite números.
- Valida exactamente 4 dígitos.
- El botón de confirmar compra solo se activa cuando el PIN tiene 4 dígitos.
- El placeholder volvió a `••••`.

---

## Bugs encontrados y corregidos

### Bug 1 — Usuarios sin crédito podían ver funciones internas

**Problema:** Un usuario nuevo sin `perfil_financiero` podía entrar a vistas internas o ver crédito como `$NaN`.

**Solución:** Se agregó `CreditPendingView` y bloqueo visual del flujo hasta que exista un perfil financiero válido.

---

### Bug 2 — Pantalla SMS se perdía al cerrar el widget

**Problema:** La sesión pendiente de SMS estaba solo en memoria de React.

**Solución:** Se persistió temporalmente en `localStorage` con expiración de 5 minutos.

---

### Bug 3 — CVV expirado reaparecía activo

**Problema:** La sesión del CVV se restauraba aunque el tiempo ya hubiera terminado.

**Solución:** Se agregó expiración real con timestamp y limpieza de `chrome.storage.session`.

---

### Bug 4 — PIN de compra aceptaba 6 dígitos

**Problema:** El input de `PinView` tenía `maxLength={6}`.

**Solución:** Se cambió a 4 dígitos exactos y se separó del flujo SMS de 6 dígitos.

---

## Estado actual del proyecto

| Módulo                                    | Estado |
| ----------------------------------------- | ------ |
| Login y registro minimalista              | ✅     |
| Registro con teléfono                     | ✅     |
| Segundo factor SMS                        | ✅     |
| Persistencia temporal de SMS              | ✅     |
| Vista de evaluación de perfil             | ✅     |
| Bloqueo de funciones sin crédito aprobado | ✅     |
| PIN de compra de 4 dígitos                | ✅     |
| CVV virtual con expiración real           | ✅     |
| Limpieza de CVV expirado                  | ✅     |
| Build de extensión                        | ✅     |

---

# Reporte de Avance — Sesión 9

## Kueski Pay Chrome Extension

**Fecha:** 25 de Mayo 2026  
**Continuación de:** Reporte Sesión 8

---

## Lo que se implementó en esta sesión

### 1. Desglose de pago para cuotas vencidas

Se agregó un desglose financiero para mostrar al usuario cuánto debe pagar cuando una cuota está vencida.

**Archivos modificados:**

- `backend/routes/compras.js`
- `extension/src/services/api.js`
- `extension/src/components/AlertView.jsx`
- `extension/src/components/PaymentModal.jsx`

**Tabla mostrada al pagar:**

| Concepto          | Descripción                      |
| ----------------- | -------------------------------- |
| Monto original    | Monto base de la cuota           |
| Multa acumulada   | Comisión por pago tardío con IVA |
| Interés acumulado | Interés moratorio acumulado      |
| Total a pagar     | Monto original + multa + interés |

---

### 2. Reglas de multa e interés moratorio

Se implementaron reglas centralizadas en backend para que el frontend no invente los montos.

**Comisión por pago tardío:**

| Monto de cuota     | Comisión base |
| ------------------ | ------------- |
| Hasta `$150`       | `$50`         |
| `$150.01` a `$300` | `$100`        |
| `$300.01` a `$700` | `$150`        |
| Más de `$700`      | `$200`        |

La comisión se calcula con IVA:

```text
multa_acumulada = comision_base * 1.16
```

**Interés moratorio:**

```text
interes_acumulado = monto_original * 0.005 * dias_moratorios
```

Reglas:

- Tasa moratoria diaria: `0.5%`
- Máximo de días moratorios: `11`
- Si la cuota no está vencida, multa e interés son `$0.00`

Ejemplo con cuota de `$600` y `130` días de atraso:

```text
monto_original = 600
multa_acumulada = 150 * 1.16 = 174
dias_moratorios = min(130, 11) = 11
interes_acumulado = 600 * 0.005 * 11 = 33
total_a_pagar = 600 + 174 + 33 = 807
```

---

### 3. Nuevo endpoint de desglose

Se agregó el endpoint:

```http
GET /api/compras/cuotas/:id/desglose
```

**Respuesta esperada:**

```json
{
  "cuota_id": 123,
  "compra_id": 10,
  "numero_cuota": 2,
  "estado": "vencida",
  "dias_vencida": 130,
  "dias_moratorios": 11,
  "monto_original": 600,
  "multa_acumulada": 174,
  "interes_acumulado": 33,
  "total_a_pagar": 807
}
```

El endpoint valida que la cuota pertenezca al usuario autenticado.

---

### 4. Conexión del frontend

Se agregó en `services/api.js`:

```js
getDesgloseCuota: (token, id) =>
  request(`/compras/cuotas/${id}/desglose`, {}, token);
```

En `AlertView.jsx`, al dar click en `Pagar`:

- Se consulta primero el desglose al backend.
- El botón muestra `Cargando...` mientras se obtiene la información.
- Se abre `PaymentModal.jsx` con el desglose ya cargado.
- Al cerrar o confirmar el pago, se limpia el desglose de estado local.

---

### 5. Tabla dentro del modal de pago

`PaymentModal.jsx` ahora muestra antes del método de pago:

- Monto original
- Multa acumulada
- Interés acumulado
- Total a pagar
- Días de atraso cuando aplica

El flujo de tarjeta y OXXO se mantiene igual.

---

## Estado actual del proyecto

| Módulo                                | Estado |
| ------------------------------------- | ------ |
| Endpoint de desglose de cuota         | ✅     |
| Cálculo de multa con IVA              | ✅     |
| Cálculo de interés moratorio          | ✅     |
| Tope de 11 días moratorios            | ✅     |
| Conexión del frontend con el desglose | ✅     |
| Tabla de desglose en modal de pago    | ✅     |
| Pago de cuotas desde Alertas          | ✅     |
| Build de extensión                    | ✅     |

---

# Reporte de Avance — Sesión 10

## Kueski Pay Chrome Extension

**Fecha:** 29 de Mayo 2026  
**Continuación de:** Reporte Sesión 9

---

## Lo que se implementó en esta sesión

### 1. Alineación visual con lineamientos de marca Kueski

Se revisó la extensión contra el PDF de lineamientos de marca 2026 y se detectó que la interfaz mezclaba varios azules y usaba el verde como color principal.

**Archivos modificados:**

- `extension/src/styles/index.css`
- `extension/src/App.jsx`
- `extension/src/components/LoginView.jsx`
- `extension/src/components/CreditPendingView.jsx`
- `extension/src/components/HomeCard.jsx`
- `extension/src/components/PaymentPlan.jsx`
- `extension/src/components/PaymentModal.jsx`
- `extension/src/components/ProfileView.jsx`

**Cambios realizados:**

- Se cambió el color primario a azul Kueski (`#0048F8`).
- Se agregó azul claro de apoyo (`#0070F8`).
- Se dejó el verde únicamente para estados de éxito o confirmación.
- Se reemplazaron colores hardcodeados como `#0874ff`, `#1A1463` y `#242733` por variables CSS.
- Se agregó `--kueski-card`, que ya se usaba en componentes pero no existía en `index.css`.
- Se quitaron tonos fuera de marca en login, perfil pendiente, plan, modal y estados seleccionados.

---

### 2. Corrección de detección de monto en páginas home

**Problema:** En páginas principales de tiendas afiliadas, especialmente Chedraui, la extensión tomaba precios de banners o carruseles y los mostraba como si fueran el monto de una compra.

**Archivos modificados:**

- `extension/content/content.js`
- `extension/background/background.js`
- `extension/src/App.jsx`

**Solución:**

- Se agregó detección de páginas home/inicio.
- Se agregó validación para detectar monto solo en páginas que parecen producto.
- Si el usuario está en home o en una página sin producto, se envía `LIMPIAR_MONTO`.
- `background.js` elimina `last_monto` cuando recibe `LIMPIAR_MONTO`.
- `App.jsx` escucha `LIMPIAR_MONTO` y borra el monto de la interfaz sin recargar.

---

### 3. Mejora de estado vacío en el simulador

Cuando el usuario entra a `Plan` desde una tienda afiliada pero aún no está en un producto, el texto anterior decía:

```text
Visita una tienda afiliada para simular tu plan de pagos
```

Esto era confuso porque el usuario ya estaba dentro de una tienda afiliada.

**Archivo modificado:**

- `extension/src/components/PaymentPlan.jsx`

**Nuevo mensaje:**

```text
Explora un artículo
Abre un producto de esta tienda para detectar el monto y ver tus planes de pago.
```

---

### 4. Reducción del espacio vacío del popup

**Problema:** Al limpiar el monto en home, el popup dejaba demasiado espacio vacío debajo del contenido.

**Archivo modificado:**

- `extension/src/styles/index.css`

**Solución:**

- Se quitó `min-height: 500px` del `body`.
- Las pantallas que sí necesitan altura completa, como login y carga, mantienen su altura dentro de sus propios componentes.
- El popup ahora se ajusta mejor al contenido visible.

---

### 5. Sincronización automática después de iniciar sesión

**Problema:** Si el usuario iniciaba sesión estando ya en Amazon, Chedraui o Palacio de Hierro, el popup podía mostrar "No estás en una tienda afiliada" hasta recargar la página.

**Archivo modificado:**

- `extension/src/App.jsx`

**Solución:**

- Se agregó una lista local de comercios afiliados.
- Después de restaurar sesión o iniciar sesión, `App.jsx` consulta la pestaña activa con `chrome.tabs.query`.
- Si la URL actual pertenece a una tienda afiliada, actualiza `comercio` inmediatamente.
- También envía `URL_CHANGED` al content script para volver a detectar el monto si aplica.

---

## Estado actual del proyecto

| Módulo                                       | Estado |
| -------------------------------------------- | ------ |
| Paleta visual alineada a Kueski 2026         | ✅     |
| Azul oficial como color primario             | ✅     |
| Verde reservado para éxito/confirmación      | ✅     |
| Detección de monto solo en producto          | ✅     |
| Limpieza de monto en home                    | ✅     |
| Estado vacío de Plan mejorado                | ✅     |
| Popup sin espacio vacío innecesario          | ✅     |
| Sincronización post-login con pestaña activa | ✅     |
| Build de extensión                           | ✅     |
