@echo off
echo Iniciando entorno de desarrollo de Servinow...

:: Usamos Windows Terminal (wt.exe) para abrir pestañas/paneles divididos
:: 1. Backend (Activa entorno virtual y corre uvicorn)
:: 2. Frontend (npm run dev)
:: 3. Ngrok (Expone el backend o frontend según tu necesidad)

wt -p "Ubuntu" -d "\\wsl$\Ubuntu\home\davidcalle\Projects\Servinow\Backend" --title "Backend" wsl.exe -e bash -c "source venv/bin/activate && uvicorn app.main:app --reload; exec bash" ^
; split-pane -H -d "\\wsl$\Ubuntu\home\davidcalle\Projects\Servinow\Frontend" --title "Frontend" wsl.exe -e bash -c "npm run dev; exec bash" ^
; split-pane -V -d "\\wsl$\Ubuntu\home\davidcalle\Projects\Servinow" --title "Ngrok" wsl.exe -e bash -c "ngrok http --domain=limeade-legible-fifth.ngrok-free.dev 8000; exec bash"

:: Nota: Puedes cambiar 8000 por 5173 en el comando de ngrok si lo que expones es el frontend.
