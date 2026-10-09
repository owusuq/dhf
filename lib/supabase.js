import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const UPLOAD_FORM = process.env.NEXT_PUBLIC_UPLOAD_FORM;
export const PAYMENT_FORM = process.env.NEXT_PUBLIC_PAYMENT_FORM;
