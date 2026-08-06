# DONAPP CONTEXT V9

> Última actualización: Julio 2026
> Estado del proyecto: MVP Avanzado / UI-UX Pulida, Push Drawer, Tablas de Ancho Fijo y Confirmación de Cierre de Sesión (~9.0/10)

---

## TABLA DE CONTENIDOS

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Inventario de Módulos](#3-inventario-de-módulos)
4. [Sistema de Diseño e Interfaz (UI/UX)](#4-sistema-de-diseño-e-interfaz-uiux)
5. [Gestión de Estado](#5-gestión-de-estado)
6. [Modelo de Negocio](#6-modelo-de-negocio)
7. [Seguridad](#7-seguridad)
8. [Deuda Técnica](#8-deuda-técnica)
9. [Gaps de Backend](#9-gaps-de-backend)
10. [Roadmap Priorizado](#10-roadmap-priorizado)

---

## 1. VISIÓN GENERAL DEL PROYECTO

### Descripción
**DonApp** es una plataforma de gestión para PyMEs (SMEs) colombianas con un componente social integrado. Su tagline es: *"Servir es el único negocio donde todos ganan"*.

En la versión **V9**, el proyecto ha consolidado su robustez visual e interactiva introduciendo mejoras clave de usabilidad y diseño de interfaz (UI/UX), mitigando problemas de colisiones de CSS y optimizando el rendimiento de renderizado en React.

### Principales Logros de la V9:
1. **Push Drawer Lateral:** Los paneles laterales derechos (crear, editar, compartir) ya no se superponen oscureciendo la pantalla principal. En su lugar, desplazan ("empujan") de manera fluida la interfaz principal hacia la izquierda, manteniendo ambas áreas activas y visibles.
2. **Colapso Inteligente del Menú Lateral:** Al activarse un panel derecho, el menú de navegación izquierdo se contrae automáticamente a un modo compacto (mostrando solo íconos). Se implementó un botón hamburguesa siempre visible en la cabecera del menú para expandirlo/contraerlo manualmente a voluntad.
3. **Tablas con Ancho Fijo (`colgroup`):** El componente de tabla unificado (`Table.jsx`) se actualizó para soportar `<colgroup>` con anchos de columna estrictos en píxeles. Esto resuelve de raíz los anchos irregulares causados por la distribución automática del navegador.
4. **Confirmación de Logout Resiliente:** Se integró un modal de confirmación al hacer clic en el perfil del usuario. Se corrigió un problema de CSS global proveniente de `InvoiceModal.css` que distorsionaba la distribución del modal en una grilla de dos columnas.

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | React + Vite | 18.3.1 / 5.4.21 |
| **Gestión de Paquetes**| PNPM (Monorepo Workspace) | 9.x / Workspace |
| **Estado** | Zustand (Optimizado con Selectores) | 4.5.7 |
| **Routing** | React Router DOM | 6.30.4 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Icons** | Lucide React | 0.300.0 |
| **Backend** | FastAPI + SQLAlchemy (Async) | 0.110.0 / 2.0+ |
| **Auth** | JWT (HS256) | - |
| **Generación PDF** | ReportLab | 4.5.1 |
| **Firma & XML** | Lxml + SignXML + Cryptography | 5.4.0 / 4.5.1 / 48.0.0 |
| **Motores de Plantilla**| Jinja2 (Email Templates) | 3.1.6 |
| **DB** | PostgreSQL (asyncpg driver) | - |

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Routing

```javascript
// Estructura de rutas (App.jsx)
Rutas Públicas:
  /                   -> Landing Page
  /login              -> Login
  /register           -> Register
  /unauthorized       -> Unauthorized

Rutas Protegidas (envueltas en MainLayout):
  /dashboard          -> Dashboard (Lógica con mocks)
  /products           -> Products (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND (Lista por defecto en V9)
  /services           -> Services (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND (Lista por defecto en V9)
  /categories         -> Categories (ADMIN, SELLER) -> ✅ CONECTADO AL BACKEND
  /billing            -> Billing (ADMIN, SELLER)  -> ✅ CONECTADO AL BACKEND
  /agenda             -> Agenda (Citas de clientes, Mocks)
  /wall               -> Wall (Muro social general) -> ✅ CONECTADO AL BACKEND
  /statistics         -> Statistics (ADMIN)
  /market             -> Market (ADMIN)
  /profile            -> Profile (Ajustes de perfil y conexión de redes sociales) -> ✅ CONECTADO AL BACKEND
```

### 2.2 API Layer (`apiClient.js`)

Se ha consolidado un único cliente HTTP asíncrono para gestionar todas las interacciones con el backend.
- **`authClient`:** Maneja registro, login, obtención de perfil y carga de avatares.
- **`productClient`:** CRUD de productos, soporta filtrado por `category_id` y por `user_id`.
- **`serviceClient`:** CRUD de servicios, soporta filtrado por `category_id` y por `user_id`.
- **`socialClient`:** Gestión de cuentas conectadas (`listAccounts`, `deleteAccount`), generación de URL OAuth de autorización (`getAuthorizeUrl`) y publicación directa (`publish`).
- **`categoryClient`:** Listado de categorías de la base de datos según el tipo de entidad (`product` o `service`).
- **`billingClient`:** Gestión completa de facturación (clientes, facturas, DIAN XML, firma, PDFs, envío de email y notas de crédito).

---

## 3. INVENTARIO DE MÓDULOS

### 3.1 Estado de Implementación (V9)

| Módulo | Frontend | Backend | Integración | Detalle Técnico / Comentarios |
|--------|----------|---------|-------------|-------------------------------|
| **Landing** | ✅ Completo | N/A | Mock | Página principal corporativa de la marca. |
| **Login** | ✅ Completo | ✅ | API real | Validación mediante tokens JWT. |
| **Register** | ✅ Completo | ✅ | API real | Registro de usuarios nuevos. |
| **Dashboard** | ⚠️ Parcial | ❌ | Mock | Requiere conectar a endpoints del backend. |
| **Products** | ✅ Completo | ✅ | API real | CRUD con anchos fijos y vista de lista por defecto. Acciones directas (compartir/editar/borrar). |
| **Services** | ✅ Completo | ✅ | API real | CRUD con anchos fijos, vista de lista por defecto e idéntico diseño al de productos. |
| **Categories**| ✅ Completo | ✅ | API real | CRUD con anchos fijos y filtro por tipo de entidad. |
| **Billing** | ✅ Completo | ✅ | API real | Facturación Electrónica DIAN, PDFs, Notas Crédito y Emails. |
| **Agenda** | ⚠️ Parcial | ❌ | Mock | Citas de servicios aún simuladas en el frontend. |
| **Wall** | ✅ Completo | ✅ | API real | Red interna utilizando WebSockets para publicaciones rápidas. |
| **Statistics**| ⚠️ Parcial | ❌ | Mock | Estadísticas de uso y ventas. |
| **Profile** | ✅ Completo | ✅ | API real | Configuración, enlace de redes y gestión de cuentas conectadas. |

---

## 4. SISTEMA DE DISEÑO E INTERFAZ (UI/UX)

### 4.1 Push Drawer Layout
Para mejorar la usabilidad multi-tarea, el comportamiento del drawer lateral derecho cambió:
- Desplaza el elemento principal `.app-main` a la izquierda mediante estilos fluidos de transición en `layout.css`.
- Desactiva el desenfoque oscuro de fondo (`backdrop-filter`) en computadoras de escritorio, permitiendo la visibilidad transparente de la tabla de datos subyacente mientras se interactúa con el formulario.

### 4.2 Sidebar Dinámico
El menú lateral izquierdo ahora reacciona automáticamente ante la UI:
- **Auto-collapse:** Se contrae al abrirse cualquier drawer derecho para preservar la proporción y el área de trabajo en pantalla.
- **Manual override:** Cuenta con un botón de menú (`Menu` icon) siempre visible en la cabecera que permite al usuario alternar de forma manual la expansión de la barra de navegación.

### 4.3 Rediseño y Aislamiento de Estilos de Tabla y Modales
- **Precisión de Columnas:** Las columnas de las tablas principales utilizan un sistema rígido basado en la etiqueta `<colgroup>`. Los módulos asignan anchos fijos en píxeles (ej. Producto `180px`, Categoría `150px`, Estado `110px`, Acciones `120px`), previniendo desbordamientos y espacios irregulares.
- **Aislamiento de Modales:** Se introdujo la regla `.modal-sm .modal-body { display: block !important; }` en `components.css` para aislar los modales pequeños de las colisiones del sistema de grilla de `InvoiceModal.css`, previniendo que los textos cortos se rendericen verticalmente.

---

## 5. GESTIÓN DE ESTADO

### Optimización con Zustand
En la versión V9 se solucionó un problema crítico de bucles infinitos en React causado por la suscripción global de Zustand:
- **Antes:** `const { setSidebarCollapsed } = useStore();` causaba que el componente `Drawer` se volviera a renderizar por cualquier cambio en el almacén de datos (incluyendo el mismo estado del sidebar), provocando un ciclo infinito al cambiar de propiedadedes inline como `onClose`.
- **Ahora:** Se utilizan selectores granulares:
  ```javascript
  const setSidebarCollapsed = useStore(state => state.setSidebarCollapsed);
  const sidebarCollapsed = useStore(state => state.sidebarCollapsed);
  ```
- **Filtro de Actualización:** Se implementó una cláusula de salvaguarda en el efecto del drawer: `if (!sidebarCollapsed) { setSidebarCollapsed(true); }`, evitando llamadas redundantes de mutación de estado.

---

## 6. MODELO DE NEGOCIO

1. **Social Selling Integrado:** Acciones directas de compartir en redes sociales integradas directamente en las filas de las listas de productos/servicios.
2. **Cumplimiento Tributario Nativo:** Las PyMEs facturan y reportan a la DIAN directamente.
3. **Circularidad y Redes:** Visibilización de inventarios locales a través del Módulo Wall y Market.

---

## 7. SEGURIDAD

- **JWT en FastAPI:** Rutas privadas del backend protegidas por cabeceras de autorización `Bearer`.
- **Protección de Credenciales:** La configuración sensible se administra a través de variables de entorno `.env` no rastreadas.
- **Ngrok Header:** Middleware en backend para inyectar cabeceras que omitan las advertencias del navegador en desarrollo.

---

## 8. DEUDA TÉCNICA

- **Módulo Agenda:** Sigue sin un modelo y base de datos dedicados en el backend.
- **Estructura CSS:** Aunque se resolvieron colisiones críticas de modales, los archivos de estilos de páginas (`InvoiceModal.css`, `CustomerModal.css`) aún contienen reglas globales que no están debidamente encapsuladas bajo clases padre específicas.
- **Mocks residuales:** Vistas secundarias como Dashboard, Estadísticas e inventario del Market persisten con datos simulados.

---

## 9. GAPS DE BACKEND

- **Módulo de Citas (Agenda):** Requiere la creación de la tabla `appointments` en base de datos PostgreSQL, los esquemas de Pydantic y el router en FastAPI para sustituir por completo la vista simulada actual.

---

## 10. ROADMAP PRIORIZADO

### Corto Plazo (Prioridad 1)
1. **Desarrollar Backend del Módulo Agenda:** Crear la tabla `appointments` en base de datos, configurar el router en FastAPI y conectar la vista del calendario en el Frontend.
2. **Conectar Dashboard y Estadísticas a la base de datos:** Escribir consultas SQL agregadas en el backend que calculen los ingresos reales, productos/servicios destacados e historial de actividad basándose en los registros reales de facturas y existencias.

### Mediano Plazo (Prioridad 2)
1. **Optimización de Estilos CSS:** Realizar una encapsulación estricta de todas las reglas CSS dentro de sus clases de módulo correspondientes (ej. `.invoice-modal-container .modal-body`) para erradicar cualquier uso de `!important` residual y prevenir colisiones.
2. **Optimización de Lockfile:** Asegurar compatibilidad estricta de versiones de node en todas las plataformas de despliegue.

---

*Documento generado: Julio 2026*
*Versión: V9*
*Próxima actualización recomendada: Tras implementar el backend del módulo de Agenda.*
