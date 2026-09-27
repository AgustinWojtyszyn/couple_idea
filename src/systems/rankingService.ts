import type { RunScore } from '../world/Architecture'
import { getRunScores } from './buildingStore'

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined
const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined

const configured=Boolean(url&&key)

function headers(extra:Record<string,string>={}){
  return {
    apikey:key??'',
    Authorization:`Bearer ${key??''}`,
    'Content-Type':'application/json',
    ...extra,
  }
}

export async function loadLeaderboard(limit=50):Promise<RunScore[]>{
  if(!configured)return getRunScores()
  try{
    const response=await fetch(
      `${url}/rest/v1/leyenda_scores?select=run_id,display_name,mode,score,detail,created_at&order=score.desc&limit=${Math.max(1,Math.min(100,limit))}`,
      {headers:headers()}
    )
    if(!response.ok)throw new Error('leaderboard '+response.status)
    const rows=await response.json() as Array<{
      run_id:string
      display_name:string
      mode:'player'|'coach'
      score:number
      detail:string
      created_at:string
    }>
    return rows.map(row=>({
      id:row.run_id,
      name:row.display_name,
      mode:row.mode,
      score:row.score,
      detail:row.detail,
      createdAt:new Date(row.created_at).getTime(),
    }))
  }catch{
    return getRunScores()
  }
}

export async function submitLeaderboardScore(run:RunScore):Promise<boolean>{
  if(!configured)return false
  try{
    const response=await fetch(`${url}/rest/v1/rpc/submit_leyenda_score`,{
      method:'POST',
      headers:headers(),
      body:JSON.stringify({
        p_run_id:run.id,
        p_display_name:run.name,
        p_mode:run.mode,
        p_score:Math.round(run.score),
        p_detail:run.detail,
      }),
    })
    return response.ok
  }catch{
    return false
  }
}

export const globalRankingEnabled=configured
