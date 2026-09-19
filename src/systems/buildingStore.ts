import {
  baseStatsByPosition,
  clubById,
  clubs,
  leagueById,
  coachEvents,
  playerEvents,
  type CabalaGameId,
  type CareerOutcomeKind,
  type CareerState,
  type CoachEventOption,
  type CoachState,
  type Effects,
  type EventOption,
  type FinalStyle,
  type MiniGameId,
  type PlayerMode,
  type PlayerStats,
  type Position,
  type RunScore,
  type SeasonRecord,
  type TrophyRecord,
  type TransferOffer,
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

const finalMiniGameFor=(position:Position,r:()=>number):MiniGameId=>{
  const pools:Record<Position,MiniGameId[]>={
    '9':['penalties','freekicks','dribble'],
    '10':['freekicks','dribble','penalties'],
    '7':['dribble','freekicks','penalties'],
    '5':['duel','freekicks','dribble'],
    '2':['duel','penalties'],
    '1':['keeper'],
  }
  const pool=pools[position]
  return pool[Math.floor(r()*pool.length)]??pool[0]
}

const finalCabalaGameFor=(r:()=>number):CabalaGameId=>{
  const games:CabalaGameId[]=['higher-lower','dice-seven','coin-run','lucky-number','lucky-shirt']
  return games[Math.floor(r()*games.length)]??'higher-lower'
}

const challengeFor=(s:CareerState,perf:number,r:()=>number):{kind:CareerOutcomeKind;competition:string}=>{
  const club=clubById(s.clubId)
  const league=leagueById(club.leagueId)
  if(league.tier>1){
    if(perf>=58)return {kind:'promotion',competition:'Final por el ascenso'}
    return {kind:'survival',competition:'Partido por la permanencia'}
  }
  if(perf<56)return {kind:'survival',competition:'Partido por la permanencia'}
  const domestic=['Liga Argentina','Copa Argentina']
  const continental=['Copa Sudamericana','Copa Libertadores']
  const unlockedContinental=s.season>=4||s.reputation>=38||s.overall>=76
  const pool=unlockedContinental&&r()>.48?[...domestic,...continental]:domestic
  return {kind:'title',competition:pool[Math.floor(r()*pool.length)]??'Copa Argentina'}
}
const transferOffersFor=(s:CareerState):TransferOffer[]=>{
  const current=clubById(s.clubId)
  const r=rngFrom(s.seed+s.season*1709+s.overall*13+s.reputation*7)
  const candidates=clubs
    .filter(c=>c.id!==s.clubId&&c.country===current.country)
    .map(c=>{
      const prestigeGap=Math.abs(c.prestige-current.prestige)
      const overallGap=Math.abs(c.minOverall-s.overall)
      const ambitionPenalty=c.minOverall>s.overall+9?5:0
      const fit=overallGap*.75+prestigeGap*.12+ambitionPenalty-r()*4
      return {club:c,fit}
    })
    .sort((a,b)=>a.fit-b.fit)

  const picked:TransferOffer[]=[]
  for(const entry of candidates){
    if(picked.length>=4)break
    const c=entry.club
    const diff=s.overall-c.minOverall
    const role:TransferOffer['role']=diff>=8?'FIGURA':diff>=2?'TITULAR':diff>=-4?'PROYECTO':'ROTACIÓN'
    const years=1+Math.floor(r()*4)
    const salaryBase=Math.max(c.salary*.72,(s.currentSalary??current.salary)*(.9+r()*.22))
    const reputationBoost=1+s.reputation/520
    const salary=Math.max(4000,Math.round(salaryBase*reputationBoost/1000)*1000)
    const signingBonus=Math.round(salary*(1.1+r()*2.1)/1000)*1000
    picked.push({clubId:c.id,salary,years,role,signingBonus})
  }
  return picked
}

const withMarket=(s:CareerState):CareerState=>{
  const transferOffers=transferOffersFor(s)
  return {
    ...s,
    offers:transferOffers.map(offer=>offer.clubId),
    transferOffers,
    marketDecisionRequired:true,
    activeEvent:null,
  }
}

const finalizeRetirement=(s:CareerState):CareerState=>{
  const next={...s,retired:true,retirementPending:false,marketDecisionRequired:false,transferOffers:[],offers:[],activeEvent:null}
  return {...next,finalScore:careerScore(next)}
}

export function chooseFinalStyle(s:CareerState,style:FinalStyle):CareerState{
  return {...s,finalStyle:style,activeEvent:openingEvent(s.position)}
}



export function createCareer(name:string,position:Position,mode:PlayerMode,clubId:string,nationality='Argentina'):CareerState{
  const seed=mode==='daily'
    ? hash(new Date().toISOString().slice(0,10)+position+clubId)
    : Math.floor(Math.random()*2147483647)
  const retirementAge=39+(seed%4)
  const maxSeasons=retirementAge-17
  const club=clubById(clubId)
  const contractYears=2+(seed%3)
  const s:CareerState={
    version:2,gameMode:'player',mode,seed,playerName:name.trim()||'El Pibe',nationality,position,
    age:17,season:1,maxSeasons,clubId,overall:Math.round(roleOverall(baseStatsByPosition[position],position)),stats:{...baseStatsByPosition[position]},form:68,energy:92,reputation:8,fans:12,clubLegacy:0,retirementAge,
    coachTrust:55,discipline:62,leadership:42,morale:72,injuryRisk:8,money:12000,matches:0,goals:0,
    assists:0,titles:0,caps:0,nationalGoals:0,trainingCredits:2,seenEvents:[],history:[],achievements:[],offers:[],transferOffers:[],
    marketDecisionRequired:false,currentSalary:club.salary,contractYearsLeft:contractYears,contractYearsTotal:contractYears,
    finalStyle:null,pendingFinal:null,retirementPending:false,trophies:[],glory:0,lastSeasonGlory:0,activeEvent:null,retired:false
  }
  return s
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

export function careerDecisionEffects(eventId:string|undefined,e:Effects):Effects{
  const opening=eventId?.startsWith('origin-')??false
  const numericKeys=new Set(['overall','form','energy','reputation','fans','coachTrust','discipline','leadership','morale','injuryRisk','pace','finishing','passing','dribbling','defending','physical','reflexes'])
  const next:Effects={}
  for(const [key,value] of Object.entries(e)){
    if(typeof value!=='number')continue
    if(key==='money'){(next as Record<string,number>)[key]=value;continue}
    if(!numericKeys.has(key)){(next as Record<string,number>)[key]=value;continue}
    const max=opening?8:4
    const min=opening?-2:-4
    ;(next as Record<string,number>)[key]=Math.max(min,Math.min(max,value))
  }
  return next
}

export function choosePlayerEvent(s:CareerState,o:EventOption){
  const eventId=s.activeEvent?.id
  const next=applyEffects(s,careerDecisionEffects(eventId,o.effects))
  return {
    ...next,
    seenEvents:eventId?[...new Set([...(s.seenEvents??[]),eventId])]:s.seenEvents,
  }
}

export function simulateSeason(s:CareerState):CareerState{
  if(!s.finalStyle||s.pendingFinal||s.marketDecisionRequired||s.retired)return s
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
  const rating=Math.round((6+perf/58+r()*.95+(s.position==='2'?defensiveBonus*.015:0))*10)/10
  const nextStats=evolveStats(s,rating)
  const baseScore=Math.round(
    matches*110+goals*620+assists*430+rating*1450+
    club.prestige*70+s.reputation*45+s.leadership*28
  )
  const challenge=challengeFor(s,perf,r)
  const sameLeague=clubs.filter(candidate=>candidate.leagueId===club.leagueId&&candidate.id!==club.id)
  const opponent=sameLeague[Math.floor(r()*sameLeague.length)]??clubs.find(candidate=>candidate.id!==club.id&&candidate.country===club.country)??club
  const note=
    challenge.kind==='title'?'Llegaste a '+challenge.competition+'. El título se define jugando.':
    challenge.kind==='promotion'?'Llegaste a '+challenge.competition+'. Ganar significa subir de categoría.':
    'La temporada termina con '+challenge.competition+'. Ganar significa seguir en pie.'
  const record:SeasonRecord={
    season:s.season,age:s.age,clubId:s.clubId,matches,goals,assists,titles:0,rating,score:baseScore,note,glory:0
  }
  const targetRetirementAge=s.retirementAge??39
  const shouldRetire=s.age+1>=targetRetirementAge
  const salary=s.currentSalary??club.salary
  const contractYearsLeft=Math.max(0,(s.contractYearsLeft??3)-1)
  let n:CareerState={
    ...s,
    age:s.age+1,
    season:s.season+1,
    stats:nextStats,
    overall:clamp(Math.round(roleOverall(nextStats,s.position)),45,97),
    form:clamp(56+r()*32),
    energy:clamp(78+r()*21),
    reputation:clamp(s.reputation+Math.max(1,Math.round((rating-6.4)*1.35))),
    fans:clamp(s.fans+Math.max(0,Math.round(goals*.12+assists*.09))),
    clubLegacy:clamp((s.clubLegacy??0)+Math.max(1,Math.min(4,Math.round((rating-6.2)*1.05)+(s.leadership>=82?1:0))),0,100),
    coachTrust:clamp(s.coachTrust+Math.round((rating-6.8)*3)),
    discipline:clamp(s.discipline+(r()>.55?1:-1)),
    leadership:clamp(s.leadership+(s.age>23?1:0)),
    morale:clamp(62+r()*30),
    injuryRisk:clamp(Math.max(5,s.injuryRisk-5)+(s.age>30?3:0)),
    money:s.money+salary*12,
    matches:s.matches+matches,
    goals:s.goals+goals,
    assists:s.assists+assists,
    trainingCredits:2,
    history:[...s.history,record],
    offers:[],
    transferOffers:[],
    marketDecisionRequired:false,
    contractYearsLeft,
    pendingFinal:{
      id:'challenge-'+record.season+'-'+opponent.id,
      kind:challenge.kind,
      competition:challenge.competition,
      opponentClubId:opponent.id,
      miniGame:finalMiniGameFor(s.position,r),
      cabalaGame:finalCabalaGameFor(r),
      seasonRecordIndex:s.history.length,
    },
    activeEvent:null,
    retired:false,
    retirementPending:shouldRetire,
    lastSeasonGlory:0,
  }

  const achievements=new Set(n.achievements)
  if(n.goals>=50)achievements.add('50 goles')
  if(n.matches>=100)achievements.add('100 partidos')
  if((n.clubLegacy??0)>=72)achievements.add('Ídolo del club')
  if(n.overall>=90)achievements.add('Clase mundial')
  if(n.position==='2'&&n.matches>=180)achievements.add('Patrón del fondo')
  n={...n,achievements:[...achievements]}

  return n
}

const completeFinal=(s:CareerState,won:boolean,source:'skill'|'luck',score=0):CareerState=>{
  const pending=s.pendingFinal
  if(!pending)return s
  const history=[...s.history]
  const record=history[pending.seasonRecordIndex]
  if(record){
    history[pending.seasonRecordIndex]={
      ...record,
      titles:won?1:0,
      score:record.score+(won?850:220)+Math.round(score*.35),
      note:won
        ?`Campeón de ${pending.competition}. La final la resolviste por ${source==='skill'?'habilidad':'cábala'}.`
        :`Finalista de ${pending.competition}. Estuviste a un partido del título.`,
    }
  }
  let next:CareerState={
    ...s,
    history,
    pendingFinal:null,
    titles:s.titles+(won?1:0),
    reputation:clamp(s.reputation+(won?4:1)),
    fans:clamp(s.fans+(won?4:1)),
    clubLegacy:clamp((s.clubLegacy??0)+(won?5:2)),
    morale:clamp(s.morale+(won?8:-4)),
    money:s.money+(won?(s.currentSalary??clubById(s.clubId).salary)*2:0),
  }
  if(won){
    const achievements=new Set(next.achievements)
    achievements.add('Primer título')
    next={...next,achievements:[...achievements]}
  }
  if(next.retirementPending)return finalizeRetirement(next)
  return withMarket({...next,retirementPending:false})
}

export function resolveSkillFinal(s:CareerState,score:number):CareerState{
  const pending=s.pendingFinal
  if(!pending)return s
  const opponent=clubById(pending.opponentClubId)
  const current=clubById(s.clubId)
  const threshold=Math.max(285,Math.min(410,325+(opponent.prestige-current.prestige)*2))
  return completeFinal(s,score>=threshold,'skill',score)
}

export function resolveCabalFinal(s:CareerState,ritual:number):CareerState{
  const pending=s.pendingFinal
  if(!pending)return s
  const r=rngFrom(s.seed+pending.seasonRecordIndex*811+ritual*197+s.discipline*3+s.morale)
  const trait=ritual===0?s.morale:ritual===1?s.discipline:s.leadership
  const chance=Math.max(.4,Math.min(.72,.37+trait/420+s.reputation/900))
  return completeFinal(s,r()<chance,'luck')
}

export function stayAtClub(s:CareerState):CareerState{
  if(!s.marketDecisionRequired)return s
  if((s.contractYearsLeft??0)<=0)return renewCurrentClub(s,2)
  const next={...s,marketDecisionRequired:false,offers:[],transferOffers:[]}
  return {...next,activeEvent:nextPlayerEvent(next)}
}

export function renewCurrentClub(s:CareerState,years=3):CareerState{
  const club=clubById(s.clubId)
  const base=s.currentSalary??club.salary
  const raise=1.06+s.reputation/500+s.overall/900
  const salary=Math.round(Math.max(base,club.salary)*raise/1000)*1000
  const next:CareerState={
    ...s,
    currentSalary:salary,
    contractYearsLeft:years,
    contractYearsTotal:years,
    money:s.money+salary,
    marketDecisionRequired:false,
    offers:[],
    transferOffers:[],
    morale:clamp(s.morale+3),
  }
  return {...next,activeEvent:nextPlayerEvent(next)}
}

export function acceptTransferOffer(s:CareerState,offer:TransferOffer):CareerState{
  const destination=clubById(offer.clubId)
  const legacyCarry=Math.min(4,Math.round(s.reputation/24))
  const next:CareerState={
    ...s,
    clubId:offer.clubId,
    currentSalary:offer.salary,
    contractYearsLeft:offer.years,
    contractYearsTotal:offer.years,
    money:s.money+offer.signingBonus,
    offers:[],
    transferOffers:[],
    marketDecisionRequired:false,
    reputation:clamp(s.reputation+3),
    fans:clamp(s.fans-2),
    clubLegacy:legacyCarry,
    coachTrust:offer.role==='FIGURA'?68:offer.role==='TITULAR'?58:48,
    morale:clamp(s.morale+5),
  }
  return {...next,activeEvent:nextPlayerEvent({...next,clubId:destination.id})}
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
  const existing=s.transferOffers?.find(offer=>offer.clubId===id)
  if(existing)return acceptTransferOffer(s,existing)
  const c=clubById(id)
  return acceptTransferOffer(s,{
    clubId:id,
    salary:Math.round(c.salary/1000)*1000,
    years:2,
    role:'TITULAR',
    signingBonus:c.salary*2,
  })
}

export function careerScore(s:CareerState){
  const seasons=s.history.reduce((sum,h)=>sum+h.score,0)
  return Math.round(seasons+s.titles*1600+(s.clubLegacy??0)*24+s.achievements.length*400+s.overall*60)
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
