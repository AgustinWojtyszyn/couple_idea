import type { Game } from '../../game/simulation/types';

type Props = { game: Game; onPlace: (place: string) => void; compact?: boolean };

const hotspots = [
  { name: 'Casa', title: 'MI CASA', x: 23, y: 43, tone: 'mint' },
  { name: 'Plaza', title: 'PLAZA 25 DE MAYO', x: 51, y: 67, tone: 'mint' },
  { name: 'Café', title: 'CAFETERÍA', x: 78, y: 37, tone: 'amber' },
  { name: 'Supermercado', title: 'SUPER', x: 80, y: 76, tone: 'coral' },
  { name: 'Parada', title: 'COLECTIVO', x: 25, y: 81, tone: 'blue' },
  { name: 'Gimnasio', title: 'GIMNASIO', x: 57, y: 24, tone: 'amber' },
];

export function CityIllustration({ game, onPlace, compact = false }: Props) {
  const isSanJuan = game.cityId === 'san-juan';
  return <div className={`city-art ${compact ? 'city-art-compact' : ''}`}>
    <img className="city-image" src="/art/city-san-juan.webp" alt="Ciudad de San Juan al atardecer: plaza, cafés, calles y colectivos" />
    <div className="city-vignette"/>
    <div className="scene-caption"><span className="live-dot"/> {isSanJuan ? 'SAN JUAN' : game.cityId.replaceAll('-', ' ').toUpperCase()} <span>·</span> {game.hour >= 19 || game.hour < 7 ? 'NOCHE' : 'ATARDECER'}</div>
    {hotspots.map(point => <button key={point.name} className={`scene-pin pin-${point.tone}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} onClick={() => onPlace(point.name)} aria-label={`Visitar ${point.title}`}><span className="pin-pulse"/><b>{point.title}</b></button>)}
    <div className="scene-bottom">UNA CIUDAD DE POSIBILIDADES <span>↗ EXPLORÁ</span></div>
  </div>;
}
