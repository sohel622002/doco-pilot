import { createClient } from '@supabase/supabase-js'
import { env } from '../env.js'

// Service role client — bypasses RLS, backend only, never expose to frontend
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

export default supabase
