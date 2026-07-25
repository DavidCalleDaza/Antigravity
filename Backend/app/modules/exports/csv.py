"""
Servinow API — Exports Module: CSV Builder.

Genera CSV usando exclusivamente csv.writer de la librería estándar,
con codificación utf-8-sig para compatibilidad directa con Excel.
"""

import csv
from io import StringIO

from app.modules.exports.templates import ReportData
from app.modules.exports.utils import safe_str


def build_csv_bytes(report: ReportData) -> bytes:
    """Construye el CSV completo (columnas + filas) y retorna bytes utf-8-sig."""
    buffer = StringIO()
    writer = csv.writer(
        buffer,
        delimiter=",",
        quotechar='"',
        quoting=csv.QUOTE_MINIMAL,
        lineterminator="\r\n",
    )

    writer.writerow([col.label for col in report.columns])
    for row_data in report.rows:
        writer.writerow([safe_str(row_data.get(col.key)) for col in report.columns])

    return buffer.getvalue().encode("utf-8-sig")