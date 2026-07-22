-- ============================================
-- GÜNCELLEME 3 — Başvuru numaraları + Not sistemi
-- SQL Editor'de bir kez çalıştır (Run)
-- ============================================

-- 1) Başvuru numarası: ALZ-0001, ALZ-0002 ...
create sequence if not exists public.app_no_seq;

alter table public.applications
  add column if not exists app_no text unique;

create or replace function public.set_app_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.app_no is null then
    new.app_no := 'ALZ-' || lpad(nextval('public.app_no_seq')::text, 4, '0');
  end if;
  return new;
end $$;

drop trigger if exists on_app_no on public.applications;
create trigger on_app_no
before insert on public.applications
for each row execute function public.set_app_no();

-- Mevcut kayıtlara numara ver (eskiden yeniye)
update public.applications
set app_no = 'ALZ-' || lpad(nextval('public.app_no_seq')::text, 4, '0')
where app_no is null;

-- 2) Not sistemi (ekip içi: "diploması eksik, arandı" vb.)
create table if not exists public.notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id      uuid references public.profiles(id),
  body           text not null,
  created_at     timestamptz default now()
);

alter table public.notes enable row level security;

create policy "admin all notes" on public.notes for all using (public.is_admin());
create policy "agency read own notes" on public.notes for select using (
  exists (select 1 from public.applications a
          join public.students s on s.id = a.student_id
          where a.id = application_id and s.agency_id = public.my_agency()));
create policy "agency add own notes" on public.notes for insert with check (
  exists (select 1 from public.applications a
          join public.students s on s.id = a.student_id
          where a.id = application_id and s.agency_id = public.my_agency()));
