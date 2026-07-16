#!/bin/bash

# Nombre de la sesión de tmux
SESSION="servinow"

# Verificar si la sesión ya existe
tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
  echo "Iniciando entorno de desarrollo de Servinow en Docker..."

  # 1. Crear sesión de tmux con la ventana de Backend (Docker Compose)
  tmux new-session -d -s $SESSION -n "Backend" -c "/home/davidcalle/Projects/Servinow/Backend"
  tmux send-keys -t $SESSION:0 "docker compose up" C-m

  # 2. Crear una nueva ventana para el Frontend
  tmux new-window -t $SESSION -n "Frontend" -c "/home/davidcalle/Projects/Servinow/Frontend"
  tmux send-keys -t $SESSION:1 "pnpm dev || npm run dev" C-m

  # 3. Crear una nueva ventana para Ngrok
  tmux new-window -t $SESSION -n "Ngrok" -c "/home/davidcalle/Projects/Servinow"
  tmux send-keys -t $SESSION:2 "ngrok http --domain=limeade-legible-fifth.ngrok-free.dev 8000" C-m
fi

# Adjuntar a la sesión de tmux
tmux attach-session -t $SESSION
