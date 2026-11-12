-- ════════════════════════════════════════════════════════════════
-- POWER ADS — Migration 0005 : photo de profil et 8 langues.
-- À exécuter UNE FOIS, après 0004, dans Supabase > SQL Editor.
--
--  • profiles.avatar_url : écrite uniquement par le serveur du site
--    (le navigateur ne peut pas y mettre une adresse arbitraire).
--  • Bucket public « avatars » : 2 Mo max, chaque client dans son dossier,
--    20 envois par 24 h.
--  • Langues du compte : fr, en, es, pt, ar, de, it, zh (langue des e-mails
--    et du message de bienvenue).
-- ════════════════════════════════════════════════════════════════

-- ── Photo de profil ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text
    check (avatar_url is null or (avatar_url ~ '^https?://' and char_length(avatar_url) <= 1000));
-- Pas de GRANT UPDATE (avatar_url) : seule la clé serveur l'écrit, après vérification.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.avatar_uploads_last_day()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and created_at > now() - interval '24 hours';
$$;

revoke all on function public.avatar_uploads_last_day() from public, anon;
grant execute on function public.avatar_uploads_last_day() to authenticated;

drop policy if exists "avatars: envoi dans son dossier" on storage.objects;
create policy "avatars: envoi dans son dossier"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.avatar_uploads_last_day() < 20
  );

drop policy if exists "avatars: suppression de ses fichiers" on storage.objects;
create policy "avatars: suppression de ses fichiers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── 8 langues ────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
  add constraint profiles_locale_check
  check (locale in ('fr', 'en', 'es', 'pt', 'ar', 'de', 'it', 'zh'));

-- Profil + message de bienvenue dans la langue du visiteur (remplace la version de 0001).
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
      when 'en' then 'Welcome to POWER ADS! This is your direct line to our team. Ask us anything about orders, payments or your videos, and we''ll reply here.'
      when 'es' then '¡Bienvenido a POWER ADS! Aquí escribe directamente a nuestro equipo. Pregúntenos lo que quiera sobre sus pedidos, pagos o videos: le responderemos en esta conversación.'
      when 'pt' then 'Bem-vindo à POWER ADS! Aqui você fala diretamente com a nossa equipe. Pergunte o que quiser sobre pedidos, pagamentos ou vídeos: respondemos nesta conversa.'
      when 'ar' then 'مرحبًا بك في POWER ADS! هنا تتواصل مباشرةً مع فريقنا. اسألنا عن طلباتك أو مدفوعاتك أو مقاطع الفيديو الخاصة بك، وسنرد عليك في هذه المحادثة.'
      when 'de' then 'Willkommen bei POWER ADS! Hier schreiben Sie direkt an unser Team. Fragen Sie uns alles zu Bestellungen, Zahlungen oder Ihren Videos – wir antworten Ihnen in diesem Chat.'
      when 'it' then 'Benvenuto su POWER ADS! Qui scrivi direttamente al nostro team. Chiedici qualsiasi cosa su ordini, pagamenti o video: ti risponderemo in questa conversazione.'
      when 'zh' then '欢迎使用 POWER ADS！您可以在这里直接联系我们的团队。关于订单、付款或视频的任何问题都可以问我们，我们会在此对话中回复您。'
      else 'Bienvenue sur POWER ADS ! Ici, vous écrivez directement à notre équipe. Posez vos questions sur vos commandes, paiements ou vidéos : nous vous répondons dans cette conversation.'
    end
  );
  return new;
end $$;
