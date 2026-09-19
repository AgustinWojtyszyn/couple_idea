import {
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

const hash=(s:string)=>{
  let h=2166136261
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0
}

const nextPlayerEvent=(s:CareerState)=>{
  const eligible=playerEvents.filter(e=>(!e.positions||e.positions.includes(s.position))&&(!e.minSeason||s.season>=e.minSeason))
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
  const pos=positions.find(p=>p.id===position)!
  const maxSeasons=11+(seed%7)
  const s:CareerState={
    version:2,gameMode:'player',mode,seed,playerName:name.trim()||'El Pibe',nationality,position,
    age:17,season:1,maxSeasons,clubId,overall:58+pos.boost,form:68,energy:92,reputation:8,fans:12,
    coachTrust:55,discipline:62,leadership:42,morale:72,injuryRisk:8,money:12000,matches:0,goals:0,
    assists:0,titles:0,caps:0,nationalGoals:0,trainingCredits:2,history:[],achievements:[],offers:[],
    activeEvent:null,retired:false
  }
  return {...s,activeEvent:nextPlayerEvent(s)}
}

export function applyEffects(s:CareerState,e:Effects):CareerState{
  return {
    ...s,
    overall:clamp(s.overall+(e.overall??0),40,99),
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
  return applyEffects(s,o.effects)
}

export function simulateSeason(s:CareerState):CareerState{
  const club=clubById(s.clubId)
  const r=rngFrom(s.seed+s.season*4999+s.overall+s.discipline*11)
  const availability=clamp(100-s.injuryRisk*.55)
  const perf=clamp(
    s.overall*.43+s.form*.18+s.coachTrust*.1+s.energy*.08+s.morale*.08+
    s.discipline*.05+s.leadership*.04+availability*.04
  )
  const matches=Math.max(8,Math.round((24+r()*16+perf/12)*(availability/100)))
  const atk=s.position==='9'?1.35:s.position==='10'?.78:s.position==='7'?.95:s.position==='5'?.32:s.position==='2'?.11:.02
  const ast=s.position==='10'?1.25:s.position==='7'?.9:s.position==='5'?.7:s.position==='9'?.38:s.position==='2'?.1:.05
  const goals=Math.max(0,Math.round(matches*atk*(perf/100)*(.33+r()*.22)))
  const assists=Math.max(0,Math.round(matches*ast*(perf/100)*(.24+r()*.2)))
  const defensiveBonus=s.position==='2'?Math.round((s.leadership+s.discipline+perf)/30):0
  const title=r()<(club.prestige+s.overall+s.form+s.morale)/430?1:0
  const rating=Math.round((6+perf/58+r()*.95+(s.position==='2'?defensiveBonus*.015:0))*10)/10
  const growthBase=s.age<=22?2:s.age<=27?1:s.age>=33?-1:0
  const growth=growthBase+(s.trainingCredits===0?1:0)+(rating>=7.8?1:0)
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
    overall:clamp(s.overall+growth,45,97),
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
    focus==='physical'?{overall:1,energy:7,form:2,injuryRisk:-2}:
    focus==='technique'?{overall:1,form:5,energy:-4}:
    focus==='finishing'?{overall:1,reputation:3,energy:-5}:
    focus==='defending'?{overall:1,leadership:4,discipline:2,energy:-4}:
    {morale:8,discipline:4,form:2}
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
