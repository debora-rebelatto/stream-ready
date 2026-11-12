@echo off
chcp 65001 > nul
title Restaurar Watchlist Automática
echo =====================================================
echo  Iniciando restauração automática da sua Watchlist...
echo =====================================================
node scripts\restaurar_watchlist.js
echo.
pause
