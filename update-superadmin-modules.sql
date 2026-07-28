USE inventory_db;
UPDATE users SET allowedModules = '["inventory","projects","reports"]' WHERE email = 'danielbelozoo@gmail.com';
SELECT id, email, name, role, allowedModules FROM users WHERE email = 'danielbelozoo@gmail.com';
