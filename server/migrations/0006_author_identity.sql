-- Author identity surface + stats support
ALTER TABLE authors ADD COLUMN website TEXT;
ALTER TABLE authors ADD COLUMN location TEXT;
ALTER TABLE authors ADD COLUMN social_links TEXT DEFAULT '[]';
