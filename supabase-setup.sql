-- Step 1: Create the scheduled_content table with correct structure
CREATE TABLE IF NOT EXISTS scheduled_content (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL, -- Must be TEXT to match Clerk user IDs
    title TEXT,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    platform TEXT DEFAULT 'All',
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE scheduled_content ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can insert own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can update own content" ON scheduled_content;
DROP POLICY IF EXISTS "Users can delete own content" ON scheduled_content;

-- Step 4: Create RLS policies for Clerk authentication
-- Policy for SELECT (viewing content)
CREATE POLICY "Users can view own content" ON scheduled_content
    FOR SELECT USING (current_setting('request.jwt.claim.sub', true) = user_id);

-- Policy for INSERT (creating content)
CREATE POLICY "Users can insert own content" ON scheduled_content
    FOR INSERT WITH CHECK (current_setting('request.jwt.claim.sub', true) = user_id);

-- Policy for UPDATE (modifying content)
CREATE POLICY "Users can update own content" ON scheduled_content
    FOR UPDATE USING (current_setting('request.jwt.claim.sub', true) = user_id);

-- Policy for DELETE (removing content)
CREATE POLICY "Users can delete own content" ON scheduled_content
    FOR DELETE USING (current_setting('request.jwt.claim.sub', true) = user_id);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_content_user_id ON scheduled_content(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_date ON scheduled_content(date);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_user_date ON scheduled_content(user_id, date); 