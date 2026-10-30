# KC Network Mapper — Phase 1 (fresh start)

Nuxt 4 + Supabase Auth/PostgreSQL + Netlify. No Docker, Windows-specific scripts, or SNMP.

## Features
- Email/password login through Supabase Auth
- Dashboard with site and building counts
- Sites: list, create, delete
- Buildings: list, create, delete, linked to sites
- Admin-only writes enforced by PostgreSQL Row Level Security
- Viewer read-only role

## Requirements
- Node.js 22 LTS and npm
- A Supabase project
- Netlify account for hosting

## 1. Supabase setup
1. Create a Supabase project.
2. Open SQL Editor, paste and run `supabase/migrations/001_initial.sql`.
3. In Authentication > Users, create your first user manually. Keep public signups disabled unless needed.
4. In SQL Editor, promote that user (replace email):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
```

**Do not place the Supabase service-role key in the frontend or Netlify public environment variables.** RLS governs access.

## 2. Local development
```bash
cp .env.example .env
npm install
npm run dev
```
On Windows PowerShell use `Copy-Item .env.example .env` instead of `cp` if preferred.

Edit `.env` with your Supabase Project URL and anon/publishable key from Supabase Project Settings > API.

Open http://localhost:3000 and sign in with the user created above.

## 3. Netlify deployment
1. Push the project to a private Git repository (do not commit `.env`).
2. Import the repository in Netlify.
3. Build command: `npm run build`.
4. Publish directory: `.output/public`.
5. Add Netlify environment variables `SUPABASE_URL` and `SUPABASE_KEY`.
6. Deploy. The Nuxt Nitro `netlify` preset generates serverless handling where needed.
7. In Supabase Authentication > URL Configuration, add your Netlify production domain to allowed redirect URLs if using email links or OAuth later.

## Access model
- Any signed-in user can read sites and buildings.
- Only users whose `public.profiles.role` is `admin` can create/delete records.
- A new Auth user receives `viewer` role automatically.
- To grant admin rights, update `public.profiles` in the Supabase SQL Editor using a trusted admin session.

## Roadmap
Phase 2: rack and equipment templates. Phase 3: switches, patch panels, ports, VLANs and cable tracing.

## Notes
This is a fresh Phase 1 starter, not a reproduction of PatchMap.ai. Validate locally and review security before production use. The project has not been verified through a full dependency install/build in this environment.
