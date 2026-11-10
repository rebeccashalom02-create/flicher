-- FLICHER database schema. Run all of this in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  synopsis text,
  type text not null default 'movie' check (type in ('movie','series')),
  genre text,
  year integer,
  maturity_rating text,
  duration_minutes integer,
  poster_url text,
  backdrop_url text,
  video_path text,
  downloadable boolean not null default false,
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create table if not exists public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  position_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Automatically create a basic profile for new accounts.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.watchlist enable row level security;
alter table public.watch_progress enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read published titles" on public.movies;
create policy "Public can read published titles" on public.movies for select
using (published = true or public.is_admin());

drop policy if exists "Admins can insert titles" on public.movies;
create policy "Admins can insert titles" on public.movies for insert to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update titles" on public.movies;
create policy "Admins can update titles" on public.movies for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete titles" on public.movies;
create policy "Admins can delete titles" on public.movies for delete to authenticated
using (public.is_admin());

drop policy if exists "Users manage own watchlist" on public.watchlist;
create policy "Users manage own watchlist" on public.watchlist for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own progress" on public.watch_progress;
create policy "Users manage own progress" on public.watch_progress for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create buckets (posters are public; videos are private).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
 ('posters','posters',true,10485760,array['image/jpeg','image/png','image/webp','image/avif']),
 ('videos','videos',false,524288000,array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

drop policy if exists "Public can view posters" on storage.objects;
create policy "Public can view posters" on storage.objects for select
using (bucket_id = 'posters');

drop policy if exists "Admins upload posters" on storage.objects;
create policy "Admins upload posters" on storage.objects for insert to authenticated
with check (bucket_id = 'posters' and public.is_admin());

drop policy if exists "Admins update posters" on storage.objects;
create policy "Admins update posters" on storage.objects for update to authenticated
using (bucket_id = 'posters' and public.is_admin())
with check (bucket_id = 'posters' and public.is_admin());

drop policy if exists "Admins delete posters" on storage.objects;
create policy "Admins delete posters" on storage.objects for delete to authenticated
using (bucket_id = 'posters' and public.is_admin());

drop policy if exists "Admins upload videos" on storage.objects;
create policy "Admins upload videos" on storage.objects for insert to authenticated
with check (bucket_id = 'videos' and public.is_admin());

drop policy if exists "Admins update videos" on storage.objects;
create policy "Admins update videos" on storage.objects for update to authenticated
using (bucket_id = 'videos' and public.is_admin())
with check (bucket_id = 'videos' and public.is_admin());

drop policy if exists "Admins delete videos" on storage.objects;
create policy "Admins delete videos" on storage.objects for delete to authenticated
using (bucket_id = 'videos' and public.is_admin());

-- After you register with your chosen admin email, run this statement separately,
-- replacing the email with the same address. This grants the first admin role.
-- update public.profiles set role = 'admin' where email = 'you@example.com';
