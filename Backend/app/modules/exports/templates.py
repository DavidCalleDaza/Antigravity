"""
DonApp API — Exports Module: Templates.

Estructuras de datos genéricas que cualquier módulo (Billing, Statistics,
Products, etc.) usa para describir QUÉ exportar, sin saber CÓMO se
construye el archivo. El motor (excel.py/csv.py/charts.py/service.py) es
el único que conoce el "cómo".
"""

from dataclasses import dataclass, field
from typing import Any, Literal
from enum import Enum


class ColumnFormat(str, Enum):
    TEXT = "text"
    CURRENCY = "currency"
    PERCENT = "percent"
    DATE = "date"
    INTEGER = "integer"


ChartType = Literal["bar", "column", "pie", "line"]


@dataclass
class ColumnDef:
    """Define una columna de la tabla del reporte."""
    key: str                     # llave dentro de cada fila (dict)
    label: str                   # encabezado visible
    format: ColumnFormat = ColumnFormat.TEXT
    width: int | None = None     # None = autosize


@dataclass
class ReportMetadata:
    """Encabezado corporativo del reporte: quién, cuándo, para quién, con qué filtros."""
    report_title: str
    generated_by: str
    company: str = "DonApp"                 # empresa/cliente para la que se genera el reporte
    period_label: str | None = None
    filters: dict[str, Any] = field(default_factory=dict)
    system_name: str = "DonApp"
    sheet_name: str | None = None             # nombre corto de hoja; si None se infiere del título
    logo_path: str | None = None              # ruta al logo; si None o inexistente, se omite


@dataclass
class SummaryItem:
    """Un indicador del bloque de Resumen Ejecutivo (ej. 'Ingresos Totales': 12500000)."""
    label: str
    value: Any
    format: ColumnFormat = ColumnFormat.TEXT


@dataclass
class ChartSpec:
    """Descripción de un gráfico nativo de Excel a insertar debajo del resumen."""
    chart_type: ChartType
    title: str
    category_column: str            # key de ColumnDef usada como eje de categorías
    value_column: str               # key de ColumnDef usada como valores/serie
    x_axis_title: str | None = None
    y_axis_title: str | None = None
    top_n: int | None = None  # si se define, el gráfico solo grafica los N registros con mayor valor (la tabla sigue mostrando todo)


@dataclass
class ReportData:
    """Paquete completo que un módulo (Billing, Statistics, ...) entrega al ExportService."""
    metadata: ReportMetadata
    columns: list[ColumnDef]
    rows: list[dict[str, Any]]
    summary: list[SummaryItem] = field(default_factory=list)
    charts: list[ChartSpec] = field(default_factory=list)