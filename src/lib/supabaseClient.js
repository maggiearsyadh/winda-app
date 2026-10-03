import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sxacfpqutrdsczsfzjzd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Jj8YAi9q8VA7sUxdYX03qg_zhQ-4n2_';

export const supabase = createClient(supabaseUrl, supabaseKey);
