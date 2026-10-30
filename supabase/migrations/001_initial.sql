-- Phase 1: Supabase Auth users, sites and buildings. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'viewer' check (role in ('admin','viewer')),
 created_at timestamptz not null default now()
);
create table if not exists public.sites (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 120),
 address text,
 created_at timestamptz not null default now()
);
create table if not exists public.buildings (
 id uuid primary key default gen_random_uuid(),
 site_id uuid not null references public.sites(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 120),
 description text,
 created_at timestamptz not null default now()
);
create index if not exists buildings_site_id_idx on public.buildings(site_id);
create or replace function public.create_profile_for_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,role) values(new.id,'viewer') on conflict (id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_kc on auth.users;
create trigger on_auth_user_created_kc after insert on auth.users
for each row execute function public.create_profile_for_new_user();
insert into public.profiles(id,role)
select id,'viewer' from auth.users on conflict(id) do nothing;
create or replace function public.is_kc_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_kc_admin() from public;
grant execute on function public.is_kc_admin() to authenticated;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.buildings enable row level security;
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists "sites_read" on public.sites;
create policy "sites_read" on public.sites for select to authenticated using(true);
drop policy if exists "sites_admin_insert" on public.sites;
create policy "sites_admin_insert" on public.sites for insert to authenticated with check(public.is_kc_admin());
drop policy if exists "sites_admin_update" on public.sites;
create policy "sites_admin_update" on public.sites for update to authenticated using(public.is_kc_admin()) with check(public.is_kc_admin());
drop policy if exists "sites_admin_delete" on public.sites;
create policy "sites_admin_delete" on public.sites for delete to authenticated using(public.is_kc_admin());
drop policy if exists "buildings_read" on public.buildings;
create policy "buildings_read" on public.buildings for select to authenticated using(true);
drop policy if exists "buildings_admin_insert" on public.buildings;
create policy "buildings_admin_insert" on public.buildings for insert to authenticated with check(public.is_kc_admin());
drop policy if exists "buildings_admin_update" on public.buildings;
create policy "buildings_admin_update" on public.buildings for update to authenticated using(public.is_kc_admin()) with check(public.is_kc_admin());
drop policy if exists "buildings_admin_delete" on public.buildings;
create policy "buildings_admin_delete" on public.buildings for delete to authenticated using(public.is_kc_admin());
