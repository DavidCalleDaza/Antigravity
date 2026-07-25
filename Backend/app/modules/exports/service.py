"""
Servinow API — Exports Module: Service.

Punto de entrada único para cualquier módulo que necesite exportar datos.
Los módulos (Billing, Statistics, etc.) solo construyen un ReportData —
este servicio decide cómo convertirlo en bytes de Excel o CSV.

Ningún módulo de negocio debe importar excel.py, csv.py o charts.py
directamente: siempre a través de ExportService.
"""

from io import BytesIO

from app.modules.exports.csv import build_csv_bytes
from app.modules.exports.excel import build_excel_report
from app.modules.exports.templates import ReportData


class ExportService:
    """Fachada única de exportación — SOLID: un solo punto de responsabilidad por formato."""

    @staticmethod
    def export_excel(report: ReportData) -> BytesIO:
        """Genera el reporte Excel corporativo completo (encabezado, tabla, resumen, gráfico, pie)."""
        return build_excel_report(report)

    @staticmethod
    def export_csv(report: ReportData) -> bytes:
        """Genera el CSV (utf-8-sig) listo para abrir directamente en Excel."""
        return build_csv_bytes(report)