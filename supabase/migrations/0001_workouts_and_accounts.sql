-- Shared by the planner and the Rung workout app (same Supabase project, same accounts).
-- Safe to run more than once. The planner repo (Life-planner) carries the same file; its planner_state table is set up by its own 0001 migration.

-- Rung's own synced data: one row per account, like planner_state.
create table if not exists public.workout_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.workout_state enable row level security;
drop policy if exists "Read own workouts" on public.workout_state;
drop policy if exists "Create own workouts" on public.workout_state;
drop policy if exists "Update own workouts" on public.workout_state;
drop policy if exists "Delete own workouts" on public.workout_state;
create policy "Read own workouts" on public.workout_state for select using (auth.uid() = user_id);
create policy "Create own workouts" on public.workout_state for insert with check (auth.uid() = user_id);
create policy "Update own workouts" on public.workout_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own workouts" on public.workout_state for delete using (auth.uid() = user_id);

-- The bridge between the apps: Rung publishes its upcoming workouts here,
-- the planner reads them to plan around them. One workout per day.
create table if not exists public.scheduled_workouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  title text not null,
  duration_min integer not null default 45,
  done boolean not null default false,
  source text not null default 'rung',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.scheduled_workouts enable row level security;
drop policy if exists "Read own schedule" on public.scheduled_workouts;
drop policy if exists "Add to own schedule" on public.scheduled_workouts;
drop policy if exists "Change own schedule" on public.scheduled_workouts;
drop policy if exists "Remove from own schedule" on public.scheduled_workouts;
create policy "Read own schedule" on public.scheduled_workouts for select using (auth.uid() = user_id);
create policy "Add to own schedule" on public.scheduled_workouts for insert with check (auth.uid() = user_id);
create policy "Change own schedule" on public.scheduled_workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Remove from own schedule" on public.scheduled_workouts for delete using (auth.uid() = user_id);

-- In-app account deletion (required by the App Store). Deleting the auth user
-- removes every row above through "on delete cascade", in both apps.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
