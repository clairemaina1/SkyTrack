-- Supabase schema initialization for SkyTrack
-- Run this in the Supabase SQL editor if the flights table is not present.

create table if not exists public.flights (
  id bigint generated always as identity primary key,
  date text not null,
  type text not null,
  reg text not null,
  inst text not null,
  dur numeric not null,
  inserted_at timestamp with time zone default now()
);
