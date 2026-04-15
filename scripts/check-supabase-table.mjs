import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local file. Create one with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exitCode = 1;
  process.exit();
}

const env = fs.readFileSync(envPath, 'utf8');
const vars = Object.fromEntries(
  env
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=');
      return [key, rest.join('=')];
    })
);

const SUPABASE_URL = vars.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local');
  process.exit(1);
}

const CREATE_SCHEMA_SQL = `-- SkyTrack schema for multi-user operations
create table if not exists public.profiles (
  id uuid primary key,
  name text not null,
  email text,
  role text not null,
  school text not null,
  instructor_id uuid,
  phone text,
  start_date date,
  created_at timestamp with time zone default now()
);

create table if not exists public.flights (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  instructor_id uuid,
  date text not null,
  type text not null,
  reg text not null,
  inst text not null,
  dur numeric not null,
  notes text,
  inserted_at timestamp with time zone default now()
);

alter table if exists public.flights
  add column if not exists user_id uuid;
alter table if exists public.flights
  add column if not exists instructor_id uuid;
alter table if exists public.flights
  add column if not exists notes text;
`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('Checking Supabase connection and schema compatibility...');

  const tables = [
    { name: 'profiles' },
    { name: 'flights' },
  ];

  let missing = false;
  for (const table of tables) {
    const { error } = await supabase.from(table.name).select('id').limit(1);
    if (error) {
      missing = true;
      console.error(`Missing or inaccessible table public.${table.name}.`);
    }
  }

  if (!missing) {
    console.log('Success: the required tables appear to exist.');
    return;
  }

  console.error('Your Supabase project needs the following schema. Run this in the Supabase SQL editor:');
  console.log('-----------------------------------------------------------');
  console.log(CREATE_SCHEMA_SQL);
  console.log('-----------------------------------------------------------');
  process.exitCode = 1;
}

run();
