import { leagues, clubsByLeague, registerLeagueSeed } from '../world/Architecture'

type CatalogEntry = {
  country:string
  code:string
  tiers:number[]
}

export const OPEN_FOOTBALL_SOURCE='https://github.com/openfootball/football.json'
export const OPEN_FOOTBALL_LICENSE='CC0-1.0 / public domain'

const entries:CatalogEntry[]=[
  {country:'Argentina',code:'ar',tiers:[1,2]},
  {country:'Brasil',code:'br',tiers:[1,2]},
  {country:'Uruguay',code:'uy',tiers:[1,2]},
  {country:'Paraguay',code:'py',tiers:[1,2]},
  {country:'Chile',code:'cl',tiers:[1,2]},
  {country:'Colombia',code:'co',tiers:[1,2]},
  {country:'Perú',code:'pe',tiers:[1,2]},
  {country:'Ecuador',code:'ec',tiers:[1,2]},
  {country:'Bolivia',code:'bo',tiers:[1,2]},
  {country:'Venezuela',code:'ve',tiers:[1,2]},
  {country:'México',code:'mx',tiers:[1,2]},
  {country:'Estados Unidos',code:'us',tiers:[1,2]},
  {country:'Canadá',code:'ca',tiers:[1]},
  {country:'Costa Rica',code:'cr',tiers:[1,2]},
  {country:'Honduras',code:'hn',tiers:[1]},
  {country:'Guatemala',code:'gt',tiers:[1]},
  {country:'El Salvador',code:'sv',tiers:[1]},
  {country:'Panamá',code:'pa',tiers:[1]},
  {country:'Inglaterra',code:'en',tiers:[1,2,3]},
  {country:'España',code:'es',tiers:[1,2,3]},
  {country:'Alemania',code:'de',tiers:[1,2,3]},
  {country:'Italia',code:'it',tiers:[1,2,3]},
  {country:'Francia',code:'fr',tiers:[1,2,3]},
  {country:'Portugal',code:'pt',tiers:[1,2]},
  {country:'Países Bajos',code:'nl',tiers:[1,2]},
  {country:'Bélgica',code:'be',tiers:[1,2]},
  {country:'Turquía',code:'tr',tiers:[1,2]},
  {country:'Grecia',code:'gr',tiers:[1,2]},
  {country:'Austria',code:'at',tiers:[1,2]},
  {country:'Suiza',code:'ch',tiers:[1,2]},
  {country:'Escocia',code:'sc',tiers:[1,2]},
  {country:'Irlanda',code:'ie',tiers:[1,2]},
  {country:'Irlanda del Norte',code:'nir',tiers:[1,2]},
  {country:'Gales',code:'wal',tiers:[1]},
  {country:'Dinamarca',code:'dk',tiers:[1,2]},
  {country:'Suecia',code:'se',tiers:[1,2]},
  {country:'Noruega',code:'no',tiers:[1,2]},
  {country:'Finlandia',code:'fi',tiers:[1,2]},
  {country:'Islandia',code:'is',tiers:[1,2]},
  {country:'Polonia',code:'pl',tiers:[1,2]},
  {country:'Chequia',code:'cz',tiers:[1,2]},
  {country:'Eslovaquia',code:'sk',tiers:[1,2]},
  {country:'Hungría',code:'hu',tiers:[1,2]},
  {country:'Rumania',code:'ro',tiers:[1,2]},
  {country:'Bulgaria',code:'bg',tiers:[1,2]},
  {country:'Croacia',code:'hr',tiers:[1,2]},
  {country:'Serbia',code:'rs',tiers:[1,2]},
  {country:'Eslovenia',code:'si',tiers:[1,2]},
  {country:'Bosnia y Herzegovina',code:'ba',tiers:[1]},
  {country:'Montenegro',code:'me',tiers:[1]},
  {country:'Albania',code:'al',tiers:[1]},
  {country:'Macedonia del Norte',code:'mk',tiers:[1]},
  {country:'Ucrania',code:'ua',tiers:[1,2]},
  {country:'Georgia',code:'ge',tiers:[1]},
  {country:'Armenia',code:'am',tiers:[1]},
  {country:'Azerbaiyán',code:'az',tiers:[1]},
  {country:'Israel',code:'il',tiers:[1,2]},
  {country:'Chipre',code:'cy',tiers:[1,2]},
  {country:'Japón',code:'jp',tiers:[1,2,3]},
  {country:'Corea del Sur',code:'kr',tiers:[1,2]},
  {country:'China',code:'cn',tiers:[1,2]},
  {country:'Australia',code:'au',tiers:[1]},
  {country:'Arabia Saudita',code:'sa',tiers:[1,2]},
  {country:'Emiratos Árabes Unidos',code:'ae',tiers:[1]},
  {country:'Qatar',code:'qa',tiers:[1]},
  {country:'India',code:'in',tiers:[1,2]},
  {country:'Indonesia',code:'id',tiers:[1]},
  {country:'Tailandia',code:'th',tiers:[1]},
  {country:'Vietnam',code:'vn',tiers:[1]},
  {country:'Malasia',code:'my',tiers:[1]},
  {country:'Sudáfrica',code:'za',tiers:[1,2]},
  {country:'Egipto',code:'eg',tiers:[1,2]},
  {country:'Marruecos',code:'ma',tiers:[1,2]},
  {country:'Argelia',code:'dz',tiers:[1,2]},
  {country:'Túnez',code:'tn',tiers:[1,2]},
  {country:'Nigeria',code:'ng',tiers:[1]},
  {country:'Ghana',code:'gh',tiers:[1]},
  {country:'Kenia',code:'ke',tiers:[1]},
  {country:'Nueva Zelanda',code:'nz',tiers:[1]},
  {country:'Rusia',code:'ru',tiers:[1,2]},
  {country:'Kazajistán',code:'kz',tiers:[1]},
  {country:'Camerún',code:'cm',tiers:[1]},
]

const seasonCandidates=['2026-27','2026','2025-26','2025']
const cacheKey='leyenda-openfootball-v1'

type CacheShape=Record<string,string[]>

const readCache=():CacheShape=>{
  if(typeof window==='undefined')return {}
  try{return JSON.parse(localStorage.getItem(cacheKey)??'{}') as CacheShape}catch{return {}}
}

const writeCache=(cache:CacheShape)=>{
  if(typeof window==='undefined')return
  try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}
}

const generatedId=(entry:CatalogEntry,tier:number)=>`of-${entry.code}-${tier}`
const idFor=(entry:CatalogEntry,tier:number)=>leagues.find(league=>league.country===entry.country&&league.tier===tier)?.id??generatedId(entry,tier)

for(const entry of entries){
  for(const tier of entry.tiers){
    if(!leagues.some(league=>league.country===entry.country&&league.tier===tier)){
      registerLeagueSeed({id:generatedId(entry,tier),country:entry.country,division:tier,teams:[]})
    }
  }
}

const cachedAtBoot=readCache()
for(const entry of entries){
  for(const tier of entry.tiers){
    const id=idFor(entry,tier)
    const teams=cachedAtBoot[id]
    if(teams?.length&&!clubsByLeague(id).length)registerLeagueSeed({id,country:entry.country,division:tier,teams})
  }
}

const teamNamesFromMatches=(payload:unknown)=>{
  if(!payload||typeof payload!=='object')return []
  const matches=(payload as {matches?:Array<{team1?:string;team2?:string}>}).matches
  if(!Array.isArray(matches))return []
  const names=new Set<string>()
  for(const match of matches){
    if(match?.team1)names.add(match.team1.trim())
    if(match?.team2)names.add(match.team2.trim())
  }
  return [...names].filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'))
}

const entryForLeague=(leagueId:string)=>{
  for(const entry of entries){
    for(const tier of entry.tiers){
      if(idFor(entry,tier)===leagueId)return {entry,tier}
    }
  }
  return null
}

export const isOpenFootballLeague=(leagueId:string)=>Boolean(entryForLeague(leagueId))

export async function ensureOpenFootballLeague(leagueId:string){
  const target=entryForLeague(leagueId)
  if(!target)return {ok:false,teams:[] as string[],source:OPEN_FOOTBALL_SOURCE}
  const cache=readCache()
  if(clubsByLeague(leagueId).length){
    return {ok:true,teams:clubsByLeague(leagueId).map(team=>team.name),source:'local'}
  }
  if(cache[leagueId]?.length){
    registerLeagueSeed({id:leagueId,country:target.entry.country,division:target.tier,teams:cache[leagueId]})
    return {ok:true,teams:cache[leagueId],source:OPEN_FOOTBALL_SOURCE}
  }

  for(const season of seasonCandidates){
    const file=`${target.entry.code}.${target.tier}.json`
    const url=`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${file}`
    try{
      const response=await fetch(url,{cache:'force-cache'})
      if(!response.ok)continue
      const payload=await response.json()
      const teams=teamNamesFromMatches(payload)
      if(!teams.length)continue
      registerLeagueSeed({id:leagueId,country:target.entry.country,division:target.tier,teams})
      cache[leagueId]=teams
      writeCache(cache)
      return {ok:true,teams,source:url}
    }catch{
      // Try the next published season. The catalog intentionally tolerates missing competitions.
    }
  }

  return {ok:false,teams:[] as string[],source:OPEN_FOOTBALL_SOURCE}
}

export const openFootballCountries=entries.map(entry=>entry.country)
