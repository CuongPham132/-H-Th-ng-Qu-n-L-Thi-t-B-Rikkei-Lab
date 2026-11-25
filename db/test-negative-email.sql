-- ==============================================================================
-- RIKKEI LAB - NEGATIVE CONSTRAINT VERIFICATION SCRIPT
-- Purpose: Verify that MySQL rejects invalid operations with appropriate errors.
-- ==============================================================================

-- Test 1: Duplicate Email in users
-- Expected: ERROR 1062 (23000): Duplicate entry 'admin@rikkeilab.vn' for key 'users.uk_users_email'
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@rikkeilab.vn', 'hash', 'Duplicate User', 'BORROWER');
