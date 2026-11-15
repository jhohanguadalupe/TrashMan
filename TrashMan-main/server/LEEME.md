# Sala online de Trash Man

El cliente web necesita un servidor WebSocket para crear la única sala global, entregar el código de invitación, sincronizar a los jugadores y compartir la basura recogida.

## Ejecutar en desarrollo

1. Instala Node.js.
2. Abre una terminal dentro de `server/` y ejecuta `npm install`.
3. Ejecuta `npm start` y mantén esa terminal abierta.
4. Sirve el proyecto web desde el mismo equipo. El cliente busca por defecto `ws://<mismo-host>:8080`.
5. En Multijugador, el anfitrión elige el mapa y pulsa **Crear la sala global**. Comparte el código/enlace y espera a que el equipo pulse **Unirse**. Luego pulsa **Iniciar cuando llegue el equipo** y elige la dificultad.

El servidor solo admite una sala a la vez y hasta 16 jugadores. Si el sitio web se aloja en otro dominio, añade `?ws=wss://TU-SERVIDOR` a la URL del juego y publica el servidor detrás de un proxy HTTPS que habilite WebSocket seguro (`wss://`). El código copiado conserva ese parámetro.

## Recursos incorporados

- `js/engine/gamepad.js`: Gamepad API, navegación con cruceta, movimiento analógico, cámara, acción, mochila, armas, vibración y ajustes persistentes.
- `js/engine/camera.js`: cámara con suavizado por tiempo, auto centrado, colisiones, zoom progresivo, FOV al correr y temblor del Titán.
- `assets/sounds/`: versión OGG de los efectos, música y ambientes; el juego ya reproduce varios de ellos y cambia el ambiente según el mapa.
- `assets/shaders/unity-reference/` y `assets/reference/RiverMap-Unity.cs.txt`: fuentes originales de Unity, guardadas como referencia. El navegador usa Three.js; sus materiales/efectos compatibles se implementan en `js/world/maps.js` y `js/engine/graphics.js`.
- `assets/tools/gamepad_test.html`: comprobador del mando.
