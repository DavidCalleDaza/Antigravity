"""
Servinow API — Exports Module: Constants.

Valores fijos de identidad corporativa y textos institucionales,
usados por excel.py, csv.py y charts.py. Cambiar la marca, el pie de
página o la versión del sistema se hace ÚNICAMENTE aquí.
"""

from pathlib import Path

# ==========================================================
# IDENTIDAD CORPORATIVA
# ==========================================================

SYSTEM_NAME = "SERVINOW"
SYSTEM_SLOGAN = "Sistema Inteligente de Facturación"
SYSTEM_VERSION = "1.0.0"

# ==========================================================
# RUTAS
# ==========================================================

EXPORTS_DIR = Path(__file__).resolve().parent
ASSETS_DIR = EXPORTS_DIR / "assets"

DEFAULT_LOGO_PATH = ASSETS_DIR / "logo.png"

# ==========================================================
# PIE DE PÁGINA
# ==========================================================

FOOTER_LINE_1 = "Reporte generado automáticamente por Servinow."
FOOTER_LINE_2 = (
    "Este documento fue generado por el Sistema Inteligente de Facturación."
)

# ==========================================================
# EXCEL
# ==========================================================

MAX_SHEET_NAME_LENGTH = 31

LOGO_COLUMN_SPAN = 2
HEADER_TEXT_START_COL = 2

# ==========================================================
# GRÁFICOS
# ==========================================================

CHART_STACK_ROW_HEIGHT = 20
CHART_WIDTH_CM = 18
CHART_HEIGHT_CM = 11