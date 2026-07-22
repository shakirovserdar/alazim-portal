-- ============================================
-- GÜNCELLEME 1 — Acenta kayıt sayfası alanları
-- Supabase SQL Editor'de bir kez çalıştır (Run)
-- ============================================

alter table public.profiles
  add column if not exists company text default '',
  add column if not exists country text default '',
  add column if not exists city    text default '';

-- Kayıt tetikleyicisini güncelle: firma/ülke/şehir de profile yazılsın
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone, company, country, city)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'phone',''),
          coalesce(new.raw_user_meta_data->>'company',''),
          coalesce(new.raw_user_meta_data->>'country',''),
          coalesce(new.raw_user_meta_data->>'city',''));
  return new;
end $$;
