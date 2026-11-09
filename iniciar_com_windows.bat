@echo off
echo ==========================================================
echo   Configurar Addon para Iniciar Automaticamente no Windows
echo ==========================================================
echo.

set SCRIPT_DIR=%~dp0
set VBS_TARGET=%SCRIPT_DIR%iniciar_segundo_plano.vbs
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\StremioWatchlistAddon.lnk

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_TARGET%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCESSO] Addon configurado para iniciar automaticamente!
    echo Sempre que voce ligar o computador, ele iniciara em segundo
    echo plano (silenciosamente, sem janela aberta) e estara pronto para a TV.
) else (
    echo [ERRO] Nao foi possivel criar o atalho de inicializacao.
)

echo.
pause
