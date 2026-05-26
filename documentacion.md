# Documentacion del Proyecto - Kueski Pay Chrome Extension

## 1. Resumen general

Kueski Pay Chrome Extension es una extension de Chrome tipo popup que detecta productos en tiendas afiliadas, identifica el monto del producto en la pagina activa y permite simular o registrar una compra a quincenas usando una API propia.

El proyecto esta dividido en dos aplicaciones:

- `backend/`: API REST en Node.js con Express, autenticacion JWT y conexion a PostgreSQL/Supabase.
- `extension/`: extension de Chrome Manifest V3 construida con React, Vite y `@crxjs/vite-plugin`.

La extension esta pensada para funcionar en:

- Amazon Mexico: `amazon.com.mx`
- Palacio de Hierro: `elpalaciodehierro.com`
- Chedraui Mexico: `chedraui.com.mx`

El flujo principal cubre:

1. Inicio de sesion o registro.
2. Verificacion de identidad por SMS.
3. Evaluacion de perfil financiero si el usuario todavia no tiene credito aprobado.
4. Deteccion de comercio afiliado y monto del producto.
5. Consulta de credito disponible.
6. Simulacion de pagos por quincena.
7. Verificacion de PIN.
8. Generacion de CVV virtual temporal.
9. Confirmacion de compra.
10. Creacion de historial y cuotas.
11. Alertas por pagos proximos o vencidos.
12. Perfil, preferencias y favoritos.

## 2. Stack tecnologico

### Backend

- Node.js
- Express 5
- PostgreSQL mediante `pg`
- Supabase como base de datos remota
- JWT para autenticacion
- bcryptjs para hash de contrasenas y PIN
- dotenv para variables de entorno
- CORS habilitado para consumo desde la extension

### Extension

- React 19
- React DOM
- Vite
- `@crxjs/vite-plugin`
- Manifest V3
- Chrome APIs:
  - `chrome.storage.local`
  - `chrome.storage.session`
  - `chrome.runtime`
  - `chrome.tabs`
  - `chrome.notifications`

## 3. Estructura del proyecto

```text
kueski-extension/
|-- avances.md
|-- documentacion.md
|-- README.md
|-- backend/
|   |-- server.js
|   |-- package.json
|   |-- package-lock.json
|   |-- db/
|   |   |-- db.js
|   |   `-- schema.sql
|   |-- middleware/
|   |   `-- auth.js
|   `-- routes/
|       |-- auth.js
|       |-- calculadora.js
|       |-- comercios.js
|       |-- compras.js
|       |-- favoritos.js
|       |-- pin.js
|       |-- preferencias.js
|       |-- recordatorios.js
|       `-- tokens.js
`-- extension/
    |-- manifest.json
    |-- popup.html
    |-- vite.config.js
    |-- package.json
    |-- background/
    |   `-- background.js
    |-- content/
    |   `-- content.js
    |-- assets/
    |   |-- icon16.png
    |   |-- icon48.png
    |   `-- icon128.png
    `-- src/
        |-- App.jsx
        |-- main.jsx
        |-- services/
        |   `-- api.js
        |-- styles/
        |   `-- index.css
        `-- components/
            |-- AlertView.jsx
            |-- CreditPendingView.jsx
            |-- CvvView.jsx
            |-- HomeCard.jsx
            |-- LoginView.jsx
            |-- NavBar.jsx
            |-- NoComercioView.jsx
            |-- PaymentPlan.jsx
            |-- PaymentModal.jsx
            |-- PinView.jsx
            |-- ProfileView.jsx
            `-- PurchaseHistory.jsx
```

## 4. Configuracion del backend

El backend se levanta desde `backend/server.js` y expone la API en `http://localhost:3001` por defecto.

### Variables de entorno requeridas

El archivo `backend/db/db.js` espera las siguientes variables:

```env
PORT=3001
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...
```

La conexion usa SSL con:

```js
ssl: { rejectUnauthorized: false }
```

Esto esta pensado para Supabase/PostgreSQL remoto.

### Comandos

Desde `backend/`:

```bash
npm install
npm run dev
```

Para produccion/local sin nodemon:

```bash
npm start
```

### Rutas montadas

En `backend/server.js` se montan estas rutas:

```text
/api/auth
/api/comercios
/api/calculadora
/api/pin
/api/tokens
/api/compras
/api/preferencias
/api/recordatorios
/api/favoritos
```

Tambien existe un health check:

```http
GET /
```

Respuesta esperada:

```json
{
  "status": "ok",
  "mensaje": "Kueski API corriendo"
}
```

## 5. Configuracion de la extension

La extension vive en `extension/`.

### Comandos

Desde `extension/`:

```bash
npm install
npm run dev
npm run build
npm run lint
```

### Manifest

El archivo `extension/manifest.json` define:

- `manifest_version`: 3
- Nombre: `Kueski Pay Assistant`
- Popup: `popup.html`
- Background service worker: `background/background.js`
- Content script: `content/content.js`
- Permisos:
  - `storage`
  - `notifications`
  - `activeTab`
- Host permissions:
  - `amazon.com.mx`
  - `elpalaciodehierro.com`
  - `chedraui.com.mx`
  - `http://localhost:3001/*`

### Carga en Chrome

Flujo recomendado:

1. Ejecutar el backend en `localhost:3001`.
2. Desde `extension/`, ejecutar `npm run build`.
3. Abrir `chrome://extensions`.
4. Activar modo desarrollador.
5. Cargar la carpeta generada por Vite/CRXJS, normalmente `extension/dist`.

## 6. Arquitectura funcional

### Content script

Archivo: `extension/content/content.js`

Responsabilidades:

- Detectar si la pagina actual pertenece a un comercio afiliado.
- Extraer el precio del producto usando selectores especificos por tienda.
- Parsear montos en formatos comunes mexicanos y europeos.
- Ignorar precios fuera del rango `10` a `500000`.
- Enviar mensajes al runtime:
  - `COMERCIO`
  - `MONTO`
- Observar cambios del DOM con `MutationObserver`.
- Reintentar deteccion cada 2 segundos hasta 5 intentos.
- Reaccionar a mensajes `URL_CHANGED` enviados por el service worker.

Comercios y selectores actuales:

```js
amazon.com.mx:
  #corePriceDisplay_desktop_feature_div .a-price-whole
  .a-price .a-offscreen
  #price_inside_buybox
  #priceblock_ourprice

elpalaciodehierro.com:
  .b-product_price-sales .b-product_price-value
  .b-product_price-value[content]
  [data-js-line-item-price-sales] .b-product_price-value

chedraui.com.mx:
  [itemprop="price"]
  [data-testid*="price"]
  [class*="price"]
  [class*="Price"]
  .price
```

### Background service worker

Archivo: `extension/background/background.js`

Responsabilidades:

- Registrar instalacion de la extension.
- Detectar cambios de URL con `chrome.tabs.onUpdated`.
- Limpiar `last_comercio` y `last_monto` si el usuario sale de una tienda afiliada.
- No limpiar comercio/monto si el usuario esta en flujo activo de PIN o CVV.
- Reenviar `URL_CHANGED` al content script.
- Persistir mensajes `COMERCIO` y `MONTO` en `chrome.storage.local`.

### Popup React

Archivo principal: `extension/src/App.jsx`

Responsabilidades:

- Restaurar sesion desde `chrome.storage.local`.
- Restaurar vista activa desde `chrome.storage.session`.
- Cargar comercio y monto detectados.
- Escuchar mensajes del content script mientras el popup esta abierto.
- Consultar `perfil_financiero` al iniciar sesion.
- Mostrar pantalla de evaluacion si el usuario no tiene perfil financiero valido.
- Actualizar cuotas vencidas solo cuando existe credito/perfil aprobado.
- Controlar navegacion entre vistas:
  - `home`
  - `plan`
  - `pin`
  - `cvv`
  - `history`
  - `alertas`
  - `profile`

## 7. Flujo principal de compra

```text
Usuario abre tienda afiliada
  -> content.js detecta comercio y monto
  -> background.js guarda last_comercio y last_monto
  -> App.jsx restaura esos datos al abrir popup
  -> Usuario inicia sesion y confirma codigo SMS
  -> Si no hay perfil financiero, se muestra CreditPendingView y se bloquean funciones
  -> HomeCard muestra comercio, monto y credito disponible
  -> Usuario entra a PaymentPlan
  -> calculadoraAPI.simular calcula pagos por quincena
  -> Usuario elige quincenas y paga
  -> PinView valida PIN con /api/pin/verificar
  -> CvvView genera CVV con /api/tokens/generar
  -> CVV se guarda en chrome.storage.session por 120 segundos
  -> Usuario copia CVV y paga en tienda
  -> Usuario confirma compra
  -> /api/tokens/canjear marca token usado, crea compra, crea cuotas y descuenta credito
  -> App vuelve a HomeCard
```

## 8. Componentes del frontend

### `LoginView.jsx`

Pantalla de login y registro.

- Login: `POST /api/auth/login`
- Registro: `POST /api/auth/register`
- En login exitoso no entrega la sesion inmediatamente; primero muestra verificacion SMS.
- En registro exitoso tambien muestra verificacion SMS antes de entrar.
- Tras validar SMS, entrega `token` y `usuario` a `App.jsx`.
- Usa `extension/public/kueski_logo.png` como logo principal.
- Tiene una interfaz blanca, compacta y minimalista.
- Permite mostrar/ocultar la contrasena.
- El codigo SMS de demo es `123456`, pero no se muestra en pantalla.
- Guarda temporalmente la sesion pendiente de SMS en `localStorage` con expiracion de 5 minutos.
- Valida antes de llamar al backend:
  - Nombre requerido en registro, minimo 3 caracteres.
  - Telefono requerido en registro, exactamente 10 digitos.
  - Email requerido y con formato valido.
  - Contrasena requerida.
  - En registro, contrasena minimo 6 caracteres.

### `CreditPendingView.jsx`

Vista para usuarios autenticados que todavia no tienen credito aprobado.

- Se muestra cuando `App.jsx` no encuentra un `perfil_financiero` valido.
- Usa el mismo estilo visual del login: fondo blanco, logo Kueski y tipografia compacta.
- Informa que Kueski esta evaluando el perfil del usuario.
- Mientras esta vista esta activa, no se muestra `NavBar` ni se puede acceder a compra, historial, alertas o perfil.

### `HomeCard.jsx`

Vista principal autenticada.

- Muestra saludo del usuario.
- Muestra comercio detectado.
- Muestra monto detectado.
- Consulta perfil financiero con `calculadoraAPI.perfil`.
- Muestra credito disponible.
- Permite agregar o quitar comercio actual de favoritos.
- Muestra banner de riesgo si hay cuotas vencidas.
- Bloquea el boton de plan si `nivelRiesgo` es `alto`.

### `PaymentPlan.jsx`

Simulador de pagos.

- Opciones de quincenas: `2`, `4`, `6`, `8`, `10`, `12`.
- Llama a `POST /api/calculadora/simular`.
- Si falla la API, usa fallback local dividiendo monto entre quincenas.
- Permite continuar al flujo de PIN.

Nota tecnica: el fallback local usa campos distintos (`por_quincena`, `total`) a los que la UI renderiza (`monto_por_quincena`), por lo que el fallback podria mostrar valores incompletos si la API falla.

### `PinView.jsx`

Vista para confirmar compra con PIN.

- Recibe monto y quincenas.
- Pide PIN numerico de exactamente 4 digitos.
- Limita el input a 4 caracteres y solo acepta numeros.
- Valida con `POST /api/pin/verificar`.
- Si el PIN es valido, avanza a CVV.

### `CvvView.jsx`

Vista de CVV virtual.

- Busca el `comercio_id` real usando dominio.
- Genera token con `POST /api/tokens/generar`.
- Construye CVV visual con `token_pago.id` y `padStart(6, '0')`.
- Guarda CVV activo en `chrome.storage.session`.
- Mantiene countdown de 120 segundos usando expiracion real con timestamp `cvv_expira_en`.
- Si el CVV expira, limpia la sesion temporal y muestra mensaje de expiracion.
- Si se cierra y reabre la extension despues de expirar, no se restaura como CVV activo.
- Permite copiar CVV al portapapeles.
- Confirma compra con `POST /api/tokens/canjear`.

Por seguridad de UX, el numero no se muestra directamente en pantalla; se copia con boton.

### `PurchaseHistory.jsx`

Historial de compras.

- Consume `GET /api/compras`.
- Muestra comercio, fecha, monto total, numero de quincenas y estado.

### `AlertView.jsx`

Vista de alertas.

- Consume compras y preferencias.
- Separa:
  - Pagos vencidos.
  - Proximos vencimientos en los siguientes 30 dias.
  - Historial de cuotas pagadas.
- Calcula badge de alertas sumando vencidas y proximas a vencer en 7 dias o menos.
- Permite activar/desactivar notificaciones push actualizando preferencias.
- Permite pagar cuotas pendientes o vencidas desde cada alerta.
- Antes de abrir el modal de pago, consulta `GET /api/compras/cuotas/:id/desglose`.
- Muestra estado `Cargando...` mientras se obtiene el desglose.
- Abre `PaymentModal.jsx` para elegir metodo de pago.
- Al confirmar pago, llama al backend para marcar la cuota como `pagada`.
- Mantiene historial de alertas con maximo 5 pagos recientes.
- Incluye cuotas pagadas de compras `completada`, para que el historial no desaparezca al reabrir la extension.

### `PaymentModal.jsx`

Modal de pago usado desde Alertas.

- Titulo: `Elegir metodo de pago`.
- Opciones: Tarjeta y Deposito en OXXO.
- Tarjeta solicita nombre del titular, numero, fecha de vencimiento y CVV.
- OXXO genera una referencia numerica de 10 a 14 digitos.
- Muestra tabla de desglose antes del metodo de pago:
  - Monto original.
  - Multa acumulada.
  - Interes acumulado.
  - Total a pagar.
  - Dias de atraso cuando aplica.
- Valida tarjeta:
  - Nombre minimo de 3 caracteres.
  - Numero de tarjeta numerico entre 16 y 19 digitos.
  - Fecha con formato `MM/AA` y mes entre `01` y `12`.
  - CVV numerico de 3 o 4 digitos.
- No guarda datos sensibles de tarjeta en la base de datos.

### `ProfileView.jsx`

Vista de perfil.

- Muestra datos de cuenta.
- Permite crear PIN si el usuario no tiene uno.
- Permite cambiar PIN si ya existe.
- Muestra preferencias:
  - Notificaciones por email.
  - Notificaciones push.
  - Dias de anticipacion: `1`, `3`, `5`, `7`.
- Muestra favoritos.
- Permite quitar favoritos.
- Acceso rapido a historial.
- Abre centro de ayuda de Kueski en una nueva pestana.

### `NoComercioView.jsx`

Vista para paginas no afiliadas.

- Informa que la tienda actual no es afiliada.
- Muestra accesos a Amazon, Palacio de Hierro y Chedraui.

### `NavBar.jsx`

Barra inferior.

Tabs:

- Inicio
- Plan
- Alertas
- Historial
- Perfil

La pestaña de alertas muestra badge rojo cuando existen pagos vencidos o proximos.

## 9. Servicio de API del frontend

Archivo: `extension/src/services/api.js`

Base URL:

```js
export const API = 'http://localhost:3001/api'
```

Todas las peticiones pasan por `request(endpoint, options, token)`.

Si hay token, agrega:

```http
Authorization: Bearer <token>
```

Si la respuesta HTTP no es exitosa, lanza:

```js
throw new Error(data.error || 'Error en la solicitud')
```

APIs exportadas:

- `authAPI`
- `comerciosAPI`
- `comprasAPI`
- `calculadoraAPI`
- `pinAPI`
- `tokensAPI`
- `preferenciasAPI`
- `recordatoriosAPI`
- `favoritosAPI`

## 10. API REST

### Autenticacion

#### `POST /api/auth/register`

Crea usuario.

Body:

```json
{
  "nombre": "Alvaro",
  "telefono": "5512345678",
  "email": "alvaro@test.mx",
  "password": "123456"
}
```

Respuesta:

```json
{
  "mensaje": "Usuario creado",
  "usuario": {
    "id": 1,
    "nombre": "Alvaro",
    "email": "alvaro@test.mx"
  }
}
```

Observacion: el frontend envia `telefono` para el flujo de registro y verificacion SMS, pero el backend actual solo guarda `nombre`, `email` y `password_hash`.

#### `POST /api/auth/login`

Inicia sesion.

Body:

```json
{
  "email": "alvaro@test.mx",
  "password": "123456"
}
```

Respuesta:

```json
{
  "token": "jwt",
  "usuario": {
    "id": 1,
    "nombre": "Alvaro",
    "email": "alvaro@test.mx"
  }
}
```

El token expira en 7 dias.

### Comercios

#### `GET /api/comercios`

Lista comercios afiliados.

Respuesta:

```json
[
  {
    "id": 1,
    "nombre": "Amazon",
    "dominio": "amazon.com.mx",
    "logo_url": "...",
    "activo": true
  }
]
```

#### `GET /api/comercios/dominio/:dominio`

Busca comercio activo por dominio.

Ejemplo:

```http
GET /api/comercios/dominio/amazon.com.mx
```

### Calculadora

#### `GET /api/calculadora/config`

Devuelve configuracion financiera global desde `configuracion_kueski`.

#### `GET /api/calculadora/perfil`

Requiere JWT.

Devuelve:

```json
{
  "limite_credito": 10000,
  "credito_usado": 1500,
  "credito_disponible": 8500,
  "nivel_riesgo": "bajo"
}
```

#### `POST /api/calculadora/simular`

Requiere JWT.

Body:

```json
{
  "monto": 2400,
  "num_quincenas": 6
}
```

Valida:

- `monto` requerido.
- `num_quincenas` requerido.
- Monto entre `configuracion_kueski.monto_minimo` y `monto_maximo`.
- Quincenas entre `1` y `configuracion_kueski.max_quincenas`.

Formula:

```text
monto_por_quincena = monto * tasa / (1 - (1 + tasa)^(-num_quincenas))
```

Respuesta:

```json
{
  "monto_total": 2400,
  "num_quincenas": 6,
  "tasa_aplicada": 0.05,
  "monto_por_quincena": 473.64,
  "total_con_intereses": 2841.84
}
```

### PIN

#### `POST /api/pin/crear`

Requiere JWT.

Crea o reemplaza PIN de 4 digitos.

Body:

```json
{
  "pin": "1234"
}
```

#### `POST /api/pin/verificar`

Requiere JWT.

Verifica PIN.

Body:

```json
{
  "pin": "1234"
}
```

Comportamiento:

- Si no existe PIN: `404`.
- Si el PIN falla: incrementa `intentos_fallidos`.
- Al tercer intento fallido bloquea por 15 minutos.
- Registra intento en `log_intentos_pin`.
- Si el PIN es correcto: reinicia intentos y bloqueo.

#### `POST /api/pin/cambiar`

Requiere JWT.

Body:

```json
{
  "pin_actual": "1234",
  "pin_nuevo": "5678"
}
```

Valida PIN actual y actualiza el hash.

#### `GET /api/pin/existe`

Requiere JWT.

Respuesta:

```json
{
  "existe": true
}
```

Sirve para evitar consultar con un PIN falso que contaria como intento fallido.

### Tokens y CVV

#### `POST /api/tokens/generar`

Requiere JWT.

Body:

```json
{
  "pin": "1234",
  "comercio_id": 1,
  "monto": 2400,
  "num_quincenas": 6
}
```

Validaciones:

1. Bloquea si el usuario tiene cuotas vencidas.
2. Bloquea si el monto supera `credito_disponible`.
3. Verifica existencia y estado del PIN.
4. Bloquea si el PIN esta temporalmente bloqueado.
5. Valida PIN con bcrypt.
6. Crea registro en `tokens_pago`.

Respuesta:

```json
{
  "valido": true,
  "token_pago": {
    "id": 15,
    "expira_en": "2026-05-13T..."
  }
}
```

El frontend transforma el `id` en CVV con 6 digitos.

#### `POST /api/tokens/canjear`

Requiere JWT.

Body:

```json
{
  "token_id": 15
}
```

Comportamiento:

- Busca token.
- Valida que exista.
- Valida que no haya sido usado.
- Valida que no haya expirado.
- Calcula monto por quincena.
- Marca token como usado.
- Crea compra.
- Crea cuotas individuales.
- Incrementa `perfil_financiero.credito_usado`.

Respuesta:

```json
{
  "mensaje": "Compra registrada correctamente",
  "compra_id": 10
}
```

Nota importante: el codigo actual crea cuotas con intervalos fijos de 15 dias (`fecha.setDate(fecha.getDate() + i * 15)`). En `avances.md` se documenta un fix a quincenas reales de calendario, pero ese fix no esta presente en `backend/routes/tokens.js` al momento de esta documentacion.

### Compras

#### `GET /api/compras`

Requiere JWT.

Devuelve compras del usuario con comercio y cuotas agrupadas.

Campos principales:

- `id`
- `monto_total`
- `num_quincenas`
- `monto_quincena`
- `estado`
- `fecha_compra`
- `comercio`
- `logo_url`
- `cuotas`

#### `GET /api/compras/:id`

Requiere JWT.

Devuelve detalle de una compra del usuario autenticado.

#### `POST /api/compras/actualizar-vencidas`

Requiere JWT.

Marca como `vencida` toda cuota pendiente con `fecha_vencimiento < CURRENT_DATE`.

Despues calcula nivel de riesgo:

```text
0 cuotas vencidas   -> bajo
1-2 cuotas vencidas -> medio
3+ cuotas vencidas  -> alto
```

Actualiza `perfil_financiero.nivel_riesgo`.

Respuesta:

```json
{
  "cuotas_vencidas": 2,
  "nivel_riesgo": "medio"
}
```

#### `GET /api/compras/cuotas/:id/desglose`

Requiere JWT.

Calcula el desglose de pago de una cuota antes de pagarla.

Comportamiento:

- Valida que la cuota exista.
- Valida que la cuota pertenezca al usuario autenticado.
- Calcula dias vencidos desde `fecha_vencimiento`.
- Aplica multa e interes solo si la cuota esta vencida o la fecha ya paso.
- Regresa monto original, multa acumulada, interes acumulado y total a pagar.

Reglas actuales:

```text
IVA = 16%
Tasa moratoria diaria = 0.5%
Dias maximos moratorios = 11
```

Comision por pago tardio:

| Monto de cuota     | Comision base |
| ------------------ | ------------- |
| Hasta $150         | $50           |
| $150.01 a $300     | $100          |
| $300.01 a $700     | $150          |
| Mas de $700        | $200          |

Formulas:

```text
multa_acumulada = comision_base * 1.16
dias_moratorios = min(dias_vencida, 11)
interes_acumulado = monto_original * 0.005 * dias_moratorios
total_a_pagar = monto_original + multa_acumulada + interes_acumulado
```

Respuesta:

```json
{
  "cuota_id": 123,
  "compra_id": 10,
  "numero_cuota": 2,
  "estado": "vencida",
  "fecha_vencimiento": "2026-01-15",
  "dias_vencida": 130,
  "dias_moratorios": 11,
  "monto_original": 600,
  "multa_acumulada": 174,
  "interes_acumulado": 33,
  "total_a_pagar": 807
}
```

#### `POST /api/compras/cuotas/:id/pagar`

Requiere JWT.

Registra el pago de una cuota desde Alertas.

Body actual desde frontend:

```json
{
  "metodo_pago": "tarjeta",
  "referencia_pago": null
}
```

Comportamiento:

- Abre una transaccion con PostgreSQL.
- Valida que la cuota exista y pertenezca al usuario autenticado.
- Bloquea la fila de cuota con `FOR UPDATE`.
- Rechaza cuotas ya pagadas.
- Actualiza `cuotas.estado = 'pagada'`.
- Si todas las cuotas de la compra estan pagadas, actualiza `compras.estado = 'completada'`.
- Recalcula cuotas vencidas del usuario.
- Actualiza `perfil_financiero.nivel_riesgo`.

Respuesta:

```json
{
  "mensaje": "Pago registrado correctamente",
  "cuota": {
    "id": 123,
    "compra_id": 10,
    "numero_cuota": 2,
    "monto": 450,
    "fecha_vencimiento": "2026-05-15",
    "estado": "pagada"
  },
  "compra_completada": false,
  "cuotas_vencidas": 0,
  "nivel_riesgo": "bajo"
}
```

Nota: el endpoint no almacena datos de tarjeta ni referencia en columnas dedicadas; actualmente persiste el estado de la cuota y recalcula el riesgo.
El total con multa e interes se calcula para mostrarlo antes del pago mediante `GET /api/compras/cuotas/:id/desglose`; el endpoint de pago sigue marcando la cuota como pagada.

### Preferencias

#### `GET /api/preferencias`

Requiere JWT.

Devuelve preferencias desde `preferencias_usuario`.

Si no hay fila, responde valores default:

```json
{
  "notif_email": true,
  "notif_push": true,
  "dias_antes_recordatorio": 3
}
```

#### `PUT /api/preferencias`

Requiere JWT.

Body:

```json
{
  "notif_email": true,
  "notif_push": false,
  "dias_antes_recordatorio": 5
}
```

Usa upsert por `usuario_id`.

Nota: desde `AlertView.jsx`, el toggle de push manda solamente `notif_push`. Como el backend espera tambien `notif_email` y `dias_antes_recordatorio`, esa ruta puede escribir valores `undefined` si no se manda el objeto completo. En `ProfileView.jsx` si se manda el objeto completo.

### Recordatorios

#### `GET /api/recordatorios/pendientes`

Requiere JWT.

Devuelve recordatorios no enviados con datos de la cuota.

#### `PUT /api/recordatorios/:id/enviado`

Requiere JWT.

Marca recordatorio como enviado y guarda `enviado_en = NOW()`.

### Favoritos

El proyecto tiene dos implementaciones de favoritos:

1. `backend/routes/comercios.js` expone `/api/comercios/favoritos`.
2. `backend/routes/favoritos.js` expone `/api/favoritos`.

La extension usa actualmente `/api/favoritos`.

#### `GET /api/favoritos`

Requiere JWT.

Lista comercios favoritos del usuario.

#### `POST /api/favoritos`

Requiere JWT.

Body:

```json
{
  "dominio": "amazon.com.mx"
}
```

Busca comercio por dominio y lo agrega a `favoritos`.

#### `DELETE /api/favoritos/:dominio`

Requiere JWT.

Elimina favorito por dominio.

## 11. Modelo de datos esperado

El archivo `backend/db/schema.sql` existe pero esta vacio actualmente. Por lo tanto, el esquema siguiente se infiere de las consultas reales del backend y del reporte `avances.md`.

### `usuarios`

Uso:

- Registro.
- Login.
- Relacion con compras, PIN, perfil, preferencias, favoritos, tokens y recordatorios.

Columnas usadas:

- `id`
- `nombre`
- `email`
- `password_hash`

### `perfil_financiero`

Uso:

- Credito disponible.
- Credito usado.
- Nivel de riesgo.

Columnas usadas:

- `usuario_id`
- `limite_credito`
- `credito_usado`
- `credito_disponible`
- `nivel_riesgo`
- `updated_at`

Nota: `credito_disponible` parece estar pensado como columna calculada desde `limite_credito - credito_usado`.

### `configuracion_kueski`

Uso:

- Configuracion global para simulacion y calculo de cuotas.

Columnas usadas:

- `monto_minimo`
- `monto_maximo`
- `max_quincenas`
- `tasa_interes_quincenal`

### `comercios`

Uso:

- Comercios afiliados.
- Resolucion por dominio.
- Favoritos.

Columnas usadas:

- `id`
- `nombre`
- `dominio`
- `logo_url`
- `activo`

### `pins`

Uso:

- PIN de seguridad.
- Bloqueo por intentos fallidos.

Columnas usadas:

- `id`
- `usuario_id`
- `pin_hash`
- `intentos_fallidos`
- `bloqueado_hasta`
- `updated_at`

### `log_intentos_pin`

Uso:

- Auditoria de intentos de PIN.

Columnas usadas:

- `usuario_id`
- `exitoso`
- `ip_origen`

### `tokens_pago`

Uso:

- CVV virtual temporal.
- Base para confirmar compra.

Columnas usadas:

- `id`
- `usuario_id`
- `comercio_id`
- `monto`
- `num_quincenas`
- `expira_en`
- `usado`

### `compras`

Uso:

- Historial de compras.
- Relacion con cuotas.
- Base de alertas.

Columnas usadas:

- `id`
- `usuario_id`
- `comercio_id`
- `token_pago_id`
- `monto_total`
- `num_quincenas`
- `monto_quincena`
- `estado`
- `fecha_compra`

### `cuotas`

Uso:

- Pagos individuales de una compra.
- Alertas.
- Deteccion de morosidad.

Columnas usadas:

- `id`
- `compra_id`
- `numero_cuota`
- `monto`
- `fecha_vencimiento`
- `estado`

Estados observados:

- `pendiente`
- `pagada`
- `vencida`

Una cuota puede pasar a `pagada` desde Alertas usando `POST /api/compras/cuotas/:id/pagar`.

### `preferencias_usuario`

Uso:

- Configuracion del usuario.

Columnas usadas:

- `usuario_id`
- `notif_email`
- `notif_push`
- `dias_antes_recordatorio`
- `updated_at`

### `recordatorios`

Uso:

- Recordatorios pendientes y enviados.

Columnas usadas:

- `id`
- `usuario_id`
- `cuota_id`
- `tipo`
- `dias_antes`
- `enviado`
- `enviado_en`

### `favoritos`

Uso:

- Comercios favoritos del usuario.

Columnas usadas:

- `usuario_id`
- `comercio_id`

## 12. Autenticacion y seguridad

### JWT

El middleware `backend/middleware/auth.js`:

- Lee `Authorization: Bearer <token>`.
- Valida con `JWT_SECRET`.
- Guarda el payload en `req.usuario`.
- Rechaza sin token con `401`.
- Rechaza token invalido/expirado con `403`.

Payload usado:

```json
{
  "id": 1,
  "email": "usuario@test.mx"
}
```

### Contrasenas

Las contrasenas se guardan con hash bcrypt:

```js
const hash = await bcrypt.hash(password, 10)
```

### PIN

El PIN tambien se guarda con bcrypt.

Reglas:

- Debe ser numerico.
- Debe tener 4 digitos en crear/cambiar.
- En `PinView.jsx` se limita a exactamente 4 digitos.
- 3 intentos fallidos bloquean la cuenta por 15 minutos.
- Los intentos se registran en `log_intentos_pin`.

### Segundo factor SMS

El segundo factor esta implementado como simulacion local de frontend para demo.

Reglas actuales:

- Aplica despues de login exitoso.
- Aplica despues de registro exitoso.
- Solicita un codigo SMS de 6 digitos.
- El codigo interno de demo es `123456`.
- No se muestra el codigo en pantalla.
- La sesion pendiente de verificacion se guarda temporalmente en `localStorage`.
- La sesion pendiente expira despues de 5 minutos.
- Al confirmar el codigo correcto, se guarda la sesion JWT normal.
- Al cambiar cuenta o expirar, se borra la sesion pendiente.

Nota: no existe envio real de SMS ni endpoint backend para 2FA; es un flujo visual/funcional controlado desde `LoginView.jsx`.

### CVV

El CVV virtual:

- Se genera desde `tokens_pago.id`.
- Se conserva en `chrome.storage.session`.
- Expira visualmente y logicamente en 120 segundos usando `cvv_expira_en`.
- Se elimina al confirmar compra, volver o expirar.
- Si expira, se marca `cvv_expirado` en `chrome.storage.session` para evitar que se regenere automaticamente al reabrir el popup.
- Backend valida expiracion con `expira_en`.

### Multa e interes por cuota vencida

Las cuotas vencidas tienen un desglose calculado desde backend antes de pagar.

Reglas:

- Multa por pago tardio segun rango del monto original.
- IVA del 16% sobre la multa.
- Interes moratorio diario de 0.5%.
- Maximo 11 dias moratorios.

Ejemplo:

```text
Cuota original: $600
Dias de atraso: 130
Comision base: $150
Multa con IVA: $174
Dias moratorios: 11
Interes: 600 * 0.005 * 11 = $33
Total: 600 + 174 + 33 = $807
```

## 13. Persistencia en la extension

### `chrome.storage.local`

Usado para datos persistentes:

- `jwt`
- `usuario`
- `last_comercio`
- `last_monto`

### `chrome.storage.session`

Usado para datos temporales del flujo:

- `vistaActiva`
- `datosVista`
- `cvv_id`
- `cvv_valor`
- `cvv_generado_en`
- `cvv_expira_en`
- `cvv_expirado`

Esto permite:

- Cerrar y reabrir popup sin perder el flujo PIN/CVV.
- Mantener countdown real del CVV.
- Evitar regenerar CVV si todavia esta vigente.
- Evitar restaurar CVV si ya expiro.

### Fallback fuera de Chrome

Si no existe `chrome.storage`, `App.jsx` usa `localStorage` para `kueski_jwt` y `kueski_usuario`.

### `localStorage`

Ademas del fallback de sesion fuera de Chrome, el login usa:

- `kueski_pending_2fa`

Este valor conserva temporalmente la sesion pendiente de verificacion SMS para que, si el usuario cierra el widget en esa pantalla, al abrirlo de nuevo continue en `Verifica tu identidad`.

## 14. Estados y reglas de riesgo

Al iniciar sesion, `App.jsx` primero llama:

```js
calculadoraAPI.perfil(token)
```

Si el perfil financiero existe y devuelve `credito_disponible` valido, entonces llama:

```js
comprasAPI.actualizarVencidas(token)
```

El backend:

1. Marca cuotas pendientes vencidas.
2. Cuenta cuotas vencidas.
3. Actualiza `perfil_financiero.nivel_riesgo`.

Reglas:

```text
bajo  -> 0 cuotas vencidas
medio -> 1 o 2 cuotas vencidas
alto  -> 3 o mas cuotas vencidas
```

Efectos en frontend:

- `medio`: banner naranja, avisa pagos pendientes.
- `alto`: banner rojo y boton de plan bloqueado.

Efecto en backend:

- `/api/tokens/generar` bloquea CVV si hay cualquier cuota vencida.

Nota: existe una diferencia entre la regla visual y la regla backend. Visualmente solo `alto` bloquea el boton, pero el backend bloquea con 1 o mas cuotas vencidas.

## 15. Diseno visual

Los estilos base estan en `extension/src/styles/index.css`.

Variables principales:

```css
--kueski-bg: #f5f6fa;
--kueski-surface: #ffffff;
--kueski-primary: #00B050;
--kueski-blue: #1A1463;
--kueski-yellow: #FFB800;
--kueski-danger: #ef4444;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
```

El popup mide:

```css
body {
  width: 380px;
  min-height: 500px;
}
```

Clases reutilizables:

- `.btn-primary`
- `.btn-secondary`
- `.tag`
- `.tag-success`
- `.tag-danger`
- `.tag-blue`

## 16. Estado actual segun `avances.md`

`avances.md` reporta siete sesiones principales de avance:

### Sesion 1

- Backend REST completo.
- Registro y login JWT.
- Conexion a Supabase.
- Deteccion de comercios y precios.
- Simulador de quincenas.
- Historial de compras.
- Persistencia de sesion.

### Sesion 2

- Flujo PIN -> CVV -> confirmacion.
- Creacion de `PinView.jsx`.
- Creacion de `CvvView.jsx`.
- Validacion de credito disponible.
- Descuento de credito usado al comprar.

### Sesion 3

- Perfil en navbar.
- Cambio de PIN.
- Vista para paginas no afiliadas.
- Seccion de alertas.
- Badge de alertas.

### Sesion 4

- Preferencias de notificaciones.
- Favoritos en `HomeCard`.
- Favoritos en `ProfileView`.
- Rutas de favoritos.

### Sesion 5

- Perfil de moroso.
- Actualizacion de cuotas vencidas.
- Bloqueo por riesgo.
- Creacion de PIN para usuarios nuevos.
- Separacion de pagos vencidos en alertas.
- Perfiles de demo.

### Sesion 6

- Creacion de `documentacion.md`.
- Boton `Pagar` en cuotas pendientes y vencidas dentro de Alertas.
- Nuevo componente `PaymentModal.jsx`.
- Pago por Tarjeta u OXXO dentro de la extension.
- Referencia OXXO generada en frontend.
- Validaciones de tarjeta.
- Endpoint `POST /api/compras/cuotas/:id/pagar`.
- Persistencia de pagos de cuotas en BD.
- Cambio automatico de compra a `completada` si todas sus cuotas estan pagadas.
- Recalculo de `nivel_riesgo` al pagar cuotas.
- Historial de alertas persistente al reabrir la extension.
- Historial limitado a 5 alertas recientes.
- Rediseño minimalista de login/registro.
- Uso de `public/kueski_logo.png`.
- Validaciones locales de login/registro.
- SQL recomendado para limpiar cuentas de prueba.

### Sesion 7

- Vista `CreditPendingView.jsx` para usuarios sin credito aprobado.
- Bloqueo visual de funciones si no existe `perfil_financiero`.
- Rediseño de la pantalla de evaluacion con logo Kueski y estilo similar al login.
- Segundo factor de autenticacion por SMS despues de login.
- Registro con telefono obligatorio.
- Verificacion SMS tambien despues de crear cuenta.
- Persistencia temporal de la pantalla SMS al cerrar y reabrir el widget.
- Correccion de expiracion real del CVV virtual.
- Limpieza de CVV expirado para evitar que reaparezca activo.
- Correccion de PIN de compra a exactamente 4 digitos.

### Sesion 8

- Desglose financiero de cuotas vencidas antes de pagar.
- Endpoint `GET /api/compras/cuotas/:id/desglose`.
- Calculo de multa acumulada con IVA.
- Calculo de interes moratorio al 0.5% diario.
- Tope de 11 dias moratorios.
- Conexion de `AlertView.jsx` con el endpoint de desglose.
- Tabla de desglose en `PaymentModal.jsx`.
- Ejemplo validado: cuota de `$600` con `130` dias de atraso da total `$807`.

## 17. Pendientes y brechas conocidas

### Pendientes funcionales

- Implementar notificaciones reales de Chrome para recordatorios.
- Automatizar creacion de recordatorios a partir de cuotas/preferencias.
- Completar pruebas finales en Chrome con tiendas reales.
- Preparar demo final.
- Llenar `backend/db/schema.sql` con el esquema real de la base de datos.
- Si el telefono sera parte del producto final, agregar columna `telefono` en `usuarios` o una tabla de contacto y persistirlo desde `/api/auth/register`.
- Si el 2FA sera real, agregar backend para generar, almacenar, expirar y validar codigos SMS, ademas de integracion con proveedor SMS.
- Si se requiere auditoria completa de pagos, agregar columnas como `pagada_en`, `metodo_pago` y `referencia_pago` a `cuotas` o a una tabla dedicada de pagos.
- Si se requiere persistir el total real pagado con multa/interes, agregar columnas o tabla de pagos para guardar `monto_original`, `multa`, `interes` y `total_pagado`.

### Brechas detectadas entre documentacion de avance y codigo

- `backend/db/schema.sql` esta vacio aunque el proyecto depende de varias tablas.
- `avances.md` menciona que las quincenas reales de calendario ya fueron corregidas, pero `backend/routes/tokens.js` sigue usando intervalos de 15 dias.
- `AlertView.jsx` actualiza preferencias push mandando solo `notif_push`; el backend hace upsert esperando tambien `notif_email` y `dias_antes_recordatorio`.
- `PaymentPlan.jsx` tiene fallback local con nombres de campos que no coinciden con los renderizados.
- El historial de alertas usa `pagada_en` solo cuando el pago ocurre en la sesion actual; al recargar, si la BD no tiene columna `pagada_en`, ordena con `fecha_vencimiento`.
- Hay rutas duplicadas de favoritos:
  - `/api/comercios/favoritos`
  - `/api/favoritos`
  La extension usa `/api/favoritos`.
- `auth.register` solo guarda `nombre`, `email` y `password_hash`; el telefono enviado desde el frontend aun no se persiste.
- El segundo factor SMS es simulado en frontend; no hay envio real ni validacion backend del codigo.

## 18. Guia rapida para correr el proyecto

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Debe responder:

```http
http://localhost:3001/
```

### 2. Extension

```bash
cd extension
npm install
npm run build
```

Luego cargar `extension/dist` en `chrome://extensions`.

### 3. Flujo de prueba recomendado

1. Abrir una tienda afiliada.
2. Abrir popup.
3. Iniciar sesion.
4. Capturar codigo SMS `123456`.
5. Confirmar que aparece comercio y monto.
6. Ver credito disponible o pantalla de evaluacion si no existe perfil financiero.
7. Entrar a Plan.
8. Elegir quincenas.
9. Confirmar con PIN de 4 digitos.
10. Generar CVV.
11. Copiar CVV.
12. Confirmar compra.
13. Revisar Historial.
14. Revisar Alertas.
15. Pagar una cuota desde Alertas.
16. Cerrar y reabrir la extension para confirmar que el historial de alertas conserva el pago.
17. Revisar Perfil, Preferencias y Favoritos.

## 19. Criterios de entrega

El proyecto puede considerarse funcional cuando:

- El backend inicia sin errores.
- La extension compila.
- Chrome carga la extension sin errores de manifest.
- Login y registro funcionan.
- Login y registro solicitan verificacion SMS.
- Registro solicita telefono de 10 digitos.
- El popup restaura sesion.
- Si el usuario cierra en pantalla SMS, vuelve a esa pantalla mientras la verificacion siga vigente.
- Si el usuario no tiene perfil financiero aprobado, solo ve la pantalla de evaluacion.
- La extension detecta comercio y precio en las tiendas afiliadas.
- La simulacion devuelve pagos por quincena.
- El PIN se puede crear, verificar y cambiar.
- El PIN de compra acepta exactamente 4 digitos.
- El CVV se genera y expira correctamente.
- Un CVV expirado no reaparece activo al cerrar y reabrir la extension.
- La compra se confirma y aparece en historial.
- Las cuotas se crean en base de datos.
- Las cuotas se pueden pagar desde Alertas.
- Las cuotas vencidas muestran desglose de monto original, multa, interes y total a pagar.
- El pago de una cuota actualiza la base de datos.
- El credito usado aumenta despues de comprar.
- Las cuotas vencidas se detectan.
- Las alertas muestran vencidas y proximas.
- El historial de alertas muestra maximo 5 pagos recientes.
- Login y registro validan campos requeridos antes de llamar al backend.
- Favoritos y preferencias se guardan.

## 20. Archivos clave

- `backend/server.js`: entrada del backend y montaje de rutas.
- `backend/db/db.js`: conexion PostgreSQL/Supabase.
- `backend/middleware/auth.js`: validacion JWT.
- `backend/routes/auth.js`: registro y login.
- `backend/routes/calculadora.js`: simulacion y perfil financiero.
- `backend/routes/tokens.js`: CVV, canje y creacion de compras/cuotas.
- `backend/routes/compras.js`: historial y morosidad.
- `backend/routes/compras.js`: pago de cuotas desde Alertas y desglose de cuotas vencidas.
- `backend/routes/pin.js`: PIN, intentos y bloqueo.
- `backend/routes/preferencias.js`: configuracion del usuario.
- `backend/routes/favoritos.js`: favoritos usados por la extension.
- `extension/manifest.json`: configuracion de extension Chrome.
- `extension/content/content.js`: deteccion de comercio y precio.
- `extension/background/background.js`: persistencia y navegacion.
- `extension/src/App.jsx`: estado global y navegacion del popup.
- `extension/src/services/api.js`: cliente de API.
- `extension/src/components/HomeCard.jsx`: vista principal.
- `extension/src/components/PaymentPlan.jsx`: simulador.
- `extension/src/components/PinView.jsx`: confirmacion por PIN.
- `extension/src/components/CvvView.jsx`: CVV virtual.
- `extension/src/components/CreditPendingView.jsx`: evaluacion de perfil sin credito aprobado.
- `extension/src/components/AlertView.jsx`: alertas.
- `extension/src/components/PaymentModal.jsx`: modal de pago de cuotas.
- `extension/src/components/LoginView.jsx`: login, registro, telefono, SMS y validaciones.
- `extension/src/components/ProfileView.jsx`: perfil, PIN, preferencias y favoritos.
