-- Cotoka Relax & Beauty SPA schema
create extension if not exists pgcrypto;

do $$ begin
  create type reservation_status as enum (
    'pending',
    'unpaid',
    'processing',
    'paid',
    'confirmed',
    'canceled',
    'no_show',
    'refunded'
  );
exception when duplicate_object then null; end $$;

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_min integer not null check (duration_min > 0),
  buffer_before_min integer not null default 0,
  buffer_after_min integer not null default 0,
  price_jpy integer not null check (price_jpy >= 0),
  requires_prepayment boolean not null default true,
  currency text not null default 'JPY',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  phone text,
  color text default '#64748B',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null default 1,
  active boolean not null default true
);

create table if not exists staff_services (
  staff_id uuid references staff(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table if not exists opening_hours (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),
  open_at time not null,
  close_at time not null,
  is_open boolean not null default true
);

create table if not exists date_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  open_at time,
  close_at time,
  is_open boolean not null default false,
  note text
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  note text
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  service_id uuid not null references services(id),
  staff_id uuid references staff(id),
  room_id uuid references rooms(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status reservation_status not null default 'pending',
  stripe_payment_intent text,
  stripe_checkout_session text,
  amount_total_jpy integer not null,
  locale text default 'ja',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add payment option column (store/prepay)
alter table if exists reservations add column if not exists payment_option text check (payment_option in ('pay_in_store','prepay'));

create unique index if not exists uniq_staff_time on reservations (staff_id, start_at, end_at)
  where staff_id is not null and status <> 'canceled';

create unique index if not exists uniq_room_time on reservations (room_id, start_at, end_at)
  where room_id is not null and status <> 'canceled';

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  percent_off numeric(5, 2),
  amount_off_jpy integer,
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz
);

create table if not exists events (
  id bigserial primary key,
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table if exists opening_hours
  add constraint if not exists opening_hours_weekday_key unique (weekday);

-- Seed data
insert into services (name, description, duration_min, buffer_before_min, buffer_after_min, price_jpy, requires_prepayment)
values
  ('Relax 60min', 'やさしく丁寧な全身ケア', 60, 10, 10, 9900, true),
  ('Lymphatic 90min', 'リンパ中心のケア', 90, 15, 15, 14900, true)
on conflict (name) do nothing;

insert into staff (display_name, email, color) values
  ('Akane', 'akane@example.com', '#F59E0B'),
  ('Sho', 'sho@example.com', '#10B981')
on conflict (email) do nothing;

insert into rooms (name, capacity) values
  ('Booth A', 1),
  ('Booth B', 1)
on conflict (name) do nothing;

insert into staff_services (staff_id, service_id)
select s.id, v.id from staff s cross join services v
on conflict do nothing;

insert into opening_hours (weekday, open_at, close_at, is_open)
select g, time '10:00', time '20:00', true
from generate_series(0, 6) as g
on conflict (weekday) do nothing;


-- RLS helpers and policies
create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::json->>'role', 'anon');
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') = 'service_role';
$$;

alter table if exists services enable row level security;
alter table if exists staff enable row level security;
alter table if exists rooms enable row level security;
alter table if exists staff_services enable row level security;
alter table if exists opening_hours enable row level security;
alter table if exists date_overrides enable row level security;
alter table if exists shifts enable row level security;
alter table if exists reservations enable row level security;
alter table if exists events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'Public can read active services'
  ) then
    create policy "Public can read active services" on public.services
      for select
      using (active = true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'Admin manage services'
  ) then
    create policy "Admin manage services" on public.services
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'staff' and policyname = 'Admin manage staff'
  ) then
    create policy "Admin manage staff" on public.staff
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rooms' and policyname = 'Admin manage rooms'
  ) then
    create policy "Admin manage rooms" on public.rooms
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_services' and policyname = 'Admin manage staff services'
  ) then
    create policy "Admin manage staff services" on public.staff_services
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'opening_hours' and policyname = 'Admin manage opening hours'
  ) then
    create policy "Admin manage opening hours" on public.opening_hours
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'date_overrides' and policyname = 'Admin manage overrides'
  ) then
    create policy "Admin manage overrides" on public.date_overrides
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'shifts' and policyname = 'Admin manage shifts'
  ) then
    create policy "Admin manage shifts" on public.shifts
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'events' and policyname = 'Admin manage events'
  ) then
    create policy "Admin manage events" on public.events
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reservations' and policyname = 'Admin manage reservations'
  ) then
    create policy "Admin manage reservations" on public.reservations
      for all
      using (public.auth_role() = 'admin' or public.is_service_role())
      with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'reservations' and policyname = 'Public insert pending reservations'
  ) then
    create policy "Public insert pending reservations" on public.reservations
      for insert
      with check (
        public.auth_role() in ('anon', 'authenticated')
        and status = 'pending'
        and (customer_email is not null or customer_phone is not null)
        and stripe_checkout_session is null
        and stripe_payment_intent is null
      );
  end if;
end $$;

create or replace function public.lookup_reservation(p_code text, p_contact text)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_contact text := nullif(trim(p_contact), '');
begin
  if p_code is null or normalized_contact is null then
    raise exception 'code and contact are required' using errcode = '22004';
  end if;

  return (
    select r from public.reservations r
    where r.code = p_code
      and (
        (r.customer_email is not null and lower(r.customer_email) = lower(normalized_contact))
        or (r.customer_phone is not null and regexp_replace(r.customer_phone, '[^0-9]', '', 'g') = regexp_replace(normalized_contact, '[^0-9]', '', 'g'))
      )
    order by r.created_at desc
    limit 1
  );
end;
$$;

create or replace function public.admin_reservations_between(p_from timestamptz, p_to timestamptz)
returns setof public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  role_text text := public.auth_role();
begin
  if role_text <> 'admin' and not public.is_service_role() then
    raise exception 'admin privileges required' using errcode = '42501';
  end if;

  return query
  select r
  from public.reservations r
  where r.start_at >= coalesce(p_from, now() - interval '1 day')
    and r.start_at < coalesce(p_to, now() + interval '30 day')
  order by r.start_at;
end;
$$;


create table if not exists reservation_notifications (
  id bigserial primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  kind text not null check (kind in ('created','24h','2h')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  unique (reservation_id, kind)
);

