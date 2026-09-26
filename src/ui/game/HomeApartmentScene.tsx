import type { Game } from '../../game/simulation/types';

export function HomeApartmentScene({ game, onEnter }: { game: Game; onEnter: () => void }) {
  return <button className="apartment-card" onClick={onEnter} aria-label="Entrar a mi casa">
    <div className="apartment-copy"><span className="eyebrow">TU REFUGIO · NIVEL {game.home + 1}</span><strong>Mi casa</strong><small>{['Habitación', 'Monoambiente', 'Departamento'][game.home]} · {game.furniture.length} objetos</small></div>
    <img className="apartment-image" src="/art/apartment.webp" alt="Tu departamento con cama, escritorio, sillón y personaje" />
    <span className="apartment-enter">ENTRAR ↗</span>
  </button>;
}
