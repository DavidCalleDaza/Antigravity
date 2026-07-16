@echo off
echo Iniciando entorno de desarrollo de Servinow en Docker...

:: Usamos Windows Terminal (wt.exe) para abrir pestañas individuales (new-tab)
:: 1. Backend: Levanta todos los servicios en Docker (db, redis, web, worker, flower)
:: 2. Frontend: Corre pnpm dev de forma nativa
:: 3. Ngrok: Expone el backend local a la web

wt -p "Ubuntu" -d "\\wsl.localhost\Ubuntu\home\davidcalle\Projects\Servinow\Backend" --title "Backend (Docker)" wsl.exe -e bash -c "docker compose up; exec bash" ^
; new-tab -p "Ubuntu" -d "\\wsl.localhost\Ubuntu\home\davidcalle\Projects\Servinow\Frontend" --title "Frontend" wsl.exe -e bash -c "pnpm dev || npm run dev; exec bash" ^
; new-tab -p "Ubuntu" -d "\\wsl.localhost\Ubuntu\home\davidcalle\Projects\Servinow" --title "Ngrok" wsl.exe -e bash -c "ngrok http --domain=limeade-legible-fifth.ngrok-free.dev 8000; exec bash"
