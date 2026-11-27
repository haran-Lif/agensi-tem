-- TEST FIXTURE ONLY. Minimal Supabase contracts, not the Supabase service implementation.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema storage;
create table auth.users (
 id uuid primary key, instance_id uuid, email text unique, aud text, role text,
 encrypted_password text, email_confirmed_at timestamptz, confirmation_sent_at timestamptz,
 confirmed_at timestamptz generated always as (email_confirmed_at) stored,
 raw_app_meta_data jsonb,raw_user_meta_data jsonb,is_super_admin boolean,
 created_at timestamptz,updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth,storage to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id), name text);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
 select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
$$;
