import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);

// Create a separate client for server components using the service role key
export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);
