-- Crear usuario Super Admin principal
-- Email: danielbelozoo@gmail.com
-- Password: LT-1234512345

INSERT INTO users (id, email, password, name, role, isActive, createdAt, updatedAt)
VALUES (
  UUID(),
  'danielbelozoo@gmail.com',
  '$2b$10$99/za7UNi4V2ELJDSVX0j.nE0DA/Dmkt7YvCTGuX1u4KVHHMoZGKa', -- LT-1234512345
  'Administrador Principal',
  'SUPER_ADMIN',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  password = '$2b$10$99/za7UNi4V2ELJDSVX0j.nE0DA/Dmkt7YvCTGuX1u4KVHHMoZGKa',
  role = 'SUPER_ADMIN',
  name = 'Administrador Principal',
  isActive = 1;
