-- Normalize legacy `user` role to `rider` for auth flow redesign
UPDATE public.users SET role = 'rider' WHERE role = 'user';

-- Document allowed roles (informational; column remains TEXT)
COMMENT ON COLUMN public.users.role IS 'Account role: rider, owner, or admin';
