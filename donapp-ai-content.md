---
name: donapp-ai-content
description: Integración de IA generativa (Gemini para copy/texto, Veo para video) en DonApp, incluyendo el gap crítico de controles de presupuesto que aún no existe. Consulta esta skill SIEMPRE que trabajes en `app/modules/ai/service.py`, generación de contenido con IA, o cuando se te pida agregar límites de cuota/gasto — y menciona proactivamente el riesgo de costos sin control si el usuario toca este módulo sin abordarlo.
---

# Generación de contenido con IA en DonApp

## Estado actual

Implementado y activo en `Backend/app/modules/ai/service.py`:
- `generate_social_copy` — texto
- `generate_video_from_image` — video

El frontend (`SocialPostCreate` y flujos de Share) marca los posts con `is_ai_generated` (campo en la tabla `SocialPost`) para distinguir contenido generado total o parcialmente por IA.

## Servicios usados

- **Texto**: `genai.Client` (Google Gemini / AI Studio), con fallback en cascada entre modelos: `gemini-3.5-flash` → `gemini-3.1-flash-lite` → `gemini-flash-lite-latest` → `gemini-2.0-flash-lite`. Si vas a agregar un modelo nuevo a la cascada, respeta el orden costo/latencia existente (más capaz primero, más barato/rápido al final como fallback).
- **Video**: `veo-3.1-fast-generate-preview` (`generate_videos`), genera micro-videos promocionales a partir de una imagen estática.

## ⚠️ Controles de presupuesto — GAP CRÍTICO, no asumas que existen

**No hay ninguna limitación de llamadas** por negocio, por usuario, ni por ventana de tiempo (diaria/mensual). El consumo de la API de Google corre libre bajo la cuota de la cuenta principal de la aplicación.

**Si el usuario te pide trabajar en este módulo por cualquier motivo, señala este gap explícitamente antes de continuar** — es la prioridad #1 pendiente de este feature, no un detalle menor. No implementes funcionalidad nueva de generación de IA que aumente el volumen de llamadas sin al menos advertir sobre esto.

## Flujo de generación

**Texto**:
1. Request: `product_name`, `description`, `tone`
2. Prompt template: *"Escribe un texto {tone} y breve..."*
3. Llamada a Gemini → retorna `response.text`

**Video**:
1. Request con imagen local → `image_bytes` se envía a Veo
2. Polling **síncrono** (espera activa cada 15s consultando `client.operations.get`) — esto bloquea el request; si se necesita escalar, esto debería moverse a una tarea en background (Celery, igual que la publicación social), no está así hoy.
3. Se obtiene `video_uri` → descarga vía `httpx` con header `x-goog-api-key`
4. Se almacena en `uploads/items/<uuid>.mp4` → se entrega ruta estática al frontend

## Costos y logging

- No existe tabla de base de datos que registre costo o unidades consumidas por invocación.
- Solo hay logging básico (`logger.info`/`logger.warning`) indicando qué modelo se intentó o si falló en la cascada de fallback — **esto no sirve para control de gasto**, solo para debugging de disponibilidad de modelo.

## Restricciones de contenido

- El *system prompt* de copy fuerza reglas duras: máximo 280 caracteres, sin hashtags excesivos ni exceso de emojis.
- El `tone` se pasa dinámicamente como argumento (ej. "persuasivo").
- No hay filtro de moderación propio — se confía de forma optimista en los `SafetySettings` por defecto de Google. Si se requiere moderación adicional (marca, tipo de negocio, contenido prohibido), debe construirse desde cero.
