"""
Servinow API — Exports Module: Utilities.

Funciones auxiliares de formato compartidas entre excel.py y csv.py.
No contienen lógica de negocio de ningún módulo específico, ni conocen
OpenPyXL directamente (eso vive en excel.py/charts.py).
"""

from datetime import datetime
from decimal import Decimal

from app.modules.exports.constants import MAX_SHEET_NAME_LENGTH


def format_currency_value(value) -> float:
    """Convierte Decimal/None a float plano para exportación."""
    if value is None:
        return 0.0
    return float(value)


# Alias explícito: el mismo conversor sirve para currency, percent e integer,
# ya que en los tres casos OpenPyXL necesita un número plano y es el
# number_format el que decide cómo se ve (moneda, %, entero con separador).
to_numeric_value = format_currency_value


def format_date_value(value):
    """Normaliza date/datetime a un objeto date puro (Excel maneja fechas nativas)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def safe_str(value) -> str:
    """Convierte cualquier valor a string seguro para CSV/Excel, nunca None."""
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(float(value))
    return str(value)


def autosize_column_width(values: list, header: str, min_width: int = 10, max_width: int = 50) -> int:
    """Calcula un ancho de columna razonable según el contenido más largo."""
    longest = len(header)
    for v in values:
        longest = max(longest, len(safe_str(v)))
    return min(max(longest + 2, min_width), max_width)


def short_sheet_name(name: str, max_length: int = MAX_SHEET_NAME_LENGTH) -> str:
    """
    Trunca un nombre de hoja al límite duro de Excel (31 caracteres) y elimina
    caracteres que Excel prohíbe en nombres de hoja: : \\ / ? * [ ]
    """
    forbidden = set(':\\/?*[]')
    cleaned = "".join(ch for ch in name if ch not in forbidden).strip()
    if not cleaned:
        cleaned = "Reporte"
    return cleaned[:max_length]