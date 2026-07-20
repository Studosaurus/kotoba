create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_phrase text not null,
  normalized_form text not null,
  reading_kana text not null,
  concise_meaning text not null,
  natural_translation text not null,
  grammar_explanation text,
  example_sentence text,
  example_sentence_reading text,
  example_sentence_translation text,
  jlpt_estimate text,
  suggested_tags text[] not null default '{}',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  source_context jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.study_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'vocabulary' check (kind in ('vocabulary')),
  source_entity_id uuid not null,
  status text not null default 'due' check (status in ('due', 'scheduled', 'retired')),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  review_count integer not null default 0,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_item_id uuid not null references public.study_items(id) on delete cascade,
  rating text not null check (rating in ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz not null default now()
);

create index vocabulary_items_user_created_idx on public.vocabulary_items(user_id, created_at desc);
create index learner_events_user_occurred_idx on public.learner_events(user_id, occurred_at desc);
create index study_items_user_due_idx on public.study_items(user_id, due_at asc);
create index review_results_user_reviewed_idx on public.review_results(user_id, reviewed_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger vocabulary_items_touch_updated_at
before update on public.vocabulary_items
for each row execute function public.touch_updated_at();

create trigger study_items_touch_updated_at
before update on public.study_items
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.learner_events enable row level security;
alter table public.study_items enable row level security;
alter table public.review_results enable row level security;

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can manage own vocabulary"
on public.vocabulary_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own learner events"
on public.learner_events for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own study items"
on public.study_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own review results"
on public.review_results for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
