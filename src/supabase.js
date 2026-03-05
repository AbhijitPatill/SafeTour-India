import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wkygsklerlmideywkuyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWdza2xlcmxtaWRleXdrdXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzM2MzMsImV4cCI6MjA4ODA0OTYzM30.dp3MJhb2xUVS-ZEuOLYzVYThe5ajfJdbNY28YGeZjPQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);