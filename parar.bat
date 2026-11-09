@echo off
echo ===================================================
echo     Parando Stremio Watchlist 1080p+ Addon
echo ===================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7000" ^| findstr "LISTENING"') do (
    set FOUND=1
    echo Encerrando processo na porta 7000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

if "%FOUND%"=="1" (
    echo.
    echo [SUCESSO] Servidor encerrado com sucesso!
) else (
    echo [INFO] O servidor nao estava rodando na porta 7000.
)

echo.
pause
