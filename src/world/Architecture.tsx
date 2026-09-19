import { verifiedLeagueSeeds } from '../data/verifiedLeagues'
export type Position = '9' | '10' | '7' | '5' | '2' | '1'
export type PlayerMode = 'classic' | 'daily'
export type FinalStyle = 'cabulero' | 'mixto' | 'habilidoso'
export type GameMode = 'player' | 'coach'
export type Theme = 'dark' | 'light'
export type Tab = 'career' | 'market' | 'training' | 'history' | 'minigames' | 'ranking' | 'squad' | 'shop'
export type MiniGameId = 'penalties' | 'freekicks' | 'dribble' | 'keeper' | 'duel' | 'memory-board' | 'personal-run' | 'timing-run' | 'ball-track' | 'code-call' | 'hold-up' | 'through-pass' | 'grid-gap' | 'long-kick' | 'pressure-exit' | 'tactics' | 'scouting' | 'locker' | 'lineup' | 'negotiation'
export type CabalaGameId = 'higher-lower' | 'dice-seven' | 'coin-run' | 'lucky-number' | 'lucky-shirt' | 'three-cups' | 'wheel' | 'tower' | 'grid-reveal' | 'boots'
export type CareerOutcomeKind = 'title' | 'survival' | 'promotion'
export type PlayerStatKey = 'pace' | 'finishing' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'reflexes'
export type PlayerStats = Record<PlayerStatKey, number>

export type League = { id:string; name:string; country:string; tier:number; color:string }
export type Club = {
  id:string; leagueId:string; name:string; short:string; country:string;
  prestige:number; salary:number; minOverall:number; primary:string; secondary:string
}

export type SeasonRecord = {
  season:number; age:number; clubId:string; matches:number; goals:number; assists:number;
  titles:number; rating:number; score:number; note:string; glory?:number;
  competition?:string; outcomeKind?:CareerOutcomeKind; outcomeWon?:boolean
}

export type Effects = Partial<Record<
  'overall'|'form'|'energy'|'reputation'|'fans'|'coachTrust'|'money'|
  'discipline'|'leadership'|'morale'|'injuryRisk'|
  'pace'|'finishing'|'passing'|'dribbling'|'defending'|'physical'|'reflexes',
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
  divisionTier?:number
  overall:number
  stats?:PlayerStats
  form:number
  energy:number
  reputation:number
  fans:number
  clubLegacy?:number
  retirementAge?:number
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
  purchases?:string[]
  seenEvents?:string[]
  lastStorySeason?:number
  history:SeasonRecord[]
  achievements:string[]
  offers:string[]
  transferOffers?:TransferOffer[]
  marketDecisionRequired?:boolean
  currentSalary?:number
  contractYearsLeft?:number
  contractYearsTotal?:number
  finalStyle?:FinalStyle|null
  pendingFinal?:FinalChallenge|null
  retirementPending?:boolean
  trophies?:TrophyRecord[]
  glory?:number
  lastSeasonGlory?:number
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
export type FinalChallenge = {
  id:string
  kind:CareerOutcomeKind
  competition:string
  opponentClubId:string
  miniGame:MiniGameId
  cabalaGame:CabalaGameId
  seasonRecordIndex:number
}
export type TrophyRecord = {
  id:string
  name:string
  icon:string
  season:number
  clubId:string
}
export type TransferOffer = {
  clubId:string
  salary:number
  years:number
  role:'ROTACIÓN'|'TITULAR'|'FIGURA'|'PROYECTO'
  signingBonus:number
}

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

export const statLabels:Record<PlayerStatKey,string> = {
  pace:'Velocidad',
  finishing:'Definición',
  passing:'Pase',
  dribbling:'Regate',
  defending:'Defensa',
  physical:'Físico',
  reflexes:'Reflejos',
}

export const baseStatsByPosition:Record<Position,PlayerStats> = {
  '9':{pace:63,finishing:65,passing:54,dribbling:59,defending:34,physical:61,reflexes:22},
  '10':{pace:58,finishing:56,passing:66,dribbling:65,defending:42,physical:52,reflexes:22},
  '7':{pace:66,finishing:56,passing:56,dribbling:65,defending:36,physical:54,reflexes:22},
  '5':{pace:56,finishing:46,passing:66,dribbling:56,defending:64,physical:62,reflexes:22},
  '2':{pace:53,finishing:31,passing:51,dribbling:41,defending:67,physical:68,reflexes:22},
  '1':{pace:41,finishing:20,passing:51,dribbling:31,defending:43,physical:59,reflexes:70},
}

export const positions:Array<{id:Position;title:string;subtitle:string;boost:number}> = [
  {id:'9',title:'9 · DELANTERO',subtitle:'Goles, presencia y sangre fría.',boost:2},
  {id:'10',title:'10 · ENGANCHE',subtitle:'Visión, técnica y último pase.',boost:1},
  {id:'7',title:'7 · EXTREMO',subtitle:'Velocidad, gambeta y desequilibrio.',boost:1},
  {id:'5',title:'5 · VOLANTE',subtitle:'Equilibrio, presión y lectura.',boost:0},
  {id:'2',title:'2 · LEÑADOR',subtitle:'Defensa físico: cruces, juego aéreo y carácter.',boost:1},
  {id:'1',title:'1 · ARQUERO',subtitle:'Reflejos, personalidad y penales.',boost:0},
]

export const miniGames:MiniGame[] = [
  {id:'penalties',name:'Penales',description:'Leé al arquero y definí bajo presión.',icon:'◎',playerOnly:true},
  {id:'freekicks',name:'Tiro libre',description:'Timing y precisión para superar barrera y arquero.',icon:'↗',playerOnly:true},
  {id:'dribble',name:'Slalom',description:'Cambios de dirección para romper marcas.',icon:'⇄',playerOnly:true},
  {id:'keeper',name:'Reflejos',description:'Reaccioná al disparo antes de que cruce la línea.',icon:'◇',playerOnly:true},
  {id:'duel',name:'Duelo defensivo',description:'Anticipá, acompañá o barré según la jugada.',icon:'◆',playerOnly:true},
  {id:'memory-board',name:'Pizarra relámpago',description:'Memorizá una secuencia táctica y repetila sin error.',icon:'▦',playerOnly:true},
  {id:'personal-run',name:'La diagonal',description:'Elegí carriles y esquivá cierres hasta entrar al área.',icon:'➜',playerOnly:true},
  {id:'timing-run',name:'La corrida',description:'Frená el impulso exactamente en la zona óptima.',icon:'⚡',playerOnly:true},
  {id:'ball-track',name:'Ojo en la pelota',description:'Seguí la pelota entre cruces y tocá dónde terminó.',icon:'◉',playerOnly:true},
  {id:'code-call',name:'La señal',description:'Recordá la clave del banco y marcala bajo presión.',icon:'⌘',playerOnly:true},
  {id:'hold-up',name:'El aguante',description:'Protegé la pelota mientras la presión se cierra.',icon:'⬢',playerOnly:true},
  {id:'through-pass',name:'Pase al hueco',description:'Soltá el pase cuando la ventana se abre.',icon:'⇢',playerOnly:true},
  {id:'grid-gap',name:'El hueco',description:'Memorizá qué zona queda libre antes de que desaparezca.',icon:'▧',playerOnly:true},
  {id:'long-kick',name:'Saque largo',description:'Potencia y dirección para romper la primera presión.',icon:'↑',playerOnly:true},
  {id:'pressure-exit',name:'Salida bajo presión',description:'Conectá la secuencia correcta antes del robo.',icon:'✦',playerOnly:true},
  {id:'tactics',name:'Pizarra táctica',description:'Respondé al planteo rival con la mejor variante.',icon:'⌁',coachOnly:true},
  {id:'scouting',name:'Ojo de scout',description:'Detectá potencial real detrás de datos incompletos.',icon:'◉',coachOnly:true},
  {id:'locker',name:'Vestuario',description:'Elegí el mensaje correcto en situaciones calientes.',icon:'☰',coachOnly:true},
  {id:'lineup',name:'Once ideal',description:'Elegí estructura y roles para neutralizar al rival.',icon:'▦',coachOnly:true},
  {id:'negotiation',name:'Negociación',description:'Leé el mercado y cerrá acuerdos sin romper la caja.',icon:'↔',coachOnly:true},
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
  {id:'spec-9',category:'football',eyebrow:'EVOLUCIÓN',title:'Tu juego pide una especialización',body:'Ya no alcanza con ser prometedor. El cuerpo técnico quiere que elijas qué clase de 9 vas a ser.',positions:['9'],minSeason:3,options:[
    {id:'killer',label:'KILLER',description:'Menos elaboración. Más gol.',effects:{finishing:6,physical:2,passing:-2}},
    {id:'mobile9',label:'NUEVE MÓVIL',description:'Salís del área y conectás el ataque.',effects:{passing:5,dribbling:4,finishing:2}},
    {id:'power9',label:'POTENCIA',description:'Atacás espacio y choque.',effects:{pace:4,physical:5,finishing:2}},
  ]},
  {id:'spec-2',category:'football',eyebrow:'EVOLUCIÓN',title:'Elegí qué defensor querés ser',body:'El entrenador te ofrece tres caminos muy distintos para convertirte en patrón del fondo.',positions:['2'],minSeason:3,options:[
    {id:'stopper',label:'STOPPER',description:'Agresivo, frontal y fuerte en el duelo.',effects:{defending:6,physical:5,discipline:-2}},
    {id:'libero',label:'LÍBERO',description:'Anticipo y salida limpia.',effects:{passing:6,defending:4,pace:2}},
    {id:'captain2',label:'CAUDILLO',description:'Ordenás la línea y mandás en el área.',effects:{defending:4,leadership:8,physical:3}},
  ]},
  {id:'spec-10',category:'football',eyebrow:'EVOLUCIÓN',title:'Tu talento necesita una firma',body:'Podés convertirte en director, gambeteador o un 10 con llegada constante.',positions:['10'],minSeason:3,options:[
    {id:'director',label:'DIRECTOR',description:'Todo pasa por tu pase.',effects:{passing:7,dribbling:3,pace:-1}},
    {id:'magician',label:'GAMBETEADOR',description:'Recibís y rompés líneas solo.',effects:{dribbling:7,pace:3,physical:-1}},
    {id:'scorer10',label:'LLEGADOR',description:'Pisás el área como delantero.',effects:{finishing:6,passing:3,physical:2}},
  ]},
  {id:'spec-7',category:'football',eyebrow:'EVOLUCIÓN',title:'¿Cómo querés desequilibrar?',body:'La banda ya te queda chica. Elegí cómo hacer daño.',positions:['7'],minSeason:3,options:[
    {id:'winger',label:'EXTREMO PURO',description:'Velocidad y uno contra uno.',effects:{pace:6,dribbling:6,defending:-2}},
    {id:'inside7',label:'A PIERNA CAMBIADA',description:'Entrás hacia el arco para definir.',effects:{finishing:6,dribbling:4,passing:2}},
    {id:'worker7',label:'IDA Y VUELTA',description:'Más recorrido y sacrificio.',effects:{physical:5,defending:4,pace:3}},
  ]},
  {id:'spec-5',category:'football',eyebrow:'EVOLUCIÓN',title:'El mediocampo puede ser tuyo',body:'Definí el rol que vas a ocupar cuando el partido se ensucia.',positions:['5'],minSeason:3,options:[
    {id:'anchor5',label:'PIVOTE',description:'Cortás todo y sostenés al equipo.',effects:{defending:6,physical:5,pace:-1}},
    {id:'organizer5',label:'ORGANIZADOR',description:'Primer pase, pausa y lectura.',effects:{passing:7,dribbling:3,physical:-1}},
    {id:'mixed5',label:'MIXTO',description:'Presencia en las dos áreas.',effects:{pace:3,passing:4,physical:4,finishing:2}},
  ]},
  {id:'spec-1',category:'football',eyebrow:'EVOLUCIÓN',title:'Definí tu estilo bajo los tres palos',body:'A esta altura ya todos conocen tus virtudes. Elegí cuál llevar al máximo.',positions:['1'],minSeason:3,options:[
    {id:'shotstopper',label:'ATAJADOR',description:'Puro reflejo y reacción.',effects:{reflexes:7,physical:2}},
    {id:'sweeper1',label:'ARQUERO JUGADOR',description:'Salís del área y empezás ataques.',effects:{passing:6,pace:3,reflexes:2}},
    {id:'commander1',label:'COMANDANTE',description:'Dominás el área y ordenás la defensa.',effects:{reflexes:3,physical:4,leadership:8}},
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
