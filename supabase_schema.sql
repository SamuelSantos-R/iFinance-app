-- SQL Schema for Finance App (Supabase)
-- Paste this in your Supabase SQL Editor (https://supabase.com/dashboard) and click "Run".

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  username text,
  full_name text,
  avatar_url text,
  shortcut_api_key text unique default encode(gen_random_bytes(16), 'hex')
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Create avatar storage bucket and policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable." on storage.objects;
create policy "Avatar images are publicly readable." on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar." on storage.objects;
create policy "Users can upload their own avatar." on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can update their own avatar." on storage.objects;
create policy "Users can update their own avatar." on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  ) with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Users can delete their own avatar." on storage.objects;
create policy "Users can delete their own avatar." on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- 3. Create transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric not null,
  description text,
  category text not null,
  bank text,
  type text check (type in ('income', 'expense')) not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for transactions
alter table public.transactions enable row level security;

create policy "Users can view their own transactions." on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions." on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions." on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions." on public.transactions
  for delete using (auth.uid() = user_id);

-- 4. Create RPC function for shortcut inserts
create or replace function public.add_transaction_via_shortcut(
  api_key_param text,
  amount_param numeric,
  description_param text,
  category_param text,
  bank_param text,
  type_param text
)
returns json
language plpgsql
security definer -- runs with owner privileges to access both profiles and transactions
as $$
declare
  target_user_id uuid;
  new_trans_id uuid;
begin
  -- Find user by api key
  select id into target_user_id
  from public.profiles
  where shortcut_api_key = api_key_param;

  if target_user_id is null then
    return json_build_object('success', false, 'error', 'Invalid API key');
  end if;

  -- Insert transaction
  insert into public.transactions (user_id, amount, description, category, bank, type)
  values (target_user_id, amount_param, description_param, category_param, bank_param, type_param)
  returning id into new_trans_id;

  return json_build_object('success', true, 'transaction_id', new_trans_id);
end;
$$;

-- 5. Create trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


