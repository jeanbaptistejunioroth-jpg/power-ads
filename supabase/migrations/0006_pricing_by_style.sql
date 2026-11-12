-- ════════════════════════════════════════════════════════════════
-- POWER ADS — Migration 0006 : prix selon la durée ET le style, bonus de bienvenue.
-- À exécuter UNE FOIS, après 0005, dans Supabase > SQL Editor.
--
--  • pricing_rules a une ligne par (durée, style) : talking_head, mixed, broll_voiceover.
--  • place_order_for lit le prix avec la durée ET le style de la commande (défaut « mixed »).
--    Le reste ne change pas : débit atomique, erreurs 'insufficient_tokens' / 'invalid_duration',
--    appel réservé au serveur du site.
--  • Commandes existantes : intactes (le prix de chaque vidéo est déjà enregistré dans order_videos).
--  • Bonus de bienvenue (désactivé tant que WELCOME_BONUS_TOKENS = 0 côté site) : un numéro WhatsApp
--    ne peut appartenir qu'à un compte et ne donne droit au bonus qu'une seule fois.
-- ════════════════════════════════════════════════════════════════

-- ── Grille par durée et par style ────────────────────────────────────
alter table public.pricing_rules
  add column if not exists video_style text not null default 'mixed';

do $$ begin
  alter table public.pricing_rules
    add constraint pricing_rules_video_style_check
    check (video_style in ('mixed', 'talking_head', 'broll_voiceover'));
exception when duplicate_object then null;
end $$;

-- La clé devient (durée, style). Les anciennes lignes deviennent celles du style « mixed ».
alter table public.pricing_rules drop constraint if exists pricing_rules_pkey;
alter table public.pricing_rules add constraint pricing_rules_pkey primary key (duration_s, video_style);

-- Tokens par vidéo (1 token = 0,10 $). Modifiable ensuite dans Table Editor, sans toucher au code.
insert into public.pricing_rules (duration_s, video_style, tokens, active) values
  (15,  'talking_head',     55, true), (15,  'mixed',  80, true), (15,  'broll_voiceover',  95, true),
  (30,  'talking_head',     90, true), (30,  'mixed', 130, true), (30,  'broll_voiceover', 160, true),
  (60,  'talking_head',    160, true), (60,  'mixed', 235, true), (60,  'broll_voiceover', 290, true),
  (90,  'talking_head',    235, true), (90,  'mixed', 340, true), (90,  'broll_voiceover', 415, true),
  (120, 'talking_head',    305, true), (120, 'mixed', 440, true), (120, 'broll_voiceover', 545, true)
on conflict (duration_s, video_style) do update
  set tokens = excluded.tokens, active = true, updated_at = now();

-- ── Commande : prix lu selon la durée ET le style (reprend 0004_security) ──
create or replace function public.place_order_for(p_user uuid, p_order jsonb)
returns table (order_id uuid, order_ref text, total_tokens integer, balance_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duration integer;
  v_style    text := coalesce(nullif(p_order ->> 'video_style', ''), 'mixed');
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

  -- Durée ou style sans prix actif : refusé avec la même erreur qu'avant.
  select pr.tokens into v_unit
  from public.pricing_rules pr
  where pr.duration_s = v_duration and pr.video_style = v_style and pr.active;
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
    v_style, p_order ->> 'language',
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

-- ── Un numéro WhatsApp = un seul compte ─────────────────────────────
-- Si des doublons existent déjà, l'index n'est pas créé (aucune donnée n'est modifiée) :
-- un avertissement s'affiche ; corriger les doublons puis relancer ce bloc.
do $$ begin
  if exists (select whatsapp from public.profiles where whatsapp is not null group by whatsapp having count(*) > 1) then
    raise warning 'profiles.whatsapp : numéros en double, index unique NON créé. Corrigez-les puis relancez ce bloc.';
  else
    create unique index if not exists profiles_whatsapp_unique on public.profiles (whatsapp) where whatsapp is not null;
  end if;
end $$;

-- ── Bonus de bienvenue ───────────────────────────────────────────────
-- Empreintes (SHA-256) des numéros déjà récompensés : conservées même si le compte est supprimé,
-- pour qu'un même numéro ne rapporte pas de bonus deux fois. Le numéro lui-même n'est pas gardé.
create table if not exists public.welcome_bonus_claims (
  phone_hash  text primary key,
  claimed_at  timestamptz not null default now()
);
alter table public.welcome_bonus_claims enable row level security;
-- Aucune politique : seul le serveur y accède.

-- Crédite une seule fois p_amount tokens (kind 'bonus', external_ref 'welcome:<user_id>')
-- si le compte a un numéro WhatsApp qu'aucun autre compte n'utilise et jamais récompensé.
create or replace function public.grant_welcome_bonus(p_user uuid, p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_hash  text;
  v_rows  integer;
begin
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;

  select whatsapp into v_phone from public.profiles where id = p_user for update;
  if v_phone is null then
    return false;
  end if;
  if exists (select 1 from public.profiles where whatsapp = v_phone and id <> p_user) then
    return false;
  end if;
  if exists (select 1 from public.token_transactions where external_ref = 'welcome:' || p_user::text) then
    return false;
  end if;

  v_hash := encode(sha256(convert_to(v_phone, 'UTF8')), 'hex');
  insert into public.welcome_bonus_claims (phone_hash) values (v_hash) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;  -- numéro déjà récompensé sur un autre compte
  end if;

  perform public.credit_tokens(p_user, p_amount, 'bonus', 'welcome:' || p_user::text, 'Bonus de bienvenue');
  return true;
end $$;

revoke all on function public.grant_welcome_bonus(uuid, integer) from public, anon, authenticated;
