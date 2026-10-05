import { createClient } from '@supabase/supabase-js'

// Set these in Vercel (and in .env.local for development) to turn on accounts
// and sync. Without them Rung stays entirely on this device, as before.
// Use the same Supabase project as the planner so one account works in both.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const syncAvailable = !!supabase
