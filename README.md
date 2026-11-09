# Migajeros y Calculados — plataforma de apoyo académico (versión 2)

Plataforma web para estudiantes de ingeniería de la UCC Bogotá en ciencias básicas.

La versión 1 reconstruía en código el sitio de Wix (<https://eledward2005.wixsite.com/migajeros-y-calculad>). Esta versión 2 lo rediseña como un **panel académico interactivo**, siguiendo la retroalimentación del curso:
- agrupaciones pedagógicas claras;
- seguimiento del aprendizaje;
- gamificación;
- personalización;
- más riqueza visual.

Se mantiene la identidad visual del sitio: azul petróleo #005C77, azul noche #001B44, títulos con serifa, logo, imágenes y colores por materia.

- **Frontend:** HTML5, CSS3 y JavaScript sin frameworks, con plantillas EJS renderizadas en el servidor.
- **Backend:** Node.js + Express.
- **Base de datos:** SQL Server (`mssql`) o SQLite, que viene incluido en Node y es la opción por defecto.

## Ejecutar en local

Requiere Node.js **22.13 o superior**.

```bash
cd migajeros-y-calculados
npm install
npm start
```

Abre <http://localhost:3000>. Para probar el panel completo, regístrate, únete a un curso y completa pasos y ejercicios.

`npm test` ejecuta 82 comprobaciones automáticas: páginas, caché de CSS y JS, filtros sin JavaScript, registro, cursos, pasos, insignias, puntos de experiencia (XP), panel, ejercicios, formulario, búsqueda y página 404.

## Qué se mejoró y qué ley o principio aplica

| Observación del curso | Qué se hizo | Ley / principio |
|---|---|---|
| No hay agrupaciones pedagógicas claras | El contenido se organiza en **5 áreas**: Cálculo, Álgebra Lineal, Física, y Geometría analítica y Estadística como *Próximamente*. Cada área tiene **3 o 4 temas**, y cada tema reúne su video, su idea clave, 2 ejercicios y su parte del curso. | **Ley de Miller** (7 ± 2), Gestalt de proximidad y región común |
| Debería ser un panel académico con el progreso de los cursos | **Mi progreso** es ahora un panel académico con: <ul><li>nivel y XP;</li><li>4 indicadores;</li><li>"Continúa donde quedaste";</li><li>recomendación;</li><li>anillos de avance por curso;</li><li>actividad de la semana;</li><li>dominio por área y por tema;</li><li>insignias y logros.</li></ul> El inicio también muestra un resumen al estudiante con sesión iniciada. | Heurística de Nielsen #1 (visibilidad del estado del sistema) |
| No hay gamificación | Cada paso da +10 XP, cada ejercicio correcto +5 XP y cada insignia +50 XP. Además hay: <ul><li>6 niveles (Migajero → Ingeniero UCC);</li><li>racha de días;</li><li>5 logros de estudio y 3 insignias de curso;</li><li>avisos emergentes al ganar XP.</li></ul> | Motivación por metas y efecto del gradiente de meta |
| Poca personalización y apropiación | Saludo con el nombre, meta semanal elegible (3, 5, 10 o 15), área de interés para las recomendaciones, y formulario de dudas que se llena solo con los datos del estudiante. | Control y libertad del usuario (Nielsen #3) |
| Mucho fondo blanco, pocas imágenes, sin componentes modernos | Se agregaron: <ul><li>fondos por secciones;</li><li>encabezados de color por área;</li><li>tarjetas con sombra;</li><li>chips, anillos de progreso y barras;</li><li>migas de pan;</li><li>pie de página oscuro;</li><li>más fotos (portada, Ayudas, Nosotros, panel de invitado).</li></ul> | Ley de estética-usabilidad, jerarquía visual |
| Jerarquía visual básica | Cada página tiene encabezado, breve explicación, una acción principal destacada y una secundaria. | Ley de Hick (pocas opciones), ley de Fitts (botones grandes y cercanos) |
| — | Mismo menú, colores por área en todo el sitio, y migas de pan en las páginas internas. | Ley de Jakob y consistencia (Nielsen #4) |
| — | Banco de ejercicios interactivo: <ul><li>se elige una opción y se presiona **Comprobar**, y aparece si es correcta y por qué;</li><li>puntaje por área;</li><li>filtros por área;</li><li>se puede reiniciar.</li></ul> | Nielsen #9 (ayudar a reconocer errores) y retroalimentación inmediata |
| — | Todos los botones funcionan, también sin JavaScript. Los botones son formularios o enlaces reales. | Robustez y accesibilidad |

## Páginas

| Ruta | Contenido |
|---|---|
| `/` | Para invitados: portada, áreas de estudio, ruta de aprendizaje, gamificación, apoyo UCC e invitación a registrarse. Con sesión iniciada: bienvenida personalizada con nivel, XP e indicadores. |
| `/challenges` | Catálogo de cursos con filtros por área y "Mis cursos", avance de cada curso y cursos próximos |
| `/matematica` (Cálculo), `/algebra-lineal`, `/fisica` | Página de área: encabezado de color, avance y temas numerados. Cada tema trae video, idea clave, video animado con transcripción, botón **Practicar** y enlace al curso. |
| `/banco-de-ejercicios` | Formulario interactivo con los 18 ejercicios, puntaje y filtros |
| `/profile` | Panel académico. Sin sesión, muestra qué ofrece el panel y los botones para entrar. |
| `/p-gina-de-programas/:id` | Curso: contenido por temas que se despliega, avance, botón "Únete" o "Continuar", insignia y compartir |
| `/p-gina-de-programas/:id/participante` | Pasos del curso: avance, "Ver respuesta", "Completar paso", anterior y siguiente, y "Salir del curso" |
| `/ayudas-ucc` | Recursos institucionales y formulario "¿Tienes una duda?" |
| `/nosotros` | Misión y visión, "Cómo funciona" y equipo |
| `/buscar?q=` | Buscador (lupa en el encabezado y en el menú del celular) |
| `/login`, `/registro` | Acceso de estudiantes |
| `/admin/preguntas?token=…` | Preguntas recibidas. Requiere `ADMIN_TOKEN` en `.env` |

## Usar SQL Server

1. Copia `.env.example` como `.env` y pon `DB_DRIVER=mssql`, `DB_SERVER`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.
2. Crea las tablas con `npm run db:init`, o ejecuta `database/schema.sqlserver.sql` en SSMS o Azure Data Studio.
3. Ejecuta `npm start`. La consola dice `base de datos: mssql`.

La base de datos tiene estas tablas:
- `members`: estudiantes;
- `enrollments`: cursos a los que se unieron;
- `step_progress`: pasos completados;
- `member_badges`: insignias;
- `exercise_attempts`: respuestas del banco de ejercicios;
- `member_settings`: meta semanal y área de interés;
- `questions`: preguntas del formulario.

## Estructura

```
server.js                 Servidor Express
src/
  data/areas.js           Áreas de estudio y temas (organización pedagógica)
  data/site.js            Textos de las páginas
  data/programs.json      3 cursos: 30 pasos, transcripciones e insignias (exportados de Wix)
  data/exercises.json     Banco de 18 ejercicios
  exercises.js            Corrección de ejercicios
  gamification.js         XP, niveles, racha, actividad, logros y recomendaciones
  programs.js             Avance de los cursos e insignias
  db/                     SQLite y SQL Server con la misma interfaz
  routes/pages.js         Páginas
  routes/api.js           Cuenta, cursos, pasos, ejercicios, preferencias y formulario
views/                    Plantillas EJS
public/css/styles.css     Estilos para escritorio, tablet (≤1100 px) y celular (≤750 px)
public/js/main.js         Interacciones: menú, filtros, ejercicios, avisos de XP y formulario
public/img, public/video  Imágenes y videos originales del sitio
database/                 Esquemas de SQL Server y SQLite
scripts/                  init-db.js y smoke-test.js
```

## Notas

- **Fuente de los títulos:** Wix usa *Clarendon*, que tiene licencia comercial. Aquí se usa **Besley**, una fuente libre de estilo Clarendon.
- **Áreas próximas:** Geometría analítica y Estadística aparecen como *Próximamente*, sin contenido inventado. Se activan agregando sus temas en `src/data/areas.js` y su curso en `src/data/programs.json`.
- **Descripciones nuevas:** los temas Sistemas de ecuaciones, Leyes de Newton y Trabajo y energía no tenían descripción propia en el sitio original. Su descripción resume la "idea clave" del curso.
