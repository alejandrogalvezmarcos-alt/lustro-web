-- Clínica Lustro · base de datos de reservas para Supabase (PostgreSQL).
-- Ejecutar completo en el editor SQL de un proyecto NUEVO, en una región de la UE.
-- Estado: no probado todavía contra un proyecto real. Revisar y probar antes de usar datos reales.

create extension if not exists pgcrypto;

create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique references auth.users(id) on delete set null,
  role        text not null default 'paciente' check (role in ('admin','paciente')),
  name        text not null check (char_length(name) between 2 and 120),
  email       text not null,
  phone       text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (lower(email));

create table public.areas (id text primary key);
insert into public.areas (id) values
  ('valoracion'),('salud-oral'),('odontologia'),('estetica'),('longevidad'),
  ('hormonal'),('cardiologia'),('nutricion'),('fisioterapia');

create table public.opening_hours (weekday int not null check (weekday between 1 and 7), opens time not null, closes time not null);
insert into public.opening_hours values
  (1,'10:00','19:30'),(2,'10:00','14:00'),(2,'16:00','20:00'),(3,'10:00','19:30'),
  (4,'10:00','14:00'),(4,'16:00','20:00'),(5,'10:00','19:30');

create table public.holidays (date date primary key);
insert into public.holidays values ('2026-12-08'),('2026-12-25'),('2027-01-01'),('2027-01-06');

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  patient_id   uuid references public.profiles(id) on delete set null,
  name         text not null check (char_length(name) between 2 and 120),
  email        text not null default '',
  phone        text not null,
  area         text not null references public.areas(id),
  date         date not null,
  time         time not null,
  duration     int not null default 30 check (duration between 10 and 240),
  status       text not null default 'pendiente' check (status in ('pendiente','confirmada','realizada','cancelada','no_asistio')),
  source       text not null default 'web',
  professional text not null default '',
  notes        text not null default '' check (char_length(notes) <= 500),
  consent_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index bookings_day on public.bookings (date, area);
create index bookings_patient on public.bookings (patient_id);
-- Una sola cita activa por área y hora (capacidad 1). Quitar si se admite más de una.
create unique index bookings_slot on public.bookings (area, date, time) where status <> 'cancelada';

-- Las notas internas van aparte: el paciente nunca puede leerlas.
create table public.booking_notes (booking_id uuid primary key references public.bookings(id) on delete cascade, note text not null default '');

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null, from_time time, to_time time, reason text not null default '',
  check ((from_time is null and to_time is null) or from_time < to_time)
);

-- ---------- funciones auxiliares ----------
create or replace function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as
$$ select id from profiles where auth_id = auth.uid() and active $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where auth_id = auth.uid() and active and role = 'admin') $$;

-- Vincula la cuenta de acceso con la ficha SOLO cuando el correo está verificado.
create or replace function public.link_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null then
    update profiles set auth_id = new.id
     where auth_id is null and active and lower(email) = lower(new.email);
  end if;
  return new;
end $$;
create trigger lustro_link_profile after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_profile();

-- Si la persona ya tenía acceso verificado antes de crear su ficha, se vincula al crearla.
create or replace function public.link_existing_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.auth_id := (select id from auth.users where lower(email) = lower(new.email) and email_confirmed_at is not null limit 1);
  return new;
end $$;
create trigger lustro_link_existing before insert on public.profiles
  for each row execute function public.link_existing_user();

-- Una persona no puede cambiarse el rol, el correo o el estado.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() and
     (new.role, new.active, new.email, new.auth_id) is distinct from (old.role, old.active, old.email, old.auth_id) then
    raise exception 'No tienes permiso para hacer esto.';
  end if;
  return new;
end $$;
create trigger lustro_protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.slot_is_free(p_area text, p_date date, p_time time, p_ignore uuid default null)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_now timestamp := now() at time zone 'Europe/Madrid';
begin
  if p_date + p_time < v_now + interval '120 minutes' or p_date > v_now::date + 90 then return false; end if;
  if extract(minute from p_time)::int % 30 <> 0 or extract(second from p_time) <> 0 then return false; end if;
  if exists (select 1 from holidays where date = p_date) then return false; end if;
  if not exists (select 1 from opening_hours where weekday = extract(isodow from p_date)
                 and p_time >= opens and p_time + interval '30 minutes' <= closes) then return false; end if;
  if exists (select 1 from blocks where date = p_date
             and (from_time is null or (p_time < to_time and p_time + interval '30 minutes' > from_time))) then return false; end if;
  return not exists (select 1 from bookings where area = p_area and date = p_date and time = p_time
                     and status <> 'cancelada' and id is distinct from p_ignore);
end $$;

-- Horas libres para la web pública: no expone ningún dato personal.
create or replace function public.free_slots(p_area text, p_date date, p_ignore uuid default null)
returns table (slot text) language sql stable security definer set search_path = public as $$
  select to_char(g, 'HH24:MI')
  from opening_hours h
  cross join lateral generate_series(p_date + h.opens, p_date + h.closes - interval '30 minutes', interval '30 minutes') g
  where h.weekday = extract(isodow from p_date) and slot_is_free(p_area, p_date, g::time, p_ignore)
  order by 1
$$;

-- Única vía para que el público cree una cita.
create or replace function public.create_booking(p_name text, p_email text, p_phone text, p_area text, p_date date, p_time time, p_notes text, p_consent boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v_patient uuid; v_me profiles; v_row bookings; v_email text := lower(trim(p_email)); v_digits text := regexp_replace(p_phone, '\D', '', 'g');
begin
  if not coalesce(p_consent, false) then raise exception 'Debes aceptar la política de privacidad.'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then raise exception 'Revisa el correo electrónico.'; end if;
  if length(v_digits) not between 9 and 15 then raise exception 'Revisa el teléfono.'; end if;
  select * into v_me from profiles where auth_id = auth.uid() and active and role = 'paciente';
  if v_me.id is not null then v_patient := v_me.id; v_email := lower(v_me.email);
  else select id into v_patient from profiles where lower(email) = v_email and role = 'paciente' and active; end if;
  perform pg_advisory_xact_lock(hashtext('lustro' || p_area || p_date::text));
  if (select count(*) from bookings where status = 'pendiente' and date >= current_date
      and (email = v_email or regexp_replace(phone, '\D', '', 'g') = v_digits)) >= 3 then
    raise exception 'Ya tienes varias solicitudes pendientes. Llámanos y te ayudamos.'; end if;
  if not slot_is_free(p_area, p_date, p_time) then raise exception 'Esa hora ya no está disponible. Elige otra.'; end if;
  insert into bookings (patient_id, name, email, phone, area, date, time, notes, consent_at, source)
  values (v_patient, trim(p_name), v_email, trim(p_phone), p_area, p_date, p_time, coalesce(trim(p_notes), ''), now(),
          case when v_me.id is null then 'web' else 'paciente' end)
  returning * into v_row;
  return json_build_object('id', v_row.id, 'code', v_row.code, 'name', v_row.name, 'phone', v_row.phone, 'area', v_row.area,
                           'date', v_row.date, 'time', to_char(v_row.time, 'HH24:MI'), 'duration', v_row.duration, 'status', v_row.status);
end $$;

create or replace function public.cancel_booking(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'cancelada', updated_at = now()
   where id = p_id and (is_admin() or patient_id = my_profile_id())
     and status in ('pendiente','confirmada') and date + time >= now() at time zone 'Europe/Madrid';
  if not found then raise exception 'Esta cita no se puede cancelar.'; end if;
end $$;

create or replace function public.reschedule_booking(p_id uuid, p_date date, p_time time) returns void
language plpgsql security definer set search_path = public as $$
declare v bookings;
begin
  select * into v from bookings where id = p_id and (is_admin() or patient_id = my_profile_id())
     and status in ('pendiente','confirmada') and date + time >= now() at time zone 'Europe/Madrid' for update;
  if v.id is null then raise exception 'Esta cita no se puede cambiar.'; end if;
  perform pg_advisory_xact_lock(hashtext('lustro' || v.area || p_date::text));
  if not slot_is_free(v.area, p_date, p_time, p_id) then raise exception 'Esa hora ya no está disponible. Elige otra.'; end if;
  update bookings set date = p_date, time = p_time, status = case when is_admin() then status else 'pendiente' end, updated_at = now() where id = p_id;
end $$;

-- ---------- seguridad por filas ----------
alter table public.profiles       enable row level security;
alter table public.bookings       enable row level security;
alter table public.booking_notes  enable row level security;
alter table public.blocks         enable row level security;
alter table public.areas          enable row level security;
alter table public.opening_hours  enable row level security;
alter table public.holidays       enable row level security;

create policy profiles_read   on public.profiles for select using (is_admin() or auth_id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (is_admin());
create policy profiles_update on public.profiles for update using (is_admin() or (auth_id = auth.uid() and active)) with check (is_admin() or auth_id = auth.uid());
create policy profiles_delete on public.profiles for delete using (is_admin() and auth_id is distinct from auth.uid());

create policy bookings_read  on public.bookings for select using (is_admin() or patient_id = my_profile_id());
create policy bookings_admin on public.bookings for all using (is_admin()) with check (is_admin());
create policy notes_admin    on public.booking_notes for all using (is_admin()) with check (is_admin());
create policy blocks_admin   on public.blocks for all using (is_admin()) with check (is_admin());

create policy areas_read    on public.areas for select using (true);
create policy hours_read    on public.opening_hours for select using (true);
create policy holidays_read on public.holidays for select using (true);
create policy areas_admin    on public.areas for all using (is_admin()) with check (is_admin());
create policy hours_admin    on public.opening_hours for all using (is_admin()) with check (is_admin());
create policy holidays_admin on public.holidays for all using (is_admin()) with check (is_admin());

revoke execute on function public.slot_is_free(text,date,time,uuid), public.cancel_booking(uuid), public.reschedule_booking(uuid,date,time) from public, anon;
grant  execute on function public.cancel_booking(uuid), public.reschedule_booking(uuid,date,time) to authenticated;
grant  execute on function public.free_slots(text,date,uuid), public.create_booking(text,text,text,text,date,time,text,boolean) to anon, authenticated;

-- ---------- primera cuenta de administración ----------
-- Cambia nombre y correo y ejecuta. Después entra con "Recibir un enlace de acceso por correo".
-- insert into public.profiles (role, name, email) values ('admin', 'Nombre Apellidos', 'correo@dominio.com');
