-- ════════════════════════════════════════════════════════════════
-- POWER ADS — Migration 0004 : durcissement de la sécurité.
-- À exécuter UNE FOIS, après 0003_video_style, dans Supabase > SQL Editor,
-- au moment de déployer la version du site qui l'utilise (les commandes
-- passent désormais par place_order_for).
--
--  • Les commandes ne peuvent plus être passées directement depuis le
--    navigateur : uniquement par le serveur du site, après validation.
--  • Limites anti-abus atomiques (import Shopify, rédaction IA).
--  • Messagerie : 20 messages / 10 min et 200 / jour par client,
--    date d'envoi imposée par la base.
--  • Photos produits : 100 envois / 24 h par client.
-- ════════════════════════════════════════════════════════════════

-- ── Commandes : serveur uniquement ─────────────────────────────────
-- place_order() était appelable depuis le navigateur avec la clé publique,
-- ce qui contournait la validation de /api/orders (liens d'images, textes…).
-- Reprend la version de 0003_video_style (colonne video_style).
drop function if exists public.place_order(jsonb);

create or replace function public.place_order_for(p_user uuid, p_order jsonb)
returns table (order_id uuid, order_ref text, total_tokens integer, balance_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duration integer;
  v_scripts  jsonb := p_order -> 'scripts';
  v_count    integer;
  v_unit     integer;
  v_total    integer;
  v_order    uuid;
  v_ref      text;
  v_balance  integer;
  i          integer;
begin
  if p_user is null then
    raise exception 'not_authenticated';
  end if;

  v_duration := (p_order ->> 'duration_s')::integer;

  if v_scripts is null or jsonb_typeof(v_scripts) <> 'array' then
    raise exception 'invalid_scripts';
  end if;
  v_count := jsonb_array_length(v_scripts);
  if v_count < 1 or v_count > 10 then
    raise exception 'invalid_count';
  end if;

  select pr.tokens into v_unit
  from public.pricing_rules pr
  where pr.duration_s = v_duration and pr.active;
  if v_unit is null then
    raise exception 'invalid_duration';
  end if;

  v_total := v_unit * v_count;
  v_ref := 'PA-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-'
           || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (
    ref, user_id, product, audience, script_mode, style, aspect_ratio, video_style, language, whatsapp, video_count, total_tokens
  ) values (
    v_ref, p_user, p_order -> 'product', p_order -> 'audience', p_order ->> 'script_mode',
    nullif(p_order ->> 'style', ''), p_order ->> 'aspect_ratio',
    coalesce(nullif(p_order ->> 'video_style', ''), 'mixed'), p_order ->> 'language',
    nullif(p_order ->> 'whatsapp', ''), v_count, v_total
  ) returning id into v_order;

  for i in 0 .. v_count - 1 loop
    insert into public.order_videos (order_id, user_id, position, duration_s, tokens, script)
    values (v_order, p_user, i + 1, v_duration, v_unit, v_scripts ->> i);
  end loop;

  -- Lève 'insufficient_tokens' si le solde ne suffit pas : tout est annulé.
  v_balance := public._apply_tokens(p_user, -v_total, 'order', v_order, null, null, v_ref);

  return query select v_order, v_ref, v_total, v_balance;
end $$;

revoke all on function public.place_order_for(uuid, jsonb) from public, anon, authenticated;

-- ── Limites anti-abus (serveur uniquement) ─────────────────────────
create table if not exists public.rate_limit_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  action      text not null check (char_length(action) <= 40),
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (user_id, action, created_at desc);

alter table public.rate_limit_events enable row level security;
-- Aucune politique : seul le serveur (service role) y accède.

-- Renvoie true et enregistre l'action si la limite n'est pas atteinte, sinon false.
-- Le verrou rend le test et l'enregistrement atomiques (requêtes simultanées comprises).
create or replace function public.hit_rate_limit(
  p_user uuid,
  p_action text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_action, 0));

  delete from public.rate_limit_events
  where user_id = p_user and action = p_action and created_at < now() - interval '7 days';

  select count(*) into v_count
  from public.rate_limit_events
  where user_id = p_user and action = p_action
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_limit_events (user_id, action) values (p_user, p_action);
  return true;
end $$;

revoke all on function public.hit_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;

-- La limite de rédaction IA passe par hit_rate_limit : script_generations n'est plus utilisée.

-- ── Messagerie : anti-spam ─────────────────────────────────────────
create or replace function public.support_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender = 'user' then
    -- La date vient de la base : impossible d'antidater un message pour contourner la limite.
    new.created_at := now();
    new.read_at := null;

    if (select count(*) from public.support_messages
        where user_id = new.user_id and sender = 'user' and created_at > now() - interval '10 minutes') >= 20
       or (select count(*) from public.support_messages
           where user_id = new.user_id and sender = 'user' and created_at > now() - interval '24 hours') >= 200 then
      raise exception 'rate_limited';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.support_messages_guard() from public, anon, authenticated;

drop trigger if exists support_messages_guard on public.support_messages;
create trigger support_messages_guard
  before insert on public.support_messages
  for each row execute function public.support_messages_guard();

-- ── Photos produits : 100 envois par 24 h et par client ────────────
create or replace function public.product_uploads_last_day()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects
  where bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and created_at > now() - interval '24 hours';
$$;

revoke all on function public.product_uploads_last_day() from public, anon;
grant execute on function public.product_uploads_last_day() to authenticated;

drop policy if exists "product-images: envoi dans son dossier" on storage.objects;
create policy "product-images: envoi dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.product_uploads_last_day() < 100
  );
