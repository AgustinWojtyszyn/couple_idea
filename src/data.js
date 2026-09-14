const december20 = new URL('../IMG_20251220_084825766_HDR.jpg', import.meta.url).href;
const december22 = new URL('../IMG_20251222_185848525_HDR.jpg', import.meta.url).href;
const december30 = new URL('../IMG_20251230_192530487_HDR.jpg', import.meta.url).href;
const april11Extra = new URL('../IMG_20260411_181951405_HDR.jpg', import.meta.url).href;

export const START_DATE = '2025-10-08T00:00:00-03:00';

export const memories = [
  { src: '/photos/Peachy_20260802_132844810.jpg', date: '02 · 08 · 2026', alt: 'Ángeles y Agustín juntos', note: 'Una de esas fotos que ya se sienten como hogar.' },
  { src: '/photos/IMG_20251008_221200447_HDR.jpg', date: '08 · 10 · 2025', alt: 'Ángeles y Agustín en el comienzo de su historia', note: 'El día que dejó de ser una fecha cualquiera.' },
  { src: '/photos/IMG_20251009_220806166.jpg', date: '09 · 10 · 2025', alt: 'Ángeles y Agustín juntos al comienzo de su relación', note: 'Un día después, y ya había muchísimo por guardar.' },
  { src: '/photos/IMG_20251011_223912711_HDR.jpg', date: '11 · 10 · 2025', alt: 'Ángeles y Agustín compartiendo uno de sus primeros recuerdos', note: 'De esos primeros días que hoy se sienten lejísimos y cerquísima a la vez.' },
  { src: december20, date: '20 · 12 · 2025', alt: 'Ángeles y Agustín compartiendo un recuerdo de diciembre', note: 'Diciembre también quedó guardado en nuestra historia.' },
  { src: december22, date: '22 · 12 · 2025', alt: 'Ángeles y Agustín juntos en diciembre', note: 'Dos días después, otra escena que valía la pena conservar.' },
  { src: december30, date: '30 · 12 · 2025', alt: 'Ángeles y Agustín cerrando diciembre juntos', note: 'Casi cerrando el año, pero recién empezando nosotros.' },
  { src: '/photos/IMG-20260117-WA0077.jpg', date: '17 · 01 · 2026', alt: 'Ángeles y Agustín juntos en enero', note: 'La historia ya tenía meses, pero seguía sintiéndose nueva.' },
  { src: '/photos/IMG_20260402_212017843_HDR.jpg', date: '02 · 04 · 2026', alt: 'Ángeles y Agustín compartiendo un momento en abril', note: 'Otra noche que terminó convertida en recuerdo.' },
  { src: '/photos/IMG_20260407_230941000_HDR.jpg', date: '07 · 04 · 2026', alt: 'Ángeles y Agustín juntos en abril', note: 'Cinco minutos pueden ser una foto. Después se vuelven una época.' },
  { src: '/photos/IMG_20260411_181950106_HDR.jpg', date: '11 · 04 · 2026', alt: 'Ángeles y Agustín en otro recuerdo de abril', note: 'Una escena más de todas las que fueron armando lo nuestro.' },
  { src: april11Extra, date: '11 · 04 · 2026', alt: 'Ángeles y Agustín en un segundo recuerdo de abril', note: 'Mismo día, otro instante. También cuenta.' },
  { src: '/photos/IMG_20260722_191149120_HDR.jpg', date: '22 · 07 · 2026', alt: 'Ángeles y Agustín juntos de noche', note: 'También somos todas esas noches que terminan en foto.' },
  { src: '/photos/IMG_20260801_221742102_HDR.jpg', date: '01 · 08 · 2026', alt: 'Ángeles y Agustín compartiendo otro momento juntos', note: 'Otra escena nuestra que merecía quedarse.' },
  { src: '/photos/IMG-20260808-WA0105.jpg', date: '08 · 08 · 2026', alt: 'Ángeles y Agustín cenando', note: 'Otra mesa, otra escena que queda con nosotros.' },
  { src: '/photos/IMG-20260808-WA0108.jpg', date: '08 · 08 · 2026', alt: 'Ángeles y Agustín compartiendo una comida', note: 'Lo cotidiano también merece un lugar en la historia.' },
  { src: '/photos/IMG-20260808-WA0109.jpg', date: '08 · 08 · 2026', alt: 'Ángeles y Agustín en una salida', note: 'Plan simple. Recuerdo gigante.' },
  { src: '/photos/IMG-20260808-WA0110.jpg', date: '08 · 08 · 2026', alt: 'Ángeles y Agustín frente a un espejo', note: 'Nosotros, sin pose perfecta. Mejor así.' },
  { src: '/photos/IMG-20260819-WA0000.jpg', date: '19 · 08 · 2026', alt: 'Ángeles y Agustín por darse un beso', note: 'Hay momentos que no necesitan explicación.' },
  { src: '/photos/IMG-20260826-WA0156.jpg', date: '26 · 08 · 2026', alt: 'Ángeles y Agustín en uno de sus recuerdos', note: 'La clase de día que vale la pena guardar.' },
  { src: '/photos/IMG-20260826-WA0168.jpg', date: '26 · 08 · 2026', alt: 'Ángeles y Agustín juntos', note: 'Dos caras, una historia enorme.' },
];

export const storyMoments = [
  {
    date: '08 · 10 · 2025',
    eyebrow: 'El comienzo',
    title: 'Acá empezó nuestro nosotros.',
    text: 'Una fecha que dejó de ser un día más y pasó a tener significado propio.',
  },
  {
    date: '09 · 10 · 2025',
    eyebrow: 'El día después',
    title: 'Y ya había otra foto para guardar.',
    text: 'La historia empezó a crecer casi sin pedir permiso.',
  },
  {
    date: 'Cada día 8',
    eyebrow: 'Nuestro pequeño ritual',
    title: 'Un mes más de historia.',
    text: 'La página lo sabe: cada 8 cambia sutilmente para recordarnos que seguimos sumando.',
  },
  {
    date: 'Hoy',
    eyebrow: 'Página abierta',
    title: 'Todavía queda muchísimo por guardar.',
    text: 'Esta web no está terminada. La idea es que crezca a la misma velocidad que nuestros recuerdos.',
  },
];

export const littleNotes = [
  'Elegiría esta historia otra vez.',
  'No hace falta que sea un día especial para que sea un recuerdo especial.',
  'Lo mejor de mirar atrás es saber que todavía queda adelante.',
  'Un montón de días comunes terminaron volviéndose nuestros favoritos.',
  'Si esta página crece, es porque nosotros también.',
];
