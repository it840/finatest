# Asset Registry System

A multi-user resort asset management system — asset database, physical inventory
counts, movement/transfer log, reporting, and role-based access (admin / manager / staff).

## Stack
- **Frontend:** React + Vite + Tailwind CSS, deployed as a static site (e.g. Netlify)
- **Backend:** Supabase (Postgres + Auth + Row Level Security + Edge Functions)

## Project layout
- **Repo root** — the built, static site (what GitHub Pages actually serves at `https://it840.github.io/finatest/`). Don't hand-edit these files — they're generated.
- `app/` — the actual React source code (edit here, then rebuild)
- `supabase/migrations/` — full database schema, in order (run these against a fresh Supabase project)
- `supabase/functions/` — two Edge Functions used for privileged admin actions:
  - `admin-create-user` — lets an admin create a new login from within the app (needs the service role key, so it can't be done from the browser directly)
  - `admin-delete-user` — lets an admin delete a user account, with safeguards (can't delete yourself, can't delete the last remaining admin)

## Rebuilding after a code change
```
cd app
npm install
npx vite build --base=/finatest/ --outDir ../dist-ghpages
```
Then copy the contents of `dist-ghpages/` over the repo root files and commit.
(The main deployment target is actually Netlify, which builds from `app/` with the default `/` base — GitHub Pages is a secondary mirror.)

## Setting up a new Supabase project
1. Create a Supabase project.
2. Run every file in `supabase/migrations/` in filename order (e.g. via the SQL editor, or `supabase db push` if using the Supabase CLI).
3. Deploy both functions in `supabase/functions/` (`supabase functions deploy admin-create-user`, etc.).
4. Update `src/lib/supabase.js` with your project's URL and publishable (anon) key.

## Note on seed data
Two migrations from the original build are **intentionally not included** here:
one seeded a handful of sample assets with placeholder data, and another created
real staff accounts with plaintext passwords for initial setup. Neither belongs
in version control. Create your first account by signing up in the app — the
first person to sign up automatically becomes admin — then add further accounts
from Settings → Users.

## Roles
- **admin** — full access: assets, users, lookups, import/export, everything
- **manager** — can create/edit assets, log movements and inventory counts, view reports and log history
- **staff** — can view everything and log physical inventory counts / movements, but cannot create, edit, or delete asset records
