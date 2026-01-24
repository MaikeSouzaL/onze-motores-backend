# 🚀 SCRIPT DE INSTALAÇÃO - HTTPS COM CLOUDFLARE TUNNEL

# IMPORTANTE: Execute como Administrador!

Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CONFIGURAR HTTPS - Cloudflare Tunnel" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito e selecione 'Executar como Administrador'" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "✅ Executando como Administrador" -ForegroundColor Green
Write-Host ""

# Passo 1: Baixar cloudflared
Write-Host "📥 Baixando cloudflared..." -ForegroundColor Yellow
try {
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    $tempFile = "$env:TEMP\cloudflared.exe"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -UseBasicParsing
    
    # Mover para System32
    Move-Item -Path $tempFile -Destination "C:\Windows\System32\cloudflared.exe" -Force
    Write-Host "✅ cloudflared instalado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao baixar cloudflared: $_" -ForegroundColor Red
    pause
    exit
}

Write-Host ""

# Passo 2: Verificar instalação
Write-Host "🔍 Verificando instalação..." -ForegroundColor Yellow
$version = cloudflared --version 2>$null
if ($version) {
    Write-Host "✅ cloudflared instalado: $version" -ForegroundColor Green
} else {
    Write-Host "❌ Erro: cloudflared não foi instalado corretamente" -ForegroundColor Red
    pause
    exit
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASSOS MANUAIS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Autenticar com Cloudflare:" -ForegroundColor Yellow
Write-Host "   cloudflared tunnel login" -ForegroundColor White
Write-Host ""
Write-Host "2. Criar tunnel:" -ForegroundColor Yellow
Write-Host "   cloudflared tunnel create onze-motores-api" -ForegroundColor White
Write-Host ""
Write-Host "3. Configurar DNS:" -ForegroundColor Yellow
Write-Host "   cloudflared tunnel route dns onze-motores-api api.onzemotores.com.br" -ForegroundColor White
Write-Host ""
Write-Host "4. Criar arquivo de configuração:" -ForegroundColor Yellow
Write-Host "   Ver CONFIGURAR-HTTPS.md para detalhes" -ForegroundColor White
Write-Host ""
Write-Host "5. Instalar como serviço:" -ForegroundColor Yellow
Write-Host "   cloudflared service install" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar com a autenticação..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "🔐 Abrindo navegador para autenticação..." -ForegroundColor Yellow
cloudflared tunnel login

Write-Host ""
Write-Host "✅ Se a autenticação foi bem-sucedida, continue com os próximos passos!" -ForegroundColor Green
Write-Host "📖 Veja o arquivo CONFIGURAR-HTTPS.md para instruções detalhadas" -ForegroundColor Cyan
Write-Host ""
pause
