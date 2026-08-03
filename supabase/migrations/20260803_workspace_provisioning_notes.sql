-- Optional: provision a client org after diagnostic (run in Supabase SQL editor with service role).
-- Replace placeholders before executing.

-- insert into public.organizations (id, name)
-- values ('00000000-0000-4000-8000-000000000001', 'Example Manufacturing Co');

-- insert into public.organization_members (organization_id, email, role, user_id)
-- values (
--   '00000000-0000-4000-8000-000000000001',
--   'client@example.com',
--   'owner',
--   null  -- optionally set to auth.users.id after they sign in once
-- );

-- insert into public.facilities (organization_id, name, state, industry, employee_count, status)
-- values (
--   '00000000-0000-4000-8000-000000000001',
--   'Plant 1',
--   'New Jersey',
--   'Chemical Manufacturing',
--   '150-500',
--   'pilot'
-- );
