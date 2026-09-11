import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ztvpaaajpkwyaygtfipx.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Q5ZeBlzS9dmSeJ3tCc9U9g_rnt82bCh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
