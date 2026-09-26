import { cityById, countryById } from '../../content/countries';
import { currentMission, missionNumber, missions } from '../../game/missions';
import { formatMoney, options } from '../../game/simulation/engine';
import type { Choice } from '../../game/simulation/engine';
import type { Game } from '../../game/simulation/types';
import { drawEvent } from '../../game/events/catalog';
import { WorldScene } from './WorldScene';

function Meter({ name, value, icon, hue }: { name: string; value: number; icon: string; hue: string }) {
  return <div className="hud-meter"><span className="hud-icon" style={{ color: hue }}>{icon}</span><span className="hud-label">{name}<strong>{value}%</strong></span><div className="hud-track"><i style={{ width: `${value}%`, background: hue }}/></div></div>;
}

export function GameHome({ game, onAction, onEvent, onPlace, onMap, onGoals }: { game: Game; onAction: (choice: Choice) => void; onEvent: (id: string, label: string, index: number) => void; onPlace: (name: string) => void; onMap: () => void; onGoals: () => void }) {
  const country = countryById(game.countryId), city = cityById(country, game.cityId);
  const npc = game.npcs[0];
  const today = options(game);
  const rentIn = 7 - (game.day % 7);
  const event = drawEvent(game);
  const mission = currentMission(game);
  const decision = game.decisionHistory?.[0];
  const completed = game.completedMissions?.length ?? 0;

  return <div className="game-home">
    <div className="home-heading"><div><span className="eyebrow">MUNDO JUGABLE · NIVEL {game.level ?? 1}</span><h1>Salí y vivilo<span>.</span></h1><p>Día {game.day} · {city.districts[game.district]} · {String(game.hour).padStart(2, '0')}:00 · Reputación {game.reputation ?? 0}/100</p></div><span className="weather-badge">✺ <span>{game.hour >= 19 || game.hour < 7 ? 'Noche' : 'Día'}</span></span></div>
    <div className="status-hud" aria-label="Estado del personaje"><div className="hud-money"><span>◈ SALDO ACTUAL</span><strong>{formatMoney(game, game.money)}</strong></div><Meter name="ENERGÍA" value={game.energy} icon="ϟ" hue="#7edbc5"/><Meter name="ÁNIMO" value={game.mood} icon="✦" hue="#f1ba85"/><Meter name="COMIDA" value={game.food} icon="◕" hue="#df8f8b"/><div className="hud-rent"><span>⌂ ALQUILER</span><strong>{rentIn === 7 ? 'Hoy' : `${rentIn} días`}</strong></div></div>
    <div className="home-grid"><div className="home-main">
      <div className="panel-heading"><div><span className="eyebrow">CIUDAD EN TIEMPO REAL</span><h2>Mové a {game.name} por {city.name}</h2></div><button onClick={onMap}>MUNDO COMPLETO ↗</button></div>
      <WorldScene game={game} onPlace={onPlace} missionTarget={mission?.targetPlace}/>
      {event && !game.recentEvents.includes(event.id) && <section className="game-panel city-event"><span className="eyebrow">DECISIÓN · DIFICULTAD CRECIENTE</span><p>{event.text(game)}</p><div className="event-options">{event.choices.map((choice, i) => <button key={choice.label} onClick={() => onEvent(event.id, choice.label, i)}>{choice.label} ↗</button>)}</div></section>}
      {decision && <section className={`consequence-card consequence-${decision.impact}`}><span className="eyebrow">TU DECISIÓN DEJÓ HUELLA · DIFICULTAD {decision.difficulty}/5</span><strong>{decision.label}</strong><p>{decision.outcome}</p></section>}
    </div><div className="home-side">
      <section className="mission-card">
        <div className="mission-card-top"><div><span className="eyebrow">MISIÓN PRINCIPAL</span><strong>{mission ? `${missionNumber(game)}/${missions.length} · ${mission.title}` : 'CAPÍTULO COMPLETADO'}</strong></div><b>{completed}/{missions.length}</b></div>
        {mission ? <><p>{mission.description}</p><div className="mission-route"><span>◎</span><div><small>DESTINO</small><b>{mission.targetPlace}</b></div></div><div className="mission-reward">RECOMPENSA · {mission.rewardLabel}</div></> : <p>Completaste las misiones actuales. Seguí construyendo tu historia libremente.</p>}
      </section>
      <section className="social-decision"><div className="social-top"><span className="eyebrow">UN MENSAJE PARA VOS</span><span className="online"><i/> EN LÍNEA</span></div><div className="social-person"><span className="person-portrait">{npc.name[0]}</span><div><strong>{npc.name}</strong><small>Te escribió ahora · Cercanía {npc.friendship}/100</small></div></div><p className="chat-bubble">“¿Vamos a dar una vuelta por la plaza o preferís cenar algo por el centro?”</p><div className="decision-list"><button onClick={() => onAction({ id: `meet-${npc.id}`, label: `Ir a la plaza con ${npc.name}`, action: 'social', npcId: npc.id, hours: 2, energy: 8 })}><span>01</span> Ir a la plaza <b>↗</b></button><button onClick={() => onAction({ id: 'dinner', label: 'Cenar afuera', action: 'eat', hours: 1, cost: country.food })}><span>02</span> Cenar afuera <b>↗</b></button><button onClick={() => onAction({ id: 'stay', label: 'Quedarme en casa', action: 'rest', hours: 2 })}><span>03</span> Quedarme en casa <b>↗</b></button></div></section>
      <section className="game-panel agenda-panel"><div className="panel-heading"><div><span className="eyebrow">ACCIONES LIBRES</span><h2>Agenda de hoy</h2></div><span className="panel-hour">{String(game.hour).padStart(2, '0')}:00</span></div><div className="agenda-list">{today.slice(0, 4).map((choice, i) => <button key={choice.id} onClick={() => onAction(choice)}><span className="agenda-index">0{i + 1}</span><span>{choice.label}<small>{choice.hours} h {choice.cost ? `· ${formatMoney(game, choice.cost)}` : ''}</small></span><b>↗</b></button>)}</div></section>
      <button className="game-panel goal-preview" onClick={onGoals}><span className="eyebrow">EL FUTURO SE CONSTRUYE</span><strong>{game.goal}</strong><span>Tu objetivo a largo plazo <b>↗</b></span></button>
      <button className="mini-neighborhood" onClick={onMap}><span className="eyebrow">MI BARRIO</span><strong>{city.districts[game.district]}</strong><span>Explorá {city.districts.length} barrios ↗</span><div className="mini-streets"><i/><i/><i/></div></button>
    </div></div>
  </div>;
}
