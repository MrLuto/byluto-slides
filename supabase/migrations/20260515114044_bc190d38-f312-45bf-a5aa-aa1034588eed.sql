-- Phase 4A: editable deck persistence schema + restore presenter_notes.

-- updated_at trigger function (idempotent).
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── decks ───────────────────────────────────────────────────────────
create table public.decks (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  data          jsonb not null,
  thumbnail_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index decks_owner_id_idx on public.decks (owner_id);
alter table public.decks enable row level security;

-- ── deck_collaborators ──────────────────────────────────────────────
create table public.deck_collaborators (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references public.decks(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor',
  created_at timestamptz not null default now(),
  unique (deck_id, user_id)
);
create index deck_collaborators_deck_id_idx on public.deck_collaborators (deck_id);
create index deck_collaborators_user_id_idx on public.deck_collaborators (user_id);
alter table public.deck_collaborators enable row level security;

-- Security-definer helpers prevent recursive RLS on deck_collaborators.
create or replace function public.is_deck_collaborator(_deck_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deck_collaborators
    where deck_id = _deck_id and user_id = _user_id
  )
$$;

create or replace function public.is_deck_editor(_deck_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deck_collaborators
    where deck_id = _deck_id and user_id = _user_id and role = 'editor'
  )
$$;

-- decks RLS
create policy "Owner can select own decks"   on public.decks for select using (auth.uid() = owner_id);
create policy "Owner can insert own decks"   on public.decks for insert with check (auth.uid() = owner_id);
create policy "Owner can update own decks"   on public.decks for update using (auth.uid() = owner_id);
create policy "Owner can delete own decks"   on public.decks for delete using (auth.uid() = owner_id);
create policy "Collaborators can select decks" on public.decks for select using (public.is_deck_collaborator(id, auth.uid()));
create policy "Editor collaborators can update decks" on public.decks for update using (public.is_deck_editor(id, auth.uid()));

-- deck_collaborators RLS
create policy "Owner can manage collaborators"
  on public.deck_collaborators for all
  using (exists (select 1 from public.decks d where d.id = deck_collaborators.deck_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.decks d where d.id = deck_collaborators.deck_id and d.owner_id = auth.uid()));
create policy "Collaborator can see own membership"
  on public.deck_collaborators for select using (user_id = auth.uid());

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.update_updated_at_column();

-- ── presenter_notes (restored, single-user tool, no auth) ───────────
create table public.presenter_notes (
  id         uuid primary key default gen_random_uuid(),
  slide_id   text not null unique,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.presenter_notes enable row level security;

create policy "Public read presenter notes"   on public.presenter_notes for select using (true);
create policy "Public insert presenter notes" on public.presenter_notes for insert with check (true);
create policy "Public update presenter notes" on public.presenter_notes for update using (true);
create policy "Public delete presenter notes" on public.presenter_notes for delete using (true);

create trigger presenter_notes_set_updated_at
  before update on public.presenter_notes
  for each row execute function public.update_updated_at_column();
