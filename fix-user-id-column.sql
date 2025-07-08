-- Fix the user_id column type to match Clerk user IDs
-- Step 1: Drop existing policies first
DROP POLICY IF EXISTS "Users can view own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can insert own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can update own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can delete own content" ON scheduled_content;

-- Step 2: Alter the user_id column from UUID to TEXT
ALTER TABLE scheduled_content ALTER COLUMN user_id TYPE TEXT;

-- Step 3: Recreate the RLS policies for Clerk authentication
-- Policy for SELECT (viewing content)
CREATE POLICY "Users can view own content" ON scheduled_content
    FOR SELECT USING (auth.uid()::text = user_id);

-- Policy for INSERT (creating content)
CREATE POLICY "Users can insert own content" ON scheduled_content
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy for UPDATE (modifying content)
CREATE POLICY "Users can update own content" ON scheduled_content
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy for DELETE (removing content)
CREATE POLICY "Users can delete own content" ON scheduled_content
    FOR DELETE USING (auth.uid()::text = user_id);

-- Step 4: Recreate indexes
DROP INDEX IF EXISTS idx_scheduled_content_user_id;
DROP INDEX IF EXISTS idx_scheduled_content_user_date;
CREATE INDEX IF NOT EXISTS idx_scheduled_content_user_id ON scheduled_content(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_date ON scheduled_content(date);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_user_date ON scheduled_content(user_id, date); 