import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://wkygsklerlmideywkuyk.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWdza2xlcmxtaWRleXdrdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzM2MzMsImV4cCI6MjA4ODA0OTYzM30.dp3MJhb2xUVS-ZEuOLYzVYThe5ajfJdbNY28YGeZjPQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);