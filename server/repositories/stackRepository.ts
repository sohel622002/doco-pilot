import supabase from '../config/supabase.js'

const COLUMNS = 'id, name, compose_yaml, created_at, updated_at'

export async function listStacks(serverId: string) {
  return supabase.from('stacks').select(COLUMNS).eq('server_id', serverId).order('name', { ascending: true })
}

export async function upsertStack(serverId: string, name: string, composeYaml: string) {
  return supabase
    .from('stacks')
    .upsert(
      { server_id: serverId, name, compose_yaml: composeYaml, updated_at: new Date().toISOString() },
      { onConflict: 'server_id,name' },
    )
    .select(COLUMNS)
    .single()
}

export async function updateStack(id: string, serverId: string, composeYaml: string) {
  return supabase
    .from('stacks')
    .update({ compose_yaml: composeYaml, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('server_id', serverId)
    .select(COLUMNS)
    .single()
}

export async function deleteStack(id: string, serverId: string) {
  return supabase.from('stacks').delete().eq('id', id).eq('server_id', serverId).select('name').single()
}
