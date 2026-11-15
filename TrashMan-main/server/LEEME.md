# Sala online de Trash Man

El cliente web necesita un servidor WebSocket para crear la única sala global, entregar el código de invitación, sincronizar a los jugadores y compartir la basura recogida.

## Publicación en Cloudflare Workers

El Worker atiende la sala global en `/api/room` con un Durable Object; el cliente se conecta al mismo dominio con `wss://`. No hay que mantener un proceso Node separado para el sitio publicado.

El `wrangler.jsonc` incluye el binding `ROOM` y la migración SQLite del Durable Object. Despliega desde esta carpeta con `npx wrangler deploy`. El `.assetsignore` evita publicar archivos de desarrollo y el ZIP descargable.

## Ejecutar en desarrollo

1. Instala Node.js.
2. Abre una terminal dentro de `server/` y ejecuta `npm install`.
3. Desde la raíz del proyecto ejecuta `npx wrangler dev` para servir el Worker, los recursos y el Durable Object en el mismo origen.
4. En Multijugador, el anfitrión elige el mapa y pulsa **Crear la sala global**. Comparte el código/enlace y espera a que el equipo pulse **Unirse**. Luego pulsa **Iniciar cuando llegue el equipo** y elige la dificultad.

El servidor solo admite una sala global a la vez y hasta 16 jugadores. El servidor Node de esta carpeta sigue disponible para alojamientos dedicados; si lo usas, configura `?ws=wss://TU-SERVIDOR` en la URL. El código de invitación conserva ese parámetro.

## Recursos incorporados

- `js/engine/gamepad.js`: Gamepad API, navegación con cruceta, movimiento analógico, cámara, acción, mochila, armas, vibración y ajustes persistentes.
- `js/engine/camera.js`: cámara con suavizado por tiempo, auto centrado, colisiones, zoom progresivo, FOV al correr y temblor del Titán.
- `assets/sounds/`: versión OGG de los efectos, música y ambientes; el juego ya reproduce varios de ellos y cambia el ambiente según el mapa.
- `assets/shaders/unity-reference/` y `assets/reference/RiverMap-Unity.cs.txt`: fuentes originales de Unity, guardadas como referencia. El navegador usa Three.js; sus materiales/efectos compatibles se implementan en `js/world/maps.js` y `js/engine/graphics.js`.
- `assets/tools/gamepad_test.html`: comprobador del mando.
