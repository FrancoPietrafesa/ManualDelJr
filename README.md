# Manual del Junior — Sitio web

Repositorio de ejemplo con la estructura inicial del sitio "Manual del Junior". Tema oscuro, páginas de cursos y botones de pago placeholder.

Cómo usar (local):

1. Abrir `index.html` en el navegador (doble clic o `live server`).
2. Revisar las páginas de ejemplo: `qa.html`, `herramientas.html`, `entrevistas.html`, `profesionalizacion.html`.

Notas sobre pagos:
- Los botones son placeholders. Para integrar PayPal, usar la SDK/Checkout o botones hospedados de PayPal en servidor.
- Para MercadoPago se debe crear una "preference" en el backend y luego redirigir al usuario al checkout. Ver la documentación oficial de MercadoPago.

Siguientes pasos recomendados:
- Crear un backend (Node/Express, PHP, etc.) para generar preferencias y procesar webhooks de pago.
- Añadir formulario de registro/usuario y acceso a contenido pagando.
- Personalizar contenido y estilos según tu branding.

Si quieres, puedo:
- Generar integración de ejemplo con PayPal (cliente/servidor) o con MercadoPago.
- Mejorar el diseño visual, animaciones o preparar assets para redes.

Servidor de ejemplo:
- Se incluyó un servidor Node.js demo en la carpeta `server/` con rutas para:
	- Autenticación: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`.
	- PayPal: `POST /api/paypal/create-order` y `POST /api/paypal/capture`.
	- MercadoPago: `POST /api/mercadopago/create-preference`.
	- Compras demo: `POST /api/purchases/mark`, `GET /api/purchases`.

Cómo ejecutar el servidor (local):

1. Abrir la carpeta `server` y crear un `.env` a partir de `.env.example` con tus credenciales (usar sandbox de PayPal y credenciales de MercadoPago sandbox).
2. Instalar dependencias e iniciar:

```bash
cd server
npm install
npm run start
```

Notas de integración y seguridad:
- Las implementaciones en `server/index.js` son ejemplos para pruebas y demostraciones; NO son aptas para producción sin ajustes de seguridad, almacenamiento persistente, validación más estricta y manejo de webhooks.
- Para producción debes usar HTTPS, almacenar secretos en un vault, y persistir usuarios y compras en una base de datos.

