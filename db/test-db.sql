-- ==============================================================================
-- RIKKEI LAB - DATABASE VERIFICATION SCRIPT
-- ==============================================================================

-- 1. Database Schema and Charset Validation
SELECT SCHEMA_NAME, DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME 
FROM information_schema.SCHEMATA 
WHERE SCHEMA_NAME = 'rikkei_lab';

-- 2. Tables and Storage Engine Check
SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'rikkei_lab'
ORDER BY TABLE_NAME;

-- 3. Verify Seed Data Counts
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'equipments', COUNT(*) FROM equipments
UNION ALL
SELECT 'borrowings', COUNT(*) FROM borrowings
UNION ALL
SELECT 'borrowing_items', COUNT(*) FROM borrowing_items;

-- 4. Check Generated Column in equipments
SELECT id, code, name, total_quantity, reserved_quantity, borrowed_quantity, available_quantity, status
FROM equipments;

-- 5. Check Foreign Key Constraints Registered
SELECT 
    CONSTRAINT_NAME, 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE CONSTRAINT_SCHEMA = 'rikkei_lab' 
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- 6. Check Check Constraints Registered
SELECT 
    tc.CONSTRAINT_NAME, 
    tc.TABLE_NAME, 
    cc.CHECK_CLAUSE 
FROM information_schema.TABLE_CONSTRAINTS tc
JOIN information_schema.CHECK_CONSTRAINTS cc 
    ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
WHERE tc.CONSTRAINT_SCHEMA = 'rikkei_lab'
ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME;
