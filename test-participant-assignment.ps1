# PRUEBA FINAL: Asignación de participantes
Write-Host "`n════════════════════════════════════════════════"
Write-Host "  TEST: ASIGNACIÓN DE PARTICIPANTES EN TAREAS"
Write-Host "════════════════════════════════════════════════`n"

# Login
$loginBody = @{
  email = "danielbelozoo@gmail.com"
  password = "LT-1234512345"
} | ConvertTo-Json

$login = Invoke-RestMethod -Method POST -Uri "http://localhost/api/auth/auth/login" -ContentType "application/json" -Body $loginBody
$token = $login.access_token

Write-Host "✅ Login exitoso`n"

# Usar proyecto conocido
$projectId = "72dd21dc-d765-4edd-919d-2f944c09cea7"
$userId = "9aac347a-e4bb-11f0-b963-0242ac14000a"

# Crear tarea con participante
$taskBody = @{
  code = "TSK-FINAL-$(Get-Date -Format 'HHmmss')"
  title = "Test de Asignación de Participantes"
  description = "Verificando que se pueden asignar usuarios a tareas"
  status = "PENDING"
  priority = "HIGH"
  projectId = $projectId
  startDate = "2025-12-15T10:00:00.000Z"
  endDate = "2025-12-15T11:00:00.000Z"
  estimatedHours = 1
  participantIds = @($userId)
} | ConvertTo-Json -Depth 10

Write-Host "JSON enviado:"
Write-Host $taskBody
Write-Host ""

Write-Host "Creando tarea con participante...`n"

try {
  $task = Invoke-RestMethod -Method POST -Uri "http://localhost/api/calendar/tasks" -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $taskBody
  
  Write-Host "════════════════════════════════════════════════"
  Write-Host "✅ ¡ÉXITO! TAREA CREADA CON PARTICIPANTE"
  Write-Host "════════════════════════════════════════════════"
  Write-Host "📋 Código: $($task.data.code)"
  Write-Host "📝 Título: $($task.data.title)"
  Write-Host "👥 Participantes asignados: $($task.data.assignments.Count)"
  
  if ($task.data.assignments -and $task.data.assignments.Count -gt 0) {
    Write-Host "`n👤 Participantes:"
    foreach ($assignment in $task.data.assignments) {
      Write-Host "   ✓ $($assignment.user.name) <$($assignment.user.email)> [$($assignment.user.role)]"
    }
    Write-Host "`n✅ LA ASIGNACIÓN DE PARTICIPANTES FUNCIONA CORRECTAMENTE"
  } else {
    Write-Host "`n❌ NO SE ASIGNARON PARTICIPANTES - REVISAR LOGS"
  }
  
  Write-Host "`n════════════════════════════════════════════════"
  
} catch {
  Write-Host "❌ ERROR: $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "`nDetalles:"
    $errorDetails.message | ForEach-Object { Write-Host "  - $_" }
  }
}
