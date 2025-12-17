-- Enum: treatment_reward_status
do $$ begin
  create type treatment_reward_status as enum ('draft', 'approved', 'paid');
exception when duplicate_object then null; end $$;

-- Alter: treatment_rewards
alter table treatment_rewards 
  add column if not exists status treatment_reward_status not null default 'draft',
  add column if not exists paid_at timestamptz,
  add column if not exists calc_source jsonb,
  add column if not exists note text;

-- Table: commission_rules
create table if not exists commission_rules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  rate_type text not null check (rate_type in ('percentage', 'fixed')),
  rate_value numeric not null check (rate_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Alter: attendance_records (for break time calculation)
alter table attendance_records
  add column if not exists last_break_start_at timestamptz;

-- RLS: commission_rules
alter table commission_rules enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'commission_rules' and policyname = 'Admin manage commission rules') then
    create policy "Admin manage commission rules" on commission_rules
      for all using (public.auth_role() = 'admin' or public.is_service_role());
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'commission_rules' and policyname = 'Staff read own rules') then
    create policy "Staff read own rules" on commission_rules
      for select using (staff_id in (select id from staff where user_id = auth.uid()));
  end if;
  
  -- RLS: treatment_rewards update (for draft)
  if not exists (select 1 from pg_policies where tablename = 'treatment_rewards' and policyname = 'Contractors update own draft rewards') then
    create policy "Contractors update own draft rewards" on treatment_rewards
      for update using (
        staff_id in (select id from staff where user_id = auth.uid()) 
        and status = 'draft'
      );
  end if;
end $$;
