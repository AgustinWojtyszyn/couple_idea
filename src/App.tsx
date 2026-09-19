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
  type CareerState,
  type CoachState,
  type EventOption,
  type GameMode,
  type MiniGameId,
  type PlayerMode,
  type Position,
  type RunScore,
  type Tab,
  type Theme,
} from './world/Architecture'
import {
  careerScore,
  chooseCoachEvent,
  choosePlayerEvent,
  coachScore,
  createCareer,
  createCoach,
  getRunScores,
  saveRunScore,
  simulateCoachSeason,
  simulateSeason,
  trainCareer,
  transferTo,
} from './systems/buildingStore'
import { globalRankingEnabled, loadLeaderboard, submitLeaderboardScore } from './systems/rankingService'

type SaveState = CareerState | CoachState | null

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
  const [country,setCountry]=useState(countries.includes('Inglaterra')?'Inglaterra':countries[0]??'')
  const countryLeagues=leagues.filter(l=>l.country===country).sort((a,b)=>a.tier-b.tier)
  const [leagueId,setLeagueId]=useState(countryLeagues[0]?.id??leagues[0]?.id??'')
  const availableLeagues=leagues.filter(l=>l.country===country).sort((a,b)=>a.tier-b.tier)
  const activeLeague=availableLeagues.some(l=>l.id===leagueId)?leagueId:(availableLeagues[0]?.id??'')
  const availableClubs=clubsByLeague(activeLeague)
  const [clubId,setClubId]=useState(availableClubs[0]?.id??clubs[0]?.id??'')
  const activeClub=availableClubs.some(c=>c.id===clubId)?clubId:(availableClubs[0]?.id??'')
  const [position,setPosition]=useState<Position>('9')

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
          <div className="hero-card__brand"><span>LEYENDA</span><small>Tu carrera. Tus decisiones.</small></div>
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
            <SelectField label="EQUIPO" value={activeClub} onChange={setClubId}>
              {availableClubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectField>
          </div>

          <div className="club-preview">
            <Crest name={selectedClub.name} size="lg"/>
            <div><span>{leagueById(selectedClub.leagueId).name}</span><strong>{selectedClub.name}</strong><small>Escudo original generado por LEYENDA</small></div>
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
          <article><span>◎</span><div><strong>MINIJUEGOS</strong><small>6 desafíos jugables</small></div></article>
          <article><span>↗</span><div><strong>MERCADO</strong><small>Decisiones de carrera</small></div></article>
          <article><span>◇</span><div><strong>MODO DT</strong><small>8 temporadas de presión</small></div></article>
        </section>

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
    : [['career','⌂','Carrera'],['market','↗','Mercado'],['training','◇','Entreno'],['minigames','◎','Juegos'],['ranking','⌁','Ranking']]
  return <nav className="bottom-nav">{items.map(([id,icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span><small>{label}</small></button>)}</nav>
}

function RankingPanel({scores}:{scores:RunScore[]}){
  return <section className="panel ranking-panel">
    <div className="panel-head"><div><span className="eyebrow">HALL DE LA FAMA</span><h2>Mejores carreras</h2></div><span className="pill">{globalRankingEnabled?'GLOBAL':'LOCAL'} · TOP {Math.min(20,scores.length)}</span></div>
    {scores.length===0?<div className="empty-state"><b>⌁</b><strong>Todavía no hay carreras terminadas.</strong><span>Tu primera run completa inaugura el ranking.</span></div>:
      <div className="ranking-list">{scores.slice(0,20).map((s,i)=><div key={s.id}><b>{String(i+1).padStart(2,'0')}</b><div><strong>{s.name}</strong><span>{s.detail}</span></div><em>{s.score.toLocaleString('es-AR')}</em></div>)}</div>}
  </section>
}

function MiniGamesPanel({onScore}:{onScore:(game:MiniGameId,score:number)=>void}){
  const [active,setActive]=useState<MiniGameId|null>(null)
  const [round,setRound]=useState(0)
  const [score,setScore]=useState(0)
  const [message,setMessage]=useState('')

  const play=(id:MiniGameId)=>{
    if(active!==id){setActive(id);setRound(0);setScore(0);setMessage('')}
  }

  const action=(choice:number)=>{
    if(!active)return
    const roll=Math.random()
    let earned=0
    if(active==='penalties'||active==='keeper') earned=choice===Math.floor(roll*3)?0:Math.round(45+roll*55)
    else if(active==='duel') earned=(choice+Math.floor(roll*3))%3===1?100:Math.round(25+roll*45)
    else if(active==='scouting') earned=choice===2?100:Math.round(30+roll*40)
    else earned=Math.round(35+roll*65)
    const nextScore=score+earned
    const nextRound=round+1
    setScore(nextScore)
    setRound(nextRound)
    setMessage(earned>=80?'PERFECTO':earned>=55?'BIEN':'SEGUÍ')
    if(nextRound>=5){
      onScore(active,nextScore)
      setMessage('FINAL · '+nextScore+' PTS')
    }
  }

  if(active){
    const game=miniGames.find(g=>g.id===active)!
    const finished=round>=5
    return <section className="panel minigame-arena">
      <button className="back-link" onClick={()=>setActive(null)}>← Volver</button>
      <span className="eyebrow">{game.name.toUpperCase()}</span>
      <h2>{game.description}</h2>
      <div className="arena-score"><span>RONDA {Math.min(round+1,5)}/5</span><strong>{score}</strong></div>
      <div className="arena-visual"><div className="pitch-lines"/><span className="arena-ball">●</span><b>{message||'ELEGÍ'}</b></div>
      {!finished?<div className="arena-actions">
        <button onClick={()=>action(0)}>IZQUIERDA</button><button onClick={()=>action(1)}>CENTRO</button><button onClick={()=>action(2)}>DERECHA</button>
      </div>:<button className="play-button" onClick={()=>{setRound(0);setScore(0);setMessage('')}}>JUGAR DE NUEVO</button>}
    </section>
  }

  return <section className="panel">
    <div className="panel-head"><div><span className="eyebrow">CENTRO DE DESAFÍOS</span><h2>Minijuegos</h2></div><span className="pill">{miniGames.length} MODOS</span></div>
    <div className="minigame-grid">{miniGames.map(g=><button key={g.id} onClick={()=>play(g.id)}><b>{g.icon}</b><div><strong>{g.name}</strong><span>{g.description}</span></div><em>JUGAR →</em></button>)}</div>
  </section>
}

function PlayerGame({state,setState,theme,onTheme,onExit}:{state:CareerState;setState:(s:CareerState)=>void;theme:Theme;onTheme:()=>void;onExit:()=>void}){
  const [tab,setTab]=useState<Tab>('career')
  const [scores,setScores]=useState<RunScore[]>(()=>getRunScores())
  const club=clubById(state.clubId)

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

  const playMini=(game:MiniGameId,value:number)=>{
    const bonus=Math.round(value/75)
    setState({...state,form:Math.min(100,state.form+bonus),reputation:Math.min(100,state.reputation+(value>=400?2:0))})
  }

  return <div className="shell game-shell">
    <header className="game-header">
      <button className="brand brand--button" onClick={onExit}><span className="brand__mark">L</span><span><strong>LEYENDA</strong><small>← MENÚ</small></span></button>
      <ThemeToggle theme={theme} onToggle={onTheme}/>
    </header>

    <main className="game-main">
      <section className="identity-card">
        <Crest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">{league.name}</span><h1>{state.playerName}</h1><p>{state.position} · {state.age} años · {club.name}</p></div>
        <div className="overall"><strong>{state.overall}</strong><span>OVR</span></div>
      </section>

      <div className="quick-stats">
        <Stat value={state.matches} label="PJ"/><Stat value={state.goals} label="GOLES"/><Stat value={state.assists} label="ASIST."/><Stat value={state.titles} label="TÍTULOS"/>
      </div>

      {tab==='career'&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {state.retired?<><span className="eyebrow">FINAL DE CARRERA</span><h2>Tu historia ya está escrita.</h2><p>Terminaste {state.history.length} temporadas con {state.matches} partidos y {state.titles} títulos.</p><div className="final-score"><span>SCORE FINAL</span><strong>{careerScore(state).toLocaleString('es-AR')}</strong></div></>:
          state.activeEvent?<><span className="eyebrow">{state.activeEvent.eyebrow}</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=><button key={o.id} onClick={()=>setState(choosePlayerEvent(state,o as EventOption))}><div><strong>{o.label}</strong><span>{o.description}</span></div><b>→</b></button>)}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season} DE {state.maxSeasons}</span><h2>Todo listo para competir.</h2><p>Tu estado físico, la confianza, el vestuario y las decisiones ya están en juego.</p><button className="play-button" onClick={()=>setState(simulateSeason(state))}>▶ JUGAR TEMPORADA</button></>}
        </section>

        <aside className="panel condition-panel">
          <div className="panel-head"><div><span className="eyebrow">CONDICIÓN</span><h3>Estado del jugador</h3></div><span className="condition-label">{state.energy>70?'ÓPTIMO':state.energy>45?'CARGADO':'AL LÍMITE'}</span></div>
          <Meter label="Forma" value={state.form}/><Meter label="Energía" value={state.energy}/><Meter label="Moral" value={state.morale}/><Meter label="Confianza DT" value={state.coachTrust}/><Meter label="Disciplina" value={state.discipline}/><Meter label="Liderazgo" value={state.leadership}/>
        </aside>
      </div>}

      {tab==='market'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">MERCADO</span><h2>Tu próximo paso</h2></div><span className="pill">$ {formatMoney(club.salary)}/mes</span></div>
        {state.offers.length===0?<div className="empty-state"><b>↗</b><strong>No hay ofertas formales.</strong><span>Terminá otra temporada para mover el mercado.</span></div>:
        <div className="offer-grid">{state.offers.map(id=>{const next=clubById(id);return <button key={id} onClick={()=>{setState(transferTo(state,id));setTab('career')}}><Crest name={next.name}/><div><span>{leagueById(next.leagueId).name}</span><strong>{next.name}</strong><small>$ {formatMoney(next.salary)}/mes</small></div><b>FIRMAR</b></button>})}</div>}
      </section>}

      {tab==='training'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ENTRENAMIENTO</span><h2>{state.trainingCredits} sesiones disponibles</h2></div></div>
        <div className="training-grid">
          {[
            ['physical','Potencia física','Energía + físico'],
            ['technique','Técnica individual','Forma + control'],
            ['finishing','Definición','Reputación + ataque'],
            ['defending','Defensa y cruces','Liderazgo + disciplina'],
            ['mind','Cabeza fría','Moral + disciplina'],
          ].map(x=><button key={x[0]} disabled={!state.trainingCredits} onClick={()=>setState(trainCareer(state,x[0] as 'physical'|'technique'|'finishing'|'mind'|'defending'))}><b>◇</b><strong>{x[1]}</strong><span>{x[2]}</span></button>)}
        </div>
      </section>}

      {tab==='minigames'&&<MiniGamesPanel onScore={playMini}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">ARCHIVO</span><h2>Tu historia</h2></div><span className="pill">{state.history.length} TEMP.</span></div>
        {state.history.length===0?<div className="empty-state"><b>≡</b><strong>La historia está en blanco.</strong><span>Terminá la primera temporada.</span></div>:
          <div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><Crest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season} · {s.age} años</span><p>{s.note}</p></div><aside><b>{s.rating}</b><span>RAT</span></aside></article>)}</div>}
      </section>}
    </main>
    <BottomNav tab={tab} setTab={setTab} coach={false}/>
  </div>
}

function CoachGame({state,setState,theme,onTheme,onExit}:{state:CoachState;setState:(s:CoachState)=>void;theme:Theme;onTheme:()=>void;onExit:()=>void}){
  const [tab,setTab]=useState<Tab>('career')
  const [scores,setScores]=useState<RunScore[]>(()=>getRunScores())
  const club=clubById(state.clubId)

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
      <section className="identity-card coach-identity">
        <Crest name={club.name} size="lg"/>
        <div className="identity-card__copy"><span className="eyebrow">MODO ENTRENADOR · {leagueById(club.leagueId).name}</span><h1>{state.coachName}</h1><p>{club.name} · Temporada {state.season}/{state.maxSeasons}</p></div>
        <div className="overall"><strong>{state.tacticalRating}</strong><span>TÁCTICA</span></div>
      </section>

      <div className="quick-stats"><Stat value={state.titles} label="TÍTULOS"/><Stat value={state.boardTrust} label="DIRECTIVA"/><Stat value={state.fanTrust} label="HINCHADA"/><Stat value={'$ '+formatMoney(state.budget)} label="CAJA"/></div>

      {tab==='career'&&<div className="dashboard-grid">
        <section className="panel event-panel">
          {state.retired?<><span className="eyebrow">FIN DEL CICLO</span><h2>Tu proyecto terminó.</h2><p>Ocho temporadas de decisiones, mercado y vestuario.</p><div className="final-score"><span>SCORE DT</span><strong>{coachScore(state).toLocaleString('es-AR')}</strong></div></>:
          state.activeEvent?<><span className="eyebrow">DECISIÓN DEL ENTRENADOR</span><h2>{state.activeEvent.title}</h2><p>{state.activeEvent.body}</p><div className="decision-list">{state.activeEvent.options.map(o=><button key={o.id} onClick={()=>setState(chooseCoachEvent(state,o))}><div><strong>{o.label}</strong><span>Impacta en tu proyecto.</span></div><b>→</b></button>)}</div></>:
          <><span className="eyebrow">TEMPORADA {state.season}</span><h2>El equipo está listo.</h2><p>La táctica, la moral, los juveniles y la confianza de la directiva definen el año.</p><button className="play-button" onClick={()=>setState(simulateCoachSeason(state))}>▶ DIRIGIR TEMPORADA</button></>}
        </section>
        <aside className="panel condition-panel"><span className="eyebrow">PROYECTO</span><h3>Estado del club</h3><Meter label="Directiva" value={state.boardTrust}/><Meter label="Hinchas" value={state.fanTrust}/><Meter label="Moral" value={state.morale}/><Meter label="Táctica" value={state.tacticalRating}/><Meter label="Juveniles" value={state.youthRating}/></aside>
      </div>}

      {tab==='squad'&&<section className="panel">
        <div className="panel-head"><div><span className="eyebrow">VESTUARIO</span><h2>Gestión de equipo</h2></div><span className="pill">SIN JUGADORES REALES</span></div>
        <div className="coach-tools"><article><b>4-3-3</b><strong>Plan ofensivo</strong><span>Presión alta y amplitud.</span></article><article><b>4-4-2</b><strong>Bloque medio</strong><span>Orden y transiciones.</span></article><article><b>3-5-2</b><strong>Control central</strong><span>Más riesgo, más presencia.</span></article></div>
        <div className="squad-note">Los futbolistas del plantel se representan por rol y atributos, nunca por nombres de jugadores reales.</div>
      </section>}

      {tab==='minigames'&&<MiniGamesPanel onScore={(_,value)=>setState({...state,tacticalRating:Math.min(100,state.tacticalRating+Math.round(value/150))})}/>}
      {tab==='ranking'&&<RankingPanel scores={scores}/>}
      {tab==='history'&&<section className="panel"><div className="panel-head"><div><span className="eyebrow">ARCHIVO DEL DT</span><h2>Temporadas</h2></div></div><div className="timeline">{[...state.history].reverse().map(s=><article key={s.season}><Crest name={clubById(s.clubId).name} size="sm"/><div><strong>{clubById(s.clubId).name}</strong><span>Temporada {s.season}</span><p>{s.note}</p></div><aside><b>#{s.position}</b><span>{s.points} PTS</span></aside></article>)}</div></section>}
    </main>
    <BottomNav tab={tab} setTab={setTab} coach={true}/>
  </div>
}

export function App(){
  const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem(THEME_KEY) as Theme)||'dark')
  const [save,setSave]=useState<SaveState>(()=>{
    try{
      const raw=localStorage.getItem(SAVE_KEY)
      return raw?JSON.parse(raw) as SaveState:null
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
