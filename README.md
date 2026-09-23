# LEYENDA

Juego de carrera futbolística mobile-first construido con React + Vite.

La idea central es simple: elegís dónde empezar, definís tu estilo de juego y construís una carrera completa a través de rendimiento, minijuegos, mercado, títulos, ascensos, descensos y decisiones puntuales.

## Estado actual

La versión de prueba está enfocada en Argentina.

- Primera División + Primera Nacional
- Selección manual de país, división y club
- Modo Jugador y Modo Entrenador
- Carrera de 17 años hasta retiro entre 39 y 42
- Estilos permanentes: Cabulero, Mixto y Habilidoso
- 15 minijuegos de habilidad
- 10 minijuegos de cábala
- Finales, permanencias y ascensos definidos por minijuegos
- Mercado de pases con renovaciones y ofertas desde las primeras temporadas
- Ascensos y descensos persistentes
- Huella en el club separada de reputación general
- Vitrina de trofeos
- Gloria y score de carrera escalados a carreras largas
- Ranking local/global cuando el servicio esté disponible
- Login local de prueba, sin backend
- Tema oscuro/claro
- Navegación lateral
- Escudos argentinos resueltos desde referencias explícitas de Wikipedia/Wikimedia

## Filosofía de producto

LEYENDA toma inspiración de los juegos rápidos de carrera futbolística, pero no replica textos, arte ni branding de terceros.

Prioridades:

1. Mucho juego, poco texto.
2. Una temporada debe resolverse rápido.
3. Los partidos decisivos se juegan, no se sortean por detrás.
4. Las historias aparecen por hitos, no todos los años.
5. La interfaz debe ser cómoda desde teléfono.
6. Mercado, minijuegos y progresión son el centro de la experiencia.

## Flujo de carrera

```
LOGIN DEMO
  ↓
PAÍS
  ↓
DIVISIÓN
  ↓
CLUB
  ↓
POSICIÓN
  ↓
CABULERO / MIXTO / HABILIDOSO
  ↓
POTENCIADOR INICIAL
  ↓
TEMPORADA
  ↓
PARTIDO DECISIVO
  ↓
MERCADO
  ↓
SIGUIENTE TEMPORADA
```

## Minijuegos

### Habilidoso

Incluye definición, timing, memoria, lectura de espacios, control bajo presión, pases y reflejos.

Entre otros:

- Penales
- Tiro libre
- Slalom
- Reflejos
- Duelo defensivo
- Pizarra relámpago
- La diagonal
- La corrida
- Ojo en la pelota
- La señal
- El aguante
- Pase al hueco
- El hueco
- Saque largo
- Salida bajo presión

### Cabulero

Incluye juegos de azar controlado, lectura, memoria e intuición.

- El pálpito
- Dados del 7
- Moneda de vestuario
- Número marcado
- La camiseta
- Tres vasos
- Rueda del destino
- La torre
- Grilla de la suerte
- Los tapones

## Stack

- React 19
- TypeScript
- Vite
- CSS mobile-first
- localStorage/sessionStorage para la demo
- Wikimedia/Wikipedia para multimedia pública de clubes

## Desarrollo

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Alcance legal / de contenido

- No se incluyen nombres de futbolistas reales.
- No se incluyen marcas comerciales dentro de las mecánicas.
- Los nombres de clubes se usan como identificadores deportivos.
- Durante esta demo, los escudos se cargan desde páginas públicas de Wikipedia/Wikimedia cuando están disponibles.
