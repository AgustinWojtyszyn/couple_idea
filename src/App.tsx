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

function AssetBootScreen(){
  return <div className="asset-boot">
    <div className="asset-boot__mark"><LeyendaLogo size="lg"/></div>
    <strong>LEYENDA</strong>
    <span>Preparando clubes, escudos y cancha…</span>
    <div className="asset-boot__track"><i/></div>
  </div>
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

function GameTopNav({
  tab,setTab,coach,clubName,onExit,theme,onTheme
}:{
  tab:Tab
  setTab:(t:Tab)=>void
  coach:boolean
  clubName:string
  onExit:()=>void
  theme:Theme
  onTheme:()=>void
}){
  const [moreOpen,setMoreOpen]=useState(false)
  const primary:Array<[Tab,string]> = coach
    ? [['career','Inicio'],['squad','Equipo'],['minigames','Desafíos']]
    : [['career','Carrera'],['market','Mercado'],['minigames','Jugar']]
  const secondary:Array<[Tab,string]> = coach
    ? [['history','Historia'],['ranking','Ranking']]
    : [['training','Entreno'],['shop','Tienda'],['history','Historia'],['ranking','Ranking']]
  const go=(next:Tab)=>{
    setMoreOpen(false)
    setTab(next)
    window.scrollTo({top:0,behavior:'smooth'})
  }
  const secondaryActive=secondary.some(([id])=>id===tab)
  return <header className="game-topbar">
    <div className="game-topbar__brand">
      <button onClick={onExit} aria-label="Volver al menú"><LeyendaLogo size="sm"/></button>
      <div><strong>LEYENDA</strong><small>{clubName}</small></div>
    </div>
    <nav className="game-topbar__nav" aria-label="Secciones del juego">
      {primary.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}>{label}</button>)}
      <button className={secondaryActive||moreOpen?'active':''} onClick={()=>setMoreOpen(open=>!open)}>Más <span>⌄</span></button>
    </nav>
    <button className="game-topbar__theme" onClick={onTheme} aria-label="Cambiar tema">{theme==='dark'?'☾':'☀'}</button>
    {moreOpen&&<div className="game-topbar__more">
      {secondary.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>go(id)}>{label}</button>)}
    </div>}
  </header>
}
const shopItems:Array<{id:string;icon:string;name:string;description:string;cost:number;effects:EventOption['effects'];kind:'staff'|'asset'}>= [
  {id:'physio',icon:'✚',name:'Kinesiólogo personal',description:'Menos riesgo de lesión y mejor recuperación.',cost:180000,effects:{injuryRisk:-10,energy:6},kind:'staff'},
  {id:'psych',icon:'◉',name:'Psicólogo deportivo',description:'Más moral y disciplina en los momentos duros.',cost:150000,effects:{morale:10,discipline:4},kind:'staff'},
  {id:'physical',icon:'◆',name:'Preparador físico',description:'Mejora tu potencia y capacidad de sostener temporadas.',cost:260000,effects:{physical:4,pace:2,energy:7},kind:'staff'},
  {id:'video',icon:'⌁',name:'Analista de video',description:'Lectura específica de tu puesto y confianza del DT.',cost:240000,effects:{},kind:'staff'},
  {id:'technical',icon:'◎',name:'Entrenador técnico',description:'Trabajo individual específico para tu función.',cost:320000,effects:{},kind:'staff'},
  {id:'first-car',icon:'◫',name:'Primer auto',description:'Tu primer gusto grande como profesional. Sube la moral, no el fútbol.',cost:420000,effects:{morale:4,fans:1},kind:'asset'},
  {id:'apartment',icon:'▥',name:'Departamento propio',description:'Independencia y estabilidad fuera de la cancha.',cost:880000,effects:{morale:5,discipline:2},kind:'asset'},
  {id:'family-house',icon:'⌂',name:'Casa familiar',description:'Un hito de carrera que también ordena tu vida.',cost:1650000,effects:{morale:7,reputation:2},kind:'asset'},
  {id:'business',icon:'▦',name:'Negocio propio',description:'Un ingreso y un proyecto para pensar más allá del retiro.',cost:2400000,effects:{reputation:3,discipline:2},kind:'asset'},
  {id:'country-place',icon:'△',name:'Campo de descanso',description:'El lujo final de una carrera larga.',cost:4200000,effects:{morale:8,fans:2},kind:'asset'},
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
  const buy=(item:(typeof shopItems)[number])=>{
    if(owned.has(item.id)||state.money<item.cost)return
    const effects=shopEffectsFor(state.position,item.id,item.effects)
    const next=applyEffects(state,effects)
    setState({...next,activeEvent:state.activeEvent,money:next.money-item.cost,purchases:[...(state.purchases??[]),item.id]})
  }
  const staff=shopItems.filter(item=>item.kind==='staff')
  const assets=shopItems.filter(item=>item.kind==='asset')

  return <section className="panel shop-panel shop-panel--career">
    <div className="panel-head"><div><span className="eyebrow">TU CARRERA · STAFF + BIENES</span><h2>Lo que construís afuera también queda.</h2></div><span className="wallet">$ {formatMoney(state.money)}</span></div>
    <p className="shop-intro">Sin marcas. Mejorás tu entorno profesional y, cuando la carrera despega, empezás a convertir contratos en patrimonio.</p>

    <div className="shop-section-head"><span>STAFF · CAMBIA TU RENDIMIENTO</span><b>{staff.filter(item=>owned.has(item.id)).length}/{staff.length}</b></div>
    <div className="shop-list">{staff.map(item=>{
      const bought=owned.has(item.id)
      const effects=shopEffectsFor(state.position,item.id,item.effects)
      return <button key={item.id} disabled={bought||state.money<item.cost} onClick={()=>buy(item)}>
        <b>{item.icon}</b>
        <span><strong>{item.name}</strong><small>{item.description}</small><EffectChips effects={effects}/></span>
        <em>{bought?'CONTRATADO':'$ '+formatMoney(item.cost)}</em>
      </button>
    })}</div>

    <div className="shop-section-head shop-section-head--assets"><span>BIENES · QUEDAN EN TU HISTORIA</span><b>{assets.filter(item=>owned.has(item.id)).length}/{assets.length}</b></div>
    <div className="asset-shop-grid">{assets.map(item=>{
      const bought=owned.has(item.id)
      return <button key={item.id} className={bought?'owned':''} disabled={bought||state.money<item.cost} onClick={()=>buy(item)}>
        <span className="asset-shop-art"><b>{item.icon}</b><i/><i/></span>
        <strong>{item.name}</strong>
        <small>{item.description}</small>
        <em>{bought?'✓ TUYO':'$ '+formatMoney(item.cost)}</em>
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

function useGamePhase(active:boolean,duration=1800){
  const [phase,setPhase]=useState(0)
  useEffect(()=>{
    if(!active){setPhase(0);return}
    let frame=0
    let last=0
    const start=performance.now()
    const tick=(now:number)=>{
      if(now-last>28){
        const raw=((now-start)%duration)/duration
        setPhase(raw<.5?raw*2:(1-raw)*2)
        last=now
      }
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[active,duration])
  return phase
}

function useLoopPhase(active:boolean,duration=2200){
  const [phase,setPhase]=useState(0)
  useEffect(()=>{
    if(!active){setPhase(0);return}
    let frame=0
    let last=0
    const start=performance.now()
    const tick=(now:number)=>{
      if(now-last>28){
        setPhase(((now-start)%duration)/duration)
        last=now
      }
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(frame)
  },[active,duration])
  return phase
}

function SkillGameThumb({id}:{id:MiniGameId}){
  const group=
    id==='penalties'||id==='freekicks'?'shot':
    id==='keeper'||id==='duel'?'defence':
    id==='dribble'||id==='personal-run'||id==='timing-run'?'run':
    id==='memory-board'||id==='code-call'||id==='grid-gap'?'brain':
    id==='through-pass'||id==='pressure-exit'||id==='long-kick'?'pass':'ball'
  return <span className={'game-thumb game-thumb--'+group} aria-hidden="true">
    <svg viewBox="0 0 120 78">
      <rect x="2" y="2" width="116" height="74" rx="15" className="thumb-bg"/>
      {group==='shot'&&<><path d="M65 15h38v30H65z" className="thumb-line"/><path d="M70 17v26M82 17v26M94 17v26M66 25h36M66 35h36" className="thumb-grid"/><circle cx="25" cy="58" r="7" className="thumb-ball"/><path d="M31 54C48 42 55 31 75 27" className="thumb-path"/></>}
      {group==='defence'&&<><path d="M16 19h88v43H16z" className="thumb-line"/><circle cx="36" cy="40" r="9" className="thumb-player"/><circle cx="84" cy="38" r="7" className="thumb-ball"/><path d="M45 41h26" className="thumb-path"/><path d="M28 28l8 12 8-12M28 52l8-12 8 12" className="thumb-grid"/></>}
      {group==='run'&&<><path d="M14 62C35 57 37 20 58 22s19 34 48 19" className="thumb-path"/><circle cx="18" cy="59" r="6" className="thumb-ball"/><circle cx="45" cy="35" r="5" className="thumb-cone"/><circle cx="70" cy="39" r="5" className="thumb-cone"/><circle cx="94" cy="31" r="5" className="thumb-cone"/></>}
      {group==='brain'&&<>{[0,1,2].map(r=>[0,1,2].map(col=><rect key={r+'-'+col} x={28+col*23} y={11+r*20} width="16" height="14" rx="3" className={(r===1&&col===2)?'thumb-hot':'thumb-cell'}/>))}</>}
      {group==='pass'&&<><circle cx="22" cy="55" r="7" className="thumb-ball"/><circle cx="91" cy="23" r="8" className="thumb-player"/><circle cx="79" cy="58" r="8" className="thumb-player"/><path d="M29 52C46 47 58 34 83 27" className="thumb-path"/><path d="M58 12v54" className="thumb-grid"/></>}
      {group==='ball'&&<><circle cx="60" cy="39" r="14" className="thumb-ball"/><path d="M20 20l21 10M100 20L79 30M20 59l22-11M100 59L79 48" className="thumb-path"/></>}
    </svg>
  </span>
}

function CabalaGameThumb({id}:{id:CabalaGameId}){
  const group=
    id==='higher-lower'||id==='grid-reveal'?'cards':
    id==='dice-seven'||id==='lucky-number'?'dice':
    id==='coin-run'||id==='wheel'?'wheel':
    id==='three-cups'||id==='lucky-shirt'?'ritual':
    id==='tower'?'tower':'boots'
  return <span className={'game-thumb game-thumb--luck game-thumb--'+group} aria-hidden="true">
    <svg viewBox="0 0 120 78">
      <rect x="2" y="2" width="116" height="74" rx="15" className="thumb-bg"/>
      {group==='cards'&&<><rect x="28" y="14" width="32" height="48" rx="6" className="thumb-card"/><rect x="58" y="11" width="32" height="48" rx="6" className="thumb-card thumb-card--back"/><path d="M39 38l5-8 5 8-5 8z" className="thumb-hot"/></>}
      {group==='dice'&&<><rect x="23" y="20" width="34" height="34" rx="8" className="thumb-card"/><rect x="64" y="24" width="34" height="34" rx="8" className="thumb-card"/>{[32,48,73,89].map((x,i)=><circle key={i} cx={x} cy={i<2?30:48} r="3.5" className="thumb-hot"/>)}</>}
      {group==='wheel'&&<><circle cx="60" cy="39" r="25" className="thumb-card"/><path d="M60 14v50M35 39h50M43 22l34 34M77 22L43 56" className="thumb-grid"/><circle cx="60" cy="39" r="6" className="thumb-hot"/></>}
      {group==='ritual'&&<><path d="M24 55l8-34h22l8 34zM65 55l8-34h22l8 34z" className="thumb-card"/><circle cx="60" cy="58" r="6" className="thumb-ball"/></>}
      {group==='tower'&&<><rect x="23" y="52" width="74" height="10" rx="3" className="thumb-card"/><rect x="32" y="39" width="56" height="10" rx="3" className="thumb-card"/><rect x="42" y="26" width="38" height="10" rx="3" className="thumb-card"/><rect x="51" y="13" width="20" height="10" rx="3" className="thumb-hot"/></>}
      {group==='boots'&&<><path d="M24 52c18 0 20-23 20-33 13 10 17 22 32 22h19v13H54c-13 0-21 2-30-2z" className="thumb-card"/><path d="M23 17l5-6M40 13l2-7M92 16l-4-6" className="thumb-path"/></>}
    </svg>
  </span>
}

const advancedSkillIds:MiniGameId[]=[
  'memory-board','personal-run','timing-run','ball-track','code-call','hold-up','through-pass','grid-gap','long-kick','pressure-exit'
]

function ModernSkillGame({
  game,onComplete,onBack,forced
}:{
  game:MiniGameId
  onComplete:(score:number)=>void
  onBack:()=>void
  forced?:boolean
}){
  type Mechanic='strike'|'window'|'break'|'reaction'|'pattern'
  const mechanic:Mechanic=
    ['penalties','freekicks'].includes(game)?'strike':
    ['through-pass','long-kick','pressure-exit'].includes(game)?'window':
    ['dribble','personal-run','timing-run','hold-up'].includes(game)?'break':
    ['keeper','duel'].includes(game)?'reaction':'pattern'

  const meta:Record<Mechanic,{kicker:string;title:string;desc:string;cta:string}>={
    strike:{kicker:'UNA PELOTA · UNA HISTORIA',title:game==='penalties'?'La última':'Trazo',desc:'Arrastrá desde la pelota y soltá donde querés terminar la jugada. Dirección y potencia se calculan con tu gesto.',cta:'DESLIZÁ PARA DEFINIR'},
    window:{kicker:'LECTURA EN MOVIMIENTO',title:game==='long-kick'?'Cambio de frente':game==='pressure-exit'?'Salida limpia':'Ventana',desc:'La defensa se desplaza y el espacio aparece un instante. Tocá directamente el lugar al que querés jugar.',cta:'TOCÁ EL ESPACIO'},
    break:{kicker:'UNO CONTRA UNO',title:game==='hold-up'?'Choque':'Ruptura',desc:'El marcador cierra una dirección. Hacé un swipe rápido hacia el lado libre antes de que termine de perfilarse.',cta:'SWIPE PARA ROMPER'},
    reaction:{kicker:'DUELO DECISIVO',title:game==='keeper'?'Lectura del remate':'El cruce',desc:'No elegís una opción: esperás la jugada y tocás cuando el momento de intervenir entra en tu zona.',cta:'TOCÁ EN EL MOMENTO'},
    pattern:{kicker:'CABEZA A MIL',title:game==='memory-board'?'Código del DT':'Mapa ciego',desc:'La jugada aparece una sola vez. Después repetí el recorrido tocando los sectores en el mismo orden.',cta:'REPETÍ LA JUGADA'},
  }

  const [done,setDone]=useState(false)
  const [score,setScore]=useState<number|null>(null)
  const [feedback,setFeedback]=useState('')
  const [shot,setShot]=useState<{x:number;y:number}|null>(null)
  const [dragStart,setDragStart]=useState<{x:number;y:number}|null>(null)
  const [swipeStart,setSwipeStart]=useState<{x:number;y:number}|null>(null)
  const [patternVisible,setPatternVisible]=useState(true)
  const [patternProgress,setPatternProgress]=useState<number[]>([])
  const phase=useLoopPhase(!done,2100)
  const sequence=useMemo(()=>[1,7,4].map((value,index)=>(value+game.length+index*2)%9),[game])

  useEffect(()=>{
    if(mechanic!=='pattern')return
    setPatternVisible(true)
    setPatternProgress([])
    const id=window.setTimeout(()=>setPatternVisible(false),1500)
    return()=>window.clearTimeout(id)
  },[game,mechanic])

  const finish=(value:number,message:string)=>{
    if(done)return
    const final=Math.max(0,Math.min(100,Math.round(value)))
    setDone(true)
    setScore(final)
    setFeedback(message)
    window.setTimeout(()=>onComplete(final),520)
  }

  const targetX=.2+.6*phase
  const targetY=.32+.10*Math.sin(phase*Math.PI*2)

  const pointerIn=(event:React.PointerEvent<HTMLElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height}
  }

  const strikeDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(done)return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragStart(pointerIn(event))
    setShot(null)
  }
  const strikeUp=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(done||!dragStart)return
    const end=pointerIn(event)
    const travel=Math.max(0,dragStart.y-end.y)
    const horizontal=Math.abs(end.x-targetX)
    const vertical=Math.abs(end.y-targetY)
    const precision=Math.max(0,100-horizontal*145-vertical*110)
    const power=Math.min(100,travel*165)
    const final=precision*.72+power*.28
    setShot(end)
    setDragStart(null)
    finish(final,final>=88?'IMPOSIBLE DE ATAJAR':final>=68?'ENTRÓ LIMPIA':final>=48?'ROZÓ EL OBJETIVO':'SE FUE')
  }

  const playWindow=(event:React.PointerEvent<HTMLButtonElement>)=>{
    if(done)return
    const point=pointerIn(event)
    const distance=Math.hypot(point.x-targetX,(point.y-targetY)*1.25)
    const final=Math.max(12,100-distance*190)
    setShot(point)
    finish(final,final>=86?'PARTISTE LA DEFENSA':final>=64?'PASE CON VENTAJA':final>=45?'LLEGÓ FORZADO':'INTERCEPTADO')
  }

  const swipeDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(done)return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSwipeStart({x:event.clientX,y:event.clientY})
  }
  const swipeUp=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(done||!swipeStart)return
    const dx=event.clientX-swipeStart.x
    const dy=event.clientY-swipeStart.y
    const distance=Math.hypot(dx,dy)
    const chosen=dx<0?'left':'right'
    const open=phase<.5?'right':'left'
    const directionScore=chosen===open?82:24
    const speedBonus=Math.min(18,distance/8)
    const final=Math.min(100,directionScore+speedBonus)
    setSwipeStart(null)
    finish(final,final>=88?'LO ROMPISTE':final>=65?'GANASTE EL METRO':'TE LEYÓ')
  }

  const react=()=>{
    if(done)return
    const distance=Math.abs(phase-.68)
    const final=distance<.045?100:distance<.09?86:distance<.16?66:distance<.24?44:18
    finish(final,final>=90?'ANTICIPO PERFECTO':final>=70?'LLEGASTE JUSTO':final>=45?'METISTE EL CUERPO':'LLEGASTE TARDE')
  }

  const patternTap=(index:number)=>{
    if(done||patternVisible)return
    const expected=sequence[patternProgress.length]
    if(index!==expected){
      finish(Math.max(18,35-patternProgress.length*4),'SE CORTÓ LA JUGADA')
      return
    }
    const next=[...patternProgress,index]
    setPatternProgress(next)
    if(next.length===sequence.length)finish(100,'LA LEÍSTE COMPLETA')
  }

  return <section className={'modern-game modern-game--'+mechanic}>
    <div className="modern-game__top">
      {!forced?<button className="back-link" onClick={onBack}>← Juegos</button>:<span className="final-game-badge">PARTIDO DECISIVO</span>}
      <span>{done?'RESUELTO':'UNA SOLA JUGADA'}</span>
    </div>
    <div className="modern-game__intro">
      <span>{meta[mechanic].kicker}</span>
      <h2>{meta[mechanic].title}</h2>
      <p>{meta[mechanic].desc}</p>
    </div>

    <div className="modern-game__stadium">
      <div className="modern-match-ribbon"><span>🏆 PARTIDO DECISIVO</span><strong>89:42</strong><b>1 — 1</b></div>
      <div className="modern-game__crowd"><i/><i/><i/><i/><i/></div>
      <div className="modern-game__lights"><i/><i/><i/><i/></div>

      {mechanic==='strike'&&<div className="gesture-pitch gesture-pitch--strike" onPointerDown={strikeDown} onPointerUp={strikeUp}>
        <div className="gesture-goal"><i/><i/><i/><i/></div>
        <div className="modern-keeper" style={{left:(24+phase*52)+'%'}}><i/><b/><span/></div>
        <div className="moving-target" style={{left:(targetX*100)+'%',top:(targetY*100)+'%'}}/>
        <span className="gesture-ball">⚽</span>
        {shot&&<><span className="shot-end" style={{left:(shot.x*100)+'%',top:(shot.y*100)+'%'}}>●</span><i className="shot-vector" style={{'--shot-x':(shot.x*100)+'%','--shot-y':(shot.y*100)+'%'} as React.CSSProperties}/></>}
        <strong>{done?'JUGADA TERMINADA':'ARRASTRÁ LA PELOTA HACIA EL HUECO'}</strong>
      </div>}

      {mechanic==='window'&&<button className="gesture-pitch gesture-pitch--window" onPointerDown={playWindow} disabled={done}>
        <div className="defensive-line"><i/><i/><i/><i/></div>
        <div className="moving-window" style={{left:(targetX*100)+'%',top:(targetY*100)+'%'}}><span/></div>
        <span className="window-ball">⚽</span>
        {shot&&<span className="pass-impact" style={{left:(shot.x*100)+'%',top:(shot.y*100)+'%'}}/>}
        <strong>{done?'JUGADA TERMINADA':'TOCÁ EL ESPACIO, NO UN BOTÓN'}</strong>
      </button>}

      {mechanic==='break'&&<div className="gesture-pitch gesture-pitch--break" onPointerDown={swipeDown} onPointerUp={swipeUp}>
        <div className={'closing-defender '+(phase<.5?'closing-defender--left':'closing-defender--right')}><span/></div>
        <div className="break-player"><b>●</b><i>⚽</i></div>
        <div className="break-lanes"><span/><span/></div>
        <strong>{done?'DUELO TERMINADO':'DESLIZÁ HACIA EL ESPACIO LIBRE'}</strong>
      </div>}

      {mechanic==='reaction'&&<button className="gesture-pitch gesture-pitch--reaction" onPointerDown={react} disabled={done}>
        <div className="reaction-lane"><i className="reaction-zone"/><b style={{top:(10+phase*72)+'%'}}>⚽</b></div>
        <div className="reaction-player">◆</div>
        <strong>{done?'DUELO TERMINADO':'TOCÁ LA CANCHA CUANDO ENTRE EN TU ZONA'}</strong>
      </button>}

      {mechanic==='pattern'&&<div className="gesture-pitch gesture-pitch--pattern">
        <div className="pattern-grid">{Array.from({length:9},(_,index)=><button key={index} disabled={patternVisible||done} className={patternVisible&&sequence.includes(index)?'lit':patternProgress.includes(index)?'chosen':''} onClick={()=>patternTap(index)}><span>{index+1}</span></button>)}</div>
        <svg className="pattern-path" viewBox="0 0 300 300" aria-hidden="true">
          {patternVisible&&<polyline points={sequence.map(index=>{const col=index%3;const row=Math.floor(index/3);return (50+col*100)+','+(50+row*100)}).join(' ')} />}
        </svg>
        <strong>{patternVisible?'MIRÁ LA JUGADA':'REPETILA DE MEMORIA'}</strong>
      </div>}
    </div>

    <div className={'modern-game__result '+(done?'show':'')}>
      <span>{score===null?meta[mechanic].cta:'PUNTUACIÓN'}</span>
      {score!==null&&<strong>{score}</strong>}
      <b>{feedback}</b>
    </div>
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
  const [coachScoreValue,setCoachScoreValue]=useState(0)
  const [coachFeedback,setCoachFeedback]=useState('')

  useEffect(()=>{if(forcedGame)setActive(forcedGame)},[forcedGame])

  if(mode==='player'){
    if(active)return <ModernSkillGame
      game={active}
      forced={Boolean(forcedGame)}
      onBack={()=>setActive(null)}
      onComplete={value=>{onScore(active,value);onComplete?.(value)}}
    />
    const featured=games.filter(game=>['freekicks','through-pass','personal-run','duel','keeper','memory-board'].includes(game.id))
    return <section className="panel modern-games-hub">
      <div className="panel-head"><div><span className="eyebrow">PARTIDOS DECISIVOS</span><h2>Seis formas de jugarte la historia.</h2></div><span className="pill">UNA JUGADA</span></div>
      <p className="minigame-hub__intro">Cada desafío es una escena completa: gesto, timing, lectura o memoria. Entrás, jugás una acción y salís con un resultado.</p>
      <div className="modern-games-grid">{featured.map(game=><button key={game.id} onClick={()=>setActive(game.id)}>
        <SkillGameThumb id={game.id}/>
        <span><strong>{game.name}</strong><small>{game.description}</small></span>
        <em>JUGAR</em>
      </button>)}</div>
    </section>
  }

  const playCoach=(game:MiniGameId,index:number)=>{
    const target=(game.length+index)%3
    const earned=target===1?100:target===2?72:48
    setCoachScoreValue(earned)
    setCoachFeedback(earned>=90?'LECTURA PERFECTA':earned>=65?'BUENA DECISIÓN':'RIESGO ALTO')
    onScore(game,earned)
  }
  if(active){
    const game=games.find(item=>item.id===active)!
    return <section className="panel modern-coach-game">
      <button className="back-link" onClick={()=>{setActive(null);setCoachFeedback('')}}>← Desafíos</button>
      <span className="eyebrow">DECISIÓN ÚNICA</span><h2>{game.name}</h2><p>{game.description}</p>
      <div className="coach-match-board"><i/><i/><i/><span>●</span><span>●</span><span>●</span></div>
      <div className="coach-options"><button onClick={()=>playCoach(active,0)}>CAMBIAR ALTURA</button><button onClick={()=>playCoach(active,1)}>ATACAR EL ESPACIO</button><button onClick={()=>playCoach(active,2)}>ENFRIAR EL PARTIDO</button></div>
      {coachFeedback&&<div className="modern-game__result show"><span>PUNTUACIÓN</span><strong>{coachScoreValue}</strong><b>{coachFeedback}</b></div>}
    </section>
  }
  return <section className="panel modern-games-hub">
    <div className="panel-head"><div><span className="eyebrow">LABORATORIO DEL DT</span><h2>Decisiones de partido.</h2></div></div>
    <div className="modern-games-grid">{games.map(game=><button key={game.id} onClick={()=>setActive(game.id)}><b>{game.icon}</b><span><strong>{game.name}</strong><small>{game.description}</small></span><em>ABRIR</em></button>)}</div>
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
    'higher-lower':3,'dice-seven':1,'coin-run':1,'lucky-number':1,'lucky-shirt':1,
    'three-cups':1,'wheel':1,'tower':1,'grid-reveal':1,'boots':1,
  }
  const maxRounds=roundsByGame[game]
  const [round,setRound]=useState(0)
  const [hits,setHits]=useState(0)
  const [feedback,setFeedback]=useState('Elegí. No hay vuelta atrás.')
  const [card,setCard]=useState(()=>2+Math.floor(Math.random()*12))
  const [cardTrail,setCardTrail]=useState<number[]>([])
  const [lastCoin,setLastCoin]=useState<'CARA'|'CECA'|null>(null)
  const [luckyNumber,setLuckyNumber]=useState(()=>Math.floor(Math.random()*3))
  const [shirtWinner,setShirtWinner]=useState(()=>[7,9,10,11,23][Math.floor(Math.random()*5)])
  const [revealed,setRevealed]=useState(true)
  const [cupSlots,setCupSlots]=useState<number[]>([0,1,2])
  const [cupsReady,setCupsReady]=useState(false)
  const [weather,setWeather]=useState(()=>Math.floor(Math.random()*3))
  const [animating,setAnimating]=useState(false)
  const [generalaDice,setGeneralaDice]=useState<number[]>([1,1,1,1,1])
  const [generalaHeld,setGeneralaHeld]=useState<boolean[]>([false,false,false,false,false])
  const [generalaRolls,setGeneralaRolls]=useState(0)
  const [generalaLabel,setGeneralaLabel]=useState('TIRÁ PARA EMPEZAR')
  const finished=round>=maxRounds
  const loopPhase=useLoopPhase(!finished&&!animating,2200)

  useEffect(()=>{
    if(round>=maxRounds)return
    if(game==='grid-reveal'){
      setRevealed(true)
      const id=window.setTimeout(()=>setRevealed(false),1100)
      return()=>window.clearTimeout(id)
    }
    if(game!=='three-cups')return

    setCupSlots([0,1,2])
    setRevealed(true)
    setCupsReady(false)
    setAnimating(false)

    let shuffleTimer:number|undefined
    let finishTimer:number|undefined
    const revealTimer=window.setTimeout(()=>{
      setRevealed(false)
      setAnimating(true)
      shuffleTimer=window.setInterval(()=>{
        setCupSlots(current=>{
          const next=[...current]
          const a=Math.floor(Math.random()*3)
          let b=Math.floor(Math.random()*3)
          if(a===b)b=(b+1)%3
          const temp=next[a]
          next[a]=next[b]
          next[b]=temp
          return next
        })
      },320)
      finishTimer=window.setTimeout(()=>{
        if(shuffleTimer)window.clearInterval(shuffleTimer)
        setAnimating(false)
        setCupsReady(true)
      },2240)
    },1300)

    return()=>{
      window.clearTimeout(revealTimer)
      if(shuffleTimer)window.clearInterval(shuffleTimer)
      if(finishTimer)window.clearTimeout(finishTimer)
    }
  },[game,round])

  const commit=(success:boolean,message:string)=>{
    if(finished)return
    const nextRound=round+1
    const nextHits=hits+(success?1:0)
    setRound(nextRound)
    setHits(nextHits)
    setFeedback(message)
    if(nextRound>=maxRounds){
      const target=Math.ceil(maxRounds*.55)
      const normalized=Math.round((nextHits/maxRounds)*100)
      window.setTimeout(()=>onComplete(nextHits>=target,normalized),420)
    }
  }

  const higherLower=(higher:boolean)=>{
    const previous=card
    let next=2+Math.floor(Math.random()*12)
    if(next===previous)next=next===14?13:next+1
    const success=higher?next>previous:next<previous
    setCardTrail(current=>[...current,previous])
    setCard(next)
    commit(success,'Salió '+next+' · '+(success?'TE ACOMPAÑA':'MALA SEÑAL'))
  }

  const scoreGenerala=(dice:number[])=>{
    const counts=Object.values(dice.reduce<Record<number,number>>((acc,value)=>{acc[value]=(acc[value]??0)+1;return acc},{})).sort((a,b)=>b-a)
    const unique=[...new Set(dice)].sort((a,b)=>a-b).join('')
    if(counts[0]===5)return {label:'GENERALA',score:100,won:true}
    if(counts[0]===4)return {label:'PÓKER',score:92,won:true}
    if(counts[0]===3&&counts[1]===2)return {label:'FULL',score:88,won:true}
    if(unique==='12345'||unique==='23456')return {label:'ESCALERA',score:86,won:true}
    if(counts[0]===3)return {label:'TRÍO',score:68,won:false}
    if(counts[0]===2&&counts[1]===2)return {label:'DOBLE PAR',score:58,won:false}
    if(counts[0]===2)return {label:'PAR',score:44,won:false}
    return {label:'SIN JUEGO',score:26,won:false}
  }

  const closeGenerala=(dice=generalaDice)=>{
    if(finished||animating||generalaRolls===0)return
    const result=scoreGenerala(dice)
    setGeneralaLabel(result.label)
    setRound(1)
    setHits(result.won?1:0)
    setFeedback(result.won?result.label+' · LA CÁBALA APARECIÓ':result.label+' · NO ALCANZÓ')
    window.setTimeout(()=>onComplete(result.won,result.score),650)
  }

  const rollGenerala=()=>{
    if(finished||animating||generalaRolls>=3)return
    setAnimating(true)
    const interval=window.setInterval(()=>{
      setGeneralaDice(current=>current.map((value,index)=>generalaHeld[index]?value:1+Math.floor(Math.random()*6)))
    },70)
    window.setTimeout(()=>{
      window.clearInterval(interval)
      const next=generalaDice.map((value,index)=>generalaHeld[index]?value:1+Math.floor(Math.random()*6))
      const nextRoll=generalaRolls+1
      setGeneralaDice(next)
      setGeneralaRolls(nextRoll)
      const preview=scoreGenerala(next)
      setGeneralaLabel(preview.label)
      setAnimating(false)
      if(nextRoll>=3)window.setTimeout(()=>closeGenerala(next),260)
    },620)
  }

  const toggleGeneralaHold=(index:number)=>{
    if(generalaRolls===0||finished||animating)return
    setGeneralaHeld(current=>current.map((value,i)=>i===index?!value:value))
  }

  const coinPick=(pick:'CARA'|'CECA')=>{
    if(animating)return
    setAnimating(true)
    setLastCoin(null)
    window.setTimeout(()=>{
      const result=Math.random()>.5?'CARA':'CECA'
      setLastCoin(result)
      setAnimating(false)
      commit(result===pick,'🪙 '+result+' · '+(result===pick?'SIGUE LA RACHA':'SE CORTÓ'))
    },720)
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

  const cupPick=(cupId:number)=>{
    if(!cupsReady||animating||revealed)return
    const success=cupId===luckyNumber
    setRevealed(true)
    setCupsReady(false)
    commit(success,success?'⚽ ¡LA SEGUISTE!':'🥤 VASO VACÍO')
  }

  const wheelStop=()=>{
    if(animating)return
    const success=(loopPhase>.10&&loopPhase<.25)||(loopPhase>.56&&loopPhase<.70)
    setAnimating(true)
    window.setTimeout(()=>{
      setAnimating(false)
      commit(success,success?'CAYÓ EN ZONA DORADA':'CAYÓ EN ZONA FRÍA')
    },360)
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
    'higher-lower':'🃏 El pálpito',
    'dice-seven':'🎲 La Generala',
    'coin-run':'🪙 Moneda de vestuario',
    'lucky-number':'🔢 Número marcado',
    'lucky-shirt':'👕 La camiseta',
    'three-cups':'⚽ Los tres vasos',
    'wheel':'🎡 Rueda del destino',
    'tower':'🏟️ La tribuna',
    'grid-reveal':'🧿 Grilla de la suerte',
    'boots':'🥾 Los tapones',
  }

  const kicker:Record<CabalaGameId,string>={
    'higher-lower':'CARTAS','dice-seven':'CINCO DADOS','coin-run':'RACHA','lucky-number':'INTUICIÓN','lucky-shirt':'RITUAL',
    'three-cups':'MEMORIA + SUERTE','wheel':'TIMING + AZAR','tower':'PÁLPITO DE HINCHADA','grid-reveal':'PÁLPITO','boots':'CLIMA',
  }

  const weatherMeta=[['☀','SECO','Tapón corto'],['☂','LLUVIA','Tapón largo'],['≈','MIXTO','Tapón intermedio']][weather]

  return <section className={'cabala-minigame cabala-minigame--'+game}>
    <div className="cabala-minigame__top">
      <span>✨ {kicker[game]} · {finished?'TERMINADO':game==='dice-seven'?'HASTA 3 TIRADAS':game==='higher-lower'?'RONDA '+Math.min(round+1,3)+'/3':'JUGADA ÚNICA'}</span>
      <strong>{title[game]}</strong>
      <small>{game==='dice-seven'?generalaRolls+' tiradas':game==='higher-lower'?hits+' aciertos':'una decisión'}</small>
    </div>

    {game==='higher-lower'&&<div className="cabala-cards-stage palpito-stage">
      <div className="cabala-table-art"><i/><i/><i/></div>
      <div className="palpito-progress">{[0,1,2].map(index=><span key={index} className={index<round?'done':index===round&&!finished?'active':''}>{index<cardTrail.length?cardTrail[index]:'?'}</span>)}</div>
      <div className="palpito-card" key={card}>
        <small>{round===0?'NÚMERO INICIAL':'AHORA TENÉS'}</small>
        <strong>{card}</strong>
        <span>{card>=11?'ALTO':card<=5?'BAJO':'MEDIO'}</span>
      </div>
      <div className="cabala-question">{finished?'La serie ya quedó definida.':'¿El próximo número será mayor o menor que '+card+'?'}</div>
      <div className="two-actions"><button disabled={finished} onClick={()=>higherLower(false)}>⬇️ MENOR</button><button disabled={finished} onClick={()=>higherLower(true)}>MAYOR ⬆️</button></div>
    </div>}

    {game==='dice-seven'&&<div className="cabala-dice-stage generala-stage">
      <div className="generala-scoreline"><span>{generalaLabel}</span><strong>{generalaRolls}/3 TIRADAS</strong></div>
      <div className={'generala-table '+(animating?'generala-table--rolling':'')}>
        {generalaDice.map((value,index)=><button key={index} className={generalaHeld[index]?'held':''} disabled={generalaRolls===0||finished||animating} onClick={()=>toggleGeneralaHold(index)}>
          <b>{['⚀','⚁','⚂','⚃','⚄','⚅'][value-1]}</b>
          <small>{generalaHeld[index]?'GUARDADO':generalaRolls?'TOCÁ PARA GUARDAR':'DADO'}</small>
        </button>)}
      </div>
      <div className="cabala-question">Buscá escalera, full, póker o generala. Guardá los dados que te sirvan y volvé a tirar.</div>
      <div className="generala-actions">
        <button className="skill-main-action luck-action" disabled={finished||animating||generalaRolls>=3} onClick={rollGenerala}>{animating?'TIRANDO…':generalaRolls===0?'TIRAR LOS DADOS':'VOLVER A TIRAR'}</button>
        {generalaRolls>0&&!finished&&<button className="generala-stand" disabled={animating} onClick={()=>closeGenerala()}>PLANTARSE CON {generalaLabel}</button>}
      </div>
    </div>}

    {game==='coin-run'&&<div className="cabala-coin-stage">
      <div className={'giant-coin '+(animating?'giant-coin--spinning ':'')+(lastCoin==='CECA'?'flip':'')}><span>{animating?'?':lastCoin==='CECA'?'C':'L'}</span></div>
      <div className="cabala-question">Cuatro lanzamientos. Tratá de leer la racha.</div>
      <div className="two-actions"><button disabled={finished||animating} onClick={()=>coinPick('CARA')}>CARA</button><button disabled={finished||animating} onClick={()=>coinPick('CECA')}>CECA</button></div>
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
      <div className="cups-phase"><b>{revealed&&!finished?'👀 MIRÁ':animating?'🔀 MEZCLANDO':cupsReady?'🎯 ELEGÍ':'✅ RESUELTO'}</b><span>{animating?'Seguí el vaso, no la pelota.':cupsReady?'¿Dónde quedó?':'Memorizá el vaso que la tapa.'}</span></div>
      <div className={'real-cups-row '+(animating?'is-shuffling':'')}>
        {[0,1,2].map(cupId=><button
          key={cupId}
          disabled={!cupsReady||finished}
          className={(revealed&&cupId===luckyNumber?'show-ball ':'')+(finished&&cupId===luckyNumber?'winner':'')}
          style={{left:(cupSlots[cupId]*33.333)+'%'}}
          onClick={()=>cupPick(cupId)}
        >
          <span className="hidden-ball">⚽</span>
          <i className="real-cup"><b/><em/></i>
        </button>)}
      </div>
      <div className="cabala-question">{revealed&&!finished?'La pelota está acá. Enseguida los vasos empiezan a moverse.':animating?'No toques todavía: seguí el recorrido.':cupsReady?'Elegí uno de los tres vasos.':'La jugada quedó definida.'}</div>
    </div>}

    {game==='wheel'&&<div className="cabala-wheel-stage">
      <div className="wheel-wrap"><span className="wheel-pointer">▼</span><div className="destiny-wheel" style={{transform:'rotate('+Math.round(loopPhase*1080)+'deg)'}}><i/><i/><i/><i/><b>✦</b></div></div>
      <div className="cabala-question">La rueda gira. Frenala cuando sientas el momento.</div>
      <button className="skill-main-action luck-action" disabled={finished||animating} onClick={wheelStop}>{animating?'DECIDIENDO…':'FRENAR RUEDA'}</button>
    </div>}

    {game==='tower'&&<div className="cabala-tribuna-stage">
      <div className="tribuna-night">
        {[0,1,2].map(value=><button key={value} disabled={finished} className={Math.floor(loopPhase*3)===value?'pulse':''} onClick={()=>towerPick(value)}>
          <i/><i/><i/><i/><i/>
          <b>{value===0?'POPULAR IZQ':value===1?'PLATEA':'POPULAR DER'}</b>
          <span>⚑</span>
        </button>)}
      </div>
      <div className="cabala-question">La cancha ruge distinto en un sector. Elegí dónde sentís que nace la noche.</div>
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
      <div className="cabala-game__head"><span>⚄ CABULERO</span><strong>{pending.kind==='title'?'El título se juega con la suerte.':pending.kind==='promotion'?'El ascenso depende de tu cábala.':'La permanencia se define ahora.'}</strong><small>Partida decisiva. Cada cábala tiene su propia duración y una sola oportunidad.</small></div>
      <CabalaMiniGame game={pending.cabalaGame} onComplete={(won,score)=>onResolved(resolveCabalFinal(state,won,score))}/>
    </div>}

    {skillMode&&<div className="final-skill-game">
      <div className="final-skill-game__intro"><span>◎ HABILIDOSO</span><strong>{miniGames.find(game=>game.id===pending.miniGame)?.name??'Desafío final'}</strong><small>Una sola jugada. Tu gesto decide {pending.kind==='title'?'el título':pending.kind==='promotion'?'el ascenso':'la permanencia'}.</small></div>
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

    <div className="transfer-offers-head">
      <span>OFERTAS SOBRE LA MESA</span>
      <strong>{offers.length} · DESLIZÁ →</strong>
    </div>
    {offers.length===0?<div className="empty-state"><b>↗</b><strong>No llegaron propuestas externas.</strong><span>Podés seguir o renovar con tu club.</span></div>:
    <div className="transfer-offer-list transfer-offer-list--swipe">{offers.map((offer:TransferOffer)=>{
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
  if(!trophies.length)return null
  const grouped=Object.values(trophies.reduce<Record<string,{name:string;icon:string;count:number}>>((acc,trophy)=>{
    const current=acc[trophy.name]??{name:trophy.name,icon:trophy.icon,count:0}
    current.count+=1
    acc[trophy.name]=current
    return acc
  },{}))
  return <section className="trophy-cabinet"><div className="trophy-cabinet__head"><div><span className="eyebrow">PALMARÉS</span><h3>Tu vitrina</h3></div><strong>{trophies.length} TROFEOS</strong></div><div className="trophy-grid">{grouped.map(item=><article key={item.name}><b>{item.icon}</b><span><strong>{item.name}</strong><small>x{item.count}</small></span></article>)}</div></section>
}
function CareerRetirementSummary({state}:{state:CareerState}){
  const club=clubById(state.clubId)
  const {media}=useClubMedia(club.name)
  const finals=state.history.filter(item=>item.outcomeKind)
  const finalsWon=finals.filter(item=>item.outcomeWon).length
  const finalsLost=finals.filter(item=>item.outcomeWon===false).length
  const assets=shopItems.filter(item=>item.kind==='asset'&&(state.purchases??[]).includes(item.id))
  const staff=shopItems.filter(item=>item.kind==='staff'&&(state.purchases??[]).includes(item.id))
  const journey:Array<{clubId:string;from:number;to:number;matches:number;goals:number;assists:number;titles:number}>=[]

  state.history.forEach(record=>{
    const current=journey[journey.length-1]
    if(current&&current.clubId===record.clubId){
      current.to=record.season
      current.matches+=record.matches
      current.goals+=record.goals
      current.assists+=record.assists
      current.titles+=record.titles
    }else{
      journey.push({clubId:record.clubId,from:record.season,to:record.season,matches:record.matches,goals:record.goals,assists:record.assists,titles:record.titles})
    }
  })

  const score=careerScore(state)
  const legacy=
    score>=1800000?'LEYENDA ABSOLUTA':
    score>=1000000?'LEYENDA':
    score>=550000?'ÍDOLO':
    score>=250000?'REFERENTE':'PROFESIONAL'
  const heroImage=media.stadiumImage??media.image

  return <section className="career-retirement">
    <div className="retirement-hero" style={heroImage?{backgroundImage:'linear-gradient(90deg,rgba(3,9,19,.95),rgba(3,9,19,.54)),url("'+heroImage+'")'}:undefined}>
      <div className="retirement-hero__top"><span>FINAL DE CARRERA</span><b>{legacy}</b></div>
      <div className="retirement-hero__identity">
        <ClubCrest name={club.name} size="lg"/>
        <div><small>{state.nationality} · {state.position}</small><h1>{state.playerName}</h1><p>{state.age} años · último club: {club.name}</p></div>
      </div>
      <div className="retirement-score"><span>SCORE FINAL</span><strong>{score.toLocaleString('es-AR')}</strong><small>{Math.round(state.glory??0).toLocaleString('es-AR')} GLORIA</small></div>
    </div>

    <div className="retirement-stats">
      <Stat value={state.matches} label="PARTIDOS"/>
      <Stat value={state.goals} label="GOLES"/>
      <Stat value={state.assists} label="ASIST."/>
      <Stat value={state.titles} label="TÍTULOS"/>
      <Stat value={finalsWon} label="FINALES GANADAS"/>
      <Stat value={finalsLost} label="FINALES PERDIDAS"/>
    </div>

    <section className="retirement-section retirement-section--journey">
      <div className="retirement-section__head"><div><span className="eyebrow">TRAYECTORIA</span><h2>Los clubes que hicieron tu historia.</h2></div><b>{journey.length} ETAPAS</b></div>
      <div className="career-route">{journey.map((step,index)=>{
        const team=clubById(step.clubId)
        return <article key={step.clubId+'-'+index}>
          <span className="route-line"/>
          <ClubCrest name={team.name}/>
          <div><strong>{team.name}</strong><small>Temporadas {step.from}{step.to!==step.from?'–'+step.to:''}</small><p>{step.matches} PJ · {step.goals} G · {step.assists} A · {step.titles} títulos</p></div>
        </article>
      })}</div>
    </section>

    <section className="retirement-section">
      <div className="retirement-section__head"><div><span className="eyebrow">PALMARÉS</span><h2>Lo que levantaste.</h2></div><b>{state.trophies?.length??0} TROFEOS</b></div>
      {(state.trophies?.length??0)>0?<div className="retirement-trophies">{(state.trophies??[]).map(trophy=><article key={trophy.id}><b>{trophy.icon}</b><span><strong>{trophy.name}</strong><small>Temporada {trophy.season} · {clubById(trophy.clubId).short}</small></span></article>)}</div>:<div className="retirement-empty">No levantaste trofeos. La carrera igual dejó historia.</div>}
    </section>

    <section className="retirement-section retirement-section--assets">
      <div className="retirement-section__head"><div><span className="eyebrow">FUERA DE LA CANCHA</span><h2>Lo que te llevaste del fútbol.</h2></div><b>$ {formatMoney(state.money)}</b></div>
      <div className="asset-showcase">
        {assets.length?assets.map(item=><article key={item.id}><b>{item.icon}</b><span><strong>{item.name}</strong><small>BIEN ADQUIRIDO</small></span></article>):<div className="retirement-empty">No compraste bienes durante la carrera.</div>}
      </div>
      {staff.length>0&&<div className="career-staff"><span>STAFF QUE TE ACOMPAÑÓ</span><div>{staff.map(item=><b key={item.id}>{item.icon} {item.name}</b>)}</div></div>}
    </section>

    <section className="retirement-section retirement-section--finals">
      <div className="retirement-section__head"><div><span className="eyebrow">PARTIDOS QUE PESARON</span><h2>Finales y noches decisivas.</h2></div></div>
      {finals.length?<div className="final-history">{[...finals].reverse().map(record=><article key={record.season+'-'+record.clubId}>
        <span className={record.outcomeWon?'won':'lost'}>{record.outcomeWon?'✓':'×'}</span>
        <div><strong>{record.competition??'Partido decisivo'}</strong><small>{clubById(record.clubId).name} · Temporada {record.season}</small></div>
        <b>{record.outcomeWon?'GANADA':'PERDIDA'}</b>
      </article>)}</div>:<div className="retirement-empty">No quedaron definiciones registradas en esta carrera.</div>}
    </section>
  </section>
}

function CabalaPracticePanel(){
  const games:Array<{id:CabalaGameId;icon:string;name:string;description:string}>=[
    {id:'higher-lower',icon:'🃏',name:'El pálpito',description:'Arrancás con un número y jugás tres predicciones de mayor o menor.'},
    {id:'dice-seven',icon:'⚄',name:'La Generala',description:'Cinco dados, tres tiradas y podés guardar los que te sirvan.'},
    {id:'coin-run',icon:'◐',name:'Moneda de vestuario',description:'Leé una racha de cara o ceca.'},
    {id:'lucky-number',icon:'17',name:'Número marcado',description:'Encontrá el casillero con la pelota.'},
    {id:'lucky-shirt',icon:'▾',name:'La camiseta',description:'Una sola elección antes de salir.'},
    {id:'three-cups',icon:'🥤',name:'Tres vasos',description:'Mirá la pelota, seguí la mezcla y elegí el vaso correcto.'},
    {id:'wheel',icon:'🎡',name:'Rueda del destino',description:'Una sola frenada. El resultado sale de dónde la detenés.'},
    {id:'tower',icon:'⚑',name:'La tribuna',description:'Elegí el sector donde sentís que está la noche.'},
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
    <div className="cabala-practice-grid">{games.map(game=><button key={game.id} onClick={()=>{setActive(game.id);setResult('')}}><CabalaGameThumb id={game.id}/><span><strong>{game.name}</strong><small>{game.description}</small></span><em>JUGAR →</em></button>)}</div>
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
    if(state.pendingFinal&&tab!=='career')setTab('career')
  },[state.pendingFinal,tab])


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
    const bonus=value>=80?2:1
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
    <GameTopNav tab={tab} setTab={setTab} coach={false} clubName={club.name} onExit={onExit} theme={theme} onTheme={onTheme}/>

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
          {seasonSummary.outcomeKind&&<div className={'season-outcome-chip '+(seasonSummary.outcomeWon?'won':'lost')}>
            <b>{seasonSummary.outcomeWon?'✓':'×'}</b><span>{seasonSummary.competition??'PARTIDO DECISIVO'}</span><strong>{seasonSummary.outcomeWon?'GANADO':'PERDIDO'}</strong>
          </div>}
          <em>{seasonSummary.note}</em>
          <button className="play-button" onClick={closeSeasonSummary}>CONTINUAR →</button>
        </section>
      </div>}
      {tab==='career'&&state.retired&&<CareerRetirementSummary state={state}/>}
      {tab==='career'&&!state.retired&&<div className="career-overview">
      <section className="identity-card identity-card--media" style={(playerMedia.stadiumImage??playerMedia.image)?{backgroundImage:'linear-gradient(90deg,var(--surface) 35%,rgba(5,10,18,.58)),url("'+(playerMedia.stadiumImage??playerMedia.image)+'")'}:undefined}>
        <ClubCrest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">{displayLeague}</span><h1>{state.playerName}</h1><p>{state.position} · {state.age} años · {club.name}</p>{state.finalStyle&&<small className={'career-style-badge career-style-badge--'+state.finalStyle}>{state.finalStyle.toUpperCase()}</small>}</div>
        <div className="overall"><strong>{state.overall}</strong><span>OVR</span></div>
      </section>
      <div className="quick-stats quick-stats--career">
        <Stat value={state.matches} label="PJ"/><Stat value={state.goals} label="GOLES"/><Stat value={state.assists} label="ASIST."/><Stat value={state.titles} label="TÍTULOS"/><Stat value={(state.glory??0).toLocaleString('es-AR')} label="GLORIA"/>
      </div>
      <div className="career-vitals" aria-label="Estado del jugador">
        <span><small>FORMA</small><b>{Math.round(state.form)}</b><i><em style={{width:state.form+'%'}}/></i></span>
        <span><small>ENERGÍA</small><b>{Math.round(state.energy)}</b><i><em style={{width:state.energy+'%'}}/></i></span>
        <span><small>MORAL</small><b>{Math.round(state.morale)}</b><i><em style={{width:state.morale+'%'}}/></i></span>
        <strong>{state.energy>70?'ÓPTIMO':state.energy>45?'CARGADO':'AL LÍMITE'}</strong>
      </div>

      </div>}

      {tab==='career'&&!state.retired&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {lastEffects&&<div className="decision-feedback"><div><span className="eyebrow">DECISIÓN TOMADA</span><strong>Tu jugador cambió</strong><EffectChips effects={lastEffects}/></div><button onClick={()=>setLastEffects(null)}>×</button></div>}
          {state.retired?<><span className="eyebrow">FINAL DE CARRERA</span><h2>Tu historia ya está escrita.</h2><p>Terminaste {state.history.length} temporadas con {state.matches} partidos y {state.titles} títulos.</p><div className="final-score"><span>SCORE FINAL</span><strong>{careerScore(state).toLocaleString('es-AR')}</strong></div></>:
          !state.finalStyle&&!state.activeEvent?<FinalStyleChoice onChoose={style=>setState(chooseFinalStyle(state,style))}/>:
          state.pendingFinal?<CareerFinalPanel state={state} onResolved={resolveFinal}/>:
          state.marketDecisionRequired?<div className="market-blocker"><span className="eyebrow">MERCADO DE PASES</span><h2>Antes de seguir, decidí tu futuro.</h2><p>Tenés que elegir si continuás, renovás o aceptás una de las ofertas que llegaron.</p><button className="play-button" onClick={()=>setTab('market')}>VER OFERTAS →</button></div>:
          state.activeEvent?<><DecisionScene category={state.activeEvent.category} title={state.activeEvent.title} media={playerMedia} clubName={club.name}/><span className="eyebrow">{state.activeEvent.eyebrow}</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=>{const effects=careerDecisionEffects(state.activeEvent?.id,o.effects);return <button key={o.id} onClick={()=>{setLastEffects(effects);setState(choosePlayerEvent(state,o as EventOption))}}><div><strong>{o.label}</strong><span>{o.description}</span><EffectChips effects={effects}/></div><b>→</b></button>})}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season} DE {state.maxSeasons}</span><h2>Todo listo para competir.</h2><p>Tu estado físico, la confianza, el vestuario y las decisiones ya están en juego.</p><button className="play-button" onClick={playSeason}>▶ JUGAR TEMPORADA</button></>}
        </section>


      </div>}

      {tab==='career'&&!state.retired&&<details className="career-details">
        <summary><span>FICHA Y PROGRESO</span><b>OVR {state.overall} · HUELLA {Math.round(state.clubLegacy??0)}/100 · {state.trophies?.length??0} TROFEOS</b></summary>
        <div className="career-details__body">
          <PlayerAttributes state={{...state,stats:playerStats}}/>
          <IdolProgress value={state.clubLegacy??0} years={state.history.filter(item=>item.clubId===state.clubId).length}/>
          <TrophyCabinet state={state}/>
        </div>
      </details>}

      {tab==='market'&&<MarketPanel state={state} onState={setState} onDone={()=>setTab('career')}/>} 

      {tab==='training'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ENTRENAMIENTO</span><h2>{state.trainingCredits} sesiones disponibles</h2></div></div>
        <div className="training-grid">
          {trainingOptionsFor(state.position).map(x=><button key={x[0]} disabled={!state.trainingCredits} onClick={()=>setState(trainCareer(state,x[0] as 'physical'|'technique'|'finishing'|'mind'|'defending'))}><b>◇</b><strong>{x[1]}</strong><span>{x[2]}</span></button>)}
        </div>
      </section>}

      {tab==='shop'&&<ShopPanel state={state} setState={setState}/>}
      {tab==='minigames'&&<PlayerGamesHub style={state.finalStyle} onSkillScore={playMini}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ARCHIVO</span><h2>Tu historia</h2></div><span className="pill">{state.history.length} TEMP.</span></div>
        {state.history.length===0?<div className="empty-state"><b>≡</b><strong>La historia está en blanco.</strong><span>Terminá la primera temporada.</span></div>:
          <div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><ClubCrest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season} · {s.age} años</span><p>{s.note}</p></div><aside><b>{s.rating}</b><span>RAT</span></aside></article>)}</div>}
      </section>}
    </main>
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
    <GameTopNav tab={tab} setTab={setTab} coach={true} clubName={club.name} onExit={onExit} theme={theme} onTheme={onTheme}/>

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
  </div>
}

export function App(){
  const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem(THEME_KEY) as Theme)||'dark')
  const [assetsReady,setAssetsReady]=useState(false)
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
    let alive=true
    const argentinaCrestNames=clubs.filter(club=>club.country==='Argentina').map(club=>club.name)
    const warmImages=async()=>{
      await preloadClubMedia(argentinaCrestNames,Math.min(16,argentinaCrestNames.length),false)
      const medias=await Promise.all(argentinaCrestNames.map(name=>getClubMedia(name)))
      const urls=[...new Set(medias.map(media=>media.logo).filter((url):url is string=>Boolean(url)))]
      let cursor=0
      const workers=Array.from({length:Math.min(12,urls.length)},async()=>{
        while(cursor<urls.length){
          const url=urls[cursor++]
          await new Promise<void>(resolve=>{
            const img=new Image()
            const done=()=>resolve()
            img.onload=done
            img.onerror=done
            img.src=url
            if(img.complete)resolve()
          })
        }
      })
      await Promise.all(workers)
    }
    void warmImages().finally(()=>{if(alive)setAssetsReady(true)})
    return()=>{alive=false}
  },[])

  useEffect(()=>{
    if(save)sessionStorage.setItem(SAVE_KEY,JSON.stringify(save))
  },[save])

  const toggleTheme=()=>setTheme(t=>t==='dark'?'light':'dark')
  const enterDemo=(name:string)=>{sessionStorage.setItem(AUTH_KEY,name);setDemoUser(name);window.scrollTo({top:0,behavior:'auto'})}
  const exit=()=>{setSave(null);sessionStorage.removeItem(SAVE_KEY)}

  if(!assetsReady)return <AssetBootScreen/>
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
