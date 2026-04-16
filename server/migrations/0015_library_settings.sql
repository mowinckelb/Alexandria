-- Library author settings — company layer on top of protocol.
-- Visibility defaults to 'authors' (invite-only: other account holders can see, public cannot).

ALTER TABLE authors ADD COLUMN visibility TEXT DEFAULT 'authors';
