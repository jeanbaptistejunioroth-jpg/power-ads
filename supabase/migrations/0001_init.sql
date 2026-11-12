-- ════════════════════════════════════════════════════════════════
-- POWER ADS — Migration 0001 : profils, messagerie service client
-- À exécuter dans Supabase > SQL Editor (ou via `supabase db push`).
-- Les tables de facturation (transactions de tokens, commandes,
-- vidéos, grille tarifaire) arrivent dans la migration 0002.
-- ════════════════════════════════════════════════════════════════

-- ── Profils ─────────────────────────────────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text check (char_length(full_name) <= 80),
  locale         text check (locale in ('fr', 'en')),
  token_balance  integer not null default 0 check (token_balance >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: lecture de son profil"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles: modification de son profil"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sécurité : le client ne peut modifier QUE son nom et sa langue.
-- Le solde de tokens n'est modifiable que côté serveur (service role / fonctions SQL).
revoke update on public.profiles from authenticated, anon;
grant update (full_name, locale) on public.profiles to authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── Messagerie service client ──────────────────────────────────
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  sender      text not null check (sender in ('user', 'agent')),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

create index if not exists support_messages_user_created_idx
  on public.support_messages (user_id, created_at);

alter table public.support_messages enable row level security;

create policy "support: lecture de sa conversation"
  on public.support_messages for select
  using ((select auth.uid()) = user_id);

-- Un client n'écrit qu'en son nom, et uniquement en tant que "user".
-- Les réponses "agent" sont insérées par l'équipe (service role / tableau de bord).
create policy "support: envoi d'un message client"
  on public.support_messages for insert
  with check ((select auth.uid()) = user_id and sender = 'user');

-- Temps réel : les réponses du service client s'affichent sans recharger la page.
alter publication supabase_realtime add table public.support_messages;

-- ── Création automatique du profil + message de bienvenue ───────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale text := case
    when new.raw_user_meta_data ->> 'locale' in ('fr', 'en') then new.raw_user_meta_data ->> 'locale'
    else null
  end;
  v_name text := left(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name'
  ), 80);
begin
  insert into public.profiles (id, full_name, locale)
  values (new.id, v_name, v_locale)
  on conflict (id) do nothing;

  insert into public.support_messages (user_id, sender, body)
  values (
    new.id,
    'agent',
    case when v_locale = 'en'
      then 'Welcome to POWER ADS! This is your direct line to our team. Ask us anything about orders, payments or your videos, and we''ll reply here.'
      else 'Bienvenue sur POWER ADS ! Ici, vous écrivez directement à notre équipe. Posez vos questions sur vos commandes, paiements ou vidéos : nous vous répondons dans cette conversation.'
    end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
