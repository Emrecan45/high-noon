drop schema public cascade;

create schema public;

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;

delete from auth.users;
