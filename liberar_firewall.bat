@echo off
echo ========================================================
echo   Liberar Porta 7000 no Firewall (Permitir acesso da TV)
echo ========================================================
echo.
echo Solicitando permissao de Administrador...

net session >nul 2>&1
if %errorLevel% == 0 (
    netsh advfirewall firewall delete rule name="Stremio Watchlist Addon (Porta 7000)" >nul 2>&1
    netsh advfirewall firewall add rule name="Stremio Watchlist Addon (Porta 7000)" dir=in action=allow protocol=TCP localport=7000 >nul
    echo.
    echo [SUCESSO] Porta 7000 liberada no Firewall do Windows!
    echo Sua Smart TV e outros aparelhos na mesma rede agora podem acessar o Addon.
) else (
    echo [AVISO] Execute este arquivo como Administrador:
    echo Clique com o botao direito nele e escolha "Executar como Administrador".
)

echo.
pause
