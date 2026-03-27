-- Supabase Security Lockdown Patch
-- Tarih: 2026-03-28
-- Hedef:
-- 1) public schema'daki tum tablolar icin RLS'i zorunlu hale getirmek
-- 2) anon/authenticated rollerinin tablo erisimini kapatmak
-- 3) acik policy'leri temizleyip varsayilan "deny-all" moduna almak
--
-- Not:
-- - Uygulama Prisma + sunucu tarafi baglanti (service role / postgres) ile calisiyorsa
--   bu patch canli uygulamayi bozmaz, yalnizca Supabase REST public erisimini kapatir.
-- - SQL Editor'da tek sefer calistirin.

begin;

-- 0) Emniyet: public schema'da yeni nesne olusturma yetkisini kapat
revoke create on schema public from public;

-- 1) API tarafinda anon/authenticated rollerini schema seviyesinde kisitla
revoke usage on schema public from anon, authenticated;

-- 2) public schema'daki tum policy'leri temizle (acik policy kalmasin)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  end loop;
end $$;

-- 3) Tum tablolarda RLS + FORCE RLS aktif et, anon/authenticated tum yetkileri kaldir
do $$
declare t record;
begin
  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke all privileges on table %I.%I from anon, authenticated',
      t.schemaname,
      t.tablename
    );
    execute format(
      'alter table %I.%I enable row level security',
      t.schemaname,
      t.tablename
    );
    execute format(
      'alter table %I.%I force row level security',
      t.schemaname,
      t.tablename
    );
  end loop;
end $$;

-- 4) Sequence ve function erisimlerini de kapat
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- 5) Gelecekte olusacak nesneler icin default ACL kilidi
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

commit;

-- 6) Dogrulama sorgulari (opsiyonel)
-- Tum tablolar RLS/FORCE RLS durumunu gosterir:
-- select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;

-- Kalan policy var mi kontrol:
-- select schemaname, tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

