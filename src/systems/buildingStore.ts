import {
  baseStatsByPosition,
  clubById,
  clubs,
  coachEvents,
  playerEvents,
  positions,
  type CareerState,
  type CoachEventOption,
  type CoachState,
  type Effects,
  type EventOption,
  type PlayerMode,
  type PlayerStats,
  type Position,
  type RunScore,
  type SeasonRecord,
  type CoachSeason,
} from '../world/Architecture'

export const clamp=(v:number,a=0,b=100)=>Math.max(a,Math.min(b,v))

const rngFrom=(seed:number)=>{
  let a=seed>>>0
  return()=>{
    a+=0x6d2b79f5
    let t=a
    t=Math.imul(t^(t>>>15),t|1)
    t^=t+Math.imul(t^(t>>>7),t|61)
    return((t^(t>>>14))>>>0)/4294967296
  }
}

const roleOverall=(stats:PlayerStats,position:Position)=>{
  const w:Record<Position,Partial<Record<keyof PlayerStats,number>>>={
    '9':{finishing:.38,pace:.2,dribbling:.14,physical:.13,passing:.09,defending:.03,reflexes:.03},
    '10':{passing:.31,dribbling:.28,finishing:.14,pace:.1,physical:.07,defending:.07,reflexes:.03},
    '7':{pace:.3,dribbling:.28,finishing:.18,passing:.12,physical:.06,defending:.03,reflexes:.03},
    '5':{passing:.24,defending:.23,physical:.18,dribbling:.12,pace:.1,finishing:.08,reflexes:.05},
    '2':{defending:.38,physical:.27,pace:.11,passing:.1,dribbling:.05,finishing:.04,reflexes:.05},
    '1':{reflexes:.55,physical:.15,passing:.1,defending:.08,pace:.05,dribbling:.04,finishing:.03},
  }
  return Object.entries(w[position]).reduce((sum,[key,weight])=>sum+stats[key as keyof PlayerStats]*(weight??0),0)
}

export const statsFor=(s:CareerState):PlayerStats=>{
  if(s.stats)return s.stats
  const base=baseStatsByPosition[s.position]
  const shift=s.overall-roleOverall(base,s.position)
  return Object.fromEntries(Object.entries(base).map(([key,value])=>[key,clamp(value+shift,20,95)])) as PlayerStats
}

const evolveStats=(s:CareerState,rating:number)=>{
  const current=statsFor(s)
  const youth=s.age<=21?2:s.age<=25?1:0
  const hot=rating>=7.8?1:0
  const decline=s.age>=32?1:0
  const next={...current}
  const keyStats:Record<Position,Array<keyof PlayerStats>>={
    '9':['finishing','pace','physical'],
    '10':['passing','dribbling','finishing'],
    '7':['pace','dribbling','finishing'],
    '5':['passing','defending','physical'],
    '2':['defending','physical','passing'],
    '1':['reflexes','physical','passing'],
  }
  for(const key of keyStats[s.position]) next[key]=clamp(next[key]+youth+hot,20,97)
  if(decline){
    next.pace=clamp(next.pace-2,20,97)
    next.physical=clamp(next.physical-1,20,97)
    if(s.position==='1')next.reflexes=clamp(next.reflexes-1,20,97)
  }
  return next
}

const hash=(s:string)=>{
  let h=2166136261
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0
}

const openingEvent=(position:Position)=>{
  const base={category:'football' as const,eyebrow:'TU IDENTIDAD',body:'Elegí una identidad. Esta decisión define tus stats de arranque y no es cosmética: cambia cómo rendís durante toda la carrera.'}
  if(position==='9')return {...base,id:'origin-9',title:'¿Qué clase de delantero sos?',options:[
    {id:'hunter',label:'CAZADOR DEL ÁREA',description:'Vivís del gol. Adentro del área no perdonás.',effects:{finishing:8,physical:2,passing:-2,reputation:3}},
    {id:'vertical',label:'FLECHA',description:'Te tiran una pelota al espacio y no te agarran más.',effects:{pace:8,dribbling:3,physical:-1,form:3}},
    {id:'complete',label:'TODOTERRENO',description:'Un poco de todo, bien hecho.',effects:{finishing:3,pace:3,physical:3,passing:3,leadership:3}},
  ]}
  if(position==='2')return {...base,id:'origin-2',title:'¿Qué clase de 2 sos?',options:[
    {id:'wall',label:'MURALLA',description:'Primero pasa la pelota. Después vemos.',effects:{defending:8,physical:5,pace:-2,discipline:3}},
    {id:'anticipate',label:'ANTICIPO',description:'Leés antes que el delantero y salís jugando.',effects:{defending:5,passing:5,pace:2,coachTrust:4}},
    {id:'boss',label:'CAUDILLO',description:'Ordenás el fondo y te hacés escuchar.',effects:{defending:4,physical:6,leadership:8,discipline:-2}},
  ]}
  if(position==='1')return {...base,id:'origin-1',title:'¿Qué clase de arquero sos?',options:[
    {id:'reflex',label:'GATO',description:'Tu carrera vive de una reacción imposible.',effects:{reflexes:9,physical:2}},
    {id:'sweeper',label:'ARQUERO LÍBERO',description:'Jugás lejos del arco y ayudás a salir.',effects:{passing:7,pace:3,reflexes:2,coachTrust:4}},
    {id:'leader',label:'DUEÑO DEL ÁREA',description:'Mandás en cada pelota parada.',effects:{reflexes:4,physical:4,leadership:8}},
  ]}
  if(position==='10')return {...base,id:'origin-10',title:'¿Qué clase de enganche sos?',options:[
    {id:'vision',label:'CEREBRO',description:'Ves el pase antes de que exista.',effects:{passing:8,dribbling:4,physical:-1}},
    {id:'artist',label:'ARTISTA',description:'Jugás para romper líneas y levantar a la gente.',effects:{dribbling:8,passing:3,physical:-2,fans:4}},
    {id:'runner',label:'ENGANCHE MODERNO',description:'Técnica con recorrido.',effects:{pace:5,passing:4,physical:4}},
  ]}
  if(position==='7')return {...base,id:'origin-7',title:'¿Qué clase de extremo sos?',options:[
    {id:'dribble',label:'DESEQUILIBRIO',description:'Uno contra uno y sin pedir permiso.',effects:{dribbling:8,pace:3,defending:-2,fans:4}},
    {id:'speed',label:'RAYO',description:'Atacás cuarenta metros como si fueran diez.',effects:{pace:9,finishing:2,physical:-1}},
    {id:'inside',label:'EXTREMO INTERIOR',description:'Entrás por dentro y pensás como un 10.',effects:{passing:6,dribbling:4,finishing:3}},
  ]}
  return {...base,id:'origin-5',title:'¿Qué clase de volante sos?',options:[
    {id:'anchor',label:'ANCLA',description:'Equilibrás todo y no regalás una transición.',effects:{defending:7,physical:4,passing:2,pace:-1}},
    {id:'box',label:'BOX TO BOX',description:'Llegás a las dos áreas.',effects:{pace:5,physical:6,finishing:3,energy:4}},
    {id:'captain',label:'CAPITÁN SILENCIOSO',description:'Orden, pase y liderazgo.',effects:{passing:6,defending:4,leadership:8}},
  ]}
}

const nextPlayerEvent=(s:CareerState)=>{
  const baseEligible=playerEvents.filter(e=>(!e.positions||e.positions.includes(s.position))&&(!e.minSeason||s.season>=e.minSeason))
  const unseen=baseEligible.filter(e=>!(s.seenEvents??[]).includes(e.id))
  const eligible=unseen.length?unseen:baseEligible
  const r=rngFrom(s.seed+s.season*971+s.age*37+s.matches)
  return eligible[Math.floor(r()*eligible.length)]??playerEvents[0]
}

const nextCoachEvent=(s:CoachState)=>{
  const r=rngFrom(hash(s.coachName+s.clubId)+s.season*739)
  return coachEvents[Math.floor(r()*coachEvents.length)]??coachEvents[0]
}

const offersFor=(s:CareerState)=>{
  const current=clubById(s.clubId)
  return clubs
    .filter(c=>c.id!==s.clubId&&s.overall+6>=c.minOverall)
    .sort((a,b)=>{
      const aFit=Math.abs(a.minOverall-s.overall)+(a.prestige<current.prestige?2:0)
      const bFit=Math.abs(b.minOverall-s.overall)+(b.prestige<current.prestige?2:0)
      return aFit-bFit
    })
    .slice(0,4)
    .map(c=>c.id)
}

export function createCareer(name:string,position:Position,mode:PlayerMode,clubId:string,nationality='Argentina'):CareerState{
  const seed=mode==='daily'
    ? hash(new Date().toISOString().slice(0,10)+position+clubId)
    : Math.floor(Math.random()*2147483647)
  const maxSeasons=11+(seed%7)
  const s:CareerState={
    version:2,gameMode:'player',mode,seed,playerName:name.trim()||'El Pibe',nationality,position,
    age:17,season:1,maxSeasons,clubId,overall:Math.round(roleOverall(baseStatsByPosition[position],position)),stats:{...baseStatsByPosition[position]},form:68,energy:92,reputation:8,fans:12,
    coachTrust:55,discipline:62,leadership:42,morale:72,injuryRisk:8,money:12000,matches:0,goals:0,
    assists:0,titles:0,caps:0,nationalGoals:0,trainingCredits:2,seenEvents:[],history:[],achievements:[],offers:[],
    activeEvent:null,retired:false
  }
  return {...s,activeEvent:openingEvent(position)}
}

export function applyEffects(s:CareerState,e:Effects):CareerState{
  const current=statsFor(s)
  const nextStats:PlayerStats={
    pace:clamp(current.pace+(e.pace??0),20,99),
    finishing:clamp(current.finishing+(e.finishing??0),20,99),
    passing:clamp(current.passing+(e.passing??0),20,99),
    dribbling:clamp(current.dribbling+(e.dribbling??0),20,99),
    defending:clamp(current.defending+(e.defending??0),20,99),
    physical:clamp(current.physical+(e.physical??0),20,99),
    reflexes:clamp(current.reflexes+(e.reflexes??0),20,99),
  }
  return {
    ...s,
    stats:nextStats,
    overall:clamp(Math.round(roleOverall(nextStats,s.position)+(e.overall??0)),40,99),
    form:clamp(s.form+(e.form??0)),
    energy:clamp(s.energy+(e.energy??0)),
    reputation:clamp(s.reputation+(e.reputation??0)),
    fans:clamp(s.fans+(e.fans??0)),
    coachTrust:clamp(s.coachTrust+(e.coachTrust??0)),
    discipline:clamp(s.discipline+(e.discipline??0)),
    leadership:clamp(s.leadership+(e.leadership??0)),
    morale:clamp(s.morale+(e.morale??0)),
    injuryRisk:clamp(s.injuryRisk+(e.injuryRisk??0)),
    money:Math.max(0,s.money+(e.money??0)),
    activeEvent:null,
  }
}

export function choosePlayerEvent(s:CareerState,o:EventOption){
  const eventId=s.activeEvent?.id
  const next=applyEffects(s,o.effects)
  return {
    ...next,
    seenEvents:eventId?[...new Set([...(s.seenEvents??[]),eventId])]:s.seenEvents,
  }
}

export function simulateSeason(s:CareerState):CareerState{
  const club=clubById(s.clubId)
  const r=rngFrom(s.seed+s.season*4999+s.overall+s.discipline*11)
  const stats=statsFor(s)
  const availability=clamp(100-s.injuryRisk*.55)
  const role=roleOverall(stats,s.position)
  const perf=clamp(
    role*.45+s.form*.16+s.coachTrust*.09+s.energy*.07+s.morale*.07+
    s.discipline*.05+s.leadership*.04+availability*.04+club.prestige*.03
  )
  const matches=Math.max(8,Math.round((24+r()*16+perf/12)*(availability/100)))
  const atk=s.position==='9'?1.35:s.position==='10'?.78:s.position==='7'?.95:s.position==='5'?.32:s.position==='2'?.11:.02
  const ast=s.position==='10'?1.25:s.position==='7'?.9:s.position==='5'?.7:s.position==='9'?.38:s.position==='2'?.1:.05
  const finishingFactor=(stats.finishing/100)*.72+.28
  const passingFactor=(stats.passing/100)*.72+.28
  const goals=Math.max(0,Math.round(matches*atk*(perf/100)*finishingFactor*(.33+r()*.22)))
  const assists=Math.max(0,Math.round(matches*ast*(perf/100)*passingFactor*(.24+r()*.2)))
  const defensiveBonus=s.position==='2'?Math.round((stats.defending+stats.physical+s.leadership+perf)/38):s.position==='1'?Math.round((stats.reflexes+stats.physical+perf)/34):0
  const title=r()<(club.prestige+s.overall+s.form+s.morale)/430?1:0
  const rating=Math.round((6+perf/58+r()*.95+(s.position==='2'?defensiveBonus*.015:0))*10)/10
  const nextStats=evolveStats(s,rating)
  const called=s.reputation>52&&s.overall>76&&r()>.4
  const caps=called?Math.round(2+r()*7):0
  const nationalGoals=called&&s.position!=='1'?Math.round(caps*atk*.2*r()):0
  const score=Math.round(
    matches*10+goals*42+assists*30+title*850+rating*75+
    club.prestige*4+s.reputation*3+s.leadership*2
  )
  const record:SeasonRecord={
    season:s.season,age:s.age,clubId:s.clubId,matches,goals,assists,titles:title,rating,score,
    note:title?'Campeón. La temporada cambió tu lugar en el club.':
      rating>=7.8?'Temporada de consolidación y mercado caliente.':
      rating<6.8?'Año irregular. El próximo puede ser decisivo.':'Cumpliste y seguís creciendo.'
  }
  const shouldRetire=s.season>=s.maxSeasons
  let n:CareerState={
    ...s,
    age:s.age+1,
    season:s.season+1,
    stats:nextStats,
    overall:clamp(Math.round(roleOverall(nextStats,s.position)),45,97),
    form:clamp(56+r()*32),
    energy:clamp(78+r()*21),
    reputation:clamp(s.reputation+Math.round(rating*2)+title*9),
    fans:clamp(s.fans+Math.round(goals*.75+assists*.42+title*11)),
    coachTrust:clamp(s.coachTrust+Math.round((rating-6.8)*4)),
    discipline:clamp(s.discipline+(r()>.55?1:-1)),
    leadership:clamp(s.leadership+(s.age>23?2:1)),
    morale:clamp(62+r()*30),
    injuryRisk:clamp(Math.max(5,s.injuryRisk-5)+(s.age>30?3:0)),
    money:s.money+club.salary*12,
    matches:s.matches+matches,
    goals:s.goals+goals,
    assists:s.assists+assists,
    titles:s.titles+title,
    caps:s.caps+caps,
    nationalGoals:s.nationalGoals+nationalGoals,
    trainingCredits:2,
    history:[...s.history,record],
    offers:[],
    activeEvent:null,
    retired:shouldRetire,
  }
  const achievements=new Set(n.achievements)
  if(n.goals>=50)achievements.add('50 goles')
  if(n.matches>=100)achievements.add('100 partidos')
  if(n.titles>=1)achievements.add('Primer título')
  if(n.caps>=1)achievements.add('Debut internacional')
  if(n.fans>=90)achievements.add('Ídolo de la gente')
  if(n.overall>=90)achievements.add('Clase mundial')
  if(n.position==='2'&&n.matches>=180)achievements.add('Patrón del fondo')
  n={...n,achievements:[...achievements]}

  if(shouldRetire){
    const finalScore=careerScore(n)
    return {...n,finalScore}
  }

  return {...n,offers:offersFor(n),activeEvent:nextPlayerEvent(n)}
}

export function trainCareer(s:CareerState,focus:'physical'|'technique'|'finishing'|'mind'|'defending'){
  if(!s.trainingCredits)return s
  const effects:Effects=
    focus==='physical'?{physical:4,pace:2,energy:7,form:2,injuryRisk:-2}:
    focus==='technique'?{dribbling:4,passing:3,form:4,energy:-4}:
    focus==='finishing'?{finishing:5,reputation:2,energy:-5}:
    focus==='defending'?{defending:5,physical:2,leadership:3,discipline:2,energy:-4}:
    s.position==='1'?{reflexes:3,morale:8,discipline:4}:{passing:2,morale:8,discipline:4,form:2}
  const n=applyEffects(s,effects)
  return {...n,activeEvent:s.activeEvent,trainingCredits:s.trainingCredits-1}
}

export function transferTo(s:CareerState,id:string):CareerState{
  const c=clubById(id)
  return {
    ...s,clubId:id,offers:[],reputation:clamp(s.reputation+4),fans:clamp(s.fans-5),
    coachTrust:48,morale:clamp(s.morale+4),money:s.money+c.salary*2,activeEvent:nextPlayerEvent({...s,clubId:id})
  }
}

export function careerScore(s:CareerState){
  const seasons=s.history.reduce((sum,h)=>sum+h.score,0)
  return Math.round(seasons+s.titles*1600+s.caps*35+s.nationalGoals*120+s.achievements.length*400+s.overall*60)
}

export function createCoach(name:string,clubId:string):CoachState{
  const s:CoachState={
    version:2,gameMode:'coach',coachName:name.trim()||'Míster',clubId,season:1,maxSeasons:8,
    boardTrust:62,fanTrust:58,morale:68,budget:clubById(clubId).salary*28,tacticalRating:61,
    youthRating:52,titles:0,history:[],activeEvent:null,retired:false
  }
  return {...s,activeEvent:nextCoachEvent(s)}
}

export function chooseCoachEvent(s:CoachState,o:CoachEventOption):CoachState{
  return {
    ...s,
    boardTrust:clamp(s.boardTrust+(o.effects.boardTrust??0)),
    fanTrust:clamp(s.fanTrust+(o.effects.fanTrust??0)),
    morale:clamp(s.morale+(o.effects.morale??0)),
    budget:Math.max(0,s.budget+(o.effects.budget??0)),
    tacticalRating:clamp(s.tacticalRating+(o.effects.tacticalRating??0)),
    youthRating:clamp(s.youthRating+(o.effects.youthRating??0)),
    activeEvent:null,
  }
}

export function simulateCoachSeason(s:CoachState):CoachState{
  const club=clubById(s.clubId)
  const r=rngFrom(hash(s.coachName+s.clubId)+s.season*3331+s.tacticalRating)
  const strength=clamp(club.prestige*.48+s.tacticalRating*.24+s.morale*.12+s.boardTrust*.08+s.youthRating*.08)
  const position=Math.max(1,Math.min(20,Math.round(18-strength/6+r()*6)))
  const points=Math.round(86-position*2.6+r()*8)
  const title=position===1?1:0
  const score=Math.round((21-position)*160+points*18+title*1800+s.tacticalRating*20+s.youthRating*8)
  const record:CoachSeason={
    season:s.season,clubId:s.clubId,position,points,titles:title,score,
    note:title?'Campeón. Tu proyecto ya tiene una identidad.':
      position<=4?'Clasificación continental y temporada muy fuerte.':
      position<=10?'Objetivo cumplido, con margen para crecer.':'Año bajo presión: la próxima temporada no perdona.'
  }
  const retired=s.season>=s.maxSeasons
  const next:CoachState={
    ...s,
    season:s.season+1,
    boardTrust:clamp(s.boardTrust+(position<=6?6:position>=15?-9:-1)),
    fanTrust:clamp(s.fanTrust+(position<=6?7:position>=15?-10:0)),
    morale:clamp(58+r()*34),
    budget:Math.max(0,s.budget+club.salary*14+(position<=6?180000:50000)),
    tacticalRating:clamp(s.tacticalRating+(position<=8?2:0)),
    youthRating:clamp(s.youthRating+(r()>.5?2:0)),
    titles:s.titles+title,
    history:[...s.history,record],
    activeEvent:null,
    retired,
  }
  if(retired)return {...next,finalScore:coachScore(next)}
  return {...next,activeEvent:nextCoachEvent(next)}
}

export function coachScore(s:CoachState){
  return Math.round(s.history.reduce((sum,h)=>sum+h.score,0)+s.titles*2200+s.tacticalRating*40+s.youthRating*18)
}

export function saveRunScore(score:RunScore){
  const raw=localStorage.getItem('leyenda-scores-v2')
  const scores:RunScore[]=raw?JSON.parse(raw):[]
  const next=[score,...scores].sort((a,b)=>b.score-a.score).slice(0,100)
  localStorage.setItem('leyenda-scores-v2',JSON.stringify(next))
  return next
}

export function getRunScores():RunScore[]{
  try{
    const raw=localStorage.getItem('leyenda-scores-v2')
    return raw?JSON.parse(raw):[]
  }catch{return[]}
}
