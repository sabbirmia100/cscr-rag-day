create extension if not exists pgcrypto;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll text not null,
  section text not null,
  department text not null,
  email text not null unique,
  phone text,
  payment_method text not null check (payment_method in ('Bkash', 'Nagad')),
  tshirt_size text not null check (tshirt_size in ('M', 'L', 'XL', 'XXL')),
  transaction_id text not null unique,
  payment_time timestamptz not null,
  screenshot text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_registrations_updated_at on public.registrations;
create trigger trg_registrations_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();
