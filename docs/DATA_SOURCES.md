# LEYENDA — fuentes abiertas de datos

## OpenFootball

LEYENDA usa OpenFootball como fuente abierta para ampliar el catálogo de ligas y clubes.

- Proyecto: https://github.com/openfootball/football.json
- Datos de clubes: https://github.com/openfootball/clubs
- Catálogo de ligas: https://github.com/openfootball/leagues
- Licencia declarada por el proyecto: CC0 / dominio público.

La integración de LEYENDA es lazy: una liga internacional se descarga sólo cuando el usuario la selecciona. Los nombres de equipos se extraen de los partidos publicados por OpenFootball y se guardan en cache local del navegador.

## Escudos

Los nombres de clubes y competiciones pueden provenir de los datasets abiertos anteriores, pero un escudo oficial puede tener una situación de propiedad intelectual distinta.

Por eso las ligas cargadas dinámicamente desde OpenFootball usan por defecto una identidad visual generada por LEYENDA. No se asume que un logo oficial sea libre simplemente porque el nombre del club figure en un dataset CC0.

## Jugadores y marcas

LEYENDA no necesita nombres de futbolistas reales ni marcas comerciales para el modo carrera. Las identidades del jugador, historias, eventos, bienes y minijuegos son propios del juego.
