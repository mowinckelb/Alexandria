-- Drop foreign key constraint on entries table for MVP testing
-- The test user UUID doesn't exist in auth.users

ALTER TABLE IF EXISTS entries 
DROP CONSTRAINT IF EXISTS entries_user_id_fkey;

-- Note: Re-add this constraint when implementing real authentication:
-- ALTER TABLE entries 
-- ADD CONSTRAINT entries_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id);
