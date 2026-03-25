import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabaseUrl = PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseAuthEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseClient = isSupabaseAuthEnabled
	? createClient(supabaseUrl, supabaseAnonKey)
	: null;
