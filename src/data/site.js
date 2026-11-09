// Contenido de las páginas, copiado del sitio publicado en Wix
// (https://eledward2005.wixsite.com/migajeros-y-calculad) en noviembre de 2026.

const programIds = {
  matematica: '6dd527ee-2e69-459e-95e8-a120a31d1639',
  fisica: 'd6b8e445-ccbe-4226-a79b-35130fa6a897',
  algebra: '4fb93cc4-2299-482e-a32c-593810def685'
};

const site = {
  name: 'Migajeros y Calculados',
  email: 'contacto@migajerosycalculados.com',
  copyright: '© 2026 Migajeros y Calculados. Todos los derechos reservados.',
  tagline: 'Apoyo académico en ciencias básicas · UCC Bogotá',

  // Menú principal (mismo orden y destinos que en Wix)
  nav: [
    { key: 'inicio', label: 'Inicio', href: '/' },
    {
      key: 'cursos', label: 'Cursos', href: '/challenges',
      children: [
        { key: 'matematica', label: 'Cálculo', href: '/matematica' },
        { key: 'algebra-lineal', label: 'Álgebra Lineal', href: '/algebra-lineal' },
        { key: 'fisica', label: 'Física', href: '/fisica' },
        { key: 'cursos', label: 'Todos los cursos', href: '/challenges' }
      ]
    },
    { key: 'nosotros', label: 'Nosotros', href: '/nosotros' },
    { key: 'ejercicios', label: 'Ejercicios', href: '/banco-de-ejercicios' },
    { key: 'ayudas', label: 'Ayudas UCC', href: '/ayudas-ucc' },
    { key: 'progreso', label: 'Mi progreso', href: '/profile' }
  ],

  home: {
    kicker: 'Domina la ingeniería con precisión',
    title: 'MIGAJEROS Y CALCULADOS',
    text: 'Aprende ciencias básicas a tu ritmo. Plataforma de enseñanza remota de ingeniería diseñada para la excelencia técnica.',
    cta: { label: 'Empezar ahora', href: '/matematica' },
    subjectsTitle: 'Nuestras Materias',
    subjects: [
      { title: 'Matemática', icon: '/img/icono-matematica.jpg', alt: 'Icono matematicas', href: '/matematica',
        text: 'Domina las herramientas matemáticas fundamentales para resolver problemas complejos en ingeniería.' },
      { title: 'Física', icon: '/img/icono-fisica.jpg', alt: 'Icono fisica', href: '/fisica',
        text: 'Entiende los principios físicos que rigen el comportamiento de los materiales y las fuerzas en el mundo real.' },
      { title: 'Álgebra Lineal', icon: '/img/icono-algebra.jpg', alt: '', href: '/algebra-lineal',
        text: 'Aprende matrices, determinantes, sistemas de ecuaciones y espacios vectoriales.' }
    ],
    pathTitle: 'Tu camino al éxito técnico',
    steps: [
      { n: '1', title: 'Selecciona tu Meta', text: 'Explora nuestro catálogo de materias fundamentales y elige el curso que impulsará tu carrera.' },
      { n: '2', title: 'Mira el video', text: 'Cada tema tiene un video corto que explica un concepto a la vez.' },
      { n: '3', title: 'Practica', text: 'Resuelve ejercicios del tema y revisa la respuesta con su explicación.' },
      { n: '4', title: 'Revisa tu progreso', text: 'Mira qué temas ya dominas y gana una insignia al terminar cada curso.' }
    ],
    pathCta: { label: 'Descubrir Cursos', href: '/challenges' }
  },

  // Páginas de materia (Matemática y Física comparten plantilla; Álgebra Lineal usa dos columnas)
  subjects: {
    matematica: {
      title: 'Matemática',
      intro: 'Repasa los temas de Matemática con videos y practica en el curso.',
      programId: programIds.matematica,
      layout: 'stacked',
      offset: 'mat',
      topics: [
        { title: 'Límites y continuidad', youtube: 'uK4-s0ojHFg',
          text: 'Descubre cómo se comportan las funciones cerca de un punto y cuándo son continuas. Activa los subtítulos (CC) en el reproductor.' },
        { title: 'La derivada', youtube: 'o2UTk8bsLS0',
          text: 'Entiende la derivada como la pendiente de la recta tangente y cómo se calcula. Activa los subtítulos (CC) en el reproductor.' },
        { title: 'Integrales definidas', youtube: 'K15rvmw2WwI',
          text: 'Aprende a calcular áreas bajo la curva con la integral definida. Activa los subtítulos (CC) en el reproductor.' }
      ]
    },
    fisica: {
      title: 'Física',
      intro: 'Repasa los temas de Física con videos y practica en el curso.',
      programId: programIds.fisica,
      layout: 'stacked',
      offset: 'fis',
      topics: [
        { title: 'Cinemática y dinámica', youtube: 'kKKM8Y-u7ds',
          text: 'Estudia el movimiento y las fuerzas que lo producen con las tres leyes de Newton. Video en inglés: activa los subtítulos (CC) en el reproductor.' },
        { title: 'Fluidos y termodinámica', youtube: 'Bvfn6eUhUAc',
          text: 'Explora el comportamiento de los fluidos y las leyes de la energía térmica y el calor. Activa los subtítulos (CC) en el reproductor.' }
      ]
    },
    'algebra-lineal': {
      title: 'Álgebra Lineal',
      intro: 'Repasa matrices, determinantes y vectores con videos y practica en el curso.',
      programId: programIds.algebra,
      layout: 'columns',
      topics: [
        { title: '1. Espacios Vectoriales', youtube: 'msw1vhcvK6Y', controls: true,
          text: 'Comprende la estructura fundamental del álgebra lineal: vectores, bases y dimensiones en espacios n-dimensionales.' },
        { title: '2. Transformaciones Lineales', youtube: 'YJfS4_m_0Z8', controls: true,
          text: 'Estudia cómo las funciones mapean vectores entre espacios preservando la suma y el producto escalar.' },
        { title: '3. Matrices y Determinantes', youtube: 'LCJtIGrArC0', controls: true,
          text: 'Herramientas computacionales clave para resolver sistemas de ecuaciones lineales y analizar propiedades geométricas.' }
      ]
    }
  },

  courses: {
    title: '¡Hola, estudiante!',
    text: 'En esta sección podrás visualizar de manera clara y detallada tu avance individual en cada una de las materias que integran tu programa de estudio.',
    icon: '📊',
    listTitle: 'Programas'
  },

  ayudas: {
    resourcesTitle: 'Recursos Institucionales UCC',
    resources: [
      { title: 'Monitorías Académicas', img: '/img/monitorias.jpg',
        text: 'Apoyo constante liderado por estudiantes destacados para fortalecer tus conocimientos en ciencias básicas y áreas técnicas.' },
      { title: 'Tutorías Especializadas', img: '/img/tutorias.jpg',
        text: 'Sesiones personalizadas con docentes expertos para resolver dudas puntuales y avanzar en tu ruta de aprendizaje.' },
      { title: 'Bienestar Universitario', img: '/img/bienestar.jpg',
        text: 'Programas integrales de deporte, cultura y salud para equilibrar tu vida académica y personal.' },
      { title: 'Próximamente', img: '/img/proximamente.jpg', highlight: true,
        text: 'Aviso pequeño: tutorías en línea en tiempo real. Estamos preparando nuevas herramientas digitales para tu éxito profesional.' }
    ],
    title: 'Ayudas UCC',
    text: 'Brindamos herramientas integrales para fortalecer tu camino académico y personal. Conoce los recursos disponibles para tu éxito.',
    list: [
      { label: 'Monitorías:', text: 'Apoyo entre pares para resolver dudas puntuales de tus materias.' },
      { label: 'Tutorías:', text: 'Acompañamiento docente especializado para profundizar en conceptos claves.' },
      { label: 'Bienestar Universitario:', text: 'Programas de salud mental, deporte y cultura para tu desarrollo integral.' }
    ],
    soon: 'Próximamente: tutorías en línea en tiempo real.',
    formTitle: '¿Tienes una duda?',
    formText: 'Escríbenos sobre el tema que no entiendes y te responderemos a tu correo institucional.',
    subjects: ['Matemática', 'Física', 'Álgebra Lineal']
  },

  nosotros: {
    title: 'Misión y Visión',
    text: 'Nuestra misión es democratizar el acceso a la educación de alta complejidad técnica, permitiendo que cada estudiante de ingeniería domine las ciencias básicas a su propio ritmo. Aspiramos a ser la plataforma líder que fusiona el rigor académico con una experiencia digital fresca y accesible para las nuevas generaciones de ingenieros.',
    howTitle: 'Cómo funciona',
    how: [
      { title: 'Elige tu curso', icon: '/img/icono-elige.jpg', text: 'Explora nuestro catálogo y selecciona la materia que deseas dominar hoy mismo.' },
      { title: 'Mira el video', icon: '/img/icono-video.jpg', text: 'Aprende con videotutoriales cortos y precisos diseñados por expertos en ingeniería.' },
      { title: 'Practica', icon: '/img/icono-practica.jpg', text: 'Refuerza tus conocimientos con nuestra base de ejercicios prácticos seleccionados.' },
      { title: 'Revisa tu progreso', icon: '/img/icono-progreso.jpg', text: 'Visualiza tus logros y áreas de mejora a medida que avanzas en tu plan de estudio.' }
    ],
    soonLabel: 'Próximamente:',
    soonText: 'tutorías en línea en tiempo real'
  },

  profile: {
    loggedOut: 'Inicia sesión o regístrate para ver tus cursos, tu avance por pasos y las insignias que has ganado.'
  }
};

module.exports = { site, programIds };
