# ============================================
# SCRIPT PARA GENERAR BASE64 DE FIREBASE SERVICE ACCOUNT
# ============================================

Write-Host "`n🔥 GENERADOR DE BASE64 PARA FIREBASE" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

Write-Host "PASO 1: Descarga tu Service Account Key desde Firebase Console" -ForegroundColor Yellow
Write-Host "  → https://console.firebase.google.com/project/alimento-del-cielo/settings/serviceaccounts/adminsdk" -ForegroundColor White
Write-Host "  → Click en 'Generate new private key'" -ForegroundColor White
Write-Host "  → Guarda el archivo JSON`n" -ForegroundColor White

$archivoJSON = Read-Host "PASO 2: Ingresa la ruta completa al archivo JSON descargado"

if (Test-Path $archivoJSON) {
    Write-Host "`n✅ Archivo encontrado. Generando Base64..." -ForegroundColor Green
    
    try {
        $json = Get-Content $archivoJSON -Raw
        $base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
        
        # Copiar al clipboard
        $base64 | Set-Clipboard
        
        Write-Host "`n✅ ¡BASE64 GENERADO Y COPIADO AL PORTAPAPELES!" -ForegroundColor Green
        Write-Host "`nPASO 3: Ve a Netlify Dashboard → Environment Variables" -ForegroundColor Yellow
        Write-Host "  → https://app.netlify.com/sites/alimentodelcielo-congeladosmonteliban/settings/env" -ForegroundColor White
        Write-Host "`nPASO 4: Agrega estas variables:" -ForegroundColor Yellow
        Write-Host "  1. Key: FIREBASE_PROJECT_ID" -ForegroundColor Cyan
        Write-Host "     Value: alimento-del-cielo`n" -ForegroundColor White
        Write-Host "  2. Key: FIREBASE_SERVICE_ACCOUNT_B64" -ForegroundColor Cyan
        Write-Host "     Value: [Pega con Ctrl+V - ya está en el portapapeles]`n" -ForegroundColor White
        Write-Host "  3. Key: FCM_ADMIN_SECRET" -ForegroundColor Cyan
        Write-Host "     Value: [Tu clave secreta, ejemplo: MiClave123]`n" -ForegroundColor White
        
        Write-Host "⚠️  IMPORTANTE: Después de agregar las variables, espera 1 minuto y vuelve a desplegar" -ForegroundColor Red
        Write-Host "     (o haz un commit vacío para forzar redespliegue)`n" -ForegroundColor Yellow
        
        # Mostrar los primeros caracteres del base64 para verificación
        Write-Host "🔍 Verificación (primeros 100 caracteres del Base64):" -ForegroundColor Cyan
        Write-Host $base64.Substring(0, [Math]::Min(100, $base64.Length)) -ForegroundColor DarkGray
        Write-Host "...`n" -ForegroundColor DarkGray
        
    } catch {
        Write-Host "`n❌ Error al procesar el archivo: $_" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Archivo no encontrado: $archivoJSON" -ForegroundColor Red
    Write-Host "Por favor verifica la ruta e intenta de nuevo.`n" -ForegroundColor Yellow
}

Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
