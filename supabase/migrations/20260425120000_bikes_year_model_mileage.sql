-- Year / model / mileage for CSV inventory imports
alter table public.bikes
  add column if not exists year integer,
  add column if not exists model text,
  add column if not exists mileage integer;

comment on column public.bikes.model is 'Display model name from DMS/CSV import';
comment on column public.bikes.mileage is 'Odometer from CSV, miles';
