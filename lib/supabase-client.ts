import { createClient } from '@supabase/supabase-js';

// Check if we have the required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// For client-side only - make sure we have the required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Create a Supabase client for client-side usage
export const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Server-side admin client (only instantiated on the server)
export const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    // This should never run on the client
    throw new Error('getSupabaseAdmin should only be called on the server');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for admin client');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
