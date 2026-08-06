---
name: donapp-qa-conventions
description: Convenciones de QA y testing de DonApp — formato de test case, regla estricta de solo lectura contra la base de datos, y herramientas estandarizadas (openpyxl). Consulta esta skill SIEMPRE que generes test cases, scripts de validación contra PostgreSQL, o reportes de QA para DonApp. Regla innegociable: cualquier script de validación de base de datos debe ser SOLO LECTURA (SELECT) — nunca DDL ni INSERT/UPDATE/DELETE directos que evadan el ORM/FastAPI.
---

# Convenciones de QA en DonApp

## Formato de test case

Formato tabular estándar (Excel/CSV), columnas exactas:

| Columna | Contenido |
|---|---|
| ID | Identificador único (ej. `TC-AUTH-001`) |
| Descripción | Objetivo de la prueba |
| Precondición | Requisitos previos (ej. "Usuario logueado con token válido") |
| Pasos | Secuencia numerada de acciones (UI o API) |
| Resultado Esperado | Aserción final (ej. "Retorna 200 OK y JSON del producto creado") |
| Tipo | Smoke / Regression / Boundary / Security |
| Prioridad | Alta / Media / Baja |

Código de colores al exportar/renderizar: Verde = Pass, Rojo = Fail, Amarillo = Blocked, Gris = Untested/Skipped.

Usa siempre este esquema de columnas al generar test cases nuevos — no improvises un formato distinto por conveniencia.

## Regla estricta: solo lectura contra base de datos

**Cualquier script de validación/aserción automatizada que consulte PostgreSQL directamente debe operar exclusivamente con `SELECT`.**

Prohibido en scripts de QA:
- Sentencias DDL (alterar tablas)
- `INSERT`, `UPDATE`, `DELETE` directos que evadan el ORM/FastAPI

**Razón**: preservar la integridad referencial y de auditoría (campos automáticos como `created_at`, triggers de sesión en SQLAlchemy). Las creaciones de datos para pruebas deben pasar por llamadas a la API (endpoints reales) o por fixtures controlados del ORM con transacciones revocables — nunca por escritura directa a la base de datos.

Si te piden un script que "solo va a insertar unos datos de prueba" directamente en la BD, redirige esa necesidad hacia un fixture de test o una llamada a la API — no generes el INSERT directo.

## Herramienta estandarizada

`openpyxl` (Python) es la librería seleccionada para lectura/exportación de reportes o ingestión de casos de prueba desde hojas de cálculo. Actualmente no hay un suite de scripts activo en el repo bajo este esquema — es la convención elegida para cuando se implemente, no algo que debas asumir que ya está construido.

## Cobertura actual

La cobertura formal de QA es nula o está solo planificada (el proyecto ha priorizado velocidad de MVP). Épicas pendientes de documentar formalmente:
- Core Billing (Facturación)
- Social Connect (OAuth & Publishing)
- Intelligent Assist (Generación IA — Gemini/Veo)
- User/Tenant Management

Si te piden generar test cases para alguna de estas áreas, no asumas que existe una suite previa que debas extender — probablemente estás creando la primera versión.
