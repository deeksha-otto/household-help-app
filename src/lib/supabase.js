import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wrupxirgnmpddocajhng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydXB4aXJnbm1wZGRvY2FqaG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NzYxMDcsImV4cCI6MjEwMDU1MjEwN30.XlhRlG_uOF6qooZGSdOEeXI3G4SYzYASeI6OXB0Hi20'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
