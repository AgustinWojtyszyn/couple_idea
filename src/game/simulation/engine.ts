import { cityById, countryById } from '../../content/countries';
import { currentMission } from '../missions';
import type { DecisionRecord, Entry, Game, Mode, NPC } from './types';

export type Action = 'work' | 'study' | 'rest' | 'eat' | 'social' | 'travel' | 'shop' | 'move' | 'repay' | 'job' | 'freelance';
export type Choice = { id: string; label: string; action: Action; cost?: number; energy?: number; hours?: number; npcId?: string; district?: number; item?: string; performance?: number };
export const goals = ['Independizarme', 'Pagar mis deudas', 'Conseguir un buen empleo', 'Ahorrar', 'Hacer amistades', 'Construir mi hogar'];
export const careers = ['Comercio', 'Administración', 'Programación', 'Diseño', 'Gastronomía', 'Salud', 'Mecánica', 'Logística'];
export const furniture = ['Escritorio', 'Computadora', 'Cocina', 'Planta', 'Sillón', 'Cama cómoda'];
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
export const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; };
const log = (game: Game, text: string, kind: Entry['kind'] = 'story'): Game => ({ ...game, journal: [{ day: game.day, text, kind }, ...game.journal].slice(0, 80) });

export function createGame(name: string, countryId: string, cityId: string, mode: Mode = 'vida', seed = Date.now()): Game {
  const country = countryById(countryId), city = cityById(country, cityId), roll = rng(seed);
  const npcs: NPC[] = country.names.slice(0, 4).map((person, i) => ({ id: `npc-${i}`, name: person, profession: careers[(i * 2 + 1) % careers.length], location: city.landmarks[(i + 2) % city.landmarks.length], traits: ([['creativo', 'aventurero'], ['tranquilo', 'familiar'], ['ambicioso', 'ahorrador'], ['creativo', 'tranquilo']] as NPC['traits'][])[i], money: Math.round(country.salaries * (0.5 + roll())), friendship: 10 + i * 3, trust: 8, attraction: 0, conflict: 0, memories: [], goal: goals[(i + 2) % goals.length], connections: i ? [`npc-${i - 1}`] : [] }));
  return { version: 1, seed, name: name.trim().slice(0, 24) || 'Alex', countryId: country.id, cityId: city.id, mode, day: 1, hour: 8, money: Math.round(country.salaries * (mode === '30-dias' ? 0.45 : 0.8)), debt: mode === '30-dias' ? country.rent : 0, energy: 82, mood: 68, food: 76, skill: 5, career: 'Comercio', experience: 0, employed: true, district: 0, home: 0, furniture: ['Cama'], npcs, threads: [], journal: [{ day: 1, text: `Llegaste a ${city.name}. Una habitación, algunas posibilidades y una ciudad por descubrir.`, kind: 'story' }], recentEvents: [], goal: mode === '30-dias' ? 'Pagar mis deudas' : 'Independizarme', finished: false, level: 1, reputation: 0, completedMissions: [], decisionHistory: [] };
}

export function advance(game: Game, hours: number): Game {
  let next = { ...game, hour: game.hour + hours };
  while (next.hour >= 24) {
    next = { ...next, hour: next.hour - 24, day: next.day + 1, energy: clamp(next.energy + (next.furniture.includes('Cama cómoda') ? 52 : 38)), food: clamp(next.food - 19), mood: clamp(next.mood - (next.food < 20 ? 9 : 1)) };
    const country = countryById(next.countryId);
    if (next.day % 7 === 0) { const rent = Math.round(country.rent * (1 + next.home * 0.55)); next = log({ ...next, money: next.money - rent }, `Pagaste el alquiler semanal: ${formatMoney(next, rent)}.`, 'money'); }
    next = resolveThreads(next);
    if (next.money < 0) { next = log({ ...next, debt: next.debt - next.money, money: 0 }, 'Tu saldo no alcanzó. La diferencia se convirtió en deuda.', 'money'); }
    if (next.mode === '30-dias' && next.day > 30) next = log({ ...next, finished: true }, `Terminó el desafío: ${next.goal}. Patrimonio: ${formatMoney(next, next.money - next.debt)}.`);
  }
  return next;
}

function resolveThreads(game: Game): Game {
  let next = game;
  for (const thread of game.threads.filter(t => !t.resolved && t.dueDay <= game.day)) {
    if (thread.id === 'helped-friend') {
      const npc = next.npcs.find(n => n.id === thread.npcId);
      if (npc) next = log({ ...next, money: next.money + Math.round(countryById(next.countryId).salaries * 0.16), npcs: next.npcs.map(n => n.id === npc.id ? { ...n, trust: clamp(n.trust + 17), memories: [...n.memories, 'Devolvió el favor cuando lo necesitabas'] } : n) }, `${npc.name} recordó aquella ayuda y te recomendó para un trabajo breve. Te pagaron por hacerlo.`, 'social');
    }
    if (thread.id === 'study-return') next = log({ ...next, skill: clamp(next.skill + 4) }, 'Lo que estudiaste hace unas semanas te sirvió para resolver un problema en el trabajo.');
    next = { ...next, threads: next.threads.map(t => t === thread ? { ...t, resolved: true } : t) };
  }
  return next;
}

export function formatMoney(game: Game, amount: number): string { const country = countryById(game.countryId); return new Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currency, maximumFractionDigits: 0 }).format(amount); }

export function options(game: Game): Choice[] {
  const c = countryById(game.countryId), npc = game.npcs[game.day % game.npcs.length];
  const level = game.level ?? 1;
  const pressure = Math.min(12, Math.floor(level / 2) * 2);
  return [
    { id: 'work', label: game.employed ? 'Ir a trabajar' : 'Buscar empleo', action: game.employed ? 'work' : 'job', hours: 6, energy: 24 + pressure },
    { id: 'study', label: 'Estudiar', action: 'study', hours: 3, energy: 16 + Math.floor(pressure / 2), cost: Math.round(c.food * (.2 + level * .01)) },
    { id: 'social', label: `Ver a ${npc.name}`, action: 'social', hours: 2, energy: 8, npcId: npc.id },
    { id: 'eat', label: 'Comer', action: 'eat', hours: 1, cost: Math.round(c.food * (game.furniture.includes('Cocina') ? .42 : 1)) },
    { id: 'rest', label: 'Descansar', action: 'rest', hours: 2 },
  ];
}

function missionSatisfied(id: string, choice: Choice): boolean {
  if (id === 'first-shift') return choice.action === 'work';
  if (id === 'level-up') return choice.action === 'study';
  if (id === 'make-connection') return choice.action === 'social';
  if (id === 'take-care') return choice.action === 'eat';
  if (id === 'change-air') return choice.action === 'travel';
  if (id === 'build-future') return choice.action === 'freelance';
  return false;
}

function applyMission(game: Game, choice: Choice): Game {
  const mission = currentMission(game);
  if (!mission || !missionSatisfied(mission.id, choice)) return game;
  const done = game.completedMissions ?? [];
  if (done.includes(mission.id)) return game;
  const country = countryById(game.countryId);
  const reward = Math.round(country.salaries * (.035 + done.length * .008));
  const completed = [...done, mission.id];
  return log({
    ...game,
    money: game.money + reward,
    reputation: clamp((game.reputation ?? 0) + 8 + done.length * 2),
    level: 1 + completed.length,
    completedMissions: completed,
  }, `MISIÓN COMPLETADA · ${mission.title}. Ganaste ${formatMoney(game, reward)} y tu reputación subió.`);
}

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
};

export function resolveDecision(game: Game, id: string, label: string, index: number): Game {
  if (game.finished) return game;
  const country = countryById(game.countryId);
  const level = game.level ?? 1;
  const difficulty = Math.min(5, 1 + Math.floor((level - 1) / 2) + Math.floor((game.day - 1) / 12));
  const roll = rng((game.seed ^ hashText(id) ^ (game.day * 2654435761)) >>> 0)();
  let next = { ...game };
  let outcome = '';
  let impact: DecisionRecord['impact'] = 'mixto';

  if (index === 0) {
    const success = roll > .32 + difficulty * .085;
    const amount = Math.round(country.salaries * (.025 + difficulty * .012));
    if (success) {
      next = { ...next, money: next.money + amount, mood: clamp(next.mood + 5), reputation: clamp((next.reputation ?? 0) + 3 + difficulty) };
      outcome = `Te la jugaste y salió bien: ganaste ${formatMoney(next, amount)} y reputación.`;
      impact = 'positivo';
    } else {
      next = { ...next, money: Math.max(0, next.money - amount), energy: clamp(next.energy - 5 - difficulty * 2), mood: clamp(next.mood - 4 - difficulty) };
      outcome = `La decisión tuvo costo: perdiste ${formatMoney(next, amount)} y energía.`;
      impact = 'negativo';
    }
  } else if (index === 1) {
    const cost = Math.round(country.food * (.25 + difficulty * .08));
    next = { ...next, money: Math.max(0, next.money - cost), mood: clamp(next.mood + 2), reputation: clamp((next.reputation ?? 0) + 1) };
    outcome = `Elegiste el camino seguro: gastaste ${formatMoney(next, cost)}, evitaste el riesgo y ganaste algo de reputación.`;
  } else {
    const npc = next.npcs[(game.day + index) % next.npcs.length];
    next = { ...next, energy: clamp(next.energy - 4), mood: clamp(next.mood + 5), npcs: next.npcs.map(n => n.id === npc.id ? { ...n, friendship: clamp(n.friendship + 5 + difficulty), trust: clamp(n.trust + 2) } : n) };
    outcome = `Priorizaste el vínculo con ${npc.name}. La relación cambió y eso puede volver más adelante.`;
    impact = 'positivo';
  }

  const record: DecisionRecord = { id, label, day: game.day, difficulty, outcome, impact };
  next = {
    ...next,
    recentEvents: [id, ...next.recentEvents.filter(eventId => eventId !== id)].slice(0, 25),
    decisionHistory: [record, ...(next.decisionHistory ?? [])].slice(0, 30),
  };
  return advance(log(next, `Decisión: ${label}. ${outcome}`, impact === 'negativo' ? 'money' : 'story'), 1);
}

export function act(game: Game, choice: Choice): Game {
  if (game.finished) return game;
  const country = countryById(game.countryId);
  if ((choice.cost ?? 0) > game.money) return log(game, 'No te alcanza el dinero para hacerlo.', 'money');
  if ((choice.energy ?? 0) > game.energy) return log(game, 'Estás demasiado cansado. Necesitás descansar.');
  let next: Game = { ...game, money: game.money - (choice.cost ?? 0), energy: clamp(game.energy - (choice.energy ?? 0)) };
  switch (choice.action) {
    case 'work': {
      const difficultyPenalty = Math.min(.08, ((game.level ?? 1) - 1) * .01);
      const wage = Math.round(country.salaries * (0.17 + Math.min(next.skill, 70) / 350 - difficultyPenalty) * (choice.performance === undefined ? 1 : 0.85 + choice.performance * .3));
      next = log({ ...next, money: next.money + wage, experience: next.experience + 1, mood: clamp(next.mood - 5 + (choice.performance ?? 0) * 4) }, `Cumpliste tu turno en ${next.career}. Cobraste ${formatMoney(next, wage)}.`, 'money');
      if (next.experience % 12 === 0) next = log({ ...next, skill: clamp(next.skill + 5) }, 'Tu experiencia empieza a abrirte nuevas oportunidades.');
      break;
    }
    case 'job': next = log({ ...next, employed: next.skill >= 8, mood: clamp(next.mood + 3) }, next.skill >= 8 ? `Conseguiste un puesto en ${next.career}.` : 'Entregaste solicitudes. Te pidieron más formación.'); break;
    case 'study': next = log({ ...next, skill: clamp(next.skill + 3), threads: [...next.threads, { id: 'study-return', createdDay: next.day, dueDay: next.day + 9, resolved: false }] }, 'Avanzaste en tu formación. Quizás esto sirva más adelante.'); break;
    case 'social': {
      const npc = next.npcs.find(n => n.id === choice.npcId) ?? next.npcs[0];
      const help = next.day % 3 === 2 && !npc.memories.includes('Recibió ayuda económica');
      const gift = help ? Math.round(country.food * 1.5) : 0;
      if (gift > next.money) return log(game, 'Querías ayudar, pero hoy no te alcanza.', 'money');
      next = log({ ...next, money: next.money - gift, mood: clamp(next.mood + 9), npcs: next.npcs.map(n => n.id === npc.id ? { ...n, friendship: clamp(n.friendship + 11), trust: clamp(n.trust + (help ? 14 : 4)), memories: help ? [...n.memories, 'Recibió ayuda económica'] : n.memories } : n), threads: help ? [...next.threads, { id: 'helped-friend', npcId: npc.id, createdDay: next.day, dueDay: next.day + 8, resolved: false }] : next.threads }, help ? `${npc.name} tuvo un problema inesperado. Le prestaste ${formatMoney(next, gift)}. Te lo agradeció de verdad.` : `Pasaste un rato con ${npc.name}. Hablaron de sus planes y la relación se hizo más cercana.`, 'social');
      break;
    }
    case 'eat': next = log({ ...next, food: clamp(next.food + 39), mood: clamp(next.mood + 3) }, 'Comiste y recuperaste fuerzas.'); break;
    case 'rest': next = log({ ...next, energy: clamp(next.energy + 32), mood: clamp(next.mood + 4) }, 'Una pausa en casa te hizo bien.'); break;
    case 'travel': next = log({ ...next, district: choice.district ?? 0 }, `Llegaste a ${cityById(country, next.cityId).districts[choice.district ?? 0]}.`); break;
    case 'shop': if (choice.item && !next.furniture.includes(choice.item)) next = log({ ...next, furniture: [...next.furniture, choice.item] }, `Compraste ${choice.item}. Tu casa empieza a contar otra historia.`, 'money'); break;
    case 'move': next = log({ ...next, home: Math.min(2, next.home + 1), mood: clamp(next.mood + 18) }, 'Te mudaste. Hay más espacio para la vida que estás construyendo.'); break;
    case 'repay': next = log({ ...next, debt: Math.max(0, next.debt - (choice.cost ?? 0)) }, 'Pagaste una parte de tu deuda.', 'money'); break;
    case 'freelance': next = log({ ...next, money: next.money + Math.round(country.salaries * .1) }, 'Terminaste un encargo independiente.', 'money'); break;
  }
  next = applyMission(next, choice);
  return advance(next, choice.hours ?? 1);
}
