-- ════════════════════════════════════════════════════════════════
-- VIDSELLA — Migration 0007 : passage au nom VIDSELLA.
-- À exécuter UNE FOIS, après 0006, dans Supabase > SQL Editor.
--
--  • Numéros de commande : les nouvelles commandes commencent par « VS- » au lieu de « PA- ».
--    place_order_for est reprise à l'identique de 0006_pricing_by_style.sql : seul le préfixe change.
--    (place_order n'existe plus depuis 0004 : c'est place_order_for, appelée par le serveur du site,
--    qui crée les commandes.) Les commandes existantes gardent leur numéro « PA-… ».
--  • Message de bienvenue du service client : « Bienvenue sur VIDSELLA ! » (8 langues).
--    handle_new_user est reprise à l'identique de 0005_profile_i18n.sql : seul le nom change.
--    Les messages déjà envoyés ne sont pas modifiés.
-- ════════════════════════════════════════════════════════════════

-- ── Commande : préfixe « VS- » (reprend 0006_pricing_by_style) ─────────
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
  v_ref := 'VS-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-'
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

-- ── Message de bienvenue (reprend 0005_profile_i18n) ─────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale text := case
    when new.raw_user_meta_data ->> 'locale' in ('fr', 'en', 'es', 'pt', 'ar', 'de', 'it', 'zh')
      then new.raw_user_meta_data ->> 'locale'
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
    case v_locale
      when 'en' then 'Welcome to VIDSELLA! This is your direct line to our team. Ask us anything about orders, payments or your videos, and we''ll reply here.'
      when 'es' then '¡Bienvenido a VIDSELLA! Aquí escribe directamente a nuestro equipo. Pregúntenos lo que quiera sobre sus pedidos, pagos o videos: le responderemos en esta conversación.'
      when 'pt' then 'Bem-vindo à VIDSELLA! Aqui você fala diretamente com a nossa equipe. Pergunte o que quiser sobre pedidos, pagamentos ou vídeos: respondemos nesta conversa.'
      when 'ar' then 'مرحبًا بك في VIDSELLA! هنا تتواصل مباشرةً مع فريقنا. اسألنا عن طلباتك أو مدفوعاتك أو مقاطع الفيديو الخاصة بك، وسنرد عليك في هذه المحادثة.'
      when 'de' then 'Willkommen bei VIDSELLA! Hier schreiben Sie direkt an unser Team. Fragen Sie uns alles zu Bestellungen, Zahlungen oder Ihren Videos – wir antworten Ihnen in diesem Chat.'
      when 'it' then 'Benvenuto su VIDSELLA! Qui scrivi direttamente al nostro team. Chiedici qualsiasi cosa su ordini, pagamenti o video: ti risponderemo in questa conversazione.'
      when 'zh' then '欢迎使用 VIDSELLA！您可以在这里直接联系我们的团队。关于订单、付款或视频的任何问题都可以问我们，我们会在此对话中回复您。'
      else 'Bienvenue sur VIDSELLA ! Ici, vous écrivez directement à notre équipe. Posez vos questions sur vos commandes, paiements ou vidéos : nous vous répondons dans cette conversation.'
    end
  );
  return new;
end $$;
