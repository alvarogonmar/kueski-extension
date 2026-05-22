# Standup para presentación a Kueski

**Fecha de presentación:** Jueves 21 de mayo de 2026  
**Proyecto:** Kueski Pay Assistant - Extensión de Chrome  
**Objetivo:** Mostrar un avance funcional de una extensión que acompaña al usuario durante una compra en comercios afiliados y le permite pagar en quincenas con una experiencia integrada.

---

## 1. Elevator pitch

Construimos una extensión de Chrome para Kueski Pay que detecta automáticamente cuando el usuario está en una tienda afiliada, identifica el comercio y el monto del producto, simula planes de pago en quincenas, genera un flujo de autorización con PIN y CVV virtual, registra compras, administra cuotas, muestra alertas de pago y permite pagar cuotas pendientes desde la misma extensión.

La idea es reducir fricción: el usuario no tiene que salirse del comercio ni buscar manualmente opciones de financiamiento; la extensión aparece como un asistente contextual de Kueski Pay.

---

## 2. Qué problema resolvemos

- El usuario puede estar comprando en Amazon, Palacio de Hierro o Chedraui y no recordar que puede usar Kueski Pay.
- El usuario necesita ver rápidamente si tiene crédito disponible y cuánto pagaría por quincena.
- El usuario necesita una experiencia de pago y seguimiento simple dentro del navegador.
- El usuario necesita alertas claras de próximos vencimientos o pagos vencidos.

---

## 3. Qué se puede demoear

1. Iniciar sesión o crear cuenta desde el popup.
2. Abrir una tienda afiliada.
3. Ver detección automática del comercio.
4. Ver detección automática del monto del producto.
5. Consultar crédito disponible.
6. Simular plan de pagos por quincenas.
7. Confirmar compra con PIN.
8. Generar CVV virtual temporal.
9. Confirmar compra y crear cuotas.
10. Ver historial de compras.
11. Ver alertas de cuotas vencidas o próximas.
12. Pagar una cuota desde Alertas.
13. Ver que el pago se persiste en base de datos.
14. Ver historial de alertas con máximo 5 pagos recientes.
15. Ver Perfil, Preferencias y Favoritos.

---

## 4. Estado actual del avance

| Módulo | Estado |
| ------ | ------ |
| Extensión Chrome Manifest V3 | Funcional |
| Popup React | Funcional |
| Backend Express | Funcional |
| Base de datos Supabase/PostgreSQL | Conectada |
| Login y registro | Funcional con validaciones |
| Detección de comercio | Funcional en Amazon, Palacio de Hierro y Chedraui |
| Detección de monto | Funcional con selectores por tienda |
| Simulación de quincenas | Funcional |
| PIN de seguridad | Funcional |
| CVV virtual | Funcional |
| Historial de compras | Funcional |
| Alertas de pago | Funcional |
| Pago de cuotas desde alertas | Funcional |
| Favoritos | Funcional |
| Preferencias | Funcional |
| Perfil de riesgo/moroso | Funcional |
| Notificaciones reales de Chrome | Pendiente |

---

## 5. Cómo está construido

El proyecto tiene dos partes principales:

### Backend

Carpeta: `backend/`

Tecnologías:

- Node.js
- Express
- PostgreSQL/Supabase
- JWT
- bcryptjs
- pg

Responsabilidades:

- Autenticación de usuarios.
- Registro y login.
- Verificación de JWT.
- Consulta de comercios afiliados.
- Simulación de pagos.
- Gestión de PIN.
- Generación y canje de tokens/CVV.
- Registro de compras y cuotas.
- Actualización de cuotas vencidas.
- Pago de cuotas desde Alertas.
- Preferencias y favoritos.

### Extensión

Carpeta: `extension/`

Tecnologías:

- React
- Vite
- Manifest V3
- Chrome Storage
- Content scripts
- Background service worker

Responsabilidades:

- Mostrar el popup de Kueski Pay.
- Detectar comercio y monto en páginas afiliadas.
- Guardar sesión del usuario.
- Mantener estado del flujo aunque se cierre el popup.
- Mostrar vistas: inicio, plan, PIN, CVV, historial, alertas y perfil.

---

## 6. Arquitectura de alto nivel

```text
Página de tienda afiliada
  -> content/content.js detecta comercio y monto
  -> background/background.js guarda datos en chrome.storage.local
  -> popup React lee comercio/monto
  -> services/api.js llama al backend
  -> backend Express procesa la solicitud
  -> PostgreSQL/Supabase guarda usuarios, compras, cuotas, tokens y preferencias
```

---

## 7. Flujo principal de compra

```text
Usuario abre Amazon/Palacio de Hierro/Chedraui
  -> Extensión detecta comercio y precio
  -> Usuario abre popup
  -> Home muestra crédito disponible
  -> Usuario ve plan de pagos
  -> Elige quincenas
  -> Ingresa PIN
  -> Se genera CVV virtual
  -> Usuario confirma compra
  -> Backend crea compra y cuotas
  -> Historial y alertas se actualizan
```

---

## 8. Flujo de pago de cuota

```text
Usuario entra a Alertas
  -> Ve cuota pendiente o vencida
  -> Presiona Pagar
  -> Elige Tarjeta u OXXO
  -> Confirma pago
  -> Backend actualiza cuotas.estado = 'pagada'
  -> Si ya no quedan cuotas pendientes, compra.estado = 'completada'
  -> Se recalcula nivel_riesgo
  -> UI actualiza historial de alertas
```

---

## 9. Colores y estilo visual

La extensión usa una paleta inspirada en Kueski:

| Token CSS | Color | Uso |
| --------- | ----- | --- |
| `--kueski-blue` | `#1A1463` | Texto principal, encabezados, marca |
| `--kueski-primary` | `#00B050` | Acciones positivas, éxito, favoritos |
| `--kueski-primary-hover` | `#009040` | Hover de botones verdes |
| `--kueski-bg` | `#f5f6fa` | Fondo general del popup |
| `--kueski-surface` | `#ffffff` | Cards y superficies |
| `--kueski-surface-2` | `#f0f2f8` | Inputs y fondos secundarios |
| `--kueski-border` | `#e2e5f0` | Bordes |
| `--kueski-text-muted` | `#6b7280` | Texto secundario |
| `--kueski-danger` | `#ef4444` | Alertas rojas y pagos vencidos |
| `--kueski-yellow` | `#FFB800` | Acentos |

En login/registro se usó un estilo más minimalista:

- Fondo blanco.
- Logo real `kueski_logo.png`.
- Botón azul principal `#0874ff`.
- Inputs redondeados.
- Tipografía del sistema para mantenerlo ligero.

---

## 10. Decisiones técnicas importantes

### Por qué una extensión de Chrome

Porque permite estar dentro del contexto real de compra. En vez de pedir al usuario que abra otra app o página, la extensión lee el comercio y el precio desde la página actual.

### Por qué React

Porque facilita manejar vistas diferentes dentro del popup: home, plan, PIN, CVV, historial, alertas y perfil.

### Por qué Express

Porque nos dio una API REST simple para iterar rápido y separar lógica del frontend.

### Por qué Supabase/PostgreSQL

Porque permite persistir usuarios, compras, cuotas, preferencias y estado financiero con una base relacional.

### Por qué JWT

Porque el popup necesita autenticar llamadas al backend sin mantener sesión tradicional de navegador.

### Por qué `chrome.storage`

Porque el popup de una extensión se desmonta al cerrarse. Usamos:

- `chrome.storage.local` para sesión, usuario, comercio y monto.
- `chrome.storage.session` para vista activa y CVV temporal.

---

## 11. Seguridad implementada

- Contraseñas hasheadas con bcrypt.
- PIN hasheado con bcrypt.
- JWT con expiración.
- Middleware de autenticación en rutas protegidas.
- Bloqueo de PIN tras 3 intentos fallidos.
- CVV temporal con expiración visual de 120 segundos.
- Validación de crédito disponible antes de generar CVV.
- Bloqueo de generación de CVV si hay cuotas vencidas.
- Validación de ownership al pagar cuotas: la cuota debe pertenecer al usuario autenticado.
- No se guardan datos de tarjeta en la base de datos.

---

## 12. Base de datos esperada

Tablas principales:

- `usuarios`
- `perfil_financiero`
- `comercios`
- `configuracion_kueski`
- `pins`
- `log_intentos_pin`
- `tokens_pago`
- `compras`
- `cuotas`
- `preferencias_usuario`
- `recordatorios`
- `favoritos`

Relaciones clave:

- Un usuario tiene perfil financiero.
- Un usuario tiene compras.
- Una compra tiene cuotas.
- Una compra pertenece a un comercio.
- Un token de pago se usa para crear una compra.
- Favoritos conectan usuario con comercio.

---

## 13. Endpoints importantes

| Endpoint | Uso |
| -------- | --- |
| `POST /api/auth/register` | Crear usuario |
| `POST /api/auth/login` | Iniciar sesión |
| `GET /api/comercios` | Listar comercios |
| `GET /api/comercios/dominio/:dominio` | Resolver comercio detectado |
| `GET /api/calculadora/perfil` | Consultar crédito |
| `POST /api/calculadora/simular` | Simular quincenas |
| `POST /api/pin/crear` | Crear PIN |
| `POST /api/pin/verificar` | Verificar PIN |
| `GET /api/pin/existe` | Saber si usuario tiene PIN |
| `POST /api/tokens/generar` | Generar CVV virtual |
| `POST /api/tokens/canjear` | Confirmar compra |
| `GET /api/compras` | Historial de compras |
| `POST /api/compras/actualizar-vencidas` | Marcar cuotas vencidas |
| `POST /api/compras/cuotas/:id/pagar` | Pagar cuota |
| `GET /api/preferencias` | Consultar preferencias |
| `PUT /api/preferencias` | Guardar preferencias |
| `GET /api/favoritos` | Listar favoritos |
| `POST /api/favoritos` | Agregar favorito |
| `DELETE /api/favoritos/:dominio` | Quitar favorito |

---

## 14. Preguntas probables y respuestas

### ¿Cómo detectan el comercio?

El content script revisa `location.hostname` y compara contra dominios afiliados: `amazon.com.mx`, `elpalaciodehierro.com` y `chedraui.com.mx`.

### ¿Cómo detectan el precio?

Cada comercio tiene selectores CSS específicos. El content script busca el elemento de precio, limpia texto, quita caracteres no numéricos y valida que el monto esté en un rango razonable.

### ¿Qué pasa si el precio cambia dinámicamente?

Usamos `MutationObserver` para volver a detectar cambios en el DOM. También se hacen reintentos periódicos al cargar.

### ¿Qué pasa si abro el popup después de que la página ya cargó?

El background guarda el último comercio y monto en `chrome.storage.local`, entonces el popup puede restaurarlos aunque se abra después.

### ¿Cómo manejan sesión?

Al iniciar sesión se guarda el JWT y datos del usuario en `chrome.storage.local`. Las rutas protegidas mandan `Authorization: Bearer <token>`.

### ¿El CVV es real?

Para el avance, el CVV es un token virtual controlado por nuestro backend. Tiene expiración, se guarda temporalmente y se usa para registrar la compra dentro del sistema.

### ¿Guardan datos de tarjeta?

No. El formulario de tarjeta valida datos para la experiencia, pero no se guardan datos sensibles en base de datos.

### ¿El pago de cuotas se guarda?

Sí. Al pagar una cuota desde Alertas se llama `POST /api/compras/cuotas/:id/pagar`, que actualiza `cuotas.estado = 'pagada'` en la base de datos.

### ¿Qué pasa si pago todas las cuotas?

El backend detecta que ya no quedan cuotas pendientes y cambia `compras.estado` a `completada`.

### ¿Cómo calculan perfil de moroso?

Al iniciar sesión se llama `actualizar-vencidas`. El backend marca cuotas pendientes vencidas y cuenta cuántas existen:

- 0 vencidas: `bajo`
- 1-2 vencidas: `medio`
- 3+ vencidas: `alto`

### ¿Qué pasa con un usuario en riesgo alto?

La UI muestra una alerta roja y bloquea el avance del plan. El backend además bloquea generación de CVV si hay cuotas vencidas.

### ¿Qué se guarda en favoritos?

Se guarda la relación entre usuario y comercio. Desde Home se puede agregar/quitar el comercio detectado como favorito.

### ¿Qué falta para producción?

- Integración real con pasarela o servicios internos de Kueski.
- Notificaciones reales de Chrome.
- Auditoría formal de pagos.
- Esquema SQL versionado completo.
- Pruebas E2E.
- Manejo más robusto de errores por comercio.
- Hardening de seguridad y permisos.

---

## 15. Posibles preguntas difíciles

### ¿Qué tan confiable es parsear precios desde DOM?

Es suficiente para un prototipo funcional, pero en producción habría que robustecerlo con reglas por tienda, pruebas constantes y quizá integración con APIs o eventos del checkout cuando existan.

### ¿Qué pasa si Amazon/Palacio de Hierro/Chedraui cambian sus clases CSS?

La detección puede fallar. Por eso los selectores están aislados por comercio en `content.js`, para actualizarlos rápido. Para producción se requeriría monitoreo y fallback.

### ¿Por qué no hicieron una integración directa con Kueski real?

Porque el objetivo del avance era demostrar el flujo completo y la experiencia de usuario. La arquitectura ya separa frontend/backend para conectar servicios reales después.

### ¿Cómo evitan que un usuario pague una cuota de otro usuario?

El endpoint de pago busca la cuota haciendo join con `compras` y valida `c.usuario_id = req.usuario.id`.

### ¿Qué pasa si se cierra el popup a media compra?

La vista activa se guarda en `chrome.storage.session`. Para CVV, también se guarda el token y el tiempo de generación para no reiniciar el contador.

### ¿Qué pasa con los datos de tarjeta?

No se persisten. Solo se valida el formato en frontend para que el flujo se vea completo. En una versión real se debería tokenizar con un proveedor autorizado.

---

## 16. Guion corto para demo

1. "Primero iniciamos sesión en la extensión."
2. "Ahora abrimos una tienda afiliada. La extensión detecta automáticamente comercio y precio."
3. "Desde Home vemos el monto detectado y el crédito disponible."
4. "Entramos al plan de pagos y elegimos el número de quincenas."
5. "Confirmamos con PIN y generamos un CVV virtual temporal."
6. "Al confirmar, se registra la compra y se crean sus cuotas."
7. "En Alertas vemos próximos vencimientos y pagos vencidos."
8. "Desde aquí podemos pagar una cuota; el cambio se guarda en base de datos."
9. "Si cerramos y abrimos la extensión, el historial de alertas conserva los pagos recientes."
10. "Finalmente, en Perfil podemos cambiar PIN, editar preferencias y ver favoritos."

---

## 17. Qué enfatizar a Kueski

- La extensión vive en el momento exacto de intención de compra.
- El flujo reduce fricción para descubrir y usar Kueski Pay.
- La arquitectura ya separa frontend, backend y base de datos.
- El prototipo ya persiste compras, cuotas, pagos, favoritos y preferencias.
- La experiencia contempla usuarios sanos y usuarios con pagos vencidos.
- La demo no es solo UI: hay lógica real de backend y persistencia.

---

## 18. Riesgos y siguientes pasos

### Riesgos

- Cambios en DOM de tiendas pueden romper detección de precio.
- El esquema SQL debe formalizarse en `schema.sql`.
- El pago con tarjeta/OXXO es flujo de experiencia, no integración financiera real.
- Faltan notificaciones reales de Chrome.

### Siguientes pasos

- Versionar el schema completo de PostgreSQL.
- Agregar columna o tabla de auditoría para pagos: `pagada_en`, `metodo_pago`, `referencia_pago`.
- Implementar notificaciones reales de vencimiento.
- Hacer pruebas en tiendas reales con más productos.
- Mejorar fallback de detección de precio.
- Preparar datos limpios para demo.
- Revisar permisos de extensión antes de empaquetar.

---

## 19. Archivos clave para mencionar

- `extension/content/content.js`: detección de comercio y precio.
- `extension/background/background.js`: persistencia de comercio/monto y navegación.
- `extension/src/App.jsx`: navegación y estado global del popup.
- `extension/src/components/HomeCard.jsx`: vista principal.
- `extension/src/components/PaymentPlan.jsx`: plan de pagos.
- `extension/src/components/PinView.jsx`: validación de PIN.
- `extension/src/components/CvvView.jsx`: CVV virtual.
- `extension/src/components/AlertView.jsx`: alertas y pagos de cuotas.
- `extension/src/components/PaymentModal.jsx`: modal de pago.
- `extension/src/components/ProfileView.jsx`: perfil, preferencias y favoritos.
- `extension/src/components/LoginView.jsx`: login/registro.
- `backend/server.js`: entrada del backend.
- `backend/routes/compras.js`: historial, vencidas y pago de cuotas.
- `backend/routes/tokens.js`: generación de CVV y confirmación de compra.
- `backend/routes/pin.js`: PIN y bloqueo por intentos.
- `backend/db/db.js`: conexión Supabase/PostgreSQL.

---

## 20. Checklist antes de presentar

- Backend corriendo en `http://localhost:3001`.
- Extensión compilada con `npm run build`.
- Extensión cargada desde `extension/dist`.
- Usuario demo con credito disponible.
- Al menos una tienda afiliada abierta para probar detección.
- Una compra con cuotas pendientes para mostrar Alertas.
- Una cuota vencida o próxima para mostrar pago.
- Datos de login listos.
- SQL de limpieza de cuenta a la mano.
- Tener abierto Supabase para mostrar persistencia si preguntan.

