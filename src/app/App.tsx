import { useEffect, useRef, useState } from 'react';
import { countries, cityById, countryById } from '../content/countries';
import { currentMission } from '../game/missions';
import { advance, careers, createGame, formatMoney, furniture, goals, options, resolveDecision } from '../game/simulation/engine';
import type { Choice } from '../game/simulation/engine';
import type { Mode } from '../game/simulation/types';
import { useGame } from './store';
import { exportGame, importGame, saveGame } from '../storage/save';
import { GameHome } from '../ui/game/GameHome';
import { WorldScene } from '../ui/game/WorldScene';
import { App as NativeApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type Tab = 'Inicio' | 'Mapa' | 'Trabajo' | 'Social' | 'Objetivos';
const tabs: { name: Tab; icon: string }[] = [{ name: 'Inicio', icon: '⌂' }, { name: 'Mapa', icon: '◫' }, { name: 'Trabajo', icon: '▣' }, { name: 'Social', icon: '♧' }, { name: 'Objetivos', icon: '◎' }];
const tap = () => void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function App() {
  const { game, start, decide, replace, setGoal, setCareer } = useGame();
  const [tab, setTab] = useState<Tab>('Inicio');
  const [place, setPlace] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [work, setWork] = useState<Choice | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = NativeApp.addListener('backButton', () => { if (place) setPlace(null); else if (settings) setSettings(false); else setTab('Inicio'); });
    return () => { void listener.then(l => l.remove()); };
  }, [place, settings]);
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden' && game) saveGame(game); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [game]);

  if (!game) return <Setup onStart={start} onImport={() => file.current?.click()} file={file} onFile={async f => { try { replace(await importGame(f)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Archivo inválido'); } }} message={message} />;

  const country = countryById(game.countryId);
  const city = cityById(country, game.cityId);
  const mission = currentMission(game);

  const action = (choice: Choice) => {
    tap();
    if (choice.action === 'work' && choice.performance === undefined) {
      setPlace(null);
      setWork(choice);
    } else decide(choice);
  };
  const placeAction = (name: string) => { tap(); setPlace(name); };
  const buy = (item: string) => action({ id: `buy-${item}`, label: item, action: 'shop', item, cost: Math.round(country.salaries * (item === 'Computadora' ? .8 : .36)), hours: 1 });
  const resolveEvent = (id: string, label: string, index: number) => { tap(); replace(resolveDecision(game, id, label, index)); };

  const changeCity = (nextCityId: string) => {
    if (nextCityId === game.cityId) return;
    const destination = country.cities.find(item => item.id === nextCityId);
    if (!destination) return;
    const cost = Math.max(country.transport * 7, Math.round(country.salaries * .12));
    if (game.money < cost) { setMessage(`Necesitás ${formatMoney(game, cost)} para viajar a ${destination.name}.`); return; }
    const moved = advance({
      ...game,
      cityId: destination.id,
      district: 0,
      money: game.money - cost,
      journal: [{ day: game.day, text: `Viajaste de ${city.name} a ${destination.name}. El cambio de ciudad abre nuevas rutas y personas.`, kind: 'story' }, ...game.journal].slice(0, 80),
    }, 5);
    replace(moved);
    setMessage(`Llegaste a ${destination.name}.`);
  };

  const localActions = (name: string): Choice[] => {
    const n = normalized(name);
    const base = options(game);
    if (n.includes('casa') || n.includes('home')) return base.filter(choice => ['rest','eat','study'].includes(choice.action));
    if (n.includes('trabajo') || n.includes('work')) return [
      ...base.filter(choice => ['work','job'].includes(choice.action)),
      { id: 'freelance', label: 'Tomar un encargo independiente', action: 'freelance', hours: 3, energy: 16 },
    ];
    if (n.includes('instituto') || n.includes('college')) return base.filter(choice => choice.action === 'study');
    if (n.includes('super') || n.includes('tienda') || n.includes('market')) return base.filter(choice => choice.action === 'eat');
    if (n.includes('hospital')) return [{ id: 'recover', label: 'Recuperarte', action: 'rest', hours: 3 }];
    if (n.includes('gimnasio')) return [{ id: 'gym', label: 'Entrenar y despejarte', action: 'rest', hours: 2, energy: 4 }];
    if (n.includes('cafe') || n.includes('bar')) return base.filter(choice => ['social','eat'].includes(choice.action));
    return base.filter(choice => choice.action === 'social');
  };

  return <main className="app-shell">
    <header className="topbar"><div className="brand">VIDA<span className="brand-dot">.</span></div><button className="location-pill" onClick={() => setTab('Mapa')}>⌖ <span>{country.name} · {city.name}</span> ▾</button><div className="clock-pill">☀ <span>Día {game.day} · {String(game.hour).padStart(2, '0')}:00<small>{city.districts[game.district]}</small></span></div><button className="icon-button" onClick={() => setSettings(true)} aria-label="Opciones">⚙</button></header>
    <div className="scroll-area" key={tab}>
      {tab === 'Inicio' && <GameHome game={game} onAction={action} onEvent={resolveEvent} onPlace={placeAction} onMap={() => setTab('Mapa')} onGoals={() => setTab('Objetivos')}/>}
      {tab === 'Mapa' && <div className="map-page">
        <div className="page-heading"><span className="eyebrow">MUNDO JUGABLE · {city.name.toUpperCase()}</span><h1>Ahora se recorre.</h1><p>Tocá una calle para caminar o usá los controles. Los edificios no abren menús desde lejos: tenés que llegar hasta ellos y entrar.</p></div>
        <WorldScene game={game} onPlace={placeAction} missionTarget={mission?.targetPlace}/>
        {message && <p className="inline-notice" role="status">{message}</p>}
        <div className="section-heading"><h2>Barrios</h2><span>CAMBIÁ DESDE LA PARADA</span></div>
        <div className="districts district-readonly">{city.districts.map((district, i) => <article key={district} className={game.district === i ? 'selected' : ''}><span className="district-index">0{i + 1}</span><span><b>{district}</b><small>{i === game.district ? 'ESTÁS ACÁ' : `${formatMoney(game, country.transport)} · 1 HORA`}</small></span></article>)}</div>
        <div className="section-heading"><h2>Otras ciudades</h2><span>VIAJE · 5 HORAS</span></div>
        <div className="city-travel-grid">{country.cities.map(item => <button key={item.id} className={item.id === game.cityId ? 'selected' : ''} disabled={item.id === game.cityId} onClick={() => changeCity(item.id)}><span>◈</span><div><strong>{item.name}</strong><small>{item.id === game.cityId ? 'CIUDAD ACTUAL' : `VIAJAR · ${formatMoney(game, Math.max(country.transport * 7, Math.round(country.salaries * .12)))}`}</small></div><b>↗</b></button>)}</div>
      </div>}
      {tab === 'Trabajo' && <><div className="page-heading"><h1>Tu camino</h1><p>Las oportunidades se construyen con práctica, formación y decisiones. A medida que subís de nivel, trabajar y estudiar exige más energía.</p></div><div className="feature-card"><span className="eyebrow">PROFESIÓN ACTUAL · NIVEL {game.level ?? 1}</span><h2>{game.career}</h2><p>{game.employed ? 'Tenés empleo. Tu experiencia abre nuevas puertas.' : 'Estás buscando un puesto. Mejorar tus habilidades ayuda.'}</p><div className="stat-row"><span>Experiencia <b>{game.experience} turnos</b></span><span>Formación <b>{game.skill}/100</b></span><span>Reputación <b>{game.reputation ?? 0}/100</b></span></div></div><div className="section-heading"><h2>Dar el próximo paso</h2></div><div className="actions">{options(game).slice(0, 2).map(choice => <button className="action-card" key={choice.id} onClick={() => action(choice)}><span className="action-icon">✦</span><span>{choice.label}<small>{choice.hours} horas</small></span><b>→</b></button>)}<button className="action-card" onClick={() => action({ id: 'freelance', label: 'Encargo', action: 'freelance', hours: 3, energy: 16 })}><span className="action-icon">↗</span><span>Hacer un encargo<small>3 horas · ingreso extra</small></span><b>→</b></button></div><div className="section-heading"><h2>Explorar profesiones</h2></div><div className="chips">{careers.map(career => <button key={career} className={game.career === career ? 'active' : ''} onClick={() => setCareer(career)}>{career}</button>)}</div></>}
      {tab === 'Social' && <><div className="page-heading"><h1>Las personas</h1><p>Las relaciones recuerdan lo que hacés. Tus decisiones pueden abrir favores, conflictos y oportunidades días después.</p></div><div className="npc-list">{game.npcs.map(npc => <article className="npc-card" key={npc.id}><div className="npc-avatar">{npc.name[0]}</div><div className="npc-content"><div className="npc-title"><strong>{npc.name}</strong><span>{npc.profession}</span></div><p>{npc.traits.join(' · ')} · Suele estar en {npc.location.toLowerCase()}.</p><div className="relationship">Cercanía <span>{npc.friendship}/100</span><i style={{ width: `${npc.friendship}%` }}/></div>{npc.memories.length > 0 && <small>Recuerda: {npc.memories.at(-1)}</small>}<button onClick={() => action({ id: `meet-${npc.id}`, label: `Ver a ${npc.name}`, action: 'social', npcId: npc.id, hours: 2, energy: 8 })}>Pasar tiempo juntos →</button></div></article>)}</div></>}
      {tab === 'Objetivos' && <><div className="page-heading"><h1>A tu manera</h1><p>No existe una única vida correcta. Elegí algo que hoy te importe.</p></div><div className="feature-card goal-card"><span className="eyebrow">TU OBJETIVO · NIVEL {game.level ?? 1}</span><h2>{game.goal}</h2><p>Día {game.day} · {game.mode === '30-dias' ? 'Desafío de 30 días' : 'A tu propio ritmo'} · Misiones {game.completedMissions?.length ?? 0}</p></div><div className="goal-list">{goals.map(goal => <button key={goal} className={game.goal === goal ? 'chosen' : ''} onClick={() => setGoal(goal)}><span>{goal}</span><b>{game.goal === goal ? '✓' : '○'}</b></button>)}</div><div className="section-heading"><h2>Tu patrimonio</h2></div><div className="finance-grid"><div><span>EFECTIVO</span><strong>{formatMoney(game, game.money)}</strong></div><div><span>DEUDA</span><strong>{formatMoney(game, game.debt)}</strong></div><div><span>HOGAR</span><strong>{['Habitación', 'Monoambiente', 'Departamento'][game.home]}</strong></div></div>{game.debt > 0 && <button className="primary-button" onClick={() => action({ id: 'repay', label: 'Pagar deuda', action: 'repay', cost: Math.min(game.debt, game.money), hours: 1 })}>Pagar deuda</button>}<div className="section-heading"><h2>Tu casa</h2></div><p className="muted">{game.furniture.join(' · ')}</p><div className="chips">{furniture.filter(item => !game.furniture.includes(item)).map(item => <button key={item} onClick={() => buy(item)}>{item} · {formatMoney(game, Math.round(country.salaries * (item === 'Computadora' ? .8 : .36)))}</button>)}</div>{game.home < 2 && <button className="secondary-button" onClick={() => action({ id: 'move', label: 'Mudarse', action: 'move', cost: country.rent * 2, hours: 4, energy: 12 })}>Mudarse · {formatMoney(game, country.rent * 2)}</button>}</>}
    </div>
    <nav className="bottom-nav" aria-label="Navegación principal">{tabs.map(item => <button key={item.name} className={tab === item.name ? 'active' : ''} onClick={() => { tap(); setTab(item.name); setPlace(null); }}><span>{item.icon}</span><small>{item.name}</small></button>)}</nav>
    {place && <div className="scrim" onClick={() => setPlace(null)}><div className="sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><span className="eyebrow">LLEGASTE CAMINANDO · {city.name.toUpperCase()}</span><h2>{place}</h2><p>Elegí qué hacer. El tiempo, la energía, el dinero y tus vínculos cambian con cada acción.</p>{normalized(place).includes('parada') ? <div className="actions">{city.districts.map((district, i) => <button className="action-card" key={district} disabled={i === game.district} onClick={() => { action({ id: `travel-${i}`, label: `Viajar a ${district}`, action: 'travel', district: i, cost: i === game.district ? 0 : country.transport, hours: i === game.district ? 0 : 1, energy: i === game.district ? 0 : 4 }); setPlace(null); }}><span className="action-icon">◫</span><span>{district}<small>{i === game.district ? 'Estás acá' : `${formatMoney(game, country.transport)} · 1 hora`}</small></span><b>→</b></button>)}</div> : <div className="actions">{localActions(place).map(choice => <button className="action-card" key={choice.id} onClick={() => { action(choice); setPlace(null); }}><span className="action-icon">✦</span><span>{choice.label}<small>{choice.hours ?? 1} h {choice.cost ? `· ${formatMoney(game, choice.cost)}` : ''}</small></span><b>→</b></button>)}</div>}<button className="text-button" onClick={() => setPlace(null)}>Volver al espacio</button></div></div>}
    {work && <WorkChallenge key={`${game.day}-${game.hour}`} career={game.career} onFinish={score => { decide({ ...work, performance: score }); setWork(null); }} onCancel={() => setWork(null)}/>}
    {settings && <div className="scrim" onClick={() => setSettings(false)}><div className="sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><span className="eyebrow">TU PARTIDA</span><h2>Opciones</h2><p>La partida se guarda automáticamente en este dispositivo.</p><button className="secondary-button" onClick={() => { saveGame(game); setMessage('Partida guardada.'); }}>Guardar ahora</button><button className="secondary-button" onClick={() => exportGame(game)}>Exportar partida</button><button className="secondary-button" onClick={() => file.current?.click()}>Importar partida</button><input ref={file} type="file" accept="application/json,.json" hidden onChange={async e => { const f = e.target.files?.[0]; if (f) try { replace(await importGame(f)); setSettings(false); } catch (error) { setMessage(error instanceof Error ? error.message : 'Archivo inválido'); } e.target.value = ''; }}/>{message && <p role="status">{message}</p>}<button className="text-button" onClick={() => setSettings(false)}>Cerrar</button></div></div>}
  </main>;
}

function WorkChallenge({ career, onFinish, onCancel }: { career: string; onFinish: (score: number) => void; onCancel: () => void }) {
  const [position, setPosition] = useState(0);
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const loop = (time: number) => { if (time - last > 25) { setPosition((Math.sin(time / 470) + 1) / 2); last = time; } frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  const hit = () => {
    tap();
    const score = Math.max(0, 1 - Math.abs(position - [0.42, 0.63, 0.5][round]) * 2.4);
    if (round === 2) onFinish((scores.reduce((sum, n) => sum + n, 0) + score) / 3);
    else { setScores([...scores, score]); setRound(round + 1); }
  };
  return <div className="scrim"><div className="sheet work-sheet"><div className="sheet-handle"/><span className="eyebrow">TURNO EN {career.toUpperCase()} · {round + 1}/3</span><h2>Encontrá el momento.</h2><p>Detené el marcador dentro de la zona verde. Tres tareas breves definen cómo sale tu turno.</p><div className="timing-track"><div className="timing-target" style={{ left: `${[42, 63, 50][round]}%` }}/><div className="timing-marker" style={{ left: `${position * 100}%` }}/></div><button className="primary-button" onClick={hit}>Resolver tarea</button><button className="text-button" onClick={onCancel}>Volver</button></div></div>;
}

function Setup({ onStart, onImport, file, onFile, message }: { onStart: (game: ReturnType<typeof createGame>) => void; onImport: () => void; file: React.RefObject<HTMLInputElement | null>; onFile: (file: File) => void; message: string }) {
  const [name, setName] = useState('');
  const [countryId, setCountryId] = useState('ar');
  const [cityId, setCityId] = useState('san-juan');
  const [mode, setMode] = useState<Mode>('vida');
  const country = countryById(countryId);
  return <main className="setup"><div className="setup-art"><div className="setup-sun"/><div className="setup-mountain a"/><div className="setup-mountain b"/><div className="setup-building one"/><div className="setup-building two"/><div className="setup-building three"/><span>VIDA<span>.</span></span><small>TU VIDA. TU CIUDAD. TUS DECISIONES.</small></div><div className="setup-form"><span className="eyebrow">COMENZÁ TU HISTORIA</span><h1>Todo empieza<br/>con una decisión.</h1><label>¿Cómo te llamás?<input value={name} maxLength={24} placeholder="Tu nombre" onChange={e => setName(e.target.value)} /></label><div className="setup-row"><label>País<select value={countryId} onChange={e => { const c = countryById(e.target.value); setCountryId(c.id); setCityId(c.cities[0].id); }}>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Ciudad<select value={cityId} onChange={e => setCityId(e.target.value)}>{country.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><div className="mode-selector"><span>MODO DE JUEGO</span><button className={mode === 'vida' ? 'selected' : ''} onClick={() => setMode('vida')}>VIDA <small>Sin límites. Tu historia.</small></button><button className={mode === '30-dias' ? 'selected' : ''} onClick={() => setMode('30-dias')}>30 DÍAS <small>Un objetivo, poco tiempo.</small></button><button className={mode === 'diario' ? 'selected' : ''} onClick={() => setMode('diario')}>DESAFÍO DIARIO <small>La misma semilla para todos hoy.</small></button></div><button className="primary-button" onClick={() => onStart(createGame(name, countryId, cityId, mode, mode === 'diario' ? Number(new Date().toISOString().slice(0, 10).replaceAll('-', '')) : Date.now()))}>Empezar mi vida <span>→</span></button><button className="text-button" onClick={onImport}>Importar partida</button><input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}/>{message && <p role="alert">{message}</p>}<p className="disclaimer">Economías ficticias para el juego · Disponible sin conexión</p></div></main>;
}
