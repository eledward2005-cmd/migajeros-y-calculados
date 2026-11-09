// Organización pedagógica del contenido (ley de Miller: grupos pequeños).
// 5 áreas de estudio y, en cada una, 3 o 4 temas. Cada tema reúne su video,
// su idea clave (del curso), sus 2 ejercicios del banco y el tema del curso.
// Los temas son el contenido que ya existía en el sitio; Geometría y
// Estadística se muestran como "Próximamente" (sin contenido inventado).

const areas = [
  {
    slug: 'calculo', page: '/matematica', name: 'Cálculo', subject: 'Matemática',
    programSlug: 'matematica', color: '#1E40AF', soft: '#E6ECFB', icon: 'calculo',
    cover: '/img/portada-matematica.jpg', iconImg: '/img/icono-matematica.jpg',
    tagline: 'Límites, derivadas e integrales',
    description: 'Domina las herramientas matemáticas fundamentales para resolver problemas complejos en ingeniería.',
    topics: [
      { slug: 'limites', title: 'Límites y continuidad', section: 'Límites y continuidad', youtube: 'uK4-s0ojHFg', exercises: ['matematica-1', 'matematica-2'],
        text: 'Descubre cómo se comportan las funciones cerca de un punto y cuándo son continuas.' },
      { slug: 'derivadas', title: 'La derivada', section: 'Derivadas', youtube: 'o2UTk8bsLS0', exercises: ['matematica-3', 'matematica-4'],
        text: 'Entiende la derivada como la pendiente de la recta tangente y cómo se calcula.' },
      { slug: 'integrales', title: 'Integrales definidas', section: 'Integrales', youtube: 'K15rvmw2WwI', exercises: ['matematica-5', 'matematica-6'],
        text: 'Aprende a calcular áreas bajo la curva con la integral definida.' }
    ]
  },
  {
    slug: 'algebra', page: '/algebra-lineal', name: 'Álgebra Lineal', subject: 'Álgebra Lineal',
    programSlug: 'algebra-lineal', color: '#5B21B6', soft: '#EFE8FB', icon: 'algebra',
    cover: '/img/portada-algebra.jpg', iconImg: '/img/icono-algebra.jpg',
    tagline: 'Matrices, sistemas y vectores',
    description: 'Aprende matrices, determinantes, sistemas de ecuaciones y espacios vectoriales.',
    topics: [
      { slug: 'matrices', title: 'Matrices y determinantes', section: 'Matrices y determinantes', youtube: 'LCJtIGrArC0', exercises: ['algebra-lineal-1', 'algebra-lineal-2'],
        text: 'Herramientas computacionales clave para resolver sistemas de ecuaciones lineales y analizar propiedades geométricas.' },
      { slug: 'sistemas', title: 'Sistemas de ecuaciones', section: 'Sistemas de ecuaciones', youtube: null, exercises: ['algebra-lineal-3', 'algebra-lineal-4'],
        text: 'Resuelve sistemas lineales y reconoce cuándo tienen una, infinitas o ninguna solución.' },
      { slug: 'espacios', title: 'Espacios vectoriales', section: 'Espacios vectoriales', youtube: 'msw1vhcvK6Y', exercises: ['algebra-lineal-5', 'algebra-lineal-6'],
        text: 'Comprende la estructura fundamental del álgebra lineal: vectores, bases y dimensiones en espacios n-dimensionales.' },
      { slug: 'transformaciones', title: 'Transformaciones lineales', section: null, youtube: 'YJfS4_m_0Z8', exercises: [],
        text: 'Estudia cómo las funciones mapean vectores entre espacios preservando la suma y el producto escalar.' }
    ]
  },
  {
    slug: 'fisica', page: '/fisica', name: 'Física', subject: 'Física',
    programSlug: 'fisica', color: '#115E59', soft: '#E3F2F0', icon: 'fisica',
    cover: '/img/portada-fisica.jpg', iconImg: '/img/icono-fisica.jpg',
    tagline: 'Cinemática, leyes de Newton y energía',
    description: 'Entiende los principios físicos que rigen el comportamiento de los materiales y las fuerzas en el mundo real.',
    topics: [
      { slug: 'cinematica', title: 'Cinemática y dinámica', section: 'Cinemática', youtube: 'kKKM8Y-u7ds', exercises: ['fisica-1', 'fisica-2'],
        text: 'Estudia el movimiento y las fuerzas que lo producen. Video en inglés: activa los subtítulos (CC).' },
      { slug: 'newton', title: 'Leyes de Newton', section: 'Leyes de Newton', youtube: null, exercises: ['fisica-3', 'fisica-4'],
        text: 'Relaciona fuerza, masa y aceleración, y reconoce las fuerzas de acción y reacción.' },
      { slug: 'energia', title: 'Trabajo y energía', section: 'Trabajo y energía', youtube: null, exercises: ['fisica-5', 'fisica-6'],
        text: 'Calcula el trabajo de una fuerza y la energía cinética de un cuerpo.' },
      { slug: 'fluidos', title: 'Fluidos y termodinámica', section: null, youtube: 'Bvfn6eUhUAc', exercises: [],
        text: 'Explora el comportamiento de los fluidos y las leyes de la energía térmica y el calor.' }
    ]
  },
  { slug: 'geometria', name: 'Geometría analítica', color: '#9A3412', soft: '#FCEDE4', icon: 'geometria', soon: true,
    tagline: 'Rectas, cónicas y vectores en el plano', description: 'Próximamente: nuevos temas en preparación.' },
  { slug: 'estadistica', name: 'Estadística', color: '#0E7490', soft: '#E2F3F7', icon: 'estadistica', soon: true,
    tagline: 'Probabilidad y análisis de datos', description: 'Próximamente: nuevos temas en preparación.' }
];

const active = areas.filter(a => !a.soon);
const byPage = new Map(active.map(a => [a.page.slice(1), a]));
const byProgramSlug = new Map(active.map(a => [a.programSlug, a]));

// Íconos SVG (trazo simple) para cada área
const icons = {
  calculo: '<path d="M4 20c4 0 5-16 9-16s3 10 7 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 20h18" stroke="currentColor" stroke-width="1.4"/>',
  algebra: '<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 9h2M14 9h2M8 15h2M14 15h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  fisica: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.6" fill="none" stroke="currentColor" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" fill="none" stroke="currentColor" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  geometria: '<path d="M4 19L12 5l8 14z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="14" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  estadistica: '<path d="M5 20V12M10 20V6M15 20v-9M20 20V9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};

module.exports = { areas, active, byPage, byProgramSlug, icons };
