-- POWER ADS · 0003 · Style de la vidéo
-- Le client choisit le style : face caméra + plans produit (mixed), face caméra uniquement
-- (talking_head) ou voix off sur plans produit (broll_voiceover). Le moteur en déduit le montage.
-- À exécuter après 0002, dans Supabase › SQL Editor.

alter table public.orders
  add column if not exists video_style text not null default 'mixed';

do $$ begin
  alter table public.orders
    add constraint orders_video_style_check
    check (video_style in ('mixed', 'talking_head', 'broll_voiceover'));
exception when duplicate_object then null;
end $$;

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
    ref, user_id, product, audience, script_mode, style, aspect_ratio, video_style, language, whatsapp, video_count, total_tokens
  ) values (
    v_ref, v_user, p_order -> 'product', p_order -> 'audience', p_order ->> 'script_mode',
    nullif(p_order ->> 'style', ''), p_order ->> 'aspect_ratio',
    coalesce(nullif(p_order ->> 'video_style', ''), 'mixed'), p_order ->> 'language',
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
