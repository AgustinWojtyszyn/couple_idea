# VIDA / LIFE

**Tu vida. Tu ciudad. Tus decisiones.**

Juego móvil local first en desarrollo. El código contiene una primera versión jugable con creación de persona, 4 países y 5 ciudades, mapa de barrios interactivo, economía ficticia, trabajo con minijuego de timing, estudio, relaciones con memoria, 110 plantillas de eventos, hogar ampliable, objetivos, desafío de 30 días, semilla diaria, guardado automático, exportación e importación. Funciona sin servidor y sin anuncios.

## Ejecutar

```bash
npm ci
npm run dev
```

En Android: `npm run build && npx cap sync android && npx cap open android`. Requiere Android Studio y SDK instalados. ID: `com.agustinwojtyszyn.vida`.

## Verificar

```bash
npm run build
npm run lint
npm test
```

La simulación (`src/game/simulation`) no depende de React ni Phaser. Datos de países en `src/content/countries`; eventos en `src/game/events`; persistencia versionada en `src/storage`. La ciudad y el hogar usan ilustraciones optimizadas WebP con puntos de interés interactivos en React; la simulación permanece separada de la interfaz.

## Estado y límites

Esta versión es un **primer corte jugable**, no una entrega final lista para Play Store. La ciudad y el interior tienen una primera dirección artística; faltan variaciones de escenas por ciudad, hogar y hora, sprites y animaciones de personajes, mayor variedad de microjuegos, progresión profesional profunda, familia, emprendimientos, vehículos, viajes y emigración. El modo Generaciones figura en el modelo, pero su mecánica aún no está implementada. Los eventos tienen 110 plantillas reutilizables de situaciones; no son 110 historias únicas desarrolladas. Los números económicos son ficticios. Falta medir FPS en dispositivos Android medios, prueba de accesibilidad y generar arte final, iconos, splash y AAB firmado.

El guardado local tiene versión 1 y validación básica; antes de migraciones futuras hay que añadir un migrador explícito y pruebas de compatibilidad. Exportar una partida es la forma de respaldarla fuera del dispositivo.
