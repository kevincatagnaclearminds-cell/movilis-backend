#!/usr/bin/env powershell

# Script de prueba para validación de UUID
# Ejecutar desde: c:\Users\Jeremy Llumiquinga\Desktop\App movilis\movilis-backend

$baseURL = "http://localhost:3000/api"
$token = "" # Agregar token JWT si es necesario

Write-Host "🧪 PRUEBAS DE VALIDACIÓN DE UUID" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test 1: destinatarioId vacío
Write-Host "`n[TEST 1] Enviando destinatarioId vacío ('')" -ForegroundColor Yellow

$payload1 = @{
    courseName = "Test Course"
    institucion = "Movilis"
    destinatarioId = ""
} | ConvertTo-Json

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $payload1 -ForegroundColor Gray

try {
    $response1 = Invoke-WebRequest -Uri "$baseURL/certificados" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload1 `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Continue
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response1.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3) -ForegroundColor Green
} catch {
    Write-Host "Response Status:" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 2: userIds con elementos vacíos y nulos
Write-Host "`n[TEST 2] Enviando userIds con elementos vacíos" -ForegroundColor Yellow

$validUUID = "550e8400-e29b-41d4-a716-446655440000"
$payload2 = @{
    courseName = "Test Course 2"
    institucion = "Movilis"
    destinatarioId = $validUUID
    userIds = @("", $validUUID, $null, "invalid-uuid")
} | ConvertTo-Json

Write-Host "Payload (userIds contiene: '', UUID válido, null, 'invalid-uuid'):" -ForegroundColor Gray

try {
    $response2 = Invoke-WebRequest -Uri "$baseURL/certificados" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload2 `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Continue
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response2.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3) -ForegroundColor Green
    Write-Host "✅ Esperado: Solo se conecta el UUID válido" -ForegroundColor Green
} catch {
    Write-Host "Response Status:" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

# Test 3: Payload válido y correcto
Write-Host "`n[TEST 3] Enviando payload válido y correcto" -ForegroundColor Yellow

$payload3 = @{
    courseName = "Certificado Test Válido"
    institucion = "Instituto Superior Movilis"
    destinatarioId = $validUUID
    expirationDate = "2026-12-31"
} | ConvertTo-Json

Write-Host "Payload:" -ForegroundColor Gray
Write-Host $payload3 -ForegroundColor Gray

try {
    $response3 = Invoke-WebRequest -Uri "$baseURL/certificados" `
        -Method POST `
        -ContentType "application/json" `
        -Body $payload3 `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Continue
    
    Write-Host "Response Status: $($response3.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    $jsonResponse = $response3.Content | ConvertFrom-Json
    Write-Host "Certificate ID: $($jsonResponse.data.id)" -ForegroundColor Green
    Write-Host "Message: $($jsonResponse.message)" -ForegroundColor Green
    Write-Host "✅ Certificado creado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "Response Status:" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "✅ Pruebas completadas" -ForegroundColor Cyan
