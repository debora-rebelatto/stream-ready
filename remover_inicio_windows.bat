@echo off
echo ==========================================================
echo     Remover Addon da Inicializacao do Windows
echo ==========================================================
echo.

set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\StremioWatchlistAddon.lnk

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo [SUCESSO] Addon removido da inicializacao do Windows!
) else (
    echo [INFO] O atalho de inicializacao nao foi encontrado.
)

echo.
pause
