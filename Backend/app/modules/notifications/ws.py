import json
import uuid
import asyncio
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_access_token

class UserConnectionManager:
    def __init__(self) -> None:
        # Map user_id to list of active WebSockets
        self._connections: Dict[uuid.UUID, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: uuid.UUID) -> None:
        await websocket.accept()
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = []
            self._connections[user_id].append(websocket)

    async def disconnect(self, websocket: WebSocket, user_id: uuid.UUID) -> None:
        async with self._lock:
            if user_id in self._connections:
                if websocket in self._connections[user_id]:
                    self._connections[user_id].remove(websocket)
                if not self._connections[user_id]:
                    del self._connections[user_id]

    async def send_to_user(self, user_id: uuid.UUID, payload: dict) -> None:
        async with self._lock:
            websockets = self._connections.get(user_id, [])
            if not websockets:
                return
            
            message = json.dumps(payload, default=str).encode("utf-8")
            dead: set[WebSocket] = set()
            for ws in websockets:
                try:
                    await ws.send_bytes(message)
                except Exception:
                    dead.add(ws)
            
            for ws in dead:
                websockets.remove(ws)
            if not websockets:
                del self._connections[user_id]

manager = UserConnectionManager()
