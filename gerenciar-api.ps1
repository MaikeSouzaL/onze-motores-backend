# ============================================
# SCRIPT DE GERENCIAMENTO - API ONZE MOTORES
# ============================================
# Para executar: clique com botão direito > "Executar com PowerShell"

$ErrorActionPreference = "Stop"
$BackendPath = "c:\Api_OnzeMotores\onze-motores-orcamento_2.0\backend"

function Show-Menu {
    Clear-Host
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "   API ONZE MOTORES - Gerenciamento" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Iniciar API" -ForegroundColor Green
    Write-Host "2. Parar API" -ForegroundColor Red
    Write-Host "3. Reiniciar API" -ForegroundColor Yellow
    Write-Host "4. Status da API" -ForegroundColor Blue
    Write-Host "5. Ver Logs" -ForegroundColor Magenta
    Write-Host "6. Instalar Dependências" -ForegroundColor White
    Write-Host "7. Configurar Inicialização Automática" -ForegroundColor Cyan
    Write-Host "8. Remover Inicialização Automática" -ForegroundColor DarkYellow
    Write-Host "0. Sair" -ForegroundColor Gray
    Write-Host ""
}

function Start-API {
    Write-Host "🚀 Iniciando API Onze Motores..." -ForegroundColor Green
    Set-Location $BackendPath
    pm2 start ecosystem.config.json
    pm2 save
    Write-Host "✅ API iniciada com sucesso!" -ForegroundColor Green
}

function Stop-API {
    Write-Host "⏹️  Parando API Onze Motores..." -ForegroundColor Red
    pm2 stop onze-motores-api
    Write-Host "✅ API parada!" -ForegroundColor Yellow
}

function Restart-API {
    Write-Host "🔄 Reiniciando API Onze Motores..." -ForegroundColor Yellow
    pm2 restart onze-motores-api
    Write-Host "✅ API reiniciada!" -ForegroundColor Green
}

function Show-Status {
    Write-Host "📊 Status da API:" -ForegroundColor Blue
    pm2 status
    pm2 info onze-motores-api
}

function Show-Logs {
    Write-Host "📜 Logs da API (Ctrl+C para sair):" -ForegroundColor Magenta
    pm2 logs onze-motores-api
}

function Install-Dependencies {
    Write-Host "📦 Instalando dependências..." -ForegroundColor White
    Set-Location $BackendPath
    npm install
    Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
}

function Setup-AutoStart {
    Write-Host "⚙️  Configurando inicialização automática..." -ForegroundColor Cyan
    
    # Verificar se PM2 está instalado
    $pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
    if (-not $pm2Installed) {
        Write-Host "❌ PM2 não está instalado. Instalando..." -ForegroundColor Red
        npm install -g pm2
        npm install -g pm2-windows-startup
    }
    
    # Configurar PM2 para iniciar com o Windows
    pm2-startup install
    
    # Salvar configuração atual do PM2
    pm2 save --force
    
    Write-Host "✅ Inicialização automática configurada!" -ForegroundColor Green
    Write-Host "ℹ️  A API agora irá iniciar automaticamente com o Windows" -ForegroundColor Cyan
}

function Remove-AutoStart {
    Write-Host "⚙️  Removendo inicialização automática..." -ForegroundColor DarkYellow
    pm2-startup uninstall
    Write-Host "✅ Inicialização automática removida!" -ForegroundColor Yellow
}

# Loop do menu
do {
    Show-Menu
    $choice = Read-Host "Escolha uma opção"
    
    switch ($choice) {
        "1" { Start-API; Pause }
        "2" { Stop-API; Pause }
        "3" { Restart-API; Pause }
        "4" { Show-Status; Pause }
        "5" { Show-Logs }
        "6" { Install-Dependencies; Pause }
        "7" { Setup-AutoStart; Pause }
        "8" { Remove-AutoStart; Pause }
        "0" { 
            Write-Host "👋 Até logo!" -ForegroundColor Cyan
            exit 
        }
        default { 
            Write-Host "❌ Opção inválida!" -ForegroundColor Red
            Pause 
        }
    }
} while ($true)

function Pause {
    Write-Host ""
    Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
