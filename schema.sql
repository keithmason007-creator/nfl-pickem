-- Run this in Supabase SQL Editor.

create table public.games (
  id uuid primary key default gen_random_uuid(),
  season int not null,
  week int not null,
  away_team text not null,
  home_team text not null,
  kickoff_time timestamptz not null,
  winner text,
  unique(season, week, away_team, home_team)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text
);

create table public.picks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  picked_team text not null,
  created_at timestamptz default now(),
  unique(user_id, game_id)
);

alter table public.games enable row level security;
alter table public.profiles enable row level security;
alter table public.picks enable row level security;

create policy "games readable by everyone" on public.games for select using (true);
create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "users create own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "users read own picks" on public.picks for select using (auth.uid() = user_id);

-- Picks may only be inserted/updated before kickoff.
create policy "users insert unlocked picks" on public.picks
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.games g
    where g.id = game_id and now() < g.kickoff_time
  )
);

create policy "users update unlocked picks" on public.picks
for update using (
  auth.uid() = user_id
  and exists (
    select 1 from public.games g
    where g.id = game_id and now() < g.kickoff_time
  )
);

create or replace view public.leaderboard as
select
  p.user_id,
  coalesce(pr.name, 'Player') as name,
  count(*) filter (where g.winner is not null and p.picked_team = g.winner) as correct,
  count(*) filter (where g.winner is not null) as graded
from public.picks p
join public.games g on g.id = p.game_id
left join public.profiles pr on pr.id = p.user_id
group by p.user_id, pr.name;
