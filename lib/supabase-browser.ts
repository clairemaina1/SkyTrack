import { createClient } from '@supabase/supabase-js'

// SkyTrack Connection Configuration
const supabaseUrl = 'https://gtviwxcukrjxtkmirqum.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dml3eGN1a3JqeHRrbWlycXVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzMDI1MSwiZXhwIjoyMDkxNTA2MjUxfQ.CeJ8P2Iyip6IJuNhwwa6-8TNPfc4KJCBcprAQ2JJdl8'

// Initialize the Supabase Client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase