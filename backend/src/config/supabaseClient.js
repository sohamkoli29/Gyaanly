import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Regular client (uses anon key for frontend-like operations)
export const supabase = createClient(supabaseUrl, supabaseKey)

// Service role client (bypasses RLS)
export const supabaseService = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY)