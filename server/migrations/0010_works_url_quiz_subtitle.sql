-- Add missing columns that code already writes to
ALTER TABLE works ADD COLUMN url TEXT;
ALTER TABLE quizzes ADD COLUMN subtitle TEXT;
