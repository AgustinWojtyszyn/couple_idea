import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  type CabalaGameId,
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
  careerDecisionEffects,
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
    divisionTier:value.divisionTier??leagueById(current.leagueId).tier,
    caps:0,
    nationalGoals:0,
    finalStyle:value.finalStyle??null,
    pendingFinal:value.pendingFinal&&'kind' in value.pendingFinal&&'cabalaGame' in value.pendingFinal?value.pendingFinal:null,
    retirementPending:value.retirementPending??false,
    trophies:value.trophies??[],
    glory:value.glory??0,
    lastSeasonGlory:value.lastSeasonGlory??0,
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
const AUTH_KEY='leyenda-demo-auth-v1'

function LeyendaLogo({size='md'}:{size?:'sm'|'md'|'lg'}){
  return <span className={'leyenda-logo leyenda-logo--'+size} aria-label="Leyenda">
    <svg className="leyenda-emblem" viewBox="0 0 140 156" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="legendShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7ec8ff"/>
          <stop offset="48%" stopColor="#317cff"/>
          <stop offset="100%" stopColor="#123f9b"/>
        </linearGradient>
        <linearGradient id="legendGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0a8"/>
          <stop offset="52%" stopColor="#e7ba4a"/>
          <stop offset="100%" stopColor="#8d621b"/>
        </linearGradient>
      </defs>
      <g className="emblem-laurels">
        <path d="M34 123C17 112 9 94 11 73C12 56 19 41 31 30" fill="none" stroke="url(#legendGold)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M106 123C123 112 131 94 129 73C128 56 121 41 109 30" fill="none" stroke="url(#legendGold)" strokeWidth="5" strokeLinecap="round"/>
        <path d="M22 106l-12-2 8-9m-2-9L5 80l12-5m1-10L8 56l14-2m4-10l-7-11 14 2" fill="none" stroke="#e7ba4a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M118 106l12-2-8-9m2-9 11-6-12-5m-1-10 10-9-14-2m-4-10 7-11-14 2" fill="none" stroke="#e7ba4a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <path className="emblem-star" d="M70 4l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2z" fill="url(#legendGold)"/>
      <path d="M70 23L111 39V78c0 29-17 48-41 62-24-14-41-33-41-62V39z" fill="#071323" stroke="#d9edff" strokeWidth="3"/>
      <path d="M70 30l33 13v34c0 23-13 39-33 52-20-13-33-29-33-52V43z" fill="url(#legendShield)" stroke="rgba(255,255,255,.35)" strokeWidth="2"/>
      <path d="M70 39l24 9v27c0 17-9 29-24 40-15-11-24-23-24-40V48z" fill="rgba(5,16,37,.32)" stroke="rgba(255,255,255,.24)" strokeWidth="1.5"/>
      <circle cx="70" cy="72" r="23" fill="rgba(4,14,31,.62)" stroke="#e8f4ff" strokeWidth="2"/>
      <path d="M55 59l11 7 13-4 8 10-7 12-14 1-10-10z" fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="1.7"/>
      <path d="M66 66l-4 12m17-16-2 14m-11 9 7 8" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="1.4"/>
      <text x="70" y="82" textAnchor="middle" className="emblem-letter">L</text>
      <path d="M35 118h70l-8 20H43z" fill="#071323" stroke="url(#legendGold)" strokeWidth="2"/>
      <text x="70" y="132" textAnchor="middle" className="emblem-word">LEYENDA</text>
    </svg>
  </span>
}

function MockLogin({onEnter}:{onEnter:(name:string)=>void}){
  const [name,setName]=useState('')
  const [password,setPassword]=useState('')
  const submit=(event:FormEvent)=>{
    event.preventDefault()
    onEnter(name.trim()||'Invitado')
  }
  return <div className="demo-login">
    <div className="demo-login__stadium"><i/><i/><i/><i/></div>
    <section className="demo-login__card">
      <div className="demo-login__brand"><LeyendaLogo size="lg"/><div><span>LEYENDA</span><small>FÚTBOL · DESTINO · HISTORIA</small></div></div>
      <div className="demo-login__copy"><span className="eyebrow">ACCESO DE PRUEBA</span><h1>Tu carrera empieza antes del primer partido.</h1><p>Inicio de sesión local para esta demo. No hay base de datos ni se envían credenciales.</p></div>
      <form onSubmit={submit}>
        <label><span>USUARIO O APODO</span><input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Agustín"/></label>
        <label><span>CONTRASEÑA DEMO</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Cualquier valor"/></label>
        <button type="submit">ENTRAR A LEYENDA →</button>
      </form>
      <button className="demo-login__guest" onClick={()=>onEnter('Invitado')}>Entrar como invitado</button>
      <small className="demo-login__note">La sesión dura mientras esta pestaña siga abierta.</small>
    </section>
  </div>
}

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
  const [loading,setLoading]=useState(Boolean(name))
  useEffect(()=>{
    let alive=true
    if(!name){setMedia({});setLoading(false);return()=>{alive=false}}
    setLoading(true)
    void getClubMedia(name).then(value=>{
      if(!alive)return
      setMedia(value)
      setLoading(false)
      void getClubMedia(name,true).then(fresh=>{
        if(!alive)return
        if(fresh.logo||fresh.image||fresh.stadiumImage)setMedia(fresh)
      })
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

function ClubPickerModal({clubsList,selectedId,title,onSelect,onClose}:{clubsList:typeof clubs;selectedId:string;title:string;onSelect:(id:string)=>void;onClose:()=>void}){
  const [query,setQuery]=useState('')
  const filtered=clubsList.filter(club=>club.name.toLowerCase().includes(query.trim().toLowerCase()))
  return <div className="club-picker-overlay" onClick={onClose}>
    <section className="club-picker-modal" onClick={event=>event.stopPropagation()}>
      <div className="club-picker-grab"/>
      <div className="club-picker-modal__head">
        <div><span className="eyebrow">{title.toUpperCase()}</span><h2>Elegí tu club</h2></div>
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
  useEffect(()=>{window.scrollTo({top:0,behavior:'auto'})},[])
  const countries=useMemo(()=>[...new Set(leagues.map(l=>l.country))].sort((a,b)=>a.localeCompare(b,'es')),[])
  const [gameMode,setGameMode]=useState<GameMode>('player')
  const [playerMode,setPlayerMode]=useState<PlayerMode>('classic')
  const [name,setName]=useState('')
  const [nationality,setNationality]=useState('Argentina')
  const [country,setCountry]=useState('')
  const [leagueId,setLeagueId]=useState('')
  const [clubId,setClubId]=useState('')
  const [position,setPosition]=useState<Position>('9')
  const [clubPickerOpen,setClubPickerOpen]=useState(false)

  const availableLeagues=country?leagues.filter(l=>l.country===country).sort((a,b)=>a.tier-b.tier):[]
  const activeLeague=availableLeagues.some(l=>l.id===leagueId)?leagueId:''
  const availableClubs=activeLeague?clubsByLeague(activeLeague):[]
  const activeClub=availableClubs.some(club=>club.id===clubId)?clubId:''
  const selectedClub=activeClub?clubById(activeClub):null
  const {media:selectedMedia}=useClubMedia(selectedClub?.name??'')
  const canStart=Boolean(country&&activeLeague&&activeClub)

  const changeCountry=(value:string)=>{
    setCountry(value)
    setLeagueId('')
    setClubId('')
    setClubPickerOpen(false)
  }

  const changeLeague=(value:string)=>{
    setLeagueId(value)
    setClubId('')
    setClubPickerOpen(false)
  }

  useEffect(()=>{
    if(country!=='Argentina'||!activeLeague)return
    const id=window.setTimeout(()=>{
      void preloadClubMedia(availableClubs.map(club=>club.name),5,false)
    },120)
    return()=>window.clearTimeout(id)
  },[country,activeLeague])

  const leagueLabel=activeLeague?leagueById(activeLeague):null

  return <div className="shell shell--home">
    <header className="site-header">
      <a className="brand" href="#" onClick={event=>event.preventDefault()}>
        <LeyendaLogo size="sm"/>
        <span><strong>LEYENDA</strong><small>FÚTBOL · DESTINO · GLORIA</small></span>
      </a>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <div className="home-layout">
      <aside className="desktop-rail">
        <div className="rail-title"><span>✦</span> MUNDO LEYENDA</div>
        <div className="rail-search">Elegí dónde empieza tu historia</div>
        <div className="rail-list">
          {countries.slice(0,12).map(item=><button key={item} className={item===country?'active':''} onClick={()=>changeCountry(item)}>
            <span>{item}</span><b>{leagues.filter(league=>league.country===item).length}</b>
          </button>)}
        </div>
        <div className="rail-foot"><strong>ARG</strong><span>Primera + Primera Nacional listas para test.</span></div>
      </aside>

      <main className="home-main home-main--compact">
        <section className="hero-card hero-card--compact">
          <div className="hero-card__glow"/>
          <div className="hero-card__top"><span className="eyebrow">NUEVA CARRERA</span><span className="status-dot">● ARGENTINA LAB</span></div>
          <div className="hero-card__brand"><LeyendaLogo size="lg"/><span>LEYENDA</span><small>Ganate el nombre. No te lo regala nadie.</small></div>
          <div className="mode-tabs">
            <button className={gameMode==='player'?'active':''} onClick={()=>setGameMode('player')}>MODO JUGADOR</button>
            <button className={gameMode==='coach'?'active':''} onClick={()=>setGameMode('coach')}>MODO ENTRENADOR</button>
          </div>
        </section>

        <section className="create-card create-card--primary">
          <div className="setup-heading">
            <div><span className="eyebrow">TU ARRANQUE</span><h2>Elegí dónde empieza todo.</h2><p>Nada se asigna al azar. País, división y club son decisión tuya.</p></div>
            <div className="setup-progress">
              <span className={country?'done':'active'}>1<small>PAÍS</small></span>
              <span className={activeLeague?'done':country?'active':''}>2<small>DIVISIÓN</small></span>
              <span className={activeClub?'done':activeLeague?'active':''}>3<small>CLUB</small></span>
              <span className={activeClub?'active':''}>4<small>ROL</small></span>
            </div>
          </div>

          <div className="form-grid form-grid--start">
            {gameMode==='player'&&<SelectField label="NACIONALIDAD" value={nationality} onChange={setNationality}>
              {[...new Set(['Argentina',...countries])].map(item=><option key={item} value={item}>{item}</option>)}
            </SelectField>}
            <SelectField label="PAÍS DE LA LIGA" value={country} onChange={changeCountry}>
              <option value="">Elegí un país...</option>
              {countries.map(item=><option key={item} value={item}>{item}</option>)}
            </SelectField>
            <SelectField label="DIVISIÓN" value={activeLeague} onChange={changeLeague}>
              <option value="">{country?'Elegí una división...':'Primero elegí un país'}</option>
              {availableLeagues.map(league=><option key={league.id} value={league.id}>{league.tier}ª División · {league.country}</option>)}
            </SelectField>
          </div>

          {activeLeague&&<section className="club-choice-zone">
            <div className="club-choice-head">
              <div><span className="eyebrow">{country.toUpperCase()} · {leagueLabel?.tier}ª DIVISIÓN</span><h3>Elegí tu club</h3></div>
              <button className="club-picker-open" onClick={()=>setClubPickerOpen(true)}>{availableClubs.length} CLUBES · VER TODOS</button>
            </div>
            <div className="club-strip club-strip--choice">
              {availableClubs.slice(0,12).map(club=><button key={club.id} className={club.id===activeClub?'active':''} onClick={()=>setClubId(club.id)}>
                <ClubCrest name={club.name}/>
                <span>{club.name}</span>
              </button>)}
            </div>
          </section>}

          {selectedClub?<div className="club-preview club-preview--media club-preview--selected" style={(selectedMedia.stadiumImage??selectedMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 18%,rgba(5,10,18,.7)),url("'+(selectedMedia.stadiumImage??selectedMedia.image)+'")'}:undefined}>
            <ClubCrest name={selectedClub.name} size="lg"/>
            <div><span>{leagueById(selectedClub.leagueId).name}</span><strong>{selectedClub.name}</strong><small>Este será tu primer club.</small></div>
            <b>✓</b>
          </div>:<div className="club-empty-prompt"><b>◈</b><span><strong>Elegí un club para continuar.</strong><small>La carrera no arranca hasta que vos decidas el destino.</small></span></div>}

          <label className="name-field">
            <span>{gameMode==='player'?'NOMBRE O APODO':'NOMBRE DEL ENTRENADOR'}</span>
            <input value={name} onChange={event=>setName(event.target.value)} maxLength={24} placeholder={gameMode==='player'?'Ej: El Zurdo':'Ej: Míster A.'}/>
          </label>

          {gameMode==='player'&&<div className="position-choice">
            <div className="position-choice__head"><span className="eyebrow">POSICIÓN</span><strong>Elegí por identidad, no por números.</strong></div>
            <div className="positions">
              {positions.map(item=><button key={item.id} className={position===item.id?'active':''} onClick={()=>setPosition(item.id)}>
                <b>{item.id}</b><strong>{item.title.split('·')[1]}</strong><span>{item.subtitle}</span>
              </button>)}
            </div>
          </div>}

          {gameMode==='coach'&&<div className="coach-features">
            <span>◈ Mercado</span><span>◈ Juveniles</span><span>◈ Vestuario</span><span>◈ Táctica</span>
          </div>}

          <button className="play-button start-career-button" disabled={!canStart} onClick={()=>{
            if(!activeClub)return
            if(gameMode==='player') startPlayer(name,position,playerMode,activeClub,nationality)
            else startCoach(name,activeClub)
          }}>
            <span>▶</span>{canStart?(gameMode==='player'?'EMPEZAR CARRERA':'ASUMIR COMO ENTRENADOR'):'ELEGÍ PAÍS, DIVISIÓN Y CLUB'}
          </button>
        </section>

        <section className="daily-card daily-card--compact">
          <div className="section-head"><div><span className="eyebrow">DESAFÍO DEL DÍA</span><h2>Una carrera corta. Una semilla compartida.</h2></div><span className="pill">HOY</span></div>
          <div className="daily-goals daily-goals--horizontal"><div><b>01</b><span>Terminá</span><strong>+500</strong></div><div><b>02</b><span>Ganate un título</span><strong>+250</strong></div><div><b>03</b><span>Superá tu score</span><strong>+150</strong></div></div>
          {gameMode==='player'&&<button className="ghost-action" onClick={()=>setPlayerMode(playerMode==='daily'?'classic':'daily')}>{playerMode==='daily'?'✓ Desafío diario activado':'Activar desafío diario'}</button>}
        </section>

        <section className="feature-grid feature-grid--compact">
          <article><span>◎</span><div><strong>MINIJUEGOS</strong><small>Finales y partidos decisivos</small></div></article>
          <article><span>↗</span><div><strong>MERCADO</strong><small>Ofertas desde tu primera temporada</small></div></article>
          <article><span>♛</span><div><strong>PALMARÉS</strong><small>Copas, ascensos y gloria</small></div></article>
          <article><span>⌁</span><div><strong>RANKING</strong><small>Compará carreras completas</small></div></article>
        </section>

        {clubPickerOpen&&activeLeague&&<ClubPickerModal clubsList={availableClubs} selectedId={activeClub} title={country+' · '+(leagueLabel?.tier??'')+'ª División'} onSelect={setClubId} onClose={()=>setClubPickerOpen(false)}/>}

        <footer className="legal-note">LEYENDA usa nombres de clubes reales y referencias públicas de Wikipedia/Wikimedia para sus escudos durante esta prueba. No incluye futbolistas reales.</footer>
      </main>
    </div>
  </div>
}

function GameSideNav({tab,setTab,coach}:{tab:Tab;setTab:(t:Tab)=>void;coach:boolean}){
  const items:Array<[Tab,string,string]> = coach
    ? [['career','⌂','Inicio'],['squad','▦','Equipo'],['minigames','◎','Desafíos'],['history','≡','Historia'],['ranking','⌁','Ranking']]
    : [['career','⌂','Carrera'],['market','↗','Mercado'],['training','◇','Entreno'],['shop','▣','Tienda'],['minigames','◎','Juegos'],['history','≡','Historia'],['ranking','⌁','Ranking']]
  const go=(next:Tab)=>{setTab(next);window.scrollTo({top:0,behavior:'smooth'})}
  return <nav className="game-side-nav" aria-label="Secciones del juego">
    <div className="game-side-nav__mark"><LeyendaLogo size="sm"/></div>
    {items.map(([id,icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)} aria-label={label} title={label}>
      <span>{icon}</span><small>{label}</small>
    </button>)}
  </nav>
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

const advancedSkillIds:MiniGameId[]=[
  'memory-board','personal-run','timing-run','ball-track','code-call','hold-up','through-pass','grid-gap','long-kick','pressure-exit'
]

function AdvancedSkillMiniGame({
  game,onComplete,onBack,forced
}:{
  game:MiniGameId
  onComplete:(score:number)=>void
  onBack:()=>void
  forced?:boolean
}){
  const roundsByGame:Partial<Record<MiniGameId,number>>={
    'memory-board':3,'personal-run':4,'timing-run':3,'ball-track':3,'code-call':3,
    'hold-up':3,'through-pass':3,'grid-gap':3,'long-kick':3,'pressure-exit':4,
  }
  const maxRounds=roundsByGame[game]??3
  const [round,setRound]=useState(0)
  const [score,setScore]=useState(0)
  const [feedback,setFeedback]=useState('Preparado.')
  const [target,setTarget]=useState(()=>Math.floor(Math.random()*9))
  const [revealed,setRevealed]=useState(true)
  const [direction,setDirection]=useState<number|null>(null)
  const [done,setDone]=useState(false)

  useEffect(()=>{
    if(!['memory-board','ball-track','code-call','grid-gap','pressure-exit'].includes(game))return
    setRevealed(true)
    const id=window.setTimeout(()=>setRevealed(false),game==='code-call'?1250:900)
    return()=>window.clearTimeout(id)
  },[game,round,target])

  const finish=(earned:number,message:string)=>{
    if(done)return
    const nextScore=score+earned
    const nextRound=round+1
    setScore(nextScore)
    setFeedback(message+' · +'+earned)
    setDirection(null)
    if(nextRound>=maxRounds){
      setDone(true)
      window.setTimeout(()=>onComplete(nextScore),380)
    }else{
      setRound(nextRound)
      setTarget(Math.floor(Math.random()*9))
    }
  }

  const timingScore=(center=.52,width=.18)=>{
    const phase=(Date.now()%1800)/1800
    const distance=Math.abs(phase-center)
    const normalized=Math.min(distance,1-distance)
    return normalized<=width/2?100:normalized<=width?70:normalized<=width*1.6?42:18
  }

  const chooseSafeLane=(lane:number)=>{
    const blocked=target%3
    finish(lane===blocked?20:100,lane===blocked?'TE CERRARON':'ROMPISTE LA LÍNEA')
  }

  const chooseMemory=(cell:number)=>{
    finish(cell===target?100:18,cell===target?'MEMORIA PERFECTA':'SE TE ESCAPÓ')
  }

  const chooseCode=(index:number)=>{
    const correct=target%3
    finish(index===correct?100:25,index===correct?'SEÑAL CLAVADA':'CÓDIGO ERRADO')
  }

  const choosePressure=(index:number)=>{
    const safe=target%3
    finish(index===safe?100:28,index===safe?'SALIDA LIMPIA':'TE ENCERRARON')
  }

  const kickPower=()=>{
    if(direction===null){setFeedback('Primero elegí el destino del saque.');return}
    const earned=timingScore(.58,.16)
    finish(Math.max(18,earned-(direction===1?0:8)),earned>=85?'SAQUE PERFECTO':earned>=55?'BUENA SALIDA':'QUEDÓ CORTO')
  }

  const labels:Partial<Record<MiniGameId,{kicker:string;title:string;desc:string}>>={
    'memory-board':{kicker:'MEMORIA TÁCTICA',title:'Pizarra relámpago',desc:'La zona se ilumina un instante. Recordala cuando desaparezca.'},
    'personal-run':{kicker:'UNO CONTRA TODOS',title:'La diagonal',desc:'Un defensor cierra un carril. Elegí por dónde romper.'},
    'timing-run':{kicker:'TIMING',title:'La corrida',desc:'La potencia oscila. Frenala dentro de la ventana celeste.'},
    'ball-track':{kicker:'VISIÓN',title:'Ojo en la pelota',desc:'Seguí la pelota y marcá dónde terminó después del cruce.'},
    'code-call':{kicker:'LECTURA DE BANCO',title:'La señal',desc:'Memorizá el código que aparece y elegilo cuando se oculte.'},
    'hold-up':{kicker:'CUERPO A CUERPO',title:'El aguante',desc:'La presión sube y baja. Protegé la pelota en el momento justo.'},
    'through-pass':{kicker:'LECTURA',title:'Pase al hueco',desc:'Esperá a que se abra la ventana y soltá el pase.'},
    'grid-gap':{kicker:'VISIÓN PERIFÉRICA',title:'El hueco',desc:'Un espacio queda libre por menos de un segundo. Encontralo.'},
    'long-kick':{kicker:'POTENCIA + DIRECCIÓN',title:'Saque largo',desc:'Elegí destino y soltá la potencia cuando entre en zona.'},
    'pressure-exit':{kicker:'SALIDA',title:'Bajo presión',desc:'Un compañero queda libre un instante. Encontralo antes del robo.'},
  }
  const meta=labels[game]??{kicker:'DESAFÍO',title:'Juego decisivo',desc:'Resolvé la jugada.'}
  const codes=['3 · 1 · 4','2 · 4 · 1','4 · 2 · 3']
  const ballTarget=target%3

  return <section className={'panel advanced-skill advanced-skill--'+game}>
    <div className="minigame-topline">
      {!forced?<button className="back-link" onClick={onBack}>← Volver</button>:<span className="final-game-badge">PARTIDO DECISIVO</span>}
      <span>{done?'TERMINADO':'JUGADA '+(round+1)+'/'+maxRounds}</span>
    </div>
    <div className="advanced-skill__head"><span className="eyebrow">{meta.kicker}</span><h2>{meta.title}</h2><p>{meta.desc}</p></div>
    <div className="advanced-skill__score"><span>PUNTOS</span><strong>{score}</strong></div>

    {game==='memory-board'&&<div className="visual-game visual-game--memory">
      <div className="stadium-bg"><i/><i/><i/></div>
      <div className="memory-grid">{Array.from({length:9},(_,cell)=><button key={cell} disabled={revealed||done} className={revealed&&cell===target?'target':''} onClick={()=>chooseMemory(cell)}><span>{cell+1}</span></button>)}</div>
      <strong>{revealed?'MEMORIZÁ LA ZONA':'¿DÓNDE ESTABA?'}</strong>
    </div>}

    {game==='personal-run'&&<div className="visual-game visual-game--lanes">
      <div className="runner-pitch">{[0,1,2].map(lane=><button key={lane} disabled={done} onClick={()=>chooseSafeLane(lane)}><i/><span>{lane===0?'IZQ':lane===1?'CENTRO':'DER'}</span></button>)}</div>
      <div className="runner-shadow" style={{left:(12+(target%3)*33)+'%'}}/>
      <strong>Elegí el carril antes del cierre.</strong>
    </div>}

    {game==='timing-run'&&<div className="visual-game visual-game--timing">
      <div className="sprint-track"><span/><span/><span/><i/><b/></div>
      <button className="skill-main-action" disabled={done} onClick={()=>{const earned=timingScore(.52,.14);finish(earned,earned>=85?'ACELERACIÓN PERFECTA':earned>=55?'BUEN PIQUE':'SALISTE PASADO')}}>⚡ FRENAR IMPULSO</button>
    </div>}

    {game==='ball-track'&&<div className="visual-game visual-game--track">
      <div className="ball-crossing">{[0,1,2].map(slot=><button key={slot} disabled={revealed||done} onClick={()=>finish(slot===ballTarget?100:20,slot===ballTarget?'LA SEGUISTE':'LA PERDISTE')}><span>{revealed&&slot===ballTarget?'⚽':'●'}</span><i/></button>)}</div>
      <strong>{revealed?'SEGUÍ LA PELOTA':'¿DÓNDE TERMINÓ?'}</strong>
    </div>}

    {game==='code-call'&&<div className="visual-game visual-game--code">
      <div className="bench-screen">{revealed?<strong>{codes[target%3]}</strong>:<strong>• · • · •</strong>}</div>
      <div className="code-options">{codes.map((code,index)=><button key={code} disabled={revealed||done} onClick={()=>chooseCode(index)}>{code}</button>)}</div>
      <small>{revealed?'Memorizá la señal del banco.':'Marcá la señal correcta.'}</small>
    </div>}

    {game==='hold-up'&&<div className="visual-game visual-game--hold">
      <div className="pressure-ring"><i/><b>⚽</b><span/></div>
      <button className="skill-main-action" disabled={done} onClick={()=>{const earned=timingScore(.48,.12);finish(earned,earned>=85?'CUERPO PERFECTO':earned>=55?'AGUANTASTE':'TE LA ROBARON')}}>⬢ PROTEGER</button>
    </div>}

    {game==='through-pass'&&<div className="visual-game visual-game--pass">
      <div className="pass-scene"><i className="defender-line"/><span className="runner">●</span><span className="ball">⚽</span><b className="gap"/></div>
      <button className="skill-main-action" disabled={done} onClick={()=>{const earned=timingScore(.64,.13);finish(earned,earned>=85?'PASE PERFECTO':earned>=55?'LLEGÓ JUSTO':'OFFSIDE / INTERCEPTADO')}}>⇢ FILTRAR PASE</button>
    </div>}

    {game==='grid-gap'&&<div className="visual-game visual-game--gap">
      <div className="gap-grid">{Array.from({length:9},(_,cell)=><button key={cell} disabled={revealed||done} className={revealed&&cell===target?'target':''} onClick={()=>chooseMemory(cell)}><span/></button>)}</div>
      <strong>{revealed?'EL HUECO ESTÁ ACÁ':'TOCÁ EL HUECO'}</strong>
    </div>}

    {game==='long-kick'&&<div className="visual-game visual-game--kick">
      <div className="kick-targets">{[0,1,2].map(index=><button key={index} className={direction===index?'active':''} disabled={done} onClick={()=>setDirection(index)}>{index===0?'↖ BANDA':index===1?'↑ 9': 'BANDA ↗'}</button>)}</div>
      <div className="timing-bar timing-bar--kick"><i/><b/></div>
      <button className="skill-main-action" disabled={done} onClick={kickPower}>⚽ SACAR</button>
    </div>}

    {game==='pressure-exit'&&<div className="visual-game visual-game--pressure">
      <div className="pressure-pitch"><span className="you">⚽</span>{[0,1,2].map(index=><button key={index} disabled={revealed||done} className={revealed&&index===target%3?'safe':''} onClick={()=>choosePressure(index)}><b>●</b><small>{index===0?'A':index===1?'B':'C'}</small></button>)}</div>
      <strong>{revealed?'MIRÁ QUIÉN QUEDA LIBRE':'SALÍ JUGANDO'}</strong>
    </div>}

    <div className={'minigame-feedback '+(done?'complete':'')}>{done?'PARTIDO RESUELTO · '+score+' PTS':feedback}</div>
    {done&&!forced&&<button className="play-button" onClick={onBack}>VOLVER A JUEGOS</button>}
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

  if(active&&advancedSkillIds.includes(active)){
    return <AdvancedSkillMiniGame
      game={active}
      forced={Boolean(forcedGame)}
      onBack={()=>setActive(null)}
      onComplete={value=>{onScore(active,value);onComplete?.(value)}}
    />
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
    <div className="panel-head"><div><span className="eyebrow">{mode==='player'?'CENTRO DE HABILIDAD':'LABORATORIO DEL DT'}</span><h2>{mode==='player'?'Quince pruebas jugables':'Cinco desafíos de gestión'}</h2></div><span className="pill">{mode==='player'?'15 JUEGOS':'5 MODOS'}</span></div>
    <p className="minigame-hub__intro">{mode==='player'?'Cada prueba entrena una parte distinta de tu jugador. No son decisiones de texto: tenés que acertar.':'Táctica, scouting, vestuario, formación y mercado. Tus decisiones puntúan el trabajo de entrenador.'}</p>
    <div className="minigame-grid minigame-grid--v2">{games.map(game=><button key={game.id} onClick={()=>reset(game.id)}>
      <b>{game.icon}</b>
      <div><strong>{game.name}</strong><span>{game.description}</span></div>
      <em>JUGAR →</em>
    </button>)}</div>
  </section>
}

function FinalStyleChoice({onChoose}:{onChoose:(style:FinalStyle)=>void}){
  const styles:Array<{id:FinalStyle;icon:string;title:string;kicker:string;body:string;accent:string}>=[
    {id:'cabulero',icon:'⚄',title:'CABULERO',kicker:'QUE DECIDA EL DESTINO',body:'Las finales se resuelven con rituales, intuición y suerte. Elegís tu cábala y bancás el resultado.',accent:'luck'},
    {id:'mixto',icon:'⇄',title:'MIXTO',kicker:'CABEZA + INSTINTO',body:'En cada final decidís: jugar un minijuego o confiar en la cábala. Más libertad, más decisiones.',accent:'mix'},
    {id:'habilidoso',icon:'◎',title:'HABILIDOSO',kicker:'TODO EN TUS MANOS',body:'Todas las finales se juegan. Timing, puntería, reflejos o duelo según tu posición.',accent:'skill'},
  ]
  return <div className="final-style-choice">
    <div className="final-style-choice__head"><span className="eyebrow">REGLA DE TU CARRERA · NO SE PUEDE CAMBIAR</span><h2>¿Qué clase de jugador sos?</h2><p>Esto define cómo se juegan todas las finales de tu carrera.</p></div>
    <div className="final-style-grid">{styles.map(style=><button key={style.id} className={'final-style-card final-style-card--'+style.accent} onClick={()=>onChoose(style.id)}>
      <b>{style.icon}</b>
      <div><small>{style.kicker}</small><strong>{style.title}</strong><span>{style.body}</span></div>
      <em>ELEGIR →</em>
    </button>)}</div>
  </div>
}

function CabalaMiniGame({game,onComplete}:{game:CabalaGameId;onComplete:(won:boolean,score:number)=>void}){
  const roundsByGame:Record<CabalaGameId,number>={
    'higher-lower':3,'dice-seven':3,'coin-run':4,'lucky-number':2,'lucky-shirt':1,
    'three-cups':3,'wheel':3,'tower':4,'grid-reveal':3,'boots':1,
  }
  const maxRounds=roundsByGame[game]
  const [round,setRound]=useState(0)
  const [hits,setHits]=useState(0)
  const [feedback,setFeedback]=useState('Elegí. No hay vuelta atrás.')
  const [card,setCard]=useState(()=>2+Math.floor(Math.random()*12))
  const [lastRoll,setLastRoll]=useState<number|null>(null)
  const [lastCoin,setLastCoin]=useState<'CARA'|'CECA'|null>(null)
  const [luckyNumber,setLuckyNumber]=useState(()=>Math.floor(Math.random()*3))
  const [shirtWinner,setShirtWinner]=useState(()=>[7,9,10,11,23][Math.floor(Math.random()*5)])
  const [revealed,setRevealed]=useState(true)
  const [weather,setWeather]=useState(()=>Math.floor(Math.random()*3))
  const finished=round>=maxRounds

  useEffect(()=>{
    if(!['three-cups','grid-reveal'].includes(game))return
    setRevealed(true)
    const id=window.setTimeout(()=>setRevealed(false),850)
    return()=>window.clearTimeout(id)
  },[game,round,luckyNumber])

  const commit=(success:boolean,message:string,earned=100)=>{
    if(finished)return
    const nextRound=round+1
    const nextHits=hits+(success?1:0)
    setRound(nextRound)
    setHits(nextHits)
    setFeedback(message)
    if(nextRound>=maxRounds){
      const target=Math.ceil(maxRounds*.55)
      window.setTimeout(()=>onComplete(nextHits>=target,nextHits*earned),420)
    }
  }

  const higherLower=(higher:boolean)=>{
    const next=2+Math.floor(Math.random()*12)
    const success=higher?next>card:next<card
    setCard(next)
    commit(success,'Salió '+next+' · '+(success?'TE ACOMPAÑA':'MALA SEÑAL'))
  }

  const dicePick=(pick:'under'|'seven'|'over')=>{
    const a=1+Math.floor(Math.random()*6)
    const b=1+Math.floor(Math.random()*6)
    const sum=a+b
    setLastRoll(sum)
    const success=pick==='under'?sum<7:pick==='over'?sum>7:sum===7
    commit(success,'🎲 '+a+' + '+b+' = '+sum+' · '+(success?'CÁBALA VIVA':'NO ERA'))
  }

  const coinPick=(pick:'CARA'|'CECA')=>{
    const result=Math.random()>.5?'CARA':'CECA'
    setLastCoin(result)
    commit(result===pick,'🪙 '+result+' · '+(result===pick?'SIGUE LA RACHA':'SE CORTÓ'))
  }

  const numberPick=(value:number)=>{
    const success=value===luckyNumber
    commit(success,'El casillero era '+(luckyNumber+1)+' · '+(success?'LA PEGASTE':'PASÓ DE LARGO'))
    setLuckyNumber(Math.floor(Math.random()*3))
  }

  const shirtPick=(value:number)=>{
    const success=value===shirtWinner
    commit(success,'La camiseta marcada era la '+shirtWinner+' · '+(success?'ERA ESA':'NO ESTA VEZ'))
  }

  const cupPick=(value:number)=>{
    const success=value===luckyNumber
    commit(success,success?'LA PELOTA ESTABA AHÍ':'VASO VACÍO')
    setLuckyNumber(Math.floor(Math.random()*3))
  }

  const wheelStop=()=>{
    const phase=(Date.now()%2200)/2200
    const success=(phase>.12&&phase<.28)||(phase>.58&&phase<.72)
    commit(success,success?'CAYÓ EN ZONA DORADA':'CAYÓ EN ZONA FRÍA')
  }

  const towerPick=(value:number)=>{
    const trap=luckyNumber
    const success=value!==trap
    commit(success,success?'LA TORRE AGUANTA':'TE LEYERON LA JUGADA')
    setLuckyNumber(Math.floor(Math.random()*3))
  }

  const gridPick=(value:number)=>{
    const success=value===luckyNumber
    commit(success,success?'CASILLA DE GOL':'CASILLA VACÍA')
    setLuckyNumber(Math.floor(Math.random()*9))
  }

  const bootsPick=(value:number)=>{
    const success=value===weather
    commit(success,success?'EQUIPO PERFECTO PARA LA CANCHA':'ELEGISTE MAL LOS TAPONES')
  }

  const title:Record<CabalaGameId,string>={
    'higher-lower':'El pálpito',
    'dice-seven':'Los dados del 7',
    'coin-run':'Moneda de vestuario',
    'lucky-number':'Número marcado',
    'lucky-shirt':'La camiseta',
    'three-cups':'Tres vasos',
    'wheel':'Rueda del destino',
    'tower':'La torre',
    'grid-reveal':'Grilla de la suerte',
    'boots':'Los tapones',
  }

  const kicker:Record<CabalaGameId,string>={
    'higher-lower':'CARTAS','dice-seven':'DADOS','coin-run':'RACHA','lucky-number':'INTUICIÓN','lucky-shirt':'RITUAL',
    'three-cups':'MEMORIA + SUERTE','wheel':'TIMING + AZAR','tower':'LECTURA','grid-reveal':'PÁLPITO','boots':'CLIMA',
  }

  const weatherMeta=[['☀','SECO','Tapón corto'],['☂','LLUVIA','Tapón largo'],['≈','MIXTO','Tapón intermedio']][weather]

  return <section className={'cabala-minigame cabala-minigame--'+game}>
    <div className="cabala-minigame__top">
      <span>⚄ {kicker[game]} · {finished?'TERMINADO':'RONDA '+(round+1)+'/'+maxRounds}</span>
      <strong>{title[game]}</strong>
      <small>{hits} aciertos</small>
    </div>

    {game==='higher-lower'&&<div className="cabala-cards-stage">
      <div className="cabala-table-art"><i/><i/><i/></div>
      <div className="playing-card"><span>♠</span><strong>{card===14?'A':card===13?'K':card===12?'Q':card===11?'J':card}</strong><i>♠</i></div>
      <div className="cabala-question">Tres cartas. ¿La próxima sale mayor o menor?</div>
      <div className="two-actions"><button disabled={finished} onClick={()=>higherLower(false)}>↓ MENOR</button><button disabled={finished} onClick={()=>higherLower(true)}>MAYOR ↑</button></div>
    </div>}

    {game==='dice-seven'&&<div className="cabala-dice-stage">
      <div className="dice-table"><b>⚂</b><b>⚄</b><span/></div>
      <div className="cabala-question">¿La suma queda abajo, justo o arriba de 7?</div>
      {lastRoll!==null&&<div className="cabala-last">ÚLTIMA SUMA · {lastRoll}</div>}
      <div className="three-actions"><button disabled={finished} onClick={()=>dicePick('under')}>MENOS DE 7</button><button disabled={finished} onClick={()=>dicePick('seven')}>JUSTO 7</button><button disabled={finished} onClick={()=>dicePick('over')}>MÁS DE 7</button></div>
    </div>}

    {game==='coin-run'&&<div className="cabala-coin-stage">
      <div className={'giant-coin '+(lastCoin==='CECA'?'flip':'')}><span>{lastCoin==='CECA'?'C':'L'}</span></div>
      <div className="cabala-question">Cuatro lanzamientos. Tratá de leer la racha.</div>
      <div className="two-actions"><button disabled={finished} onClick={()=>coinPick('CARA')}>CARA</button><button disabled={finished} onClick={()=>coinPick('CECA')}>CECA</button></div>
    </div>}

    {game==='lucky-number'&&<div className="cabala-number-stage">
      <div className="locker-row">{[0,1,2].map(value=><button key={value} disabled={finished} onClick={()=>numberPick(value)}><b>{value+1}</b><span>CASILLERO</span></button>)}</div>
      <div className="cabala-question">Uno de los tres casilleros tiene la pelota marcada.</div>
    </div>}

    {game==='lucky-shirt'&&<div className="cabala-shirt-stage">
      <div className="shirt-row">{[7,9,10,11,23].map(value=><button key={value} disabled={finished} onClick={()=>shirtPick(value)}><i>▾</i><b>{value}</b></button>)}</div>
      <div className="cabala-question">Una sola elección. ¿Qué camiseta sentís que trae el partido?</div>
    </div>}

    {game==='three-cups'&&<div className="cabala-cups-stage">
      <div className="cups-row">{[0,1,2].map(value=><button key={value} disabled={revealed||finished} className={revealed&&value===luckyNumber?'reveal':''} onClick={()=>cupPick(value)}><i>▱</i><span>{revealed&&value===luckyNumber?'⚽':''}</span></button>)}</div>
      <div className="cabala-question">{revealed?'Mirá dónde queda la pelota.':'Elegí el vaso.'}</div>
    </div>}

    {game==='wheel'&&<div className="cabala-wheel-stage">
      <div className="destiny-wheel"><i/><i/><i/><i/><b>✦</b></div>
      <div className="cabala-question">La rueda gira. Frenala cuando sientas el momento.</div>
      <button className="skill-main-action luck-action" disabled={finished} onClick={wheelStop}>FRENAR RUEDA</button>
    </div>}

    {game==='tower'&&<div className="cabala-tower-stage">
      <div className="tower-visual">{Array.from({length:4},(_,index)=><i key={index}/>)}</div>
      <div className="cabala-question">Una salida está estudiada por el rival. Elegí otra.</div>
      <div className="three-actions"><button disabled={finished} onClick={()=>towerPick(0)}>IZQUIERDA</button><button disabled={finished} onClick={()=>towerPick(1)}>CENTRO</button><button disabled={finished} onClick={()=>towerPick(2)}>DERECHA</button></div>
    </div>}

    {game==='grid-reveal'&&<div className="cabala-grid-stage">
      <div className="luck-grid">{Array.from({length:9},(_,value)=><button key={value} disabled={revealed||finished} className={revealed&&value===luckyNumber?'reveal':''} onClick={()=>gridPick(value)}>{revealed&&value===luckyNumber?'⚽':'·'}</button>)}</div>
      <div className="cabala-question">{revealed?'Memorizá dónde apareció el gol.':'Destapá una casilla.'}</div>
    </div>}

    {game==='boots'&&<div className="cabala-boots-stage">
      <div className="weather-board"><b>{weatherMeta[0]}</b><strong>{weatherMeta[1]}</strong><span>La cancha cambia una hora antes del partido.</span></div>
      <div className="boots-row">{[['☀','CORTOS'],['☂','LARGOS'],['≈','MIXTOS']].map((item,index)=><button key={item[1]} disabled={finished} onClick={()=>bootsPick(index)}><b>{item[0]}</b><span>{item[1]}</span></button>)}</div>
      <div className="cabala-question">Elegí los tapones sin saber si el clima aguanta.</div>
    </div>}

    <div className={'minigame-feedback '+(finished?'complete':'')}>{finished?'EL PARTIDO YA TIENE DESTINO…':feedback}</div>
  </section>
}

function CareerFinalPanel({
  state,onResolved
}:{state:CareerState;onResolved:(next:CareerState)=>void}){
  const pending=state.pendingFinal
  const [mixedMode,setMixedMode]=useState<'skill'|'luck'|null>(null)
  if(!pending)return null
  const opponent=clubById(pending.opponentClubId)
  const style=state.finalStyle??'mixto'
  const skillMode=style==='habilidoso'||(style==='mixto'&&mixedMode==='skill')
  const luckMode=style==='cabulero'||(style==='mixto'&&mixedMode==='luck')

  return <div className="career-final">
    <div className="career-final__hero">
      <div><span className="eyebrow">FINAL · {pending.competition.toUpperCase()}</span><h2>Noventa minutos para cambiar tu carrera.</h2></div>
      <div className="career-final__versus"><ClubCrest name={clubById(state.clubId).name} size="lg"/><b>VS</b><ClubCrest name={opponent.name} size="lg"/></div>
      <div className="career-final__clubs"><strong>{clubById(state.clubId).name}</strong><span>{opponent.name}</span></div>
      <p>Tu estilo permanente es <b>{style.toUpperCase()}</b>. Esta final no se simula por detrás.</p>
    </div>

    {style==='mixto'&&!mixedMode&&<div className="mixed-final-choice">
      <button onClick={()=>setMixedMode('skill')}><b>◎</b><strong>JUGARLA</strong><span>Resolver la final con un minijuego de habilidad.</span></button>
      <button onClick={()=>setMixedMode('luck')}><b>⚄</b><strong>IR CON LA CÁBALA</strong><span>Elegir un ritual y aceptar lo que salga.</span></button>
    </div>}

    {luckMode&&<div className="cabala-game">
      <div className="cabala-game__head"><span>⚄ CABULERO</span><strong>{pending.kind==='title'?'El título se juega con la suerte.':pending.kind==='promotion'?'El ascenso depende de tu cábala.':'La permanencia se define ahora.'}</strong><small>Cinco rondas. El resultado del minijuego decide el partido.</small></div>
      <CabalaMiniGame game={pending.cabalaGame} onComplete={(won,score)=>onResolved(resolveCabalFinal(state,won,score))}/>
    </div>}

    {skillMode&&<div className="final-skill-game">
      <div className="final-skill-game__intro"><span>◎ HABILIDOSO</span><strong>{miniGames.find(game=>game.id===pending.miniGame)?.name??'Desafío final'}</strong><small>5 rondas. Un solo intento. El resultado decide {pending.kind==='title'?'el título':pending.kind==='promotion'?'el ascenso':'la permanencia'}.</small></div>
      <MiniGamesPanel mode="player" forcedGame={pending.miniGame} onScore={()=>{}} onComplete={score=>onResolved(resolveSkillFinal(state,score))}/>
    </div>}
  </div>
}

function MarketPanel({
  state,onState,onDone
}:{state:CareerState;onState:(next:CareerState)=>void;onDone:()=>void}){
  const club=clubById(state.clubId)
  const offers=state.transferOffers??[]
  const salary=state.currentSalary??club.salary
  const yearsLeft=state.contractYearsLeft??0
  const choose=(next:CareerState)=>{onState(next);onDone()}

  return <section className="market-core">
    <div className="market-core__head">
      <div><span className="eyebrow">{state.marketDecisionRequired?'MERCADO ABIERTO · DECISIÓN OBLIGATORIA':'CONTRATO Y MERCADO'}</span><h2>¿Dónde jugás la próxima temporada?</h2><p>La carrera también se construye eligiendo cuándo quedarte y cuándo irte.</p></div>
      <span className="market-window">↗ PASES</span>
    </div>

    <article className="current-contract-card">
      <ClubCrest name={club.name} size="lg"/>
      <div><small>CLUB ACTUAL</small><strong>{club.name}</strong><span>Liga {club.country} · {state.divisionTier??leagueById(club.leagueId).tier}ª División</span></div>
      <aside><b>$ {formatMoney(salary)}</b><span>/ mes</span><em>{yearsLeft>0?yearsLeft+' año'+(yearsLeft===1?'':'s')+' restante'+(yearsLeft===1?'':'s'):'CONTRATO VENCIDO'}</em></aside>
    </article>

    <div className="market-actions">
      {yearsLeft>0&&<button className="stay-button" onClick={()=>choose(stayAtClub(state))}><b>⌂</b><span><strong>SEGUIR EN {club.short}</strong><small>Respetar el contrato actual por otra temporada.</small></span></button>}
      <button className="renew-button" onClick={()=>choose(renewCurrentClub(state,3))}><b>✎</b><span><strong>RENOVAR 3 AÑOS</strong><small>Nuevo sueldo y continuidad. Conservás toda tu huella en el club.</small></span></button>
    </div>

    <div className="transfer-offers-head"><span>OFERTAS SOBRE LA MESA</span><strong>{offers.length}</strong></div>
    {offers.length===0?<div className="empty-state"><b>↗</b><strong>No llegaron propuestas externas.</strong><span>Podés seguir o renovar con tu club.</span></div>:
    <div className="transfer-offer-list">{offers.map((offer:TransferOffer)=>{
      const destination=clubById(offer.clubId)
      const prestigeDelta=destination.prestige-club.prestige
      return <article key={offer.clubId} className="transfer-offer-card">
        <div className="transfer-offer-card__top"><ClubCrest name={destination.name} size="lg"/><div><span>{leagueById(destination.leagueId).name}</span><strong>{destination.name}</strong><small>{offer.role} · prestigio {destination.prestige}</small></div><em>{prestigeDelta>0?'▲ '+prestigeDelta:prestigeDelta<0?'▼ '+Math.abs(prestigeDelta):'='}</em></div>
        <div className="transfer-offer-card__terms"><div><span>SUELDO</span><b>$ {formatMoney(offer.salary)}</b></div><div><span>CONTRATO</span><b>{offer.years} AÑOS</b></div><div><span>PRIMA</span><b>$ {formatMoney(offer.signingBonus)}</b></div></div>
        <div className="transfer-offer-card__warning">Al irte, la huella construida en {club.name} queda atrás. Tu reputación viaja con vos; la idolatría no.</div>
        <button onClick={()=>choose(acceptTransferOffer(state,offer))}>FIRMAR CON {destination.short} →</button>
      </article>
    })}</div>}
  </section>
}

function TrophyCabinet({state}:{state:CareerState}){
  const trophies=state.trophies??[]
  if(!trophies.length)return <section className="trophy-cabinet trophy-cabinet--empty"><div><span className="eyebrow">PALMARÉS</span><h3>La vitrina está esperando.</h3><p>Los trofeos aparecen sólo si ganás el partido decisivo.</p></div><b>♛</b></section>
  const grouped=Object.values(trophies.reduce<Record<string,{name:string;icon:string;count:number}>>((acc,trophy)=>{
    const current=acc[trophy.name]??{name:trophy.name,icon:trophy.icon,count:0}
    current.count+=1
    acc[trophy.name]=current
    return acc
  },{}))
  return <section className="trophy-cabinet"><div className="trophy-cabinet__head"><div><span className="eyebrow">PALMARÉS</span><h3>Tu vitrina</h3></div><strong>{trophies.length} TROFEOS</strong></div><div className="trophy-grid">{grouped.map(item=><article key={item.name}><b>{item.icon}</b><span><strong>{item.name}</strong><small>x{item.count}</small></span></article>)}</div></section>
}
function CabalaPracticePanel(){
  const games:Array<{id:CabalaGameId;icon:string;name:string;description:string}>=[
    {id:'higher-lower',icon:'♠',name:'El pálpito',description:'Mayor o menor. Tres cartas para sostener la fe.'},
    {id:'dice-seven',icon:'⚄',name:'Los dados del 7',description:'Abajo, siete exacto o arriba.'},
    {id:'coin-run',icon:'◐',name:'Moneda de vestuario',description:'Leé una racha de cara o ceca.'},
    {id:'lucky-number',icon:'17',name:'Número marcado',description:'Encontrá el casillero con la pelota.'},
    {id:'lucky-shirt',icon:'▾',name:'La camiseta',description:'Una sola elección antes de salir.'},
    {id:'three-cups',icon:'◒',name:'Tres vasos',description:'Seguí dónde escondieron la pelota.'},
    {id:'wheel',icon:'✺',name:'Rueda del destino',description:'Frená la rueda en una zona dorada.'},
    {id:'tower',icon:'▥',name:'La torre',description:'Evitá la salida que el rival estudió.'},
    {id:'grid-reveal',icon:'▦',name:'Grilla de la suerte',description:'Memorizá dónde apareció el gol.'},
    {id:'boots',icon:'⌁',name:'Los tapones',description:'Leé el clima y elegí antes del partido.'},
  ]
  const [active,setActive]=useState<CabalaGameId|null>(null)
  const [result,setResult]=useState<string>('')
  if(active)return <section className="panel cabala-practice">
    <button className="back-link" onClick={()=>{setActive(null);setResult('')}}>← Volver a las cábalas</button>
    <CabalaMiniGame game={active} onComplete={(won,score)=>setResult((won?'CÁBALA CUMPLIDA':'MALA SEÑAL')+' · '+score+' PTS')}/>
    {result&&<div className={'practice-result '+(result.startsWith('CÁBALA')?'good':'bad')}>{result}</div>}
  </section>
  return <section className="panel games-style-hub">
    <div className="panel-head"><div><span className="eyebrow">CABULERO · 10 JUEGOS</span><h2>La suerte también se juega.</h2></div><span className="pill">⚄</span></div>
    <p className="games-style-intro">Practicá las mismas cábalas que pueden definir un título, un ascenso o una permanencia.</p>
    <div className="cabala-practice-grid">{games.map(game=><button key={game.id} onClick={()=>{setActive(game.id);setResult('')}}><b>{game.icon}</b><span><strong>{game.name}</strong><small>{game.description}</small></span><em>JUGAR →</em></button>)}</div>
  </section>
}

function PlayerGamesHub({style,onSkillScore}:{style:FinalStyle|null|undefined;onSkillScore:(game:MiniGameId,score:number)=>void}){
  const [mix,setMix]=useState<'skill'|'luck'>('skill')
  if(style==='cabulero')return <CabalaPracticePanel/>
  if(style==='habilidoso')return <MiniGamesPanel mode="player" onScore={onSkillScore}/>
  return <div className="mixed-games-hub">
    <div className="mixed-games-tabs"><button className={mix==='skill'?'active':''} onClick={()=>setMix('skill')}>◎ HABILIDOSO · 15</button><button className={mix==='luck'?'active':''} onClick={()=>setMix('luck')}>⚄ CABULERO · 10</button></div>
    {mix==='skill'?<MiniGamesPanel mode="player" onScore={onSkillScore}/>:<CabalaPracticePanel/>}
  </div>
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
  const displayLeague='Liga '+club.country+' · '+(state.divisionTier??league.tier)+'ª División'

  useEffect(()=>{
    if(state.retired&&state.finalScore&&!scores.some(s=>s.id==='player-'+state.seed)){
      const run={id:'player-'+state.seed,name:state.playerName,mode:'player' as const,score:state.finalScore,detail:`${state.position} · ${state.history.length} temporadas · ${state.titles} títulos`,createdAt:Date.now()}
      const next=saveRunScore(run)
      setScores(next)
      void submitLeaderboardScore(run).then(()=>loadLeaderboard()).then(setScores)
    }
  },[state.retired,state.finalScore])

  useEffect(()=>{
    if(state.pendingFinal&&tab!=='career'){
      setTab('career')
      return
    }
    if(state.marketDecisionRequired&&!seasonSummary&&tab!=='market'){
      setTab('market')
    }
  },[state.pendingFinal,state.marketDecisionRequired,seasonSummary,tab])


  const playSeason=()=>{
    const next=simulateSeason(state)
    if(next===state)return
    setSeasonSummary(next.pendingFinal?null:(next.history[next.history.length-1]??null))
    setLastEffects(null)
    setState(next)
  }

  const resolveFinal=(next:CareerState)=>{
    setState(next)
    setSeasonSummary(next.history[next.history.length-1]??null)
    setLastEffects(null)
  }

  const closeSeasonSummary=()=>{
    setSeasonSummary(null)
    if(state.marketDecisionRequired)setTab('market')
  }

  const playMini=(game:MiniGameId,value:number)=>{
    const bonus=value>=360?2:1
    const effects:EventOption['effects']=
      game==='penalties'||game==='freekicks'?{finishing:bonus,form:1}:
      game==='dribble'||game==='personal-run'?{dribbling:bonus,pace:1}:
      game==='timing-run'?{pace:bonus,physical:1}:
      game==='keeper'?{reflexes:bonus,form:1}:
      game==='duel'?{defending:bonus,physical:1}:
      game==='memory-board'||game==='code-call'?{passing:bonus,discipline:1}:
      game==='ball-track'||game==='grid-gap'?{dribbling:1,passing:1}:
      game==='hold-up'?{physical:bonus,dribbling:1}:
      game==='through-pass'||game==='long-kick'||game==='pressure-exit'?{passing:bonus,coachTrust:1}:
      {form:1}
    const next=applyEffects(state,effects)
    setState({...next,activeEvent:state.activeEvent})
  }

  return <div className="shell game-shell">
    <header className="game-header">
      <button className="brand brand--button" onClick={onExit}><LeyendaLogo size="sm"/><span><strong>LEYENDA</strong><small>← MENÚ</small></span></button>
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
          {typeof seasonSummary.glory==='number'&&seasonSummary.glory>0&&<div className="season-glory-reveal"><span>GLORIA GANADA</span><strong>+{seasonSummary.glory.toLocaleString('es-AR')}</strong><small>Se revela recién al terminar la temporada.</small></div>}
          <em>{seasonSummary.note}</em>
          <button className="play-button" onClick={closeSeasonSummary}>CONTINUAR →</button>
        </section>
      </div>}
      {tab==='career'&&<div className="career-overview">
      <section className="identity-card identity-card--media" style={(playerMedia.stadiumImage??playerMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 35%,rgba(5,10,18,.58)),url("'+(playerMedia.stadiumImage??playerMedia.image)+'")'}:undefined}>
        <ClubCrest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">{displayLeague}</span><h1>{state.playerName}</h1><p>{state.position} · {state.age} años · {club.name}</p>{state.finalStyle&&<small className={'career-style-badge career-style-badge--'+state.finalStyle}>{state.finalStyle.toUpperCase()}</small>}</div>
        <div className="overall"><strong>{state.overall}</strong><span>OVR</span></div>
      </section>
      <MatchdayScene clubName={club.name} media={playerMedia} mode="player" season={state.season} age={state.age}/>

      <div className="quick-stats">
        <Stat value={state.matches} label="PJ"/><Stat value={state.goals} label="GOLES"/><Stat value={state.assists} label="ASIST."/><Stat value={state.titles} label="TÍTULOS"/>
      </div>

      <PlayerAttributes state={{...state,stats:playerStats}}/>
      <IdolProgress value={state.clubLegacy??0} years={state.history.filter(item=>item.clubId===state.clubId).length}/>
      <TrophyCabinet state={state}/>

      </div>}

      {tab==='career'&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {lastEffects&&<div className="decision-feedback"><div><span className="eyebrow">DECISIÓN TOMADA</span><strong>Tu jugador cambió</strong><EffectChips effects={lastEffects}/></div><button onClick={()=>setLastEffects(null)}>×</button></div>}
          {state.retired?<><span className="eyebrow">FINAL DE CARRERA</span><h2>Tu historia ya está escrita.</h2><p>Terminaste {state.history.length} temporadas con {state.matches} partidos y {state.titles} títulos.</p><div className="final-score"><span>SCORE FINAL</span><strong>{careerScore(state).toLocaleString('es-AR')}</strong></div></>:
          !state.finalStyle&&!state.activeEvent?<FinalStyleChoice onChoose={style=>setState(chooseFinalStyle(state,style))}/>:
          state.pendingFinal?<CareerFinalPanel state={state} onResolved={resolveFinal}/>:
          state.marketDecisionRequired?<div className="market-blocker"><span className="eyebrow">MERCADO DE PASES</span><h2>Antes de seguir, decidí tu futuro.</h2><p>Tenés que elegir si continuás, renovás o aceptás una de las ofertas que llegaron.</p><button className="play-button" onClick={()=>setTab('market')}>VER OFERTAS →</button></div>:
          state.activeEvent?<><DecisionScene category={state.activeEvent.category} title={state.activeEvent.title} media={playerMedia} clubName={club.name}/><span className="eyebrow">{state.activeEvent.eyebrow}</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=>{const effects=careerDecisionEffects(state.activeEvent?.id,o.effects);return <button key={o.id} onClick={()=>{setLastEffects(effects);setState(choosePlayerEvent(state,o as EventOption))}}><div><strong>{o.label}</strong><span>{o.description}</span><EffectChips effects={effects}/></div><b>→</b></button>})}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season} DE {state.maxSeasons}</span><h2>Todo listo para competir.</h2><p>Tu estado físico, la confianza, el vestuario y las decisiones ya están en juego.</p><button className="play-button" onClick={playSeason}>▶ JUGAR TEMPORADA</button></>}
        </section>

        <aside className="panel condition-panel">
          <div className="panel-head"><div><span className="eyebrow">CONDICIÓN</span><h3>Estado del jugador</h3></div><span className="condition-label">{state.energy>70?'ÓPTIMO':state.energy>45?'CARGADO':'AL LÍMITE'}</span></div>
          <Meter label="Forma" value={state.form}/><Meter label="Energía" value={state.energy}/><Meter label="Moral" value={state.morale}/><Meter label="Confianza DT" value={state.coachTrust}/><Meter label="Disciplina" value={state.discipline}/><Meter label="Liderazgo" value={state.leadership}/>
        </aside>
      </div>}

      {tab==='market'&&<MarketPanel state={state} onState={setState} onDone={()=>setTab('career')}/>} 

      {tab==='training'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ENTRENAMIENTO</span><h2>{state.trainingCredits} sesiones disponibles</h2></div></div>
        <div className="training-grid">
          {trainingOptionsFor(state.position).map(x=><button key={x[0]} disabled={!state.trainingCredits} onClick={()=>setState(trainCareer(state,x[0] as 'physical'|'technique'|'finishing'|'mind'|'defending'))}><b>◇</b><strong>{x[1]}</strong><span>{x[2]}</span></button>)}
        </div>
      </section>}

      {tab==='shop'&&<ShopPanel state={state} setState={setState}/>}\n      {tab==='minigames'&&<PlayerGamesHub style={state.finalStyle} onSkillScore={playMini}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ARCHIVO</span><h2>Tu historia</h2></div><span className="pill">{state.history.length} TEMP.</span></div>
        {state.history.length===0?<div className="empty-state"><b>≡</b><strong>La historia está en blanco.</strong><span>Terminá la primera temporada.</span></div>:
          <div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><ClubCrest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season} · {s.age} años</span><p>{s.note}</p></div><aside><b>{s.rating}</b><span>RAT</span></aside></article>)}</div>}
      </section>}
    </main>
    <GameSideNav tab={tab} setTab={setTab} coach={false}/>
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
      <button className="brand brand--button" onClick={onExit}><LeyendaLogo size="sm"/><span><strong>LEYENDA</strong><small>← MENÚ</small></span></button>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <main className="game-main">
      {tab==='career'&&<div className="career-overview">
      <section className="identity-card coach-identity identity-card--media" style={(coachMedia.stadiumImage??coachMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 35%,rgba(5,10,18,.58)),url("'+(coachMedia.stadiumImage??coachMedia.image)+'")'}:undefined}>
        <ClubCrest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">MODO ENTRENADOR · {leagueById(club.leagueId).name}</span><h1>{state.coachName}</h1><p>{club.name} · Temporada {state.season}/{state.maxSeasons}</p></div>
        <div className="overall"><strong>{state.tacticalRating}</strong><span>TÁCTICA</span></div>
      </section>
      <MatchdayScene clubName={club.name} media={coachMedia} mode="coach" season={state.season}/>

      <div className="quick-stats"><Stat value={state.titles} label="TÍTULOS"/><Stat value={state.boardTrust} label="DIRECTIVA"/><Stat value={state.fanTrust} label="HINCHADA"/><Stat value={'$ '+formatMoney(state.budget)} label="CAJA"/></div>

      </div>}

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
    <GameSideNav tab={tab} setTab={setTab} coach={true}/>
  </div>
}

export function App(){
  const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem(THEME_KEY) as Theme)||'dark')
  const [demoUser,setDemoUser]=useState(()=>sessionStorage.getItem(AUTH_KEY)||'')
  const [save,setSave]=useState<SaveState>(()=>{
    try{
      const raw=sessionStorage.getItem(SAVE_KEY)
      return raw?normalizeSaveState(JSON.parse(raw) as SaveState):null
    }catch{return null}
  })

  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    localStorage.setItem(THEME_KEY,theme)
  },[theme])

  useEffect(()=>{
    if(save)sessionStorage.setItem(SAVE_KEY,JSON.stringify(save))
  },[save])

  const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark')
  const enterDemo=(name:string)=>{sessionStorage.setItem(AUTH_KEY,name);setDemoUser(name);window.scrollTo({top:0,behavior:'auto'})}
  const exit=()=>{setSave(null);sessionStorage.removeItem(SAVE_KEY)}

  if(!demoUser)return <MockLogin onEnter={enterDemo}/>

  if(!save){
    return <Home theme={theme} onTheme={toggleTheme}
      startPlayer={(name,position,mode,clubId,nationality)=>setSave(createCareer(name,position,mode,clubId,nationality))}
      startCoach={(name,clubId)=>setSave(createCoach(name,clubId))}
    />
  }

  if(save.gameMode==='coach') return <CoachGame state={save} setState={setSave} theme={theme} onTheme={toggleTheme} onExit={exit}/>
  return <PlayerGame state={save} setState={setSave} theme={theme} onTheme={toggleTheme} onExit={exit}/>
}
