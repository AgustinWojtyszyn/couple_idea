import { verifiedLeagueSeeds } from '../data/verifiedLeagues'
export type Position = '9' | '10' | '7' | '5' | '2' | '1'
export type PlayerMode = 'classic' | 'daily'
export type GameMode = 'player' | 'coach'
export type Theme = 'dark' | 'light'
export type Tab = 'career' | 'market' | 'training' | 'history' | 'minigames' | 'ranking' | 'squad'
export type MiniGameId = 'penalties' | 'freekicks' | 'passing' | 'keeper' | 'duel' | 'scouting'

export type League = { id:string; name:string; country:string; tier:number; color:string }
export type Club = {
  id:string; leagueId:string; name:string; short:string; country:string;
  prestige:number; salary:number; minOverall:number; primary:string; secondary:string
}

export type SeasonRecord = {
  season:number; age:number; clubId:string; matches:number; goals:number; assists:number;
  titles:number; rating:number; score:number; note:string
}

export type Effects = Partial<Record<
  'overall'|'form'|'energy'|'reputation'|'fans'|'coachTrust'|'money'|
  'discipline'|'leadership'|'morale'|'injuryRisk',
  number
>>

export type EventOption = { id:string; label:string; description:string; effects:Effects }
export type CareerEvent = {
  id:string
  category:'football'|'life'|'media'|'health'|'contract'|'locker'
  eyebrow:string
  title:string
  body:string
  positions?:Position[]
  minSeason?:number
  options:EventOption[]
}

export type CareerState = {
  version:2
  gameMode:'player'
  mode:PlayerMode
  seed:number
  playerName:string
  nationality:string
  position:Position
  age:number
  season:number
  maxSeasons:number
  clubId:string
  overall:number
  form:number
  energy:number
  reputation:number
  fans:number
  coachTrust:number
  discipline:number
  leadership:number
  morale:number
  injuryRisk:number
  money:number
  matches:number
  goals:number
  assists:number
  titles:number
  caps:number
  nationalGoals:number
  trainingCredits:number
  history:SeasonRecord[]
  achievements:string[]
  offers:string[]
  activeEvent:CareerEvent|null
  retired:boolean
  finalScore?:number
}

export type CoachEventOption = {
  id:string
  label:string
  effects:Partial<Record<'boardTrust'|'fanTrust'|'morale'|'budget'|'tacticalRating'|'youthRating',number>>
}
export type CoachEvent = { id:string; title:string; body:string; options:CoachEventOption[] }
export type CoachSeason = { season:number; clubId:string; position:number; points:number; titles:number; score:number; note:string }
export type CoachState = {
  version:2
  gameMode:'coach'
  coachName:string
  clubId:string
  season:number
  maxSeasons:number
  boardTrust:number
  fanTrust:number
  morale:number
  budget:number
  tacticalRating:number
  youthRating:number
  titles:number
  history:CoachSeason[]
  activeEvent:CoachEvent|null
  retired:boolean
  finalScore?:number
}

export type RunScore = {
  id:string
  name:string
  mode:GameMode
  score:number
  detail:string
  createdAt:number
}

export type MiniGame = { id:MiniGameId; name:string; description:string; icon:string; playerOnly?:boolean; coachOnly?:boolean }

const slug=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join('').toUpperCase()
const seedColor=(name:string)=>{
  let h=0
  for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0
  const hue=205+(h%36)
  return {primary:`hsl(${hue} 78% 48%)`,secondary:`hsl(${(hue+24)%360} 74% 68%)`}
}

export const leagues:League[] = verifiedLeagueSeeds.map(seed=>({
  id:seed.id,
  name:`Liga ${seed.country} · ${seed.division}ª División`,
  country:seed.country,
  tier:seed.division,
  color:seedColor(seed.id).primary,
}))

export const clubs:Club[] = verifiedLeagueSeeds.flatMap(seed=>seed.teams.map((name,index)=>{
  const colors=seedColor(name)
  const basePrestige=Math.max(42,92-seed.division*8)
  return {
    id:`${seed.id}-${slug(name)}`,
    leagueId:seed.id,
    name,
    short:initials(name).slice(0,3),
    country:seed.country,
    prestige:Math.max(40,Math.min(94,basePrestige-(index%9))),
    salary:Math.round((18000+(basePrestige*1600))*(1-(seed.division-1)*.28)),
    minOverall:Math.max(55,Math.min(88,56+Math.round(basePrestige*.32)-(seed.division-1)*4)),
    primary:colors.primary,
    secondary:colors.secondary,
  }
}))

export const positions:Array<{id:Position;title:string;subtitle:string;boost:number}> = [
  {id:'9',title:'9 · DELANTERO',subtitle:'Goles, presencia y sangre fría.',boost:2},
  {id:'10',title:'10 · ENGANCHE',subtitle:'Visión, técnica y último pase.',boost:1},
  {id:'7',title:'7 · EXTREMO',subtitle:'Velocidad, gambeta y desequilibrio.',boost:1},
  {id:'5',title:'5 · VOLANTE',subtitle:'Equilibrio, presión y lectura.',boost:0},
  {id:'2',title:'2 · LEÑADOR',subtitle:'Defensa físico: cruces, juego aéreo y carácter.',boost:1},
  {id:'1',title:'1 · ARQUERO',subtitle:'Reflejos, personalidad y penales.',boost:0},
]

export const miniGames:MiniGame[] = [
  {id:'penalties',name:'Penales',description:'Clavá el timing y elegí esquina.',icon:'◎'},
  {id:'freekicks',name:'Tiros libres',description:'Potencia y precisión en una sola ventana.',icon:'↗'},
  {id:'passing',name:'Pase imposible',description:'Encontrá la línea antes de que cierre.',icon:'⇢'},
  {id:'keeper',name:'Reflejos',description:'Leé el disparo y reaccioná rápido.',icon:'◇'},
  {id:'duel',name:'Duelo defensivo',description:'Ideal para el 2: timing, riesgo y tarjeta.',icon:'◆'},
  {id:'scouting',name:'Ojo de scout',description:'Detectá valor antes que el mercado.',icon:'◉'},
]

export const playerEvents:CareerEvent[] = [
  {id:'agent',category:'contract',eyebrow:'FUERA DE LA CANCHA',title:'Te llama un representante',body:'Promete mover tu nombre, pero quiere una comisión alta y control sobre tus próximos contratos.',options:[
    {id:'sign',label:'Firmar con él',description:'Más exposición, menos control.',effects:{reputation:8,money:-12000,fans:2}},
    {id:'alone',label:'Seguir solo',description:'Cuidás la plata y el vestuario lo valora.',effects:{money:5000,coachTrust:5,discipline:2}},
    {id:'family',label:'Delegar en alguien cercano',description:'Menos ruido, más estabilidad.',effects:{energy:6,form:3,reputation:-2}},
  ]},
  {id:'classic',category:'football',eyebrow:'SEMANA DE CLÁSICO',title:'El técnico duda entre vos y un referente',body:'La cancha va a hervir. Podés exigir titularidad, aceptar el banco o entrenar doble.',options:[
    {id:'demand',label:'Quiero jugar',description:'Más presión y exposición.',effects:{form:5,coachTrust:-4,reputation:5,leadership:2}},
    {id:'bench',label:'Aceptar el banco',description:'Ganás confianza interna.',effects:{coachTrust:8,energy:5,morale:-2}},
    {id:'train',label:'Hablar en la cancha',description:'Doble turno.',effects:{overall:1,energy:-10,form:4,injuryRisk:4}},
  ]},
  {id:'night',category:'life',eyebrow:'VIDA PERSONAL',title:'Te invitan a una fiesta dos días antes del partido',body:'Va medio plantel. También hay periodistas y teléfonos por todos lados.',options:[
    {id:'go',label:'Ir igual',description:'La pasás bien, pero tiene costo.',effects:{energy:-12,fans:5,coachTrust:-7,discipline:-5}},
    {id:'home',label:'Quedarte en casa',description:'Profesionalismo puro.',effects:{energy:8,coachTrust:6,discipline:4,fans:-1}},
    {id:'appear',label:'Caer una hora y volver',description:'Equilibrio.',effects:{fans:2,energy:-3,coachTrust:2}},
  ]},
  {id:'injury',category:'health',eyebrow:'PARTE MÉDICO',title:'Sentís una molestia muscular',body:'No parece grave, pero hay un partido importante el fin de semana.',options:[
    {id:'play',label:'Jugar igual',description:'Riesgo alto, premio alto.',effects:{energy:-18,reputation:7,form:-3,injuryRisk:15}},
    {id:'rest',label:'Parar una fecha',description:'Cuidás el físico.',effects:{energy:15,coachTrust:2,morale:-2,injuryRisk:-8}},
    {id:'therapy',label:'Pagar recuperación privada',description:'Mejor recuperación.',effects:{money:-9000,energy:10,form:3,injuryRisk:-6}},
  ]},
  {id:'captain',category:'locker',eyebrow:'VESTUARIO',title:'El capitán te pide que hables con un juvenil',body:'Está a punto de romper con el grupo. Nadie quiere meterse.',minSeason:2,options:[
    {id:'mentor',label:'Sentarte con él',description:'Ganás liderazgo.',effects:{leadership:8,morale:5,energy:-2}},
    {id:'ignore',label:'No es asunto mío',description:'Cero desgaste.',effects:{energy:3,leadership:-4}},
    {id:'staff',label:'Avisar al cuerpo técnico',description:'Orden institucional.',effects:{coachTrust:4,morale:-3,discipline:3}},
  ]},
  {id:'press',category:'media',eyebrow:'MICRÓFONOS',title:'Un periodista te provoca en vivo',body:'Pregunta si tu buen momento se debe a que el equipo juega para vos.',options:[
    {id:'team',label:'Hablar del equipo',description:'Perfil bajo.',effects:{coachTrust:5,leadership:4,reputation:2}},
    {id:'ego',label:'Decir que sos decisivo',description:'La gente compra el personaje.',effects:{fans:7,reputation:6,morale:-4}},
    {id:'walk',label:'No responder',description:'Evitás el incendio.',effects:{discipline:2,reputation:-1}},
  ]},
  {id:'family',category:'life',eyebrow:'VIDA REAL',title:'Tu familia te pide que vuelvas unos días',body:'Coincide con una semana de entrenamiento importante.',minSeason:2,options:[
    {id:'travel',label:'Viajar',description:'Te hace bien a la cabeza.',effects:{morale:9,energy:5,coachTrust:-5}},
    {id:'stay',label:'Quedarte',description:'Foco total.',effects:{discipline:5,coachTrust:4,morale:-4}},
  ]},
  {id:'red',category:'football',eyebrow:'PARTIDO CALIENTE',title:'El 9 rival te viene buscando',body:'Ya te pegó dos codazos y el árbitro mira para otro lado.',positions:['2','5'],options:[
    {id:'hard',label:'Devolvérsela fuerte',description:'Podés imponerte o terminar afuera.',effects:{leadership:4,discipline:-8,reputation:4,injuryRisk:4}},
    {id:'smart',label:'Jugarle con cabeza',description:'Menos show, más control.',effects:{discipline:7,coachTrust:5,form:3}},
    {id:'talk',label:'Hablar con el árbitro',description:'Presión institucional.',effects:{leadership:3,reputation:1}},
  ]},
  {id:'keeper_pen',category:'football',eyebrow:'MINUTO 93',title:'Penal en contra',body:'El pateador mira siempre al arquero antes de arrancar.',positions:['1'],options:[
    {id:'study',label:'Esperar hasta el final',description:'Confianza en la lectura.',effects:{form:7,reputation:5,energy:-2}},
    {id:'guess',label:'Jugarte antes',description:'Todo o nada.',effects:{fans:6,form:-2}},
  ]},
  {id:'selection',category:'football',eyebrow:'SELECCIÓN',title:'Te llaman para una gira internacional',body:'Llegás con poco descanso y tu club juega una final apenas volvés.',minSeason:3,options:[
    {id:'go',label:'Ir igual',description:'La camiseta nacional pesa.',effects:{reputation:10,energy:-12,fans:6}},
    {id:'club',label:'Priorizar al club',description:'El DT te lo agradece.',effects:{coachTrust:8,reputation:-3,energy:6}},
  ]},
]

export const coachEvents:CoachEvent[] = [
  {id:'star-bench',title:'La figura llega tarde por tercera vez',body:'Es tu mejor jugador. El vestuario espera una señal.',options:[
    {id:'bench',label:'Mandarlo al banco',effects:{boardTrust:3,fanTrust:-2,morale:5,tacticalRating:1}},
    {id:'fine',label:'Multa y titular',effects:{budget:40000,morale:-3,fanTrust:2}},
    {id:'protect',label:'Protegerlo públicamente',effects:{fanTrust:3,boardTrust:-4,morale:2}},
  ]},
  {id:'academy',title:'Aparece un juvenil distinto',body:'Tiene talento, pero subirlo ahora puede quemarlo.',options:[
    {id:'promote',label:'Subirlo ya',effects:{youthRating:7,morale:2,fanTrust:4}},
    {id:'reserve',label:'Llevarlo de a poco',effects:{youthRating:4,boardTrust:2}},
  ]},
  {id:'board-sale',title:'La dirigencia quiere vender a un referente',body:'La oferta arregla las cuentas pero debilita al equipo.',options:[
    {id:'sell',label:'Aceptar la venta',effects:{budget:600000,boardTrust:8,morale:-8,fanTrust:-8}},
    {id:'keep',label:'Plantarte',effects:{boardTrust:-7,fanTrust:8,morale:5}},
  ]},
  {id:'press-loss',title:'Tres partidos sin ganar',body:'La conferencia se empieza a poner áspera.',options:[
    {id:'own',label:'Asumir la culpa',effects:{fanTrust:4,morale:3,boardTrust:-2}},
    {id:'players',label:'Exigir al plantel',effects:{morale:-6,tacticalRating:3,boardTrust:3}},
    {id:'calm',label:'Bajar el ruido',effects:{morale:2,fanTrust:-1}},
  ]},
  {id:'derby-plan',title:'Semana de clásico',body:'El rival te supera en nombres. La gente pide ir al frente igual.',options:[
    {id:'attack',label:'Presionar alto',effects:{fanTrust:7,tacticalRating:3,morale:2}},
    {id:'counter',label:'Esperar y contragolpear',effects:{boardTrust:3,tacticalRating:5,fanTrust:-2}},
  ]},
  {id:'staff',title:'Tu ayudante recibe una oferta',body:'Podés mejorarle el contrato o dejarlo ir.',options:[
    {id:'raise',label:'Retenerlo',effects:{budget:-120000,tacticalRating:4,morale:3}},
    {id:'leave',label:'Dejarlo ir',effects:{budget:30000,tacticalRating:-4}},
  ]},
]

export const clubById=(id:string)=>clubs.find(c=>c.id===id)??clubs[0]
export const leagueById=(id:string)=>leagues.find(l=>l.id===id)??leagues[0]
export const clubsByLeague=(leagueId:string)=>clubs.filter(c=>c.leagueId===leagueId)
export const formatMoney=(value:number)=>new Intl.NumberFormat('es-AR',{notation:value>=1000000?'compact':'standard',maximumFractionDigits:1}).format(value)
