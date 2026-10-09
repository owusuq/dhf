# Daakyehene Foundation Student Portal

Next.js + Supabase. Students sign in, edit their details, add payment dates (with calendar reminders), log payments and see progress. Admins see every student.

## Setup (about 15 minutes)
1. Create a free project at supabase.com.
2. In Supabase, open SQL Editor, paste all of `supabase/schema.sql`, click Run.
3. In Supabase, open Project Settings > API. Copy the Project URL and the anon public key.
4. Copy `.env.example` to `.env.local` and paste both values in. The two JotForm links are already filled in.
5. Run `npm install`, then `npm run dev`, then open http://localhost:3000.
6. Create your own account in the app. Then, in the SQL Editor, run:
   `update public.profiles set is_admin = true where email = 'YOUR-EMAIL';`
   An "Admin" button now appears for you.

## Go live (free)
1. Push this folder to a GitHub repo.
2. At vercel.com, import the repo. Add the four variables from `.env.local` under Environment Variables. Deploy.
3. In Supabase, open Authentication > URL Configuration. Set Site URL to your Vercel link.
4. Share the Vercel link with students.

## Notes
- Email confirmation is on by default in Supabase. To let students in without it, turn it off under Authentication > Providers > Email.
- Your data lives in Supabase, so it is not lost when browsers are cleared. Supabase's free plan pauses projects after a week of no use; upgrade it or log in weekly.
- Row-level security means each student can only see their own rows; only admins can see everyone.
