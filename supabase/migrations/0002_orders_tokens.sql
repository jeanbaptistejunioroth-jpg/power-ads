-- ════════════════════════════════════════════════════════════════
-- POWER ADS — Migration 0002 : grand livre des tokens, grille tarifaire,
-- commandes et vidéos, photos produits.
-- À exécuter UNE FOIS, après 0001, dans Supabase > SQL Editor.
--
-- Principes :
--  • Le solde (profiles.token_balance) ne bouge QUE via _apply_tokens(),
--    qui verrouille la ligne du profil et trace chaque mouvement.
--  • Le prix d'une commande est recalculé ICI depuis pricing_rules :
--    le navigateur n'envoie jamais de montant.
--  • Les tokens sont déduits à la commande ; une vidéo en échec est
--    recréditée automatiquement (une seule fois).
-- ════════════════════════════════════════════════════════════════

-- ── Profil : numéro WhatsApp et rôle admin ─────────────────────────
alter table public.profiles
  add column if not exists whatsapp text
    check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  add column if not exists is_admin boolean not null default false;

-- Le client peut modifier son nom, sa langue et son WhatsApp. Jamais is_admin ni le solde.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, locale, whatsapp) on public.profiles to authenticated;

-- ── Grille tarifaire (tokens par vidéo, selon la durée) ───────────
create table if not exists public.pricing_rules (
  duration_s  integer primary key check (duration_s in (15, 30, 60, 90, 120)),
  tokens      integer not null check (tokens > 0),
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.pricing_rules enable row level security;

create policy "pricing: lecture publique"
  on public.pricing_rules for select
  using (true);

-- Valeurs de départ (gamme MiniMax H3 Max 1080p + Nano Banana 2.1, marge × 2,5).
-- Modifiables à tout moment dans Table Editor, sans toucher au code.
insert into public.pricing_rules (duration_s, tokens) values
  (15, 100), (30, 170), (60, 310), (90, 450), (120, 600)
on conflict (duration_s) do nothing;

create trigger pricing_rules_touch before update on public.pricing_rules
  for each row execute function public.touch_updated_at();

-- ── Commandes ──────────────────────────────────────────────────────
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique,
  user_id            uuid not null references auth.users (id) on delete cascade,
  status             text not null default 'pending'
                       check (status in ('pending', 'sent', 'in_production', 'completed', 'partial', 'failed')),
  product            jsonb not null check (jsonb_typeof(product) = 'object' and pg_column_size(product) < 32000),
  audience           jsonb not null check (jsonb_typeof(audience) = 'object' and pg_column_size(audience) < 8000),
  script_mode        text not null check (script_mode in ('client', 'ai')),
  style              text check (char_length(style) <= 600),
  aspect_ratio       text not null check (aspect_ratio in ('9:16', '1:1', '16:9')),
  language           text not null check (language in ('fr', 'en')),
  whatsapp           text check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  video_count        integer not null check (video_count between 1 and 10),
  total_tokens       integer not null check (total_tokens > 0),
  engine_sent_at     timestamptz,
  engine_attempts    integer not null default 0,
  last_engine_error  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_pending_idx on public.orders (status) where status = 'pending';

alter table public.orders enable row level security;

create policy "orders: lecture de ses commandes"
  on public.orders for select
  using ((select auth.uid()) = user_id);
-- Aucune écriture directe : création via place_order(), mises à jour par le serveur (service role).

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ── Vidéos d'une commande ──────────────────────────────────────────
create table if not exists public.order_videos (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  position      integer not null check (position between 1 and 10),
  duration_s    integer not null check (duration_s in (15, 30, 60, 90, 120)),
  tokens        integer not null check (tokens > 0),
  script        text not null check (char_length(script) between 20 and 4000),
  status        text not null default 'pending'
                  check (status in ('pending', 'in_production', 'delivered', 'failed')),
  refunded      boolean not null default false,
  drive_url     text,
  error         text,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (order_id, position)
);

create index if not exists order_videos_order_idx on public.order_videos (order_id);

alter table public.order_videos enable row level security;

create policy "videos: lecture de ses vidéos"
  on public.order_videos for select
  using ((select auth.uid()) = user_id);

create trigger order_videos_touch before update on public.order_videos
  for each row execute function public.touch_updated_at();

-- ── Grand livre des tokens ─────────────────────────────────────────
-- amount > 0 : crédit (achat, remboursement, bonus) ; amount < 0 : débit (commande).
create table if not exists public.token_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('purchase', 'order', 'refund', 'adjustment', 'bonus')),
  amount         integer not null check (amount <> 0),
  balance_after  integer not null check (balance_after >= 0),
  order_id       uuid references public.orders (id) on delete set null,
  video_id       uuid references public.order_videos (id) on delete set null,
  external_ref   text unique,  -- identifiant du paiement chez le prestataire (anti-doublon)
  note           text check (char_length(note) <= 500),
  created_at     timestamptz not null default now()
);

create index if not exists token_tx_user_created_idx on public.token_transactions (user_id, created_at desc);

alter table public.token_transactions enable row level security;

create policy "tokens: lecture de son historique"
  on public.token_transactions for select
  using ((select auth.uid()) = user_id);

-- ── Limite de génération de scripts (anti-abus) ────────────────────
create table if not exists public.script_generations (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists script_generations_user_idx on public.script_generations (user_id, created_at desc);
alter table public.script_generations enable row level security;
-- Aucune politique : seul le serveur (service role) lit et écrit.

-- ════════════════════════════════════════════════════════════════
-- Fonctions
-- ════════════════════════════════════════════════════════════════

-- Mouvement de tokens atomique. Interne : jamais appelable depuis le navigateur.
create or replace function public._apply_tokens(
  p_user uuid,
  p_amount integer,
  p_kind text,
  p_order uuid,
  p_video uuid,
  p_external_ref text,
  p_note text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount = 0 then
    raise exception 'amount_zero';
  end if;

  -- Verrou sur la ligne : deux commandes simultanées passent l'une après l'autre.
  select token_balance into v_balance
  from public.profiles
  where id = p_user
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_balance + p_amount < 0 then
    raise exception 'insufficient_tokens';
  end if;

  update public.profiles set token_balance = v_balance + p_amount where id = p_user;

  insert into public.token_transactions (user_id, kind, amount, balance_after, order_id, video_id, external_ref, note)
  values (p_user, p_kind, p_amount, v_balance + p_amount, p_order, p_video, p_external_ref, left(p_note, 500));

  return v_balance + p_amount;
end $$;

revoke all on function public._apply_tokens(uuid, integer, text, uuid, uuid, text, text) from public, anon, authenticated;

-- Crédit de tokens (paiement confirmé, recharge manuelle, bonus). Serveur uniquement.
-- p_external_ref rend l'appel idempotent : un webhook reçu deux fois ne crédite qu'une fois.
create or replace function public.credit_tokens(
  p_user uuid,
  p_amount integer,
  p_kind text default 'purchase',
  p_external_ref text default null,
  p_note text default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;
  if p_kind not in ('purchase', 'adjustment', 'bonus') then
    raise exception 'invalid_kind';
  end if;

  if p_external_ref is not null
     and exists (select 1 from public.token_transactions where external_ref = p_external_ref) then
    return (select token_balance from public.profiles where id = p_user);
  end if;

  return public._apply_tokens(p_user, p_amount, p_kind, null, null, p_external_ref, p_note);
end $$;

revoke all on function public.credit_tokens(uuid, integer, text, text, text) from public, anon, authenticated;

-- Passage de commande par le client connecté.
-- Recalcule le prix, crée la commande et ses vidéos, débite les tokens — tout ou rien.
create or replace function public.place_order(p_order jsonb)
returns table (order_id uuid, order_ref text, total_tokens integer, balance_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
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
  if v_user is null then
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
    ref, user_id, product, audience, script_mode, style, aspect_ratio, language, whatsapp, video_count, total_tokens
  ) values (
    v_ref, v_user, p_order -> 'product', p_order -> 'audience', p_order ->> 'script_mode',
    nullif(p_order ->> 'style', ''), p_order ->> 'aspect_ratio', p_order ->> 'language',
    nullif(p_order ->> 'whatsapp', ''), v_count, v_total
  ) returning id into v_order;

  for i in 0 .. v_count - 1 loop
    insert into public.order_videos (order_id, user_id, position, duration_s, tokens, script)
    values (v_order, v_user, i + 1, v_duration, v_unit, v_scripts ->> i);
  end loop;

  -- Lève 'insufficient_tokens' si le solde ne suffit pas : tout est annulé.
  v_balance := public._apply_tokens(v_user, -v_total, 'order', v_order, null, null, v_ref);

  return query select v_order, v_ref, v_total, v_balance;
end $$;

revoke all on function public.place_order(jsonb) from public, anon;
grant execute on function public.place_order(jsonb) to authenticated;

-- Mise à jour d'une vidéo par le moteur (via le serveur du site). Idempotente.
-- Une vidéo en échec est recréditée une seule fois ; le statut de la commande est recalculé.
create or replace function public.engine_update_video(
  p_video uuid,
  p_status text,
  p_drive_url text default null,
  p_error text default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v          public.order_videos%rowtype;
  v_total    integer;
  v_done     integer;
  v_failed   integer;
  v_status   text;
begin
  if p_status not in ('in_production', 'delivered', 'failed') then
    raise exception 'invalid_status';
  end if;

  select * into v from public.order_videos where id = p_video for update;
  if not found then
    raise exception 'video_not_found';
  end if;

  -- Déjà terminée : on ignore les doublons (callback reçu deux fois).
  if v.status in ('delivered', 'failed') then
    return (select o.status from public.orders o where o.id = v.order_id);
  end if;

  update public.order_videos set
    status       = p_status,
    drive_url    = coalesce(p_drive_url, drive_url),
    error        = case when p_status = 'failed' then left(p_error, 1000) else error end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = p_video;

  if p_status = 'failed' and not v.refunded then
    perform public._apply_tokens(v.user_id, v.tokens, 'refund', v.order_id, v.id, null, coalesce(p_error, 'échec de production'));
    update public.order_videos set refunded = true where id = p_video;
  end if;

  select count(*),
         count(*) filter (where ov.status = 'delivered'),
         count(*) filter (where ov.status = 'failed')
    into v_total, v_done, v_failed
  from public.order_videos ov
  where ov.order_id = v.order_id;

  v_status := case
    when v_done = v_total then 'completed'
    when v_failed = v_total then 'failed'
    when v_done + v_failed = v_total then 'partial'
    else 'in_production'
  end;

  update public.orders set status = v_status where id = v.order_id;
  return v_status;
end $$;

revoke all on function public.engine_update_video(uuid, text, text, text) from public, anon, authenticated;

-- Échec d'une commande entière (moteur injoignable trop longtemps, commande refusée) :
-- toutes les vidéos non terminées passent en échec et sont recréditées.
create or replace function public.fail_order(p_order uuid, p_error text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid;
  v_status text;
begin
  for v_id in
    select ov.id from public.order_videos ov
    where ov.order_id = p_order and ov.status not in ('delivered', 'failed')
    order by ov.position
  loop
    v_status := public.engine_update_video(v_id, 'failed', null, p_error);
  end loop;
  return coalesce(v_status, (select o.status from public.orders o where o.id = p_order));
end $$;

revoke all on function public.fail_order(uuid, text) from public, anon, authenticated;

-- ── Temps réel : le client voit ses vidéos avancer sans recharger ──
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_videos;

-- ── Photos produits (Supabase Storage) ─────────────────────────────
-- Bucket public en lecture (le moteur doit pouvoir télécharger les photos),
-- écriture limitée au dossier du client : product-images/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product-images: envoi dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "product-images: suppression de ses fichiers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
