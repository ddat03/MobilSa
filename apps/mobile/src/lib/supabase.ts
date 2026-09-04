import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://ljsqknwbrtbpxgcyjcth.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxqc3FrbndicnRicHhnY3lqY3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzgwMjgsImV4cCI6MjA5ODM1NDAyOH0.ME_C5F_TfLOdtV-XFRs1_Yh3Ke-2Udf3f2Q7gDCmHuE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
