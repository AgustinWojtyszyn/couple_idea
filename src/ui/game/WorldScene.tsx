import { useEffect, useMemo, useRef, useState } from 'react';
import { cityById, countryById } from '../../content/countries';
import type { Game } from '../../game/simulation/types';

type Props = {
  game: Game;
  onPlace: (place: string) => void;
  missionTarget?: string | null;
  compact?: boolean;
};

type Point = { x: number; y: number };
type Poi = { name: string; title: string; x: number; y: number; w: number; d: number; open?: boolean; kind: 'home' | 'work' | 'social' | 'shop' | 'learn' | 'travel' | 'care' };

const layout = [
  { x: 2.4, y: 2.6, w: 3.2, d: 2.6 },
  { x: 14.5, y: 2.2, w: 3.3, d: 2.8 },
  { x: 8.0, y: 7.0, w: 3.7, d: 3.1, open: true },
  { x: 14.6, y: 8.0, w: 2.7, d: 2.4 },
  { x: 2.1, y: 10.3, w: 3.8, d: 2.8 },
  { x: 9.4, y: 2.0, w: 2.8, d: 2.5 },
  { x: 17.5, y: 11.0, w: 2.8, d: 2.8 },
  { x: 8.3, y: 13.4, w: 3.0, d: 1.6, open: true },
  { x: 18.2, y: 5.8, w: 2.2, d: 2.2 },
  { x: 5.3, y: 6.0, w: 2.5, d: 2.1 },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const kindFor = (name: string): Poi['kind'] => {
  const n = normalize(name);
  if (n.includes('casa') || n.includes('home')) return 'home';
  if (n.includes('trabajo') || n.includes('work')) return 'work';
  if (n.includes('instituto') || n.includes('college')) return 'learn';
  if (n.includes('super') || n.includes('tienda') || n.includes('market')) return 'shop';
  if (n.includes('parada')) return 'travel';
  if (n.includes('hospital')) return 'care';
  return 'social';
};
const titleFor = (name: string) => {
  const n = normalize(name);
  if (n.includes('casa')) return 'MI CASA';
  if (n.includes('plaza')) return 'PLAZA';
  if (n.includes('cafe')) return 'CAFETERÍA';
  if (n.includes('super')) return 'SUPER';
  if (n.includes('parada')) return 'COLECTIVO';
  return name.toUpperCase();
};

const paletteFor = (id: string) => {
  const palettes = [
    { ground: '#24374a', grass: '#355748', road: '#27303d', line: '#728096', wall: '#b36d54', side: '#714a48', roof: '#d19a69', accent: '#78e0c4' },
    { ground: '#26354c', grass: '#3d5c4c', road: '#313442', line: '#81899b', wall: '#9f755d', side: '#66505c', roof: '#c99171', accent: '#75cfee' },
    { ground: '#263847', grass: '#4b6048', road: '#36333c', line: '#908889', wall: '#b98761', side: '#725448', roof: '#d2a36b', accent: '#f2c477' },
    { ground: '#263242', grass: '#32594f', road: '#293340', line: '#7e8ea1', wall: '#97748b', side: '#5d4c69', roof: '#c59a8f', accent: '#9bd8c8' },
  ];
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return palettes[hash % palettes.length];
};

function entrance(poi: Poi): Point {
  return poi.open ? { x: poi.x + poi.w / 2, y: poi.y + poi.d / 2 } : { x: poi.x + poi.w / 2, y: poi.y + poi.d + .7 };
}

export function WorldScene({ game, onPlace, missionTarget, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Point>({ x: 10.5, y: 12.2 });
  const targetRef = useRef<Point | null>(null);
  const keysRef = useRef(new Set<string>());
  const padRef = useRef<Point>({ x: 0, y: 0 });
  const lastRef = useRef(0);
  const [near, setNear] = useState<Poi | null>(null);
  const nearRef = useRef<Poi | null>(null);
  const [inside, setInside] = useState<string | null>(null);
  const insideRef = useRef<string | null>(null);
  const [hint, setHint] = useState('Tocá una calle o usá los controles para moverte');
  const country = countryById(game.countryId);
  const city = cityById(country, game.cityId);
  const palette = useMemo(() => paletteFor(city.id), [city.id]);
  const pois = useMemo<Poi[]>(() => city.landmarks.slice(0, 10).map((name, i) => {
    const slot = layout[i % layout.length];
    return { name, title: titleFor(name), kind: kindFor(name), ...slot };
  }), [city.landmarks]);

  useEffect(() => { insideRef.current = inside; }, [inside]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(event.key)) {
        keysRef.current.add(event.key.toLowerCase());
      }
    };
    const onUp = (event: KeyboardEvent) => keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(280, rect.width);
      height = compact ? Math.max(360, Math.min(520, width * .74)) : Math.max(430, Math.min(650, width * .82));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const project = (x: number, y: number, z = 0) => {
      const unit = Math.max(22, Math.min(40, width / 15));
      const player = playerRef.current;
      return {
        x: width * .5 + ((x - player.x) - (y - player.y)) * unit * .55,
        y: height * .48 + ((x - player.x) + (y - player.y)) * unit * .28 - z * unit * .55,
        unit,
      };
    };

    const poly = (points: Point[], fill: string, stroke?: string) => {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    };

    const tile = (x: number, y: number, fill: string, stroke = '#ffffff0b') => {
      const a = project(x, y), b = project(x + 1, y), c = project(x + 1, y + 1), d = project(x, y + 1);
      poly([a,b,c,d], fill, stroke);
    };

    const prism = (x: number, y: number, w: number, d: number, h: number, wall: string, side: string, roof: string) => {
      const a = project(x,y), b = project(x+w,y), c = project(x+w,y+d), d0 = project(x,y+d);
      const at = project(x,y,h), bt = project(x+w,y,h), ct = project(x+w,y+d,h), dt = project(x,y+d,h);
      poly([d0,c,ct,dt], side);
      poly([b,c,ct,bt], wall);
      poly([at,bt,ct,dt], roof, '#ffffff2b');
      return { top: project(x + w/2, y + d/2, h) };
    };

    const drawCity = (time: number) => {
      for (let y = -3; y < 21; y++) for (let x = -3; x < 27; x++) {
        const road = x % 6 === 0 || y % 5 === 0;
        tile(x, y, road ? palette.road : ((x + y) % 3 === 0 ? palette.grass : palette.ground), road ? '#ffffff0d' : '#0000000d');
        if (road && (x + y) % 2 === 0) {
          const a = project(x + .28,y + .5), b = project(x + .72,y + .5);
          ctx.strokeStyle = '#d7d3b74d'; ctx.lineWidth = 1; ctx.setLineDash([4,5]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
        }
      }

      for (const poi of pois) {
        if (poi.open) {
          const e = entrance(poi);
          const c = project(e.x,e.y,.1);
          ctx.fillStyle = poi.kind === 'travel' ? '#67c7ef44' : '#65d29a3d';
          ctx.beginPath(); ctx.ellipse(c.x,c.y,34,15,0,0,Math.PI*2); ctx.fill();
          if (poi.kind === 'social') {
            for (let i=0;i<4;i++) prism(poi.x+.4+i*.8,poi.y+.45+(i%2)*1.2,.15,.15,.45,'#4d704d','#39543f','#78a668');
          }
        } else {
          const heightByKind = poi.kind === 'work' ? 3.5 : poi.kind === 'learn' ? 3 : poi.kind === 'shop' ? 2.4 : 2.8;
          const box = prism(poi.x,poi.y,poi.w,poi.d,heightByKind,palette.wall,palette.side,palette.roof);
          const door = project(poi.x + poi.w/2, poi.y + poi.d + .02, .8);
          ctx.fillStyle = '#132133'; ctx.fillRect(door.x-6,door.y-12,12,16);
          ctx.fillStyle = '#f4cb7b'; ctx.fillRect(door.x-2,door.y-7,2,2);
          if (poi.kind === 'work' || poi.kind === 'learn') {
            const antenna = project(poi.x+poi.w*.75,poi.y+poi.d*.35,heightByKind+1);
            ctx.strokeStyle = '#b9d8e8'; ctx.beginPath(); ctx.moveTo(box.top.x+10,box.top.y); ctx.lineTo(antenna.x,antenna.y); ctx.stroke();
          }
        }

        const e = entrance(poi);
        const label = project(e.x, e.y, poi.open ? 1.2 : .7);
        const target = missionTarget && normalize(poi.name).includes(normalize(missionTarget));
        if (target) {
          const pulse = 10 + Math.sin(time / 220) * 4;
          ctx.strokeStyle = '#ffd477'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(label.x,label.y+8,pulse*1.5,pulse*.65,0,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(label.x,label.y-42); ctx.lineTo(label.x,label.y-12); ctx.stroke();
          ctx.fillStyle = '#ffd477'; ctx.beginPath(); ctx.arc(label.x,label.y-46,5,0,Math.PI*2); ctx.fill();
        }
        ctx.font = '700 10px system-ui, sans-serif';
        const tw = ctx.measureText(poi.title).width;
        ctx.fillStyle = '#0a1221dd'; ctx.fillRect(label.x-tw/2-6,label.y-10,tw+12,17);
        ctx.fillStyle = target ? '#ffd477' : '#f5f7fb'; ctx.fillText(poi.title,label.x-tw/2,label.y+2);
      }

      for (let i=0;i<7;i++) {
        const t = (time/1300 + i*3.1) % 22;
        const car = project(t, 5.15 + (i%2)*5, .18);
        ctx.save(); ctx.translate(car.x,car.y); ctx.rotate(.47); ctx.fillStyle = i%2 ? '#b44e55' : '#4f86b6'; ctx.fillRect(-10,-5,20,10); ctx.fillStyle='#dbe6ec'; ctx.fillRect(-3,-4,8,4); ctx.restore();
      }

      for (let i=0;i<8;i++) {
        const x = 6.8 + ((i*2.3 + time/3800) % 8);
        const y = 6.7 + ((i*1.7) % 5);
        const p = project(x,y,.35);
        ctx.fillStyle = ['#f0b58f','#9bc3e0','#d8a2bf','#a6d4aa'][i%4];
        ctx.beginPath(); ctx.arc(p.x,p.y-7,3,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#17202d'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(p.x,p.y-3);ctx.lineTo(p.x,p.y+7);ctx.stroke();
      }
    };

    const drawInterior = (place: string) => {
      const w = 13, h = 10;
      for (let y=0;y<h;y++) for(let x=0;x<w;x++) tile(x,y,(x+y)%2 ? '#4a4852' : '#514d57','#ffffff12');
      for(let x=0;x<w;x++) prism(x,0,1,.22,2.2,'#7f675f','#5d514f','#a78d7c');
      const kind = kindFor(place);
      if (kind === 'home') {
        prism(8,2,2.7,2.2,.65,'#304c72','#243b59','#5273a2');
        prism(2.2,2,2.3,1.1,1.0,'#6e4d37','#513b30','#a9784d');
        prism(3.2,6.3,3,1.5,.5,'#5b544f','#413d3a','#877c72');
        for(let i=0;i<4;i++) prism(10+i*.35,6,.18,.18,.8,'#3e6b4a','#2e5038','#72a36f');
      } else if (kind === 'work' || kind === 'learn') {
        for(let r=0;r<2;r++) for(let c=0;c<3;c++) prism(2+c*3.2,2.3+r*3,2.2,1,.75,'#655242','#4c3e35','#9a7d59');
        prism(10.5,2.2,1.2,1,.9,'#31465f','#28394d','#567493');
      } else if (kind === 'shop') {
        for(let i=0;i<4;i++) prism(2+i*2.6,2.3,1.8,.75,1.25,'#6b5c4f','#4e443c','#987e65');
        prism(3,6.2,7.5,.9,.9,'#5d4636','#453429','#a17857');
      } else {
        for(let r=0;r<2;r++) for(let c=0;c<3;c++) {
          prism(2.1+c*3.2,2.2+r*3,1.3,1.3,.65,'#665044','#4d3d35','#9b7964');
          prism(2.6+c*3.2,2.7+r*3,.28,.28,.85,'#38424e','#2d353e','#5d6b79');
        }
      }
      const counter = project(6.5,1.2,1);
      ctx.font='800 11px system-ui,sans-serif'; const title=place.toUpperCase(); const tw=ctx.measureText(title).width;
      ctx.fillStyle='#101725dd';ctx.fillRect(counter.x-tw/2-7,counter.y-13,tw+14,19);ctx.fillStyle='#f5f5f7';ctx.fillText(title,counter.x-tw/2,counter.y+1);
    };

    const blocked = (p: Point) => {
      if (insideRef.current) return p.x < .7 || p.y < .7 || p.x > 12.3 || p.y > 9.3;
      if (p.x < .3 || p.y < .3 || p.x > 21.7 || p.y > 15.7) return true;
      return pois.some(poi => !poi.open && p.x > poi.x-.35 && p.x < poi.x+poi.w+.35 && p.y > poi.y-.35 && p.y < poi.y+poi.d+.35);
    };

    const updateNear = () => {
      const player = playerRef.current;
      let candidate: Poi | null = null;
      if (insideRef.current) {
        candidate = { name: insideRef.current, title: insideRef.current.toUpperCase(), x:6.5,y:1.2,w:0,d:0,open:true,kind:kindFor(insideRef.current) };
        if (Math.hypot(player.x-6.5,player.y-2.0) > 2.2) candidate = null;
      } else {
        let best = 2.25;
        for (const poi of pois) {
          const e = entrance(poi);
          const distance = Math.hypot(player.x-e.x,player.y-e.y);
          if (distance < best) { best=distance; candidate=poi; }
        }
      }
      if (candidate?.name !== nearRef.current?.name) {
        nearRef.current = candidate;
        setNear(candidate);
        setHint(candidate ? (insideRef.current ? `Estás cerca del punto de acción de ${candidate.title}` : `Estás frente a ${candidate.title}`) : 'Tocá una calle o usá los controles para moverte');
      }
    };

    const loop = (time: number) => {
      const dt = Math.min(.04, Math.max(.001,(time-(lastRef.current || time))/1000));
      lastRef.current=time;
      const keys=keysRef.current;
      let vx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+padRef.current.x;
      let vy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+padRef.current.y;
      const target=targetRef.current;
      if (!vx && !vy && target) {
        const dx=target.x-playerRef.current.x, dy=target.y-playerRef.current.y, dist=Math.hypot(dx,dy);
        if (dist>.16) { vx=dx/dist;vy=dy/dist; } else targetRef.current=null;
      } else if (vx || vy) targetRef.current=null;
      const length=Math.hypot(vx,vy)||1;
      if (vx||vy) {
        const speed=(insideRef.current?4.2:4.6)*dt;
        const next={x:playerRef.current.x+vx/length*speed,y:playerRef.current.y+vy/length*speed};
        if (!blocked(next)) playerRef.current=next;
        else {
          const nx={x:next.x,y:playerRef.current.y}, ny={x:playerRef.current.x,y:next.y};
          if(!blocked(nx)) playerRef.current=nx; else if(!blocked(ny)) playerRef.current=ny;
        }
      }
      updateNear();

      ctx.clearRect(0,0,width,height);
      const grad=ctx.createLinearGradient(0,0,0,height);
      grad.addColorStop(0, game.hour>=19||game.hour<7 ? '#10172d' : '#1d3346');
      grad.addColorStop(1,'#080e1c');
      ctx.fillStyle=grad;ctx.fillRect(0,0,width,height);
      if (insideRef.current) drawInterior(insideRef.current); else drawCity(time);

      const player=project(playerRef.current.x,playerRef.current.y,0);
      ctx.fillStyle='#00000055';ctx.beginPath();ctx.ellipse(player.x,player.y+8,13,6,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#e9eef6';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(player.x,player.y-14);ctx.lineTo(player.x,player.y+5);ctx.stroke();
      ctx.strokeStyle='#4eb8d5';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(player.x-7,player.y-6);ctx.lineTo(player.x+7,player.y-6);ctx.stroke();
      ctx.fillStyle='#d9a37e';ctx.beginPath();ctx.arc(player.x,player.y-22,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#202839';ctx.beginPath();ctx.arc(player.x,player.y-25,7,Math.PI,Math.PI*2);ctx.fill();

      if (game.hour>=19||game.hour<7) { ctx.fillStyle='#08102a46';ctx.fillRect(0,0,width,height); }
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);

    const onPointer = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      const rect=canvas.getBoundingClientRect();
      const sx=event.clientX-rect.left-width*.5, sy=event.clientY-rect.top-height*.48;
      const unit=Math.max(22,Math.min(40,width/15));
      const dx=sx/(unit*.55), dy=sy/(unit*.28);
      const p=playerRef.current;
      const next={x:p.x+(dx+dy)/2,y:p.y+(dy-dx)/2};
      if (!blocked(next)) targetRef.current=next;
    };
    canvas.addEventListener('pointerdown',onPointer);
    return () => { cancelAnimationFrame(frame);observer.disconnect();canvas.removeEventListener('pointerdown',onPointer);lastRef.current=0; };
  }, [compact, game.hour, missionTarget, palette, pois]);

  const setPad = (x:number,y:number) => { padRef.current={x,y}; };
  const releasePad = () => { padRef.current={x:0,y:0}; };
  const enterOrAct = () => {
    if (!near) return;
    if (!inside) {
      setInside(near.name);
      playerRef.current={x:6.5,y:8.4};
      targetRef.current=null;
      setNear(null);nearRef.current=null;
    } else onPlace(inside);
  };
  const exitInterior = () => {
    setInside(null);
    playerRef.current={x:10.5,y:12.2};
    targetRef.current=null;
    setNear(null);nearRef.current=null;
  };

  return <section className={`world-scene ${compact ? 'world-scene-compact' : ''}`} ref={wrapRef}>
    <canvas ref={canvasRef} className="world-canvas" aria-label={inside ? `Interior de ${inside}. Mové el personaje con los controles.` : `Mundo jugable de ${city.name}. Mové el personaje por la ciudad.`}/>
    <div className="world-top">
      <span className="world-live"><i/> {inside ? inside.toUpperCase() : `${city.name.toUpperCase()} · ${city.districts[game.district].toUpperCase()}`}</span>
      <span className="world-mode">2.5D · EN VIVO</span>
    </div>
    {missionTarget && !inside && <div className="mission-waypoint">◎ MISIÓN · {missionTarget.toUpperCase()}</div>}
    {inside && <button className="world-exit" onClick={exitInterior}>← Salir al barrio</button>}
    <div className="world-help" aria-live="polite">{hint}</div>
    <div className="world-controls" aria-label="Controles de movimiento">
      <button onPointerDown={()=>setPad(0,-1)} onPointerUp={releasePad} onPointerCancel={releasePad} aria-label="Mover arriba">▲</button>
      <div><button onPointerDown={()=>setPad(-1,0)} onPointerUp={releasePad} onPointerCancel={releasePad} aria-label="Mover izquierda">◀</button><button onPointerDown={()=>setPad(0,1)} onPointerUp={releasePad} onPointerCancel={releasePad} aria-label="Mover abajo">▼</button><button onPointerDown={()=>setPad(1,0)} onPointerUp={releasePad} onPointerCancel={releasePad} aria-label="Mover derecha">▶</button></div>
    </div>
    <button className={`world-interact ${near ? 'ready' : ''}`} disabled={!near} onClick={enterOrAct}>{near ? (inside ? `HACER ALGO · ${near.title}` : `ENTRAR · ${near.title}`) : 'ACERCATE A UN LUGAR'}</button>
  </section>;
}
