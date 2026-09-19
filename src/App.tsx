import { useEffect, useMemo, useState } from 'react'
import {
  clubs,
  clubsByLeague,
  clubById,
  formatMoney,
  leagues,
  leagueById,
  miniGames,
  positions,
  statLabels,
  type CareerState,
  type CoachState,
  type EventOption,
  type FinalStyle,
  type GameMode,
  type MiniGameId,
  type PlayerMode,
  type PlayerStatKey,
  type Position,
  type RunScore,
  type SeasonRecord,
  type TransferOffer,
  type Tab,
  type Theme,
} from './world/Architecture'
import {
  applyEffects,
  careerScore,
  acceptTransferOffer,
  chooseCoachEvent,
  chooseFinalStyle,
  choosePlayerEvent,
  coachScore,
  createCareer,
  createCoach,
  getRunScores,
  renewCurrentClub,
  resolveCabalFinal,
  resolveSkillFinal,
  saveRunScore,
  simulateCoachSeason,
  simulateSeason,
  statsFor,
  stayAtClub,
  trainCareer,
  transferTo,
} from './systems/buildingStore'
import { globalRankingEnabled, loadLeaderboard, submitLeaderboardScore } from './systems/rankingService'
import { getClubMedia, preloadClubMedia, type ClubMedia } from './systems/clubMediaService'

type SaveState = CareerState | CoachState | null

function normalizeSaveState(value:SaveState):SaveState{
  if(!value)return null
  if(value.gameMode==='coach')return value
  const retirementAge=value.retirementAge??(39+(value.seed%4))
  const seasonsHere=value.history.filter(item=>item.clubId===value.clubId)
  const inferredLegacy=Math.min(
    42,
    seasonsHere.reduce((sum,item)=>sum+Math.max(1,Math.min(5,Math.round((item.rating-6.2)*1.1)+(item.titles?2:0))),0)
  )
  const current=clubById(value.clubId)
  return {
    ...value,
    retirementAge,
    maxSeasons:retirementAge-17,
    clubLegacy:value.clubLegacy??inferredLegacy,
    caps:0,
    nationalGoals:0,
    finalStyle:value.finalStyle??null,
    pendingFinal:value.pendingFinal??null,
    retirementPending:value.retirementPending??false,
    marketDecisionRequired:value.marketDecisionRequired??false,
    transferOffers:value.transferOffers??[],
    currentSalary:value.currentSalary??current.salary,
    contractYearsLeft:value.contractYearsLeft??2,
    contractYearsTotal:value.contractYearsTotal??2,
    activeEvent:value.activeEvent?.id==='selection'?null:value.activeEvent,
  }
}

const SAVE_KEY='leyenda-save-v2'
const THEME_KEY='leyenda-theme-v1'

function Crest({name,size='md'}:{name:string;size?:'sm'|'md'|'lg'}){
  const letters=name.split(/\s+/).filter(Boolean).slice(0,3).map(x=>x[0]).join('').toUpperCase()
  let hash=0
  for(let i=0;i<name.length;i++) hash=(hash*31+name.charCodeAt(i))>>>0
  const hue=205+(hash%36)
  return <span className={'crest crest--'+size} style={{'--crest-hue':String(hue)} as React.CSSProperties}>
    <span>{letters}</span>
  </span>
}

function useClubMedia(name:string){
  const [media,setMedia]=useState<ClubMedia>({})
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    let alive=true
    setLoading(true)
    void getClubMedia(name).then(value=>{
      if(!alive)return
      setMedia(value)
      setLoading(false)
    })
    return()=>{alive=false}
  },[name])
  return {media,loading}
}

function ClubCrest({name,size='md'}:{name:string;size?:'sm'|'md'|'lg'}){
  const {media,loading}=useClubMedia(name)
  const [failed,setFailed]=useState(false)
  useEffect(()=>setFailed(false),[name])
  if(loading)return <span className={'crest-skeleton crest-skeleton--'+size} aria-label={'Cargando escudo de '+name}/>
  if(media.logo&&!failed){
    return <span className={'real-crest real-crest--'+size}><img src={media.logo} alt={'Escudo de '+name} loading="eager" decoding="async" onError={()=>setFailed(true)}/></span>
  }
  return <Crest name={name} size={size}/>
}

function MatchdayScene({clubName,media,mode,season,age}:{clubName:string;media:ClubMedia;mode:'player'|'coach';season:number;age?:number}){
  const background=media.stadiumImage??media.image
  return <section className={'matchday-scene '+(background?'matchday-scene--photo':'matchday-scene--fallback')} style={background?{backgroundImage:'linear-gradient(180deg,rgba(3,8,17,.08),rgba(3,8,17,.88)),url("'+background+'")'}:undefined}>
    <div className="matchday-scene__lights"><i/><i/><i/><i/></div>
    <div className="matchday-scene__stands"><i/><i/><i/></div>
    <div className="matchday-scene__pitch"><span/><span/><span/></div>
    <div className="matchday-scene__scoreboard">
      <ClubCrest name={clubName} size="lg"/>
      <div><small>{mode==='player'?'JORNADA DE CARRERA':'DÍA DE PARTIDO'}</small><strong>{clubName}</strong><span>{media.stadiumName??'Sede del club'}</span></div>
    </div>
    <div className="matchday-scene__meta"><span>Temporada {season}</span>{typeof age==='number'&&<b>{age} años</b>}</div>
    <div className="matchday-scene__name">{clubName}</div>
  </section>
}

function DecisionScene({category,title,media,clubName}:{category:string;title:string;media:ClubMedia;clubName:string}){
  const visuals:Record<string,{icon:string;label:string}>={
    football:{icon:'⚽',label:'CANCHA'},
    life:{icon:'◌',label:'FUERA DEL FÚTBOL'},
    media:{icon:'◉',label:'PRENSA'},
    health:{icon:'✚',label:'PARTE MÉDICO'},
    contract:{icon:'↗',label:'CONTRATO'},
    locker:{icon:'▦',label:'VESTUARIO'},
    coach:{icon:'⌁',label:'DECISIÓN DEL DT'},
  }
  const visual=visuals[category]??visuals.football
  const background=category==='football'?(media.stadiumImage??media.image):(media.image??media.stadiumImage)
  return <div className={'decision-scene decision-scene--'+category} style={background?{backgroundImage:'linear-gradient(90deg,rgba(3,9,18,.82),rgba(3,9,18,.28)),url("'+background+'")'}:undefined}>
    <div className="decision-scene__icon">{visual.icon}</div>
    <div className="decision-scene__copy"><span>{visual.label}</span><strong>{title}</strong><small>{clubName}</small></div>
    <div className="decision-scene__graphic"><i/><i/><i/></div>
  </div>
}

function ThemeToggle({theme,onToggle}:{theme:Theme;onToggle:()=>void}){
  return <button className="theme-toggle" onClick={onToggle} aria-label="Cambiar tema">
    <span className="theme-toggle__icon">{theme==='dark'?'☾':'☀'}</span>
    <span>{theme==='dark'?'Oscuro':'Claro'}</span>
  </button>
}

function SelectField({label,value,onChange,children}:{label:string;value:string;onChange:(value:string)=>void;children:React.ReactNode}){
  return <label className="field">
    <span>{label}</span>
    <select value={value} onChange={e=>onChange(e.target.value)}>{children}</select>
  </label>
}

function Meter({label,value}:{label:string;value:number}){
  return <div className="meter">
    <div className="meter__row"><span>{label}</span><strong>{Math.round(value)}</strong></div>
    <div className="meter__track"><i style={{width:Math.max(2,Math.min(100,value))+'%'}}/></div>
  </div>
}

function Stat({value,label}:{value:string|number;label:string}){
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>
}

function IdolProgress({value,years}:{value:number;years:number}){
  const level=
    value<6?'DESCONOCIDO':
    value<15?'YA TE UBICAN':
    value<30?'TITULAR QUERIDO':
    value<48?'REFERENTE':
    value<68?'BANDERA':
    value<90?'ÍDOLO':'LEYENDA'
  return <section className="idol-progress">
    <div className="idol-progress__head"><span>HUELLA EN EL CLUB</span><strong>{level} · {Math.round(value)}/100</strong></div>
    <div className="idol-progress__track"><i style={{width:Math.max(1,value)+'%'}}/><b className="i1">●</b><b className="i2">◆</b><b className="i3">★</b><b className="i4">♛</b></div>
    <div className="idol-progress__foot"><span>AÑOS EN ESTE CLUB</span><strong>{years} {years===1?'AÑO':'AÑOS'}</strong></div>
  </section>
}

const effectLabels:Record<string,string>={
  pace:'VELOCIDAD',
  finishing:'DEFINICIÓN',
  passing:'PASE',
  dribbling:'REGATE',
  defending:'DEFENSA',
  physical:'FÍSICO',
  reflexes:'REFLEJOS',
  overall:'OVR',
  form:'FORMA',
  energy:'ENERGÍA',
  reputation:'REPUTACIÓN',
  fans:'POPULARIDAD',
  coachTrust:'CONFIANZA DT',
  discipline:'DISCIPLINA',
  leadership:'LIDERAZGO',
  morale:'MORAL',
  injuryRisk:'RIESGO LESIÓN',
  money:'DINERO',
}

function EffectChips({effects}:{effects:EventOption['effects']}){
  const entries=Object.entries(effects).filter(([,value])=>typeof value==='number'&&value!==0)
  return <div className="effect-chips">{entries.map(([key,value])=>{
    const numeric=Number(value)
    const dangerous=key==='injuryRisk'
    const positive=dangerous?numeric<0:numeric>0
    const amount=key==='money'
      ?(numeric>0?'+':'-')+'$'+formatMoney(Math.abs(numeric))
      :(numeric>0?'+':'')+numeric+' '+(effectLabels[key]??key.toUpperCase())
    return <span key={key} className={positive?'positive':'negative'}>{amount}</span>
  })}</div>
}

const visibleStatsByPosition:Record<Position,PlayerStatKey[]> = {
  '9':['pace','finishing','dribbling','physical','passing'],
  '10':['passing','dribbling','pace','finishing','physical'],
  '7':['pace','dribbling','passing','finishing','physical'],
  '5':['passing','defending','physical','pace','dribbling'],
  '2':['defending','physical','pace','passing'],
  '1':['reflexes','physical','passing'],
}

function PlayerAttributes({state}:{state:CareerState}){
  const stats=statsFor(state)
  const keys=visibleStatsByPosition[state.position]
  const entries=keys.map(key=>[key,stats[key]] as const)
  const best=new Set(
    entries.slice().sort((a,b)=>b[1]-a[1]).slice(0,2).map(([key])=>key)
  )
  return <section className="attributes-card">
    <div className="attributes-head">
      <div><span className="eyebrow">ATRIBUTOS DE TU PUESTO</span><h3>{positions.find(p=>p.id===state.position)?.title.split('·')[1]??'Jugador'}</h3></div>
      <span className="attributes-ovr">{state.overall}<small>OVR</small></span>
    </div>
    <div className="attributes-grid">{entries.map(([key,value])=><div className={best.has(key)?'attribute best':'attribute'} key={key}>
      <div><span>{statLabels[key]}</span><strong>{Math.round(value)}</strong></div>
      <i><b style={{width:Math.max(2,value)+'%'}}/></i>
    </div>)}</div>
  </section>
}

function StoryModes({start}:{start:(name:string,position:Position,clubId:string)=>void}){
  const byName=(name:string)=>clubs.find(club=>club.country==='Argentina'&&club.name===name)?.id
  const fallback=clubs.find(club=>club.country==='Argentina')?.id??clubs[0].id
  const stories=[
    {tag:'SAN JUAN',title:'EL PIBE DEL INTERIOR',body:'Debutás lejos de los flashes. Tenés que ganarte cada minuto.',icon:'⛰',position:'9' as Position,clubId:byName('San Martín de San Juan')??fallback},
    {tag:'DEFENSA',title:'EL 2 QUE NADIE QUERÍA',body:'Poco ruido, mucho duelo. Convertite en patrón del fondo.',icon:'◆',position:'2' as Position,clubId:byName('Banfield')??fallback},
    {tag:'ARCO',title:'DEBUT DE EMERGENCIA',body:'El titular cae y tu carrera arranca sin aviso.',icon:'◇',position:'1' as Position,clubId:byName('Aldosivi')??fallback},
  ]
  return <section className="story-mode-panel">
    <div className="section-head"><div><span className="eyebrow">MODO HISTORIA · ORIGINAL</span><h2>Tres carreras para arrancar distinto.</h2></div><span className="pill">ARG</span></div>
    <div className="story-mode-grid">{stories.map(story=><button key={story.title} onClick={()=>start('',story.position,story.clubId)}>
      <b>{story.icon}</b>
      <span><small>{story.tag}</small><strong>{story.title}</strong><em>{story.body}</em></span>
      <i>JUGAR →</i>
    </button>)}</div>
  </section>
}

function ClubPickerModal({clubsList,selectedId,onSelect,onClose}:{clubsList:typeof clubs;selectedId:string;onSelect:(id:string)=>void;onClose:()=>void}){
  const [query,setQuery]=useState('')
  const filtered=clubsList.filter(club=>club.name.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="club-picker-overlay" onClick={onClose}>
    <section className="club-picker-modal" onClick={event=>event.stopPropagation()}>
      <div className="club-picker-grab"/>
      <div className="club-picker-modal__head">
        <div><span className="eyebrow">ARGENTINA · 1ª DIVISIÓN</span><h2>Elegí tu club</h2></div>
        <button onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <label className="club-picker-search"><span>⌕</span><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar equipo..."/></label>
      <div className="club-picker-results">
        {filtered.map(club=><button key={club.id} className={club.id===selectedId?'active':''} onClick={()=>{onSelect(club.id);onClose()}}>
          <ClubCrest name={club.name}/>
          <span><strong>{club.name}</strong><small>Prestigio {club.prestige} · OVR base {club.minOverall}</small></span>
          <b>{club.id===selectedId?'✓':'›'}</b>
        </button>)}
        {!filtered.length&&<div className="club-picker-empty">No encontré clubes con ese nombre.</div>}
      </div>
    </section>
  </div>
}

function Home({
  theme,onTheme,startPlayer,startCoach
}:{
  theme:Theme
  onTheme:()=>void
  startPlayer:(name:string,position:Position,mode:PlayerMode,clubId:string,nationality:string)=>void
  startCoach:(name:string,clubId:string)=>void
}){
  const countries=useMemo(()=>[...new Set(leagues.map(l=>l.country))].sort((a,b)=>a.localeCompare(b,'es')),[])
  const [gameMode,setGameMode]=useState<GameMode>('player')
  const [playerMode,setPlayerMode]=useState<PlayerMode>('classic')
  const [name,setName]=useState('')
  const [nationality,setNationality]=useState('Argentina')
  const [country,setCountry]=useState(countries.includes('Argentina')?'Argentina':countries[0]??'')
  const countryLeagues=leagues.filter(l=>l.country===country).sort((a,b)=>a.tier-b.tier)
  const [leagueId,setLeagueId]=useState(countryLeagues[0]?.id??leagues[0]?.id??'')
  const availableLeagues=leagues.filter(l=>l.country===country).sort((a,b)=>a.tier-b.tier)
  const activeLeague=availableLeagues.some(l=>l.id===leagueId)?leagueId:(availableLeagues[0]?.id??'')
  const availableClubs=clubsByLeague(activeLeague)
  const [clubId,setClubId]=useState(availableClubs[0]?.id??clubs[0]?.id??'')
  const activeClub=availableClubs.some(c=>c.id===clubId)?clubId:(availableClubs[0]?.id??'')
  const [position,setPosition]=useState<Position>('9')
  const [clubPickerOpen,setClubPickerOpen]=useState(false)

  const changeCountry=(value:string)=>{
    setCountry(value)
    const firstLeague=leagues.filter(l=>l.country===value).sort((a,b)=>a.tier-b.tier)[0]
    setLeagueId(firstLeague?.id??'')
    setClubId(firstLeague?clubsByLeague(firstLeague.id)[0]?.id??'':'')
  }

  const changeLeague=(value:string)=>{
    setLeagueId(value)
    setClubId(clubsByLeague(value)[0]?.id??'')
  }

  const selectedClub=clubById(activeClub)
  const {media:selectedMedia}=useClubMedia(selectedClub.name)

  useEffect(()=>{
    if(country!=='Argentina')return
    const id=window.setTimeout(()=>{
      void preloadClubMedia(availableClubs.map(club=>club.name),4)
    },180)
    return()=>window.clearTimeout(id)
  },[country,activeLeague])

  return <div className="shell shell--home">
    <header className="site-header">
      <a className="brand" href="#" onClick={e=>e.preventDefault()}>
        <span className="brand__mark">L</span>
        <span><strong>LEYENDA</strong><small>FÚTBOL · DECISIONES · HISTORIA</small></span>
      </a>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <div className="home-layout">
      <aside className="desktop-rail">
        <div className="rail-title"><span>◈</span> UNIVERSO</div>
        <div className="rail-search">⌕ Buscar país o liga</div>
        <div className="rail-list">
          {countries.slice(0,12).map(item=><button key={item} className={item===country?'active':''} onClick={()=>changeCountry(item)}>
            <span>{item}</span><b>{leagues.filter(l=>l.country===item).length}</b>
          </button>)}
        </div>
        <div className="rail-foot"><strong>{countries.length}</strong><span>países disponibles en la base actual</span></div>
      </aside>

      <main className="home-main">
        <section className="hero-card">
          <div className="hero-card__glow"/>
          <div className="hero-card__top">
            <span className="eyebrow">NUEVA GENERACIÓN · V2</span>
            <span className="status-dot">● EN DESARROLLO</span>
          </div>
          <div className="hero-card__brand"><span>LEYENDA</span><small>Argentina Lab · club, rol, decisiones y stats</small></div>
          <div className="mode-tabs">
            <button className={gameMode==='player'?'active':''} onClick={()=>setGameMode('player')}>MODO JUGADOR</button>
            <button className={gameMode==='coach'?'active':''} onClick={()=>setGameMode('coach')}>MODO ENTRENADOR</button>
          </div>
        </section>

        <section className="daily-card">
          <div className="section-head">
            <div><span className="eyebrow">DESAFÍO DEL DÍA</span><h2>Misma semilla. Distinta historia.</h2></div>
            <span className="pill">HOY</span>
          </div>
          <div className="daily-goals">
            <div><b>01</b><span>Terminá una carrera</span><strong>+500</strong></div>
            <div><b>02</b><span>Conseguí un título</span><strong>+250</strong></div>
            <div><b>03</b><span>Superá tu mejor score</span><strong>+150</strong></div>
          </div>
          {gameMode==='player'&&<button className="ghost-action" onClick={()=>setPlayerMode(playerMode==='daily'?'classic':'daily')}>
            {playerMode==='daily'?'✓ Desafío diario activado':'Activar desafío diario'}
          </button>}
        </section>

        {gameMode==='player'&&<StoryModes start={(storyName,storyPosition,storyClub)=>startPlayer(storyName,storyPosition,'classic',storyClub,'Argentina')}/>}

        <section className="create-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">{gameMode==='player'?'CARRERA LIBRE':'DESPACHO DEL DT'}</span>
              <h2>{gameMode==='player'?'Creá una historia que no se repita.':'Tomá un club y bancate la presión.'}</h2>
            </div>
            <button className="random-button" onClick={()=>{
              const randomLeague=leagues[Math.floor(Math.random()*leagues.length)]
              const randomClub=clubsByLeague(randomLeague.id)
              changeCountry(randomLeague.country)
              setLeagueId(randomLeague.id)
              setClubId(randomClub[Math.floor(Math.random()*randomClub.length)]?.id??'')
              setPosition(positions[Math.floor(Math.random()*positions.length)].id)
            }}>⤨ AL AZAR</button>
          </div>

          {country==='Argentina'&&<section className="argentina-lab-panel">
            <div className="argentina-lab-head"><div><span>🇦🇷 PRUEBA ARGENTINA</span><strong>Primera División</strong></div><button className="club-picker-open" onClick={()=>setClubPickerOpen(true)}>{availableClubs.length} CLUBES ↗</button></div>
            <div className="club-strip">
              {availableClubs.slice(0,10).map(club=><button key={club.id} className={club.id===activeClub?'active':''} onClick={()=>setClubId(club.id)}>
                <ClubCrest name={club.name}/>
                <span>{club.name}</span>
              </button>)}
            </div>
          </section>}

          <div className="form-grid">
            {gameMode==='player'&&<SelectField label="NACIONALIDAD" value={nationality} onChange={setNationality}>
              {[...new Set(['Argentina',...countries])].map(item=><option key={item}>{item}</option>)}
            </SelectField>}
            <SelectField label="PAÍS DE LA LIGA" value={country} onChange={changeCountry}>
              {countries.map(item=><option key={item}>{item}</option>)}
            </SelectField>
            <SelectField label="DIVISIÓN" value={activeLeague} onChange={changeLeague}>
              {availableLeagues.map(l=><option key={l.id} value={l.id}>{l.tier}ª División</option>)}
            </SelectField>
            {country!=='Argentina'&&<SelectField label="EQUIPO" value={activeClub} onChange={setClubId}>
              {availableClubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>}
          </div>

          <div className="club-preview club-preview--media" style={(selectedMedia.stadiumImage??selectedMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 18%,rgba(5,10,18,.72)),url("'+(selectedMedia.stadiumImage??selectedMedia.image)+'")'}:undefined}>
            <ClubCrest name={selectedClub.name} size="lg"/>
            <div><span>{leagueById(selectedClub.leagueId).name}</span><strong>{selectedClub.name}</strong><small>{selectedMedia.logo?'Escudo cargado desde Wikimedia':'Identidad visual de respaldo LEYENDA'}</small></div>
          </div>

          <label className="name-field">
            <span>{gameMode==='player'?'NOMBRE O APODO':'NOMBRE DEL ENTRENADOR'}</span>
            <input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder={gameMode==='player'?'Ej: El Zurdo':'Ej: Míster A.'}/>
          </label>

          {gameMode==='player'&&<div className="positions">
            {positions.map(p=><button key={p.id} className={position===p.id?'active':''} onClick={()=>setPosition(p.id)}>
              <b>{p.id}</b><strong>{p.title.split('·')[1]}</strong><span>{p.subtitle}</span>
            </button>)}
          </div>}

          {gameMode==='coach'&&<div className="coach-features">
            <span>◈ Mercado</span><span>◈ Juveniles</span><span>◈ Vestuario</span><span>◈ Táctica</span>
          </div>}

          <button className="play-button" onClick={()=>{
            if(gameMode==='player') startPlayer(name,position,playerMode,activeClub,nationality)
            else startCoach(name,activeClub)
          }}>
            <span>▶</span>{gameMode==='player'?'EMPEZAR CARRERA':'ASUMIR COMO ENTRENADOR'}
          </button>
        </section>

        <section className="feature-grid">
          <article><span>⌁</span><div><strong>RANKING</strong><small>Compará runs y récords</small></div></article>
          <article><span>◎</span><div><strong>10 MINIJUEGOS</strong><small>5 jugador · 5 entrenador</small></div></article>
          <article><span>↗</span><div><strong>MERCADO</strong><small>Decisiones de carrera</small></div></article>
          <article><span>◇</span><div><strong>MODO DT</strong><small>8 temporadas de presión</small></div></article>
        </section>

        {clubPickerOpen&&country==='Argentina'&&<ClubPickerModal clubsList={availableClubs} selectedId={activeClub} onSelect={setClubId} onClose={()=>setClubPickerOpen(false)}/>}

        <footer className="legal-note">
          LEYENDA no incluye jugadores reales, marcas ni escudos oficiales. Los nombres de clubes provienen de fuentes abiertas; la identidad visual de los clubes dentro del juego es generada.
        </footer>
      </main>
    </div>
  </div>
}

function BottomNav({tab,setTab,coach}:{tab:Tab;setTab:(t:Tab)=>void;coach:boolean}){
  const items:Array<[Tab,string,string]> = coach
    ? [['career','⌂','Inicio'],['squad','▦','Equipo'],['minigames','◎','Desafíos'],['history','≡','Historia'],['ranking','⌁','Ranking']]
    : [['career','⌂','Carrera'],['market','↗','Mercado'],['training','◇','Entreno'],['shop','▣','Tienda'],['minigames','◎','Juegos'],['ranking','⌁','Ranking']]
  return <nav className="bottom-nav" style={{gridTemplateColumns:`repeat(${items.length},1fr)`}}>{items.map(([id,icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span><small>{label}</small></button>)}</nav>
}

const shopItems:Array<{id:string;icon:string;name:string;description:string;cost:number;effects:EventOption['effects']}>= [
  {id:'physio',icon:'✚',name:'Kinesiólogo personal',description:'Menos riesgo de lesión y mejor recuperación.',cost:180000,effects:{injuryRisk:-10,energy:6}},
  {id:'psych',icon:'◉',name:'Psicólogo deportivo',description:'Más moral y disciplina en los momentos duros.',cost:150000,effects:{morale:10,discipline:4}},
  {id:'physical',icon:'◆',name:'Preparador físico',description:'Mejora tu potencia y capacidad de sostener temporadas.',cost:260000,effects:{physical:4,pace:2,energy:7}},
  {id:'video',icon:'⌁',name:'Analista de video',description:'Lectura específica de tu puesto y confianza del DT.',cost:240000,effects:{}},
  {id:'technical',icon:'◎',name:'Entrenador técnico',description:'Trabajo individual específico para tu función.',cost:320000,effects:{}},
]

function shopEffectsFor(position:Position,id:string,base:EventOption['effects']):EventOption['effects']{
  if(id==='video'){
    if(position==='1')return {passing:3,reflexes:2,coachTrust:5}
    if(position==='2'||position==='5')return {passing:3,defending:3,coachTrust:5}
    return {passing:3,dribbling:2,coachTrust:5}
  }
  if(id==='technical'){
    if(position==='1')return {reflexes:4,passing:2}
    if(position==='2')return {defending:3,passing:3,physical:1}
    if(position==='5')return {passing:4,defending:2}
    return {dribbling:4,finishing:3}
  }
  return base
}

function ShopPanel({state,setState}:{state:CareerState;setState:(next:CareerState)=>void}){
  const owned=new Set(state.purchases??[])
  return <section className="panel shop-panel">
    <div className="panel-head"><div><span className="eyebrow">STAFF PERSONAL</span><h2>Invertí en tu carrera</h2></div><span className="wallet">$ {formatMoney(state.money)}</span></div>
    <p className="shop-intro">No hay marcas: contratás profesionales y mejoras que cambian tus stats de verdad.</p>
    <div className="shop-list">{shopItems.map(item=>{
      const bought=owned.has(item.id)
      const disabled=bought||state.money<item.cost
      const effects=shopEffectsFor(state.position,item.id,item.effects)
      return <button key={item.id} disabled={disabled} onClick={()=>{
        const next=applyEffects(state,effects)
        setState({...next,activeEvent:state.activeEvent,money:next.money-item.cost,purchases:[...(state.purchases??[]),item.id]})
      }}>
        <b>{item.icon}</b>
        <span><strong>{item.name}</strong><small>{item.description}</small><EffectChips effects={effects}/></span>
        <em>{bought?'CONTRATADO':'$ '+formatMoney(item.cost)}</em>
      </button>
    })}</div>
  </section>
}

function RankingPanel({scores}:{scores:RunScore[]}){
  return <section className="panel ranking-panel">
    <div className="panel-head"><div><span className="eyebrow">HALL DE LA FAMA</span><h2>Mejores carreras</h2></div><span className="pill">{globalRankingEnabled?'GLOBAL':'LOCAL'} · TOP {Math.min(20,scores.length)}</span></div>
    {scores.length===0?<div className="empty-state"><b>⌁</b><strong>Todavía no hay carreras terminadas.</strong><span>Tu primera run completa inaugura el ranking.</span></div>:
      <div className="ranking-list">{scores.slice(0,20).map((s,i)=><div key={s.id}><b>{String(i+1).padStart(2,'0')}</b><div><strong>{s.name}</strong><span>{s.detail}</span></div><em>{s.score.toLocaleString('es-AR')}</em></div>)}</div>}
  </section>
}

function MiniGamesPanel({
  mode,onScore,forcedGame,onComplete
}:{
  mode:'player'|'coach'
  onScore:(game:MiniGameId,score:number)=>void
  forcedGame?:MiniGameId
  onComplete?:(score:number)=>void
}){
  const games=miniGames.filter(game=>mode==='player'?game.playerOnly:game.coachOnly)
  const [active,setActive]=useState<MiniGameId|null>(forcedGame??null)
  const [round,setRound]=useState(0)
  const [score,setScore]=useState(0)
  const [feedback,setFeedback]=useState('')
  const [completed,setCompleted]=useState(false)

  useEffect(()=>{
    if(!forcedGame)return
    setActive(forcedGame)
    setRound(0)
    setScore(0)
    setFeedback('')
    setCompleted(false)
  },[forcedGame])

  const reset=(id:MiniGameId)=>{
    setActive(id)
    setRound(0)
    setScore(0)
    setFeedback('')
    setCompleted(false)
  }

  const commit=(earned:number,message:string)=>{
    if(!active||completed)return
    const nextRound=round+1
    const nextScore=score+earned
    setRound(nextRound)
    setScore(nextScore)
    setFeedback(message+' · +'+earned)
    if(nextRound>=5){
      setCompleted(true)
      onScore(active,nextScore)
      onComplete?.(nextScore)
    }
  }

  const playerChoice=(choice:number)=>{
    if(!active)return
    if(active==='penalties'){
      const keeper=Math.floor(Math.random()*3)
      commit(choice===keeper?18:100,choice===keeper?'ATAJÓ EL ARQUERO':'GOL')
      return
    }
    if(active==='keeper'){
      const shot=Math.floor(Math.random()*3)
      commit(choice===shot?100:22,choice===shot?'ATAJADÓN':'NO LLEGASTE')
      return
    }
    if(active==='duel'){
      const cue=round%3
      commit(choice===cue?100:28,choice===cue?'CRUCE LIMPIO':'TE SUPERÓ')
      return
    }
    if(active==='dribble'){
      const target=(round+score)%2
      commit(choice===target?100:24,choice===target?'LO DEJASTE ATRÁS':'TE CERRÓ')
      return
    }
  }

  const timingShot=()=>{
    const phase=(Date.now()%1800)/18
    const distance=Math.abs(phase-72)
    const earned=Math.max(18,Math.round(100-distance*2.15))
    commit(earned,earned>=88?'AL ÁNGULO':earned>=62?'BUEN REMATE':'LE FALTÓ PRECISIÓN')
  }

  const coachChoice=(choice:number)=>{
    if(!active)return
    const roundIndex=round%5
    const correct:Record<string,number[]> = {
      tactics:[1,0,2,1,2],
      lineup:[0,2,1,0,2],
      locker:[2,1,0,2,1],
      scouting:[1,2,0,1,2],
      negotiation:[1,0,2,1,0],
    }
    const expected=correct[active]?.[roundIndex]??0
    commit(choice===expected?100:choice===((expected+1)%3)?55:20,choice===expected?'DECISIÓN PERFECTA':'DECISIÓN DISCUTIBLE')
  }

  if(active){
    const game=miniGames.find(item=>item.id===active)!
    const roundLabel=Math.min(round+1,5)
    const duelCue=['RECORTE','PIQUE LARGO','CUERPO A CUERPO'][round%3]
    const dribbleCue=(round+score)%2===0?'← CAMBIO A IZQUIERDA':'CAMBIO A DERECHA →'
    const tacticalScenarios=[
      'El rival sale con doble punta y te gana la espalda.',
      'Te presionan alto y tu salida corta está bloqueada.',
      'El rival se mete atrás con nueve hombres.',
      'Ganás por uno y faltan quince minutos.',
      'Tu lateral está amonestado y el extremo rival lo busca.',
    ]
    const scoutCards=[
      [{a:'Técnica 66',b:'Físico 72',c:'Techo medio'},{a:'Técnica 61',b:'Físico 64',c:'Techo alto'},{a:'Técnica 70',b:'Físico 59',c:'Techo bajo'}],
      [{a:'Pase 71',b:'Lectura 65',c:'Techo alto'},{a:'Pase 68',b:'Lectura 72',c:'Techo medio'},{a:'Pase 62',b:'Lectura 60',c:'Techo alto'}],
      [{a:'Defensa 63',b:'Físico 70',c:'Techo alto'},{a:'Defensa 69',b:'Físico 68',c:'Techo medio'},{a:'Defensa 72',b:'Físico 74',c:'Techo bajo'}],
      [{a:'Velocidad 74',b:'Regate 61',c:'Techo medio'},{a:'Velocidad 68',b:'Regate 69',c:'Techo alto'},{a:'Velocidad 72',b:'Regate 67',c:'Techo medio'}],
      [{a:'Reflejos 66',b:'Juego aéreo 62',c:'Techo medio'},{a:'Reflejos 69',b:'Juego aéreo 65',c:'Techo bajo'},{a:'Reflejos 64',b:'Juego aéreo 70',c:'Techo alto'}],
    ][round%5]

    return <section className="panel minigame-arena minigame-arena--v2">
      <div className="minigame-topline">
        {!forcedGame?<button className="back-link" onClick={()=>setActive(null)}>← Volver</button>:<span className="final-game-badge">FINAL · SIN REINTENTO</span>}
        <span>RONDA {roundLabel}/5</span>
      </div>
      <div className="minigame-title"><b>{game.icon}</b><div><span className="eyebrow">{mode==='player'?'HABILIDAD':'DESPACHO DEL DT'}</span><h2>{game.name}</h2><p>{game.description}</p></div></div>
      <div className="arena-score"><span>PUNTOS</span><strong>{score}</strong></div>

      {active==='penalties'&&<div className="skill-stage penalty-stage">
        <div className="goal-frame"><span className="keeper">●</span><i className="net"/></div>
        <div className="skill-prompt">Elegí dónde patear.</div>
        <div className="three-actions"><button onClick={()=>playerChoice(0)}>↙ IZQ</button><button onClick={()=>playerChoice(1)}>↑ CENTRO</button><button onClick={()=>playerChoice(2)}>DER ↘</button></div>
      </div>}

      {active==='keeper'&&<div className="skill-stage penalty-stage keeper-stage">
        <div className="goal-frame"><span className="keeper keeper--you">🧤</span><i className="net"/></div>
        <div className="skill-prompt">Leé la carrera y tirate.</div>
        <div className="three-actions"><button onClick={()=>playerChoice(0)}>↙ IZQ</button><button onClick={()=>playerChoice(1)}>↑ CENTRO</button><button onClick={()=>playerChoice(2)}>DER ↘</button></div>
      </div>}

      {active==='freekicks'&&<div className="skill-stage freekick-stage">
        <div className="freekick-scene"><div className="wall"><i/><i/><i/><i/></div><div className="mini-goal"/><span className="mini-ball">●</span></div>
        <div className="timing-bar"><i/><b/></div>
        <div className="skill-prompt">El marcador se mueve. Pegale cerca de la zona celeste.</div>
        <button className="skill-main-action" onClick={timingShot}>⚡ PATEAR</button>
      </div>}

      {active==='dribble'&&<div className="skill-stage dribble-stage">
        <div className="slalom-field"><i/><i/><i/><i/><i/><span>●</span></div>
        <strong className="big-cue">{dribbleCue}</strong>
        <div className="two-actions"><button onClick={()=>playerChoice(0)}>← IZQUIERDA</button><button onClick={()=>playerChoice(1)}>DERECHA →</button></div>
      </div>}

      {active==='duel'&&<div className="skill-stage duel-stage">
        <div className="duel-visual"><span className="defender-silhouette">◆</span><b>VS</b><span className="attacker-silhouette">●</span></div>
        <strong className="big-cue">{duelCue}</strong>
        <div className="three-actions"><button onClick={()=>playerChoice(0)}>ANTICIPAR</button><button onClick={()=>playerChoice(1)}>ACOMPAÑAR</button><button onClick={()=>playerChoice(2)}>BARRER</button></div>
      </div>}

      {active==='tactics'&&<div className="skill-stage coach-game-stage">
        <div className="tactical-board"><i className="half"/>{[18,33,48,62,77].map((x,i)=><span key={i} style={{left:x+'%',top:(25+(i%2)*42)+'%'}}/> )}</div>
        <strong className="scenario-title">{tacticalScenarios[round%5]}</strong>
        <div className="coach-options"><button onClick={()=>coachChoice(0)}>BLOQUE BAJO + SALIDA RÁPIDA</button><button onClick={()=>coachChoice(1)}>AJUSTAR PRESIÓN Y ALTURA</button><button onClick={()=>coachChoice(2)}>CAMBIAR ESTRUCTURA</button></div>
      </div>}

      {active==='lineup'&&<div className="skill-stage coach-game-stage">
        <div className="formation-board"><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><b>GK</b></div>
        <strong className="scenario-title">{tacticalScenarios[(round+2)%5]}</strong>
        <div className="coach-options"><button onClick={()=>coachChoice(0)}>4-3-3 · ANCHO</button><button onClick={()=>coachChoice(1)}>4-4-2 · BLOQUE MEDIO</button><button onClick={()=>coachChoice(2)}>3-5-2 · SUPERIORIDAD CENTRAL</button></div>
      </div>}

      {active==='locker'&&<div className="skill-stage coach-game-stage locker-stage">
        <div className="locker-art"><span>▤</span><i/><i/><i/></div>
        <strong className="scenario-title">{['La figura fue suplente y explotó frente al grupo.','Perdiste un clásico y el vestuario está quebrado.','Un juvenil pide jugar o irse.','Dos referentes se pelearon en el entrenamiento.','Estás a un partido del título y sobra ansiedad.'][round%5]}</strong>
        <div className="coach-options"><button onClick={()=>coachChoice(0)}>MARCAR AUTORIDAD</button><button onClick={()=>coachChoice(1)}>HABLAR EN PRIVADO</button><button onClick={()=>coachChoice(2)}>RESPALDAR AL GRUPO</button></div>
      </div>}

      {active==='scouting'&&<div className="skill-stage coach-game-stage scouting-stage">
        <strong className="scenario-title">Elegí el proyecto con mejor combinación de presente y techo.</strong>
        <div className="prospect-grid">{scoutCards.map((card,index)=><button key={index} onClick={()=>coachChoice(index)}><b>U20-{index+1}</b><span>{card.a}</span><span>{card.b}</span><em>{card.c}</em></button>)}</div>
      </div>}

      {active==='negotiation'&&<div className="skill-stage coach-game-stage negotiation-stage">
        <div className="negotiation-visual"><span>$</span><div><i/><i/><i/></div></div>
        <strong className="scenario-title">{['El club vendedor pide demasiado por un titular.','Tu figura exige renovar antes del clásico.','Te ofrecen comprar a un juvenil por debajo de mercado.','Un agente presiona con otra oferta.','Necesitás liberar salario antes del cierre.'][round%5]}</strong>
        <div className="coach-options"><button onClick={()=>coachChoice(0)}>ACEPTAR AHORA</button><button onClick={()=>coachChoice(1)}>CONTRAOFERTAR</button><button onClick={()=>coachChoice(2)}>LEVANTARSE DE LA MESA</button></div>
      </div>}

      <div className={'minigame-feedback '+(completed?'complete':'')}>{completed?'DESAFÍO COMPLETO · '+score+' PTS':feedback||'JUGÁ LA RONDA'}</div>
      {completed&&!forcedGame&&<button className="play-button" onClick={()=>reset(active)}>JUGAR DE NUEVO</button>}
    </section>
  }

  return <section className="panel minigame-hub">
    <div className="panel-head"><div><span className="eyebrow">{mode==='player'?'CENTRO DE HABILIDAD':'LABORATORIO DEL DT'}</span><h2>{mode==='player'?'Cinco pruebas jugables':'Cinco desafíos de gestión'}</h2></div><span className="pill">5 MODOS</span></div>
    <p className="minigame-hub__intro">{mode==='player'?'Cada prueba entrena una parte distinta de tu jugador. No son decisiones de texto: tenés que acertar.':'Táctica, scouting, vestuario, formación y mercado. Tus decisiones puntúan el trabajo de entrenador.'}</p>
    <div className="minigame-grid minigame-grid--v2">{games.map(game=><button key={game.id} onClick={()=>reset(game.id)}>
      <b>{game.icon}</b>
      <div><strong>{game.name}</strong><span>{game.description}</span></div>
      <em>JUGAR →</em>
    </button>)}</div>
  </section>
}

function trainingOptionsFor(position:Position){
  const common={
    physical:['physical','Potencia física','Físico · velocidad · energía'],
    technique:['technique','Técnica específica','Control y pase'],
    finishing:['finishing','Definición','Finalización y ataque'],
    defending:['defending','Defensa y cruces','Marca · físico · liderazgo'],
    mind:['mind',position==='1'?'Reflejos y lectura':'Cabeza fría',position==='1'?'Reflejos · moral · disciplina':'Moral · disciplina · lectura'],
  } as const
  const ids:Record<Position,Array<keyof typeof common>>={
    '9':['physical','technique','finishing','mind'],
    '10':['technique','finishing','physical','mind'],
    '7':['physical','technique','finishing','mind'],
    '5':['technique','defending','physical','mind'],
    '2':['defending','physical','technique','mind'],
    '1':['mind','physical','technique'],
  }
  return ids[position].map(id=>common[id])
}

function PlayerGame({state,setState,theme,onTheme,onExit}:{state:CareerState;setState:(s:CareerState)=>void;theme:Theme;onTheme:()=>void;onExit:()=>void}){
  const [tab,setTab]=useState<Tab>('career')
  const [scores,setScores]=useState<RunScore[]>(()=>getRunScores())
  const [lastEffects,setLastEffects]=useState<EventOption['effects']|null>(null)
  const [seasonSummary,setSeasonSummary]=useState<SeasonRecord|null>(null)
  const club=clubById(state.clubId)
  const playerStats=statsFor(state)
  const {media:playerMedia}=useClubMedia(club.name)

  useEffect(()=>{
    loadLeaderboard().then(setScores)
  },[])
  const league=leagueById(club.leagueId)

  useEffect(()=>{
    if(state.retired&&state.finalScore&&!scores.some(s=>s.id==='player-'+state.seed)){
      const run={id:'player-'+state.seed,name:state.playerName,mode:'player' as const,score:state.finalScore,detail:`${state.position} · ${state.history.length} temporadas · ${state.titles} títulos`,createdAt:Date.now()}
      const next=saveRunScore(run)
      setScores(next)
      void submitLeaderboardScore(run).then(()=>loadLeaderboard()).then(setScores)
    }
  },[state.retired,state.finalScore])

  const playSeason=()=>{
    const next=simulateSeason(state)
    setSeasonSummary(next.history[next.history.length-1]??null)
    setLastEffects(null)
    setState(next)
  }

  const playMini=(game:MiniGameId,value:number)=>{
    const bonus=Math.max(1,Math.round(value/110))
    const effects:EventOption['effects']=
      game==='penalties'||game==='freekicks'?{finishing:bonus,form:2}:
      game==='dribble'?{dribbling:bonus,pace:Math.max(1,bonus-1)}:
      game==='keeper'?{reflexes:bonus,form:2}:
      game==='duel'?{defending:bonus,physical:Math.max(1,bonus-1)}:
      {form:1}
    const next=applyEffects(state,effects)
    setState({...next,activeEvent:state.activeEvent})
  }

  return <div className="shell game-shell">
    <header className="game-header">
      <button className="brand brand--button" onClick={onExit}><span className="brand__mark">L</span><span><strong>LEYENDA</strong><small>← MENÚ</small></span></button>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <main className="game-main">
      {seasonSummary&&<div className="season-result-overlay" onClick={()=>setSeasonSummary(null)}>
        <section className={'season-result '+(seasonSummary.titles?'season-result--champion':'')} onClick={event=>event.stopPropagation()}>
          <span className="season-result__eyebrow">{seasonSummary.titles?'🏆 TEMPORADA CAMPEONA':'TEMPORADA COMPLETA'}</span>
          <ClubCrest name={clubById(seasonSummary.clubId).name} size="lg"/>
          <h2>{clubById(seasonSummary.clubId).name}</h2>
          <p>Temporada {seasonSummary.season} · {seasonSummary.age} años</p>
          <div className="season-result__stats">
            <Stat value={seasonSummary.matches} label="PJ"/>
            <Stat value={seasonSummary.goals} label="GOLES"/>
            <Stat value={seasonSummary.assists} label="ASIST."/>
            <Stat value={seasonSummary.rating} label="RATING"/>
          </div>
          <div className="season-result__score"><span>SCORE DE TEMPORADA</span><strong>{seasonSummary.score.toLocaleString('es-AR')}</strong></div>
          <em>{seasonSummary.note}</em>
          <button className="play-button" onClick={()=>setSeasonSummary(null)}>CONTINUAR →</button>
        </section>
      </div>}
      <section className="identity-card identity-card--media" style={(playerMedia.stadiumImage??playerMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 35%,rgba(5,10,18,.58)),url("'+(playerMedia.stadiumImage??playerMedia.image)+'")'}:undefined}>
        <ClubCrest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">{league.name}</span><h1>{state.playerName}</h1><p>{state.position} · {state.age} años · {club.name}</p></div>
        <div className="overall"><strong>{state.overall}</strong><span>OVR</span></div>
      </section>
      <MatchdayScene clubName={club.name} media={playerMedia} mode="player" season={state.season} age={state.age}/>

      <div className="quick-stats">
        <Stat value={state.matches} label="PJ"/><Stat value={state.goals} label="GOLES"/><Stat value={state.assists} label="ASIST."/><Stat value={state.titles} label="TÍTULOS"/>
      </div>

      <PlayerAttributes state={{...state,stats:playerStats}}/>
      <IdolProgress value={state.clubLegacy??0} years={state.history.filter(item=>item.clubId===state.clubId).length}/>

      {tab==='career'&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {lastEffects&&<div className="decision-feedback"><div><span className="eyebrow">DECISIÓN TOMADA</span><strong>Tu jugador cambió</strong><EffectChips effects={lastEffects}/></div><button onClick={()=>setLastEffects(null)}>×</button></div>}
          {state.retired?<><span className="eyebrow">FINAL DE CARRERA</span><h2>Tu historia ya está escrita.</h2><p>Terminaste {state.history.length} temporadas con {state.matches} partidos y {state.titles} títulos.</p><div className="final-score"><span>SCORE FINAL</span><strong>{careerScore(state).toLocaleString('es-AR')}</strong></div></>:
          state.activeEvent?<><DecisionScene category={state.activeEvent.category} title={state.activeEvent.title} media={playerMedia} clubName={club.name}/><span className="eyebrow">{state.activeEvent.eyebrow}</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=><button key={o.id} onClick={()=>{setLastEffects(o.effects);setState(choosePlayerEvent(state,o as EventOption))}}><div><strong>{o.label}</strong><span>{o.description}</span><EffectChips effects={o.effects}/></div><b>→</b></button>)}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season} DE {state.maxSeasons}</span><h2>Todo listo para competir.</h2><p>Tu estado físico, la confianza, el vestuario y las decisiones ya están en juego.</p><button className="play-button" onClick={playSeason}>▶ JUGAR TEMPORADA</button></>}
        </section>

        <aside className="panel condition-panel">
          <div className="panel-head"><div><span className="eyebrow">CONDICIÓN</span><h3>Estado del jugador</h3></div><span className="condition-label">{state.energy>70?'ÓPTIMO':state.energy>45?'CARGADO':'AL LÍMITE'}</span></div>
          <Meter label="Forma" value={state.form}/><Meter label="Energía" value={state.energy}/><Meter label="Moral" value={state.morale}/><Meter label="Confianza DT" value={state.coachTrust}/><Meter label="Disciplina" value={state.discipline}/><Meter label="Liderazgo" value={state.leadership}/>
        </aside>
      </div>}

      {tab==='market'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">MERCADO</span><h2>Tu próximo paso</h2></div><span className="pill">$ {formatMoney(club.salary)}/mes</span></div>
        {state.offers.length===0?<div className="empty-state"><b>↗</b><strong>No hay ofertas formales.</strong><span>Terminá otra temporada para mover el mercado.</span></div>:
        <div className="offer-grid">{state.offers.map(id=>{const next=clubById(id);return <button key={id} onClick={()=>{setState(transferTo(state,id));setTab('career')}}><ClubCrest name={next.name}/><div><span>{leagueById(next.leagueId).name}</span><strong>{next.name}</strong><small>$ {formatMoney(next.salary)}/mes</small></div><b>FIRMAR</b></button>})}</div>}
      </section>}

      {tab==='training'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ENTRENAMIENTO</span><h2>{state.trainingCredits} sesiones disponibles</h2></div></div>
        <div className="training-grid">
          {trainingOptionsFor(state.position).map(x=><button key={x[0]} disabled={!state.trainingCredits} onClick={()=>setState(trainCareer(state,x[0] as 'physical'|'technique'|'finishing'|'mind'|'defending'))}><b>◇</b><strong>{x[1]}</strong><span>{x[2]}</span></button>)}
        </div>
      </section>}

      {tab==='shop'&&<ShopPanel state={state} setState={setState}/>}\n      {tab==='minigames'&&<MiniGamesPanel mode="player" onScore={playMini}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ARCHIVO</span><h2>Tu historia</h2></div><span className="pill">{state.history.length} TEMP.</span></div>
        {state.history.length===0?<div className="empty-state"><b>≡</b><strong>La historia está en blanco.</strong><span>Terminá la primera temporada.</span></div>:
          <div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><ClubCrest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season} · {s.age} años</span><p>{s.note}</p></div><aside><b>{s.rating}</b><span>RAT</span></aside></article>)}</div>}
      </section>}
    </main>
    <BottomNav tab={tab} setTab={setTab} coach={false}/>
  </div>
}

function CoachGame({state,setState,theme,onTheme,onExit}:{state:CoachState;setState:(s:CoachState)=>void;theme:Theme;onTheme:()=>void;onExit:()=>void}){
  const [tab,setTab]=useState<Tab>('career')
  const [scores,setScores]=useState<RunScore[]>(()=>getRunScores())
  const club=clubById(state.clubId)
  const {media:coachMedia}=useClubMedia(club.name)

  useEffect(()=>{
    loadLeaderboard().then(setScores)
  },[])

  useEffect(()=>{
    if(state.retired&&state.finalScore&&!scores.some(s=>s.id==='coach-'+state.coachName+'-'+state.clubId)){
      const run={id:'coach-'+state.coachName+'-'+state.clubId,name:state.coachName,mode:'coach' as const,score:state.finalScore,detail:`DT · ${club.name} · ${state.titles} títulos`,createdAt:Date.now()}
      setScores(saveRunScore(run))
      void submitLeaderboardScore(run).then(()=>loadLeaderboard()).then(setScores)
    }
  },[state.retired,state.finalScore])

  return <div className="shell game-shell">
    <header className="game-header">
      <button className="brand brand--button" onClick={onExit}><span className="brand__mark">L</span><span><strong>LEYENDA</strong><small>← MENÚ</small></span></button>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <main className="game-main">
      <section className="identity-card coach-identity identity-card--media" style={(coachMedia.stadiumImage??coachMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 35%,rgba(5,10,18,.58)),url("'+(coachMedia.stadiumImage??coachMedia.image)+'")'}:undefined}>
        <ClubCrest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">MODO ENTRENADOR · {leagueById(club.leagueId).name}</span><h1>{state.coachName}</h1><p>{club.name} · Temporada {state.season}/{state.maxSeasons}</p></div>
        <div className="overall"><strong>{state.tacticalRating}</strong><span>TÁCTICA</span></div>
      </section>
      <MatchdayScene clubName={club.name} media={coachMedia} mode="coach" season={state.season}/>

      <div className="quick-stats"><Stat value={state.titles} label="TÍTULOS"/><Stat value={state.boardTrust} label="DIRECTIVA"/><Stat value={state.fanTrust} label="HINCHADA"/><Stat value={'$ '+formatMoney(state.budget)} label="CAJA"/></div>

      {tab==='career'&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {state.retired?<><span className="eyebrow">FIN DEL CICLO</span><h2>Tu proyecto terminó.</h2><p>Ocho temporadas de decisiones, mercado y vestuario.</p><div className="final-score"><span>SCORE DT</span><strong>{coachScore(state).toLocaleString('es-AR')}</strong></div></>:
          state.activeEvent?<><DecisionScene category="coach" title={state.activeEvent.title} media={coachMedia} clubName={club.name}/><span className="eyebrow">DECISIÓN DEL ENTRENADOR</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=><button key={o.id} onClick={()=>setState(chooseCoachEvent(state,o))}><div><strong>{o.label}</strong><span>Impacta en tu proyecto.</span></div><b>→</b></button>)}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season}</span><h2>El equipo está listo.</h2><p>La táctica, la moral, los juveniles y la confianza de la directiva definen el año.</p><button className="play-button" onClick={()=>setState(simulateCoachSeason(state))}>▶ DIRIGIR TEMPORADA</button></>}
        </section>
        <aside className="panel condition-panel"><span className="eyebrow">PROYECTO</span><h3>Estado del club</h3><Meter label="Directiva" value={state.boardTrust}/><Meter label="Hinchas" value={state.fanTrust}/><Meter label="Moral" value={state.morale}/><Meter label="Táctica" value={state.tacticalRating}/><Meter label="Juveniles" value={state.youthRating}/></aside>
      </div>}

      {tab==='squad'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">VESTUARIO</span><h2>Gestión de equipo</h2></div><span className="pill">SIN JUGADORES REALES</span></div>
        <div className="coach-tools"><article><b>4-3-3</b><strong>Plan ofensivo</strong><span>Presión alta y amplitud.</span></article><article><b>4-4-2</b><strong>Bloque medio</strong><span>Orden y transiciones.</span></article><article><b>3-5-2</b><strong>Control central</strong><span>Más riesgo, más presencia.</span></article></div>
        <div className="squad-note">Los futbolistas del plantel se representan por rol y atributos, nunca por nombres de jugadores reales.</div>
      </section>}

      {tab==='minigames'&&<MiniGamesPanel mode="coach" onScore={(_,value)=>setState({...state,tacticalRating:Math.min(100,state.tacticalRating+Math.max(1,Math.round(value/180))),fanTrust:Math.min(100,state.fanTrust+(value>=400?2:0))})}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel"><div className="panel-head"><div><span className="eyebrow">ARCHIVO DEL DT</span><h2>Temporadas</h2></div></div><div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><ClubCrest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season}</span><p>{s.note}</p></div><aside><b>#{s.position}</b><span>{s.points} PTS</span></aside></article>)}</div></section>}
    </main>
    <BottomNav tab={tab} setTab={setTab} coach={true}/>
  </div>
}

export function App(){
  const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem(THEME_KEY) as Theme)||'dark')
  const [save,setSave]=useState<SaveState>(()=>{
    try{
      const raw=localStorage.getItem(SAVE_KEY)
      return raw?normalizeSaveState(JSON.parse(raw) as SaveState):null
    }catch{return null}
  })

  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    localStorage.setItem(THEME_KEY,theme)
  },[theme])

  useEffect(()=>{
    if(save)localStorage.setItem(SAVE_KEY,JSON.stringify(save))
  },[save])

  const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark')
  const exit=()=>{setSave(null);localStorage.removeItem(SAVE_KEY)}

  if(!save){
    return <Home theme={theme} onTheme={toggleTheme}
      startPlayer={(name,position,mode,clubId,nationality)=>setSave(createCareer(name,position,mode,clubId,nationality))}
      startCoach={(name,clubId)=>setSave(createCoach(name,clubId))}
    />
  }

  if(save.gameMode==='coach') return <CoachGame state={save} setState={setSave} theme={theme} onTheme={toggleTheme} onExit={exit}/>
  return <PlayerGame state={save} setState={setSave} theme={theme} onTheme={toggleTheme} onExit={exit}/>
}
