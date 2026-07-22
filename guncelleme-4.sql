-- ============================================
-- GÜNCELLEME 4 — Üniversite & Program veritabanı
-- SQL Editor'de bir kez çalıştır (Run)
-- ============================================

create table if not exists public.universities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  city       text default 'İstanbul',
  country    text default 'Türkiye',
  website    text default '',
  currency   text default 'USD',
  created_at timestamptz default now()
);

create table if not exists public.programs (
  id             uuid primary key default gen_random_uuid(),
  university_id  uuid not null references public.universities(id) on delete cascade,
  name           text not null,
  level          text default 'Lisans',      -- Lisans / Önlisans / Yüksek Lisans / Doktora / Dil Kursu
  language       text default 'İngilizce',
  years          int  default 4,
  price          numeric,                    -- liste fiyatı (yıllık)
  discount_price numeric,                    -- indirimli / acenta fiyatı
  deposit        numeric,
  notes          text default '',
  available      boolean default true,
  created_at     timestamptz default now()
);

alter table public.universities enable row level security;
alter table public.programs     enable row level security;

-- Girişli herkes okur (admin + acenta), sadece admin yazar
create policy "unis read"  on public.universities for select using (auth.uid() is not null);
create policy "unis admin" on public.universities for all    using (public.is_admin());
create policy "progs read"  on public.programs for select using (auth.uid() is not null);
create policy "progs admin" on public.programs for all    using (public.is_admin());

-- Partner üniversiteler (başlangıç)
insert into public.universities (name, city, website) values
  ('İstanbul Medipol Üniversitesi','İstanbul','https://www.medipol.edu.tr'),
  ('Kadir Has Üniversitesi','İstanbul','https://www.khas.edu.tr'),
  ('Bahçeşehir Üniversitesi (BAU)','İstanbul','https://www.bau.edu.tr'),
  ('Özyeğin Üniversitesi','İstanbul','https://www.ozyegin.edu.tr'),
  ('İstinye Üniversitesi','İstanbul','https://www.istinye.edu.tr'),
  ('İstanbul Gelişim Üniversitesi','İstanbul','https://www.gelisim.edu.tr'),
  ('İstanbul Bilgi Üniversitesi','İstanbul','https://www.bilgi.edu.tr'),
  ('Bezmiâlem Vakıf Üniversitesi','İstanbul','https://www.bezmialem.edu.tr'),
  ('Acıbadem Üniversitesi','İstanbul','https://www.acibadem.edu.tr')
on conflict (name) do nothing;
