-- Check the current table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scheduled_content' 
ORDER BY ordinal_position;

-- Check if there are any existing rows that might cause issues
SELECT COUNT(*) as total_rows FROM scheduled_content;

-- Check the first few rows to see the data format
SELECT id, user_id, content, date FROM scheduled_content LIMIT 5; 