export type ClubMedia = {
  logo?: string
  image?: string
  stadiumImage?: string
  stadiumName?: string
  wikidataId?: string
}

const CACHE_KEY='leyenda-club-media-v4'
const inFlight=new Map<string,Promise<ClubMedia>>()

function readCache():Record<string,ClubMedia>{
  try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch{return{}}
}
function writeCache(cache:Record<string,ClubMedia>){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}
}


const exactWikiTitles:Record<string,string>={
  'Tigre':'Club Atlético Tigre',
  'Vélez Sarsfield':'Club Atlético Vélez Sarsfield',
  'Godoy Cruz':'Club Deportivo Godoy Cruz Antonio Tomba',
  'Rosario Central':'Club Atlético Rosario Central',
  "Newell's Old Boys":"Club Atlético Newell's Old Boys",
  'Independiente Rivadavia':'Club Sportivo Independiente Rivadavia',
  'Defensa y Justicia':'Club Social y Deportivo Defensa y Justicia',
  'Banfield':'Club Atlético Banfield',
  'Lanús':'Club Atlético Lanús',
  'Deportivo Riestra':'Club Deportivo Riestra',
  'Barracas Central':'Club Atlético Barracas Central',
  'Racing Club':'Racing Club',
  'Independiente':'Club Atlético Independiente',
  'Sarmiento de Junín':'Club Atlético Sarmiento (Junín)',
  'Belgrano de Córdoba':'Club Atlético Belgrano',
  'Huracán':'Club Atlético Huracán',
  'San Martín de San Juan':'Club Atlético San Martín (San Juan)',
  'Atlético Tucumán':'Club Atlético Tucumán',
  'San Lorenzo':'Club Atlético San Lorenzo de Almagro',
  'Talleres de Córdoba':'Club Atlético Talleres (Córdoba)',
  'Estudiantes':'Club Estudiantes de La Plata',
  'Unión de Santa Fe':'Club Atlético Unión (Santa Fe)',
  'Instituto de Córdoba':'Instituto Atlético Central Córdoba',
  'Gimnasia de La Plata':'Club de Gimnasia y Esgrima La Plata',
  'Platense':'Club Atlético Platense',
  'River Plate':'Club Atlético River Plate',
  'Boca Juniors':'Club Atlético Boca Juniors',
  'Argentinos Juniors':'Asociación Atlética Argentinos Juniors',
  'Central Córdoba SdE':'Club Atlético Central Córdoba (Santiago del Estero)',
  'Aldosivi':'Club Atlético Aldosivi',
  'Agropecuario':'Club Agropecuario Argentino',
  'All Boys':'Club Atlético All Boys',
  'Almagro':'Club Almagro',
  'Alvarado':'Club Atlético Alvarado',
  'Atlanta':'Club Atlético Atlanta',
  'Chacarita Juniors':'Club Atlético Chacarita Juniors',
  'Chaco For Ever':'Club Atlético Chaco For Ever',
  'Colegiales':'Club Atlético Colegiales (Munro)',
  'Colón':'Club Atlético Colón',
  'Defensores de Belgrano':'Club Atlético Defensores de Belgrano',
  'Deportivo Madryn':'Club Social y Deportivo Madryn',
  'Deportivo Maipú':'Club Deportivo Maipú',
  'Deportivo Morón':'Club Deportivo Morón',
  'Estudiantes de Buenos Aires':'Club Atlético Estudiantes (Buenos Aires)',
  'Estudiantes de Río Cuarto':'Asociación Atlética Estudiantes',
  'Ferro Carril Oeste':'Club Ferro Carril Oeste',
  'Gimnasia de Jujuy':'Gimnasia y Esgrima de Jujuy',
  'Gimnasia y Tiro':'Club de Gimnasia y Tiro',
  'Güemes':'Club Atlético Güemes',
  'Los Andes':'Club Atlético Los Andes',
  'Mitre de Santiago del Estero':'Club Atlético Mitre (Santiago del Estero)',
  'Nueva Chicago':'Club Atlético Nueva Chicago',
  'Patronato':'Club Atlético Patronato de la Juventud Católica',
  'Quilmes':'Quilmes Atlético Club',
  'Racing de Córdoba':'Club Atlético Racing',
  'San Martín de Tucumán':'Club Atlético San Martín (Tucumán)',
  'San Miguel':'Club Atlético San Miguel',
  'Temperley':'Club Atlético Temperley',
  'Tristán Suárez':'Club Tristán Suárez',
  'Arsenal de Sarandí':'Arsenal Fútbol Club',
  'Almirante Brown':'Club Almirante Brown',
  'Defensores Unidos':'Club Atlético Defensores Unidos',
  'Talleres de Remedios de Escalada':'Club Atlético Talleres (Remedios de Escalada)',
  'Gimnasia y Esgrima de Mendoza':'Club Atlético Gimnasia y Esgrima (Mendoza)',
  'Central Norte':'Club Atlético Central Norte (Salta)',
  'Acassuso':'Club Atlético Acassuso',
}

async function exactWikipediaMedia(name:string):Promise<ClubMedia>{
  const title=exactWikiTitles[name]
  if(!title)return {}
  try{
    const res=await fetch(
      'https://es.wikipedia.org/w/api.php?'+new URLSearchParams({
        action:'query',
        titles:title,
        prop:'pageimages|pageprops',
        piprop:'thumbnail',
        pithumbsize:'512',
        redirects:'1',
        format:'json',
        origin:'*',
      })
    )
    if(!res.ok)return {}
    const data=await res.json() as {query?:{pages?:Record<string,{thumbnail?:{source?:string};pageprops?:{wikibase_item?:string}}>} }
    const page=Object.values(data.query?.pages??{})[0]
    if(!page)return {}
    return {logo:page.thumbnail?.source,wikidataId:page.pageprops?.wikibase_item}
  }catch{return {}}
}

const aliases:Record<string,string>={
  'Tigre':'Club Atlético Tigre Argentina',
  'Vélez Sarsfield':'Club Atlético Vélez Sarsfield',
  'Godoy Cruz':'Club Deportivo Godoy Cruz Antonio Tomba',
  'Rosario Central':'Club Atlético Rosario Central',
  "Newell's Old Boys":"Club Atlético Newell's Old Boys",
  'Independiente Rivadavia':'Club Sportivo Independiente Rivadavia',
  'Defensa y Justicia':'Club Social y Deportivo Defensa y Justicia',
  'Banfield':'Club Atlético Banfield',
  'Lanús':'Club Atlético Lanús',
  'Deportivo Riestra':'Deportivo Riestra football club',
  'Barracas Central':'Club Atlético Barracas Central',
  'Racing Club':'Racing Club de Avellaneda',
  'Independiente':'Club Atlético Independiente Avellaneda',
  'Sarmiento de Junín':'Club Atlético Sarmiento Junín',
  'Belgrano de Córdoba':'Club Atlético Belgrano Córdoba',
  'Huracán':'Club Atlético Huracán Buenos Aires',
  'San Martín de San Juan':'Club Atlético San Martín San Juan',
  'Atlético Tucumán':'Club Atlético Tucumán',
  'San Lorenzo':'Club Atlético San Lorenzo de Almagro',
  'Talleres de Córdoba':'Club Atlético Talleres Córdoba',
  'Estudiantes':'Estudiantes de La Plata football club',
  'Unión de Santa Fe':'Club Atlético Unión Santa Fe',
  'Instituto de Córdoba':'Instituto Atlético Central Córdoba',
  'Gimnasia de La Plata':'Club de Gimnasia y Esgrima La Plata',
  'Platense':'Club Atlético Platense Argentina',
  'River Plate':'Club Atlético River Plate Argentina',
  'Boca Juniors':'Club Atlético Boca Juniors',
  'Argentinos Juniors':'Asociación Atlética Argentinos Juniors',
  'Central Córdoba SdE':'Club Atlético Central Córdoba Santiago del Estero',
  'Aldosivi':'Club Atlético Aldosivi',
}

function commonsUrl(file?:string){
  return file?'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(file):undefined
}

async function wikidataEntityMedia(id:string):Promise<ClubMedia>{
  try{
    const entityRes=await fetch(
      'https://www.wikidata.org/w/api.php?'+new URLSearchParams({
        action:'wbgetentities',
        ids:id,
        props:'claims|labels',
        languages:'es|en',
        format:'json',
        origin:'*',
      })
    )
    if(!entityRes.ok)return {}
    const entityData=await entityRes.json() as {entities?:Record<string,{claims?:Record<string,Array<{mainsnak?:{datavalue?:{value?:unknown}}}>>}>}
    const claims=entityData.entities?.[id]?.claims??{}
    const logo=claims.P154?.[0]?.mainsnak?.datavalue?.value
    const image=claims.P18?.[0]?.mainsnak?.datavalue?.value
    const venueId=(claims.P115?.[0]?.mainsnak?.datavalue?.value as {id?:string}|undefined)?.id
    let stadiumImage:string|undefined
    let stadiumName:string|undefined
    if(venueId){
      try{
        const venueRes=await fetch(
          'https://www.wikidata.org/w/api.php?'+new URLSearchParams({
            action:'wbgetentities',
            ids:venueId,
            props:'claims|labels',
            languages:'es|en',
            format:'json',
            origin:'*',
          })
        )
        if(venueRes.ok){
          const venueData=await venueRes.json() as {entities?:Record<string,{claims?:Record<string,Array<{mainsnak?:{datavalue?:{value?:unknown}}}>>;labels?:Record<string,{value:string}>}>}
          const venue=venueData.entities?.[venueId]
          const venueImage=venue?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
          stadiumImage=commonsUrl(typeof venueImage==='string'?venueImage:undefined)
          stadiumName=venue?.labels?.es?.value??venue?.labels?.en?.value
        }
      }catch{}
    }
    return {
      logo:commonsUrl(typeof logo==='string'?logo:undefined),
      image:commonsUrl(typeof image==='string'?image:undefined),
      stadiumImage,
      stadiumName,
      wikidataId:id,
    }
  }catch{return {}}
}

async function wikipediaFallback(query:string):Promise<ClubMedia>{
  try{
    const res=await fetch(
      'https://es.wikipedia.org/w/api.php?'+new URLSearchParams({
        action:'query',
        generator:'search',
        gsrsearch:query+' fútbol club',
        gsrlimit:'6',
        prop:'pageimages|pageterms',
        piprop:'thumbnail',
        pithumbsize:'420',
        format:'json',
        origin:'*',
      })
    )
    if(!res.ok)return {}
    const data=await res.json() as {query?:{pages?:Record<string,{title?:string;thumbnail?:{source?:string};terms?:{description?:string[]}}>}}
    const pages=Object.values(data.query?.pages??{})
    const normalized=query.toLowerCase()
    const page=pages.find(item=>{
      const title=(item.title??'').toLowerCase()
      const description=(item.terms?.description??[]).join(' ').toLowerCase()
      return (title.includes(normalized.split(' ')[0])||normalized.includes(title.split(' ')[0]))&&/fútbol|football|club/i.test(title+' '+description)
    })??pages.find(item=>/fútbol|football|club/i.test((item.title??'')+' '+((item.terms?.description??[]).join(' '))))
    return page?.thumbnail?.source?{logo:page.thumbnail.source,image:page.thumbnail.source}:{}
  }catch{return {}}
}


function normalizeWikiTitle(value:string){
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
}

async function preloadExactTitlesBatch(names:string[]){
  const cache=readCache()
  const pending=names.filter(name=>exactWikiTitles[name]&&!cache[name]?.logo)
  if(!pending.length)return

  const groups:Array<string[]>=[]
  for(let i=0;i<pending.length;i+=40)groups.push(pending.slice(i,i+40))

  for(const group of groups){
    try{
      const wanted=group.map(name=>exactWikiTitles[name])
      const byTitle=new Map(wanted.map((title,index)=>[normalizeWikiTitle(title),group[index]]))
      const res=await fetch(
        'https://es.wikipedia.org/w/api.php?'+new URLSearchParams({
          action:'query',
          titles:wanted.join('|'),
          prop:'pageimages|pageprops',
          piprop:'thumbnail',
          pithumbsize:'512',
          redirects:'1',
          indexpageids:'1',
          format:'json',
          origin:'*',
        })
      )
      if(!res.ok)continue
      const data=await res.json() as {query?:{pages?:Record<string,{title?:string;thumbnail?:{source?:string};pageprops?:{wikibase_item?:string}}>;redirects?:Array<{from:string;to:string}>}}
      const redirectMap=new Map((data.query?.redirects??[]).map(item=>[normalizeWikiTitle(item.to),normalizeWikiTitle(item.from)]))
      for(const page of Object.values(data.query?.pages??{})){
        const titleKey=normalizeWikiTitle(page.title??'')
        const originalKey=redirectMap.get(titleKey)??titleKey
        const name=byTitle.get(originalKey)??byTitle.get(titleKey)
        if(!name||!page.thumbnail?.source)continue
        cache[name]={...(cache[name]??{}),logo:page.thumbnail.source,wikidataId:page.pageprops?.wikibase_item}
      }
      writeCache(cache)
    }catch{}
  }
}

export async function getClubMedia(name:string,forceRefresh=false):Promise<ClubMedia>{
  const cache=readCache()
  if(cache[name]&&!forceRefresh)return cache[name]
  const pending=inFlight.get(name)
  if(pending)return pending

  const task=(async()=>{
  try{
    const exact=await exactWikipediaMedia(name)
    if(exact.logo){
      const entity=exact.wikidataId?await wikidataEntityMedia(exact.wikidataId):{}
      const result:ClubMedia={
        ...entity,
        ...exact,
        logo:exact.logo,
        image:entity.image,
        stadiumImage:entity.stadiumImage,
        stadiumName:entity.stadiumName,
      }
      cache[name]=result
      writeCache(cache)
      return result
    }
    const query=aliases[name]||name
    const search=await fetch(
      'https://www.wikidata.org/w/api.php?'+new URLSearchParams({
        action:'wbsearchentities',
        search:query,
        language:'es',
        uselang:'es',
        format:'json',
        origin:'*',
        limit:'8',
        type:'item',
      })
    )
    if(!search.ok)throw new Error('search failed')
    const data=await search.json() as {search?:Array<{id:string;label:string;description?:string}>}
    const candidates=data.search??[]
    const football=candidates.find(x=>/fútbol|football|soccer|club deportivo|association football/i.test(x.description||''))
    if(!football)throw new Error('football club not found')

    const entityRes=await fetch(
      'https://www.wikidata.org/w/api.php?'+new URLSearchParams({
        action:'wbgetentities',
        ids:football.id,
        props:'claims|labels',
        format:'json',
        origin:'*',
      })
    )
    if(!entityRes.ok)throw new Error('entity failed')
    const entityData=await entityRes.json() as {entities?:Record<string,{claims?:Record<string,Array<{mainsnak?:{datavalue?:{value?:string}}}>>}>}
    const claims=entityData.entities?.[football.id]?.claims??{}
    const logo=claims.P154?.[0]?.mainsnak?.datavalue?.value
    const image=claims.P18?.[0]?.mainsnak?.datavalue?.value
    const venueId=(claims.P115?.[0]?.mainsnak?.datavalue?.value as {id?:string}|undefined)?.id
    let stadiumImage:string|undefined
    let stadiumName:string|undefined
    if(venueId){
      try{
        const venueRes=await fetch(
          'https://www.wikidata.org/w/api.php?'+new URLSearchParams({
            action:'wbgetentities',
            ids:venueId,
            props:'claims|labels',
            languages:'es|en',
            format:'json',
            origin:'*',
          })
        )
        if(venueRes.ok){
          const venueData=await venueRes.json() as {entities?:Record<string,{claims?:Record<string,Array<{mainsnak?:{datavalue?:{value?:string}}}>>;labels?:Record<string,{value:string}>}>}
          const venue=venueData.entities?.[venueId]
          const venueImage=venue?.claims?.P18?.[0]?.mainsnak?.datavalue?.value
          stadiumImage=commonsUrl(venueImage)
          stadiumName=venue?.labels?.es?.value??venue?.labels?.en?.value
        }
      }catch{}
    }
    let result:ClubMedia={logo:commonsUrl(logo),image:commonsUrl(image),stadiumImage,stadiumName,wikidataId:football.id}
    if(!result.logo){
      const fallback=await wikipediaFallback(query)
      result={...fallback,...result,logo:result.logo??fallback.logo,image:result.image??fallback.image}
    }
    cache[name]=result
    writeCache(cache)
    return result
  }catch{
    const fallback=await wikipediaFallback(aliases[name]||name)
    if(fallback.logo||fallback.image){cache[name]=fallback;writeCache(cache)}
    return fallback
  }finally{
    inFlight.delete(name)
  }
  })()

  inFlight.set(name,task)
  return task
}

function warmImage(url?:string){
  if(!url||typeof Image==='undefined')return
  const img=new Image()
  img.decoding='async'
  img.src=url
}

export async function preloadClubMedia(names:string[],concurrency=4,forceRefresh=false){
  const unique=[...new Set(names)]
  if(!forceRefresh)await preloadExactTitlesBatch(unique)
  let cursor=0
  const worker=async()=>{
    while(cursor<unique.length){
      const index=cursor++
      const media=await getClubMedia(unique[index],forceRefresh)
      warmImage(media.logo)
      warmImage(media.stadiumImage??media.image)
    }
  }
  await Promise.all(Array.from({length:Math.min(concurrency,unique.length)},()=>worker()))
}