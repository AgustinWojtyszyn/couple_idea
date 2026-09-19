export type ClubMedia = {
  logo?: string
  image?: string
  stadiumImage?: string
  stadiumName?: string
  wikidataId?: string
}

const CACHE_KEY='leyenda-club-media-v2'

function readCache():Record<string,ClubMedia>{
  try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'{}')}catch{return{}}
}
function writeCache(cache:Record<string,ClubMedia>){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify(cache))}catch{}
}

const aliases:Record<string,string>={
  'Central Córdoba SdE':'Central Córdoba de Santiago del Estero',
  'Belgrano de Córdoba':'Club Atlético Belgrano',
  'Instituto de Córdoba':'Instituto Atlético Central Córdoba',
  'Sarmiento de Junín':'Club Atlético Sarmiento Junín',
  'San Martín de San Juan':'Club Atlético San Martín San Juan',
  'Independiente Rivadavia':'Independiente Rivadavia Mendoza',
  'Unión de Santa Fe':'Club Atlético Unión Santa Fe',
  'Estudiantes':'Estudiantes de La Plata',
  'Gimnasia de La Plata':'Gimnasia y Esgrima La Plata',
  'Talleres de Córdoba':'Club Atlético Talleres Córdoba',
  'Atlético Tucumán':'Club Atlético Tucumán',
  "Newell's Old Boys":"Newell's Old Boys",
}

function commonsUrl(file?:string){
  return file?'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(file):undefined
}

export async function getClubMedia(name:string):Promise<ClubMedia>{
  const cache=readCache()
  if(cache[name])return cache[name]

  try{
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
    const football=candidates.find(x=>/fútbol|football|soccer|club deportivo|association football/i.test(x.description||''))??candidates[0]
    if(!football)throw new Error('not found')

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
    const result:ClubMedia={logo:commonsUrl(logo),image:commonsUrl(image),stadiumImage,stadiumName,wikidataId:football.id}
    cache[name]=result
    writeCache(cache)
    return result
  }catch{
    const result:ClubMedia={}
    cache[name]=result
    writeCache(cache)
    return result
  }
}