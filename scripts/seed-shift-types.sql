-- Seed para tipos de jornada con colores específicos
INSERT INTO shift_types (id, code, name, color, description, isActive, createdAt, updatedAt) VALUES
  (UUID(), 'NORMAL', 'Jornada Normal', '#3B82F6', 'Jornada laboral estándar de lunes a viernes', 1, NOW(), NOW()),
  (UUID(), 'DOUBLE_SHIFT', 'Doble Turno', '#F59E0B', 'Jornada extendida cubriendo dos turnos consecutivos', 1, NOW(), NOW()),
  (UUID(), 'NIGHT_SHIFT', 'Nocturno', '#6366F1', 'Jornada de trabajo durante horas nocturnas', 1, NOW(), NOW()),
  (UUID(), 'PERMISSION', 'Permiso', '#10B981', 'Permiso laboral autorizado', 1, NOW(), NOW()),
  (UUID(), 'WEEKEND', 'Fin de Semana', '#8B5CF6', 'Jornada durante sábado o domingo', 1, NOW(), NOW()),
  (UUID(), 'EXTENDED', 'Jornada Extendida', '#EF4444', 'Jornada con horas adicionales al horario estándar', 1, NOW(), NOW()),
  (UUID(), 'OVERNIGHT_REMOTE', 'Pernoctar Fuera de Zona', '#EC4899', 'Jornada que requiere pernoctar fuera del área habitual', 1, NOW(), NOW()),
  (UUID(), 'EARLY_MORNING', 'Salida Madrugada', '#14B8A6', 'Jornada que inicia en horas de la madrugada', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updatedAt = NOW();
