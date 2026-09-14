import { useEffect, useMemo, useState } from 'react';
import { START_DATE, littleNotes, memories, storyMoments } from './data';

const pad = (value) => String(value).padStart(2, '0');

function getElapsed() {
  const start = new Date(START_DATE);
  const now = new Date();
  const total = Math.max(0, now.getTime() - start.getTime());
  const seconds = Math.floor(total / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function getCalendarAge() {
  const start = new Date(START_DATE);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months };
}

function useReveal() {
  useEffect(() => {
    const nodes = [...document.querySelectorAll('[data-reveal]')];
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.16 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

function LiveCounter() {
  const [elapsed, setElapsed] = useState(getElapsed());
  const age = useMemo(getCalendarAge, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(getElapsed()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cells = [
    ['Años', age.years],
    ['Meses', age.months],
    ['Días', elapsed.days],
    ['Horas', pad(elapsed.hours)],
    ['Min', pad(elapsed.minutes)],
    ['Seg', pad(elapsed.seconds)],
  ];

  return (
    <section className="counter-shell" id="tiempo" data-reveal>
      <div className="counter-copy">
        <span className="kicker">Desde el 8 de octubre de 2025</span>
        <h2>El tiempo corre.<br />Nosotros lo guardamos.</h2>
      </div>
      <div className="counter-grid" aria-label="Tiempo juntos">
        {cells.map(([label, value]) => (
          <div className="counter-cell" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="counter-note">Días totales desde que empezó nuestra historia: <strong>{elapsed.days}</strong>.</p>
    </section>
  );
}

function Hero({ onSecret }) {
  return (
    <header className="hero" id="inicio">
      <img className="hero-backdrop-image" src={memories[0].src} alt="" aria-hidden="true" />
      <img className="hero-image" src={memories[0].src} alt={memories[0].alt} fetchPriority="high" />
      <div className="hero-vignette" />
      <div className="hero-frame" aria-hidden="true" />
      <nav className="floating-nav" aria-label="Navegación principal">
        <a className="brand" href="#inicio">A<span>♡</span>A</a>
        <div className="nav-links">
          <a href="#historia">Historia</a>
          <a href="#recuerdos">Recuerdos</a>
          <a href="#universo">Universo</a>
        </div>
      </nav>
      <div className="hero-copy">
        <p className="hero-eyebrow">Ángeles & Agustín · 08.10.2025</p>
        <h1>Lo nuestro,<br /><em>en movimiento.</em></h1>
        <p className="hero-lead">Una página que cambia, crece y guarda un poquito de todo lo que somos.</p>
        <a className="hero-cta" href="#tiempo">Entrar en nuestra historia <span>↓</span></a>
      </div>
      <button className="secret-heart" aria-label="Detalle secreto" onClick={onSecret}>♡</button>
      <div className="scroll-indicator"><span />DESLIZÁ</div>
    </header>
  );
}

function Story() {
  return (
    <section className="story section-pad" id="historia">
      <div className="section-heading" data-reveal>
        <span className="kicker">Capítulo 01 · nuestra línea de tiempo</span>
        <h2>No es una cronología perfecta.<br /><i>Es mejor: es nuestra.</i></h2>
      </div>
      <div className="story-list">
        {storyMoments.map((item, index) => (
          <article className="story-item" key={item.date} data-reveal>
            <div className="story-number">0{index + 1}</div>
            <div className="story-date">{item.date}</div>
            <div className="story-content">
              <span>{item.eyebrow}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Gallery({ onOpen }) {
  return (
    <section className="gallery-section section-pad" id="recuerdos">
      <div className="section-heading split" data-reveal>
        <div>
          <span className="kicker">Capítulo 02 · recuerdos</span>
          <h2>Fotos que no necesitan<br /><i>ser perfectas.</i></h2>
        </div>
        <p>Las mejores son las que, con solo verlas, te devuelven exactamente a ese momento.</p>
      </div>
      <div className="editorial-grid">
        {memories.slice(1).map((memory, index) => (
          <button
            className={`photo-card photo-${index + 2}`}
            key={memory.src}
            onClick={() => onOpen(index + 1)}
            data-reveal
            aria-label={`Abrir recuerdo ${index + 2}`}
          >
            <span className="photo-image-shell">
              <img src={memory.src} alt={memory.alt} loading="lazy" />
            </span>
            <span className="photo-index">{pad(index + 2)}</span>
            <span className="photo-caption">{memory.note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function RandomMemory({ onOpen }) {
  const [index, setIndex] = useState(2);
  const pick = () => {
    let next = Math.floor(Math.random() * memories.length);
    if (next === index) next = (next + 1) % memories.length;
    setIndex(next);
  };

  return (
    <section className="random-memory section-pad" data-reveal>
      <div className="random-card">
        <button className="random-photo-wrap" onClick={() => onOpen(index)} aria-label="Abrir recuerdo aleatorio">
          <img src={memories[index].src} alt={memories[index].alt} />
          <span className="random-shine" />
        </button>
        <div className="random-copy">
          <span className="kicker">Memory machine</span>
          <h2>Traeme un recuerdo.</h2>
          <p>{memories[index].note}</p>
          <button className="pill-button" onClick={pick}>Otro recuerdo <span>↻</span></button>
        </div>
      </div>
    </section>
  );
}

function Universe({ onOpen }) {
  const stars = [
    [8, 22, 0], [16, 68, 3], [29, 40, 7], [38, 80, 5], [46, 18, 9],
    [57, 56, 1], [65, 88, 8], [73, 31, 6], [84, 66, 2], [91, 14, 4],
  ];

  return (
    <section className="universe section-pad" id="universo">
      <div className="universe-copy" data-reveal>
        <span className="kicker light">Capítulo 03 · nuestro universo</span>
        <h2>Cada punto<br />guarda <i>algo.</i></h2>
        <p>Tocá una estrella. Cada una abre una escena distinta de nosotros.</p>
      </div>
      <div className="star-field" data-reveal aria-label="Mapa interactivo de recuerdos">
        <div className="orbit orbit-a" />
        <div className="orbit orbit-b" />
        {stars.map(([x, y, memoryIndex], index) => (
          <button
            className={`star star-${index + 1}`}
            key={`${x}-${y}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onOpen(memoryIndex)}
            aria-label={`Abrir estrella ${index + 1}`}
          >
            <span />
          </button>
        ))}
        <div className="universe-center">A <span>♡</span> A</div>
      </div>
    </section>
  );
}

function Lightbox({ index, onClose, onStep }) {
  useEffect(() => {
    if (index === null) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onStep(1);
      if (event.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', handler);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.classList.remove('no-scroll');
    };
  }, [index, onClose, onStep]);

  if (index === null) return null;
  const memory = memories[index];

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Recuerdo ampliado" onMouseDown={onClose}>
      <div className="lightbox-inner" onMouseDown={(event) => event.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">×</button>
        <button className="lightbox-arrow left" onClick={() => onStep(-1)} aria-label="Anterior">←</button>
        <img src={memory.src} alt={memory.alt} />
        <button className="lightbox-arrow right" onClick={() => onStep(1)} aria-label="Siguiente">→</button>
        <div className="lightbox-caption">
          <span>{pad(index + 1)} / {pad(memories.length)}</span>
          <p>{memory.note}</p>
        </div>
      </div>
    </div>
  );
}

function SpecialDay() {
  const now = new Date();
  const isMonthly = now.getDate() === 8;
  const isAnniversary = isMonthly && now.getMonth() === 9;
  if (!isMonthly) return null;
  return (
    <div className={`special-day ${isAnniversary ? 'anniversary' : ''}`}>
      <span>{isAnniversary ? '✦ ANIVERSARIO ✦' : 'HOY ES 8'}</span>
      <p>{isAnniversary ? 'Otro año de nosotros. Y esta página también lo celebra.' : 'Un pequeño aniversario escondido dentro de un día normal.'}</p>
    </div>
  );
}

function Footer() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <footer className="footer section-pad">
      <p className="footer-mark">A <span>♡</span> A</p>
      <h2>Desde el 08.10.2025.<br /><i>Y contando.</i></h2>
      <p className="footer-small">Hecho para Ángeles, pensado para seguir creciendo.</p>
      {deferredPrompt && <button className="install-button" onClick={install}>Instalar en el celular</button>}
    </footer>
  );
}

export default function App() {
  useReveal();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [secretClicks, setSecretClicks] = useState(0);
  const [secretVisible, setSecretVisible] = useState(false);
  const [note, setNote] = useState(littleNotes[0]);

  const stepLightbox = (delta) => {
    setLightboxIndex((current) => {
      if (current === null) return null;
      return (current + delta + memories.length) % memories.length;
    });
  };

  const secretClick = () => {
    const next = secretClicks + 1;
    setSecretClicks(next);
    if (next >= 5) {
      setNote(littleNotes[Math.floor(Math.random() * littleNotes.length)]);
      setSecretVisible(true);
      setSecretClicks(0);
    }
  };

  return (
    <>
      <SpecialDay />
      <Hero onSecret={secretClick} />
      <main>
        <LiveCounter />
        <Story />
        <Gallery onOpen={setLightboxIndex} />
        <RandomMemory onOpen={setLightboxIndex} />
        <Universe onOpen={setLightboxIndex} />
      </main>
      <Footer />
      <Lightbox index={lightboxIndex} onClose={() => setLightboxIndex(null)} onStep={stepLightbox} />
      {secretVisible && (
        <div className="secret-message" role="status" onClick={() => setSecretVisible(false)}>
          <button aria-label="Cerrar mensaje">×</button>
          <span>Encontraste algo que no estaba a simple vista.</span>
          <strong>{note}</strong>
          <small>Tocá para cerrar.</small>
        </div>
      )}
    </>
  );
}
