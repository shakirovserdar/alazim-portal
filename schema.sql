-- ============================================================
-- AL AZIM PORTAL — Aşama 1 Veritabanı Şeması
-- Supabase SQL Editor'e yapıştır ve RUN de. (Tek seferlik)
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1. PROFILES (her giriş yapan kullanıcının kimliği) ----------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text default '',
  email      text default '',
  phone      text default '',
  role       text not null default 'pending'
             check (role in ('admin','agency','pending','rejected')),
  agency_id  uuid,
  created_at timestamptz default now()
);

-- Kayıt olan herkese otomatik profil aç (rol: pending → admin onaylar)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- 2. AGENCIES (alt acentalar) ----------
create table public.agencies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  country         text default '',
  city            text default '',
  contact_name    text default '',
  phone           text default '',
  email           text default '',
  commission_rate numeric default 0,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','suspended')),
  owner_id        uuid references public.profiles(id),
  created_at      timestamptz default now()
);

alter table public.profiles
  add constraint profiles_agency_fk
  foreign key (agency_id) references public.agencies(id);

-- ---------- 3. STUDENTS (öğrenciler) ----------
create table public.students (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid references public.agencies(id),  -- null = direkt Al Azim
  first_name    text not null,
  last_name     text not null,
  father_name   text default '',
  mother_name   text default '',
  birth_date    date,
  gender        text default '',
  email         text default '',
  phone         text default '',
  passport_no   text default '',
  citizenship   text default '',
  residence     text default '',
  lang          text default 'tk',   -- öğrenciye gidecek maillerin dili: en/tr/tk/ru
  created_at    timestamptz default now()
);

-- ---------- 4. APPLICATIONS (başvurular + durum) ----------
create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,
  university   text not null,
  program1     text default '',
  program2     text default '',
  program3     text default '',
  level        text default '',     -- lisans / önlisans / yükseklisans / doktora / dil kursu
  edu_lang     text default '',     -- eğitim dili
  semester     text default '',
  status       text not null default 'new'
               check (status in ('new','review','sent_to_uni','accepted',
                                 'deposit_pending','deposit_paid',
                                 'letter_sent','rejected')),
  note         text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ---------- 5. APPLICATION_EVENTS (kim, ne zaman, neyi değiştirdi) ----------
create table public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status     text,
  new_status     text,
  changed_by     uuid references public.profiles(id),
  note           text default '',
  created_at     timestamptz default now()
);

-- Durum her değiştiğinde otomatik geçmişe yaz
create or replace function public.log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.application_events (application_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger on_status_change
before update on public.applications
for each row execute function public.log_status_change();

-- ---------- 6. DOCUMENTS (yüklenen dosyalar) ----------
create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  doc_type       text default '',   -- passport / diploma / transcript / photo / other
  storage_path   text not null,
  created_at     timestamptz default now()
);

-- ============================================================
-- GÜVENLİK (RLS) — para işi, her tablo kilitli
-- ============================================================

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.my_agency()
returns uuid language sql stable security definer set search_path = public as
$$ select agency_id from public.profiles where id = auth.uid() and role = 'agency' $$;

alter table public.profiles           enable row level security;
alter table public.agencies           enable row level security;
alter table public.students           enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.documents          enable row level security;

-- PROFILES: herkes kendi profilini görür; admin hepsini görür/değiştirir
create policy "own profile"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "admin edits"   on public.profiles for update using (public.is_admin());

-- AGENCIES: admin her şeyi yapar; acenta sadece kendi kaydını görür
create policy "admin all agencies"  on public.agencies for all    using (public.is_admin());
create policy "agency sees self"    on public.agencies for select using (id = public.my_agency());

-- STUDENTS: admin hepsi; acenta sadece kendi öğrencileri (görür + ekler + günceller)
create policy "admin all students"    on public.students for all    using (public.is_admin());
create policy "agency own students"   on public.students for select using (agency_id = public.my_agency());
create policy "agency add students"   on public.students for insert with check (agency_id = public.my_agency());
create policy "agency edit students"  on public.students for update using (agency_id = public.my_agency());

-- APPLICATIONS: admin hepsi; acenta sadece kendi öğrencilerinin başvuruları
create policy "admin all apps" on public.applications for all using (public.is_admin());
create policy "agency own apps" on public.applications for select using (
  exists (select 1 from public.students s
          where s.id = student_id and s.agency_id = public.my_agency()));
create policy "agency add apps" on public.applications for insert with check (
  exists (select 1 from public.students s
          where s.id = student_id and s.agency_id = public.my_agency()));

-- EVENTS: admin hepsi; acenta kendi başvurularının geçmişi
create policy "admin all events" on public.application_events for select using (public.is_admin());
create policy "agency own events" on public.application_events for select using (
  exists (select 1 from public.applications a
          join public.students s on s.id = a.student_id
          where a.id = application_id and s.agency_id = public.my_agency()));

-- DOCUMENTS: admin hepsi; acenta kendi öğrencilerinin dosyaları
create policy "admin all docs" on public.documents for all using (public.is_admin());
create policy "agency own docs" on public.documents for select using (
  exists (select 1 from public.students s
          where s.id = student_id and s.agency_id = public.my_agency()));
create policy "agency add docs" on public.documents for insert with check (
  exists (select 1 from public.students s
          where s.id = student_id and s.agency_id = public.my_agency()));
