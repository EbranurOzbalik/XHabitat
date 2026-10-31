-- XHabitat Supabase schema
-- Run this file once in Supabase Dashboard > SQL Editor.

create table if not exists public.xh_workspaces (
  id text primary key,
  active_facility_id text,
  is_demo boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.xh_facilities (
  workspace_id text not null references public.xh_workspaces(id) on delete cascade,
  id text not null,
  name text not null,
  line text not null,
  electric_factor numeric not null,
  coal_factor numeric not null,
  target_intensity numeric not null,
  electricity_price numeric not null,
  primary key (workspace_id, id)
);

create table if not exists public.xh_production_records (
  workspace_id text not null,
  facility_id text not null,
  production_date date not null,
  production_ton numeric not null check (production_ton > 0),
  electricity_kwh numeric not null check (electricity_kwh >= 0),
  coal_ton numeric not null check (coal_ton >= 0),
  operating_hours numeric not null check (operating_hours > 0 and operating_hours <= 24),
  primary key (workspace_id, facility_id, production_date),
  foreign key (workspace_id, facility_id)
    references public.xh_facilities(workspace_id, id) on delete cascade
);

alter table public.xh_workspaces enable row level security;
alter table public.xh_facilities enable row level security;
alter table public.xh_production_records enable row level security;

create or replace function public.xh_get_state(p_workspace_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_row public.xh_workspaces%rowtype;
  facilities_json jsonb;
  records_json jsonb;
begin
  select * into workspace_row from public.xh_workspaces where id = p_workspace_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'line', f.line,
    'factors', jsonb_build_object('electricFactor', f.electric_factor, 'coalFactor', f.coal_factor),
    'goal', jsonb_build_object('targetIntensity', f.target_intensity, 'electricityPrice', f.electricity_price)
  ) order by f.name, f.line), '[]'::jsonb)
  into facilities_json
  from public.xh_facilities f where f.workspace_id = p_workspace_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'facilityId', r.facility_id,
    'date', to_char(r.production_date, 'YYYY-MM-DD'),
    'production', r.production_ton,
    'electricity', r.electricity_kwh,
    'coal', r.coal_ton,
    'hours', r.operating_hours
  ) order by r.production_date), '[]'::jsonb)
  into records_json
  from public.xh_production_records r where r.workspace_id = p_workspace_id;

  return jsonb_build_object(
    'demo', workspace_row.is_demo,
    'activeFacilityId', workspace_row.active_facility_id,
    'facilities', facilities_json,
    'records', records_json
  );
end;
$$;

create or replace function public.xh_save_state(p_workspace_id text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  facility jsonb;
  production_record jsonb;
begin
  if jsonb_typeof(p_state->'facilities') <> 'array' or jsonb_array_length(p_state->'facilities') = 0 then
    raise exception 'At least one facility is required';
  end if;
  if jsonb_typeof(p_state->'records') <> 'array' then
    raise exception 'Records must be an array';
  end if;

  insert into public.xh_workspaces (id, active_facility_id, is_demo, updated_at)
  values (p_workspace_id, p_state->>'activeFacilityId', coalesce((p_state->>'demo')::boolean, false), now())
  on conflict (id) do update set
    active_facility_id = excluded.active_facility_id,
    is_demo = excluded.is_demo,
    updated_at = now();

  delete from public.xh_production_records where workspace_id = p_workspace_id;
  delete from public.xh_facilities where workspace_id = p_workspace_id;

  for facility in select value from jsonb_array_elements(p_state->'facilities') loop
    insert into public.xh_facilities (
      workspace_id, id, name, line, electric_factor, coal_factor, target_intensity, electricity_price
    ) values (
      p_workspace_id,
      facility->>'id',
      facility->>'name',
      facility->>'line',
      (facility->'factors'->>'electricFactor')::numeric,
      (facility->'factors'->>'coalFactor')::numeric,
      (facility->'goal'->>'targetIntensity')::numeric,
      (facility->'goal'->>'electricityPrice')::numeric
    );
  end loop;

  for production_record in select value from jsonb_array_elements(p_state->'records') loop
    insert into public.xh_production_records (
      workspace_id, facility_id, production_date, production_ton,
      electricity_kwh, coal_ton, operating_hours
    ) values (
      p_workspace_id,
      production_record->>'facilityId',
      (production_record->>'date')::date,
      (production_record->>'production')::numeric,
      (production_record->>'electricity')::numeric,
      (production_record->>'coal')::numeric,
      (production_record->>'hours')::numeric
    );
  end loop;
end;
$$;

revoke all on function public.xh_get_state(text) from public, anon, authenticated;
revoke all on function public.xh_save_state(text, jsonb) from public, anon, authenticated;
grant execute on function public.xh_get_state(text) to service_role;
grant execute on function public.xh_save_state(text, jsonb) to service_role;

