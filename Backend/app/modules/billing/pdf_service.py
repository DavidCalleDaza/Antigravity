"""
Servinow API — Billing Module: PDF Generation Service.

Generates professional, regulatory-compliant PDFs for invoices using ReportLab.
Includes styling, item tables, totals, payment details, and QR codes for DIAN.

Diseño:
- `_build_invoice_pdf` es el renderer único: puede escribir a un archivo en
  disco (str) o a un buffer en memoria (BytesIO).
- `render_invoice_pdf_bytes` renderiza SIEMPRE en memoria y en tiempo real —
  es la función que debe usar el endpoint de descarga, para garantizar que
  el PDF entregado refleje el estado actual de la factura (evita servir un
  PDF cacheado y desactualizado tras un cambio de estado, pago o anulación).
- `generate_invoice_pdf` conserva el comportamiento histórico de escribir una
  copia en disco y actualizar `invoice.pdf_url`. Se sigue usando como
  "pre-generación" de conveniencia al crear/actualizar una factura, pero
  NO es la fuente que se sirve en la descarga.
"""

import os
import qrcode
from io import BytesIO
from datetime import datetime
from decimal import Decimal
import uuid

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.core.config import settings
from app.modules.billing.models import Invoice


class InvoicePDFDataError(ValueError):
    """
    Se lanza cuando la factura no tiene los datos mínimos requeridos para
    generar un PDF (factura sin ítems, cliente incompleto, configuración de
    empresa incompleta, etc.). El router debe traducir esto a un 422.
    """


def _validate_invoice_for_pdf(invoice: Invoice) -> None:
    """Valida que existan los datos mínimos para renderizar el documento."""
    missing: list[str] = []

    if invoice.customer is None:
        missing.append("cliente asociado a la factura")
    else:
        if not invoice.customer.business_name:
            missing.append("razón social del cliente")
        if not invoice.customer.id_number:
            missing.append("número de identificación del cliente")

    if not invoice.items:
        missing.append("al menos un ítem/línea de factura")

    if not getattr(settings, "COMPANY_NAME", None):
        missing.append("nombre de la empresa emisora (configuración)")
    if not getattr(settings, "COMPANY_NIT", None):
        missing.append("NIT de la empresa emisora (configuración)")

    if missing:
        # ---- AGREGUE ESTA LÍNEA TEMPORAL PARA VER EL ERROR EN CONSOLA ----
        print(f"\n[ERROR PDF] Faltan los siguientes datos: {missing}\n")
        # ------------------------------------------------------------------
        raise InvoicePDFDataError(
            "No es posible generar el PDF de la factura porque faltan datos "
            "requeridos: " + "; ".join(missing) + "."
        )


def _generate_qr_code_image(data: str) -> BytesIO:
    """Generate a QR code image as a BytesIO stream."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)
    return img_byte_arr


def _load_company_logo_flowable():
    """
    Carga el logotipo de la empresa desde `settings.COMPANY_LOGO_PATH` si
    está configurado y el archivo existe. Si no hay logo disponible, retorna
    None y el encabezado se renderiza solo con el nombre/razón social (no
    debe romper la generación del PDF).
    """
    logo_path = getattr(settings, "COMPANY_LOGO_PATH", None)
    if not logo_path or not os.path.isfile(logo_path):
        return None
    try:
        return RLImage(logo_path, width=1.1 * inch, height=1.1 * inch, kind="proportional")
    except Exception:
        return None


def _build_invoice_pdf(invoice: Invoice, destination, verify_base_url: str = None) -> None:
    """
    Construye el PDF de una factura.

    `destination` puede ser:
      - una ruta de archivo (str): ReportLab escribe directamente a disco.
      - un buffer BytesIO: ReportLab escribe en memoria (sin tocar disco).

    Lanza `InvoicePDFDataError` si a la factura le faltan datos requeridos.
    """
    _validate_invoice_for_pdf(invoice)

    # Setup document
    # letter is 8.5 x 11 inches (612 x 792 points)
    doc = SimpleDocTemplate(
        destination,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    story = []

    # Palette colors
    c_primary = colors.HexColor("#1E293B")     # Slate 800
    c_secondary = colors.HexColor("#475569")   # Slate 600
    c_light_bg = colors.HexColor("#F8FAFC")    # Slate 50
    c_border = colors.HexColor("#E2E8F0")      # Slate 200
    c_accent = colors.HexColor("#0F766E")      # Teal 700

    # Styles
    styles = getSampleStyleSheet()

    # Base text styles
    style_normal = ParagraphStyle(
        "Normal_Custom",
        parent=styles["Normal"],
        fontSize=9,
        leading=11,
        textColor=c_secondary,
    )
    style_bold = ParagraphStyle(
        "Bold_Custom",
        parent=style_normal,
        fontName="Helvetica-Bold",
        textColor=c_primary,
    )
    style_title = ParagraphStyle(
        "Title_Custom",
        parent=style_normal,
        fontSize=18,
        leading=22,
        fontName="Helvetica-Bold",
        textColor=c_primary,
    )
    style_subtitle = ParagraphStyle(
        "Subtitle_Custom",
        parent=style_normal,
        fontSize=10,
        leading=13,
        fontName="Helvetica-Bold",
        textColor=c_accent,
    )
    style_header_right = ParagraphStyle(
        "Header_Right",
        parent=style_normal,
        fontSize=11,
        leading=14,
        fontName="Helvetica-Bold",
        alignment=2,  # Right
        textColor=c_primary,
    )
    style_text_right = ParagraphStyle(
        "Text_Right",
        parent=style_normal,
        alignment=2,  # Right
    )
    style_text_bold_right = ParagraphStyle(
        "Text_Bold_Right",
        parent=style_bold,
        alignment=2,  # Right
    )
    style_table_header = ParagraphStyle(
        "Table_Header",
        parent=style_normal,
        fontSize=9,
        leading=11,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )
    style_table_header_right = ParagraphStyle(
        "Table_Header_Right",
        parent=style_table_header,
        alignment=2,
    )
    # Fuente ligeramente menor para la razón social del cliente: junto con el
    # ancho ampliado de la columna izquierda de la tabla de cliente, evita
    # que nombres largos salten a una segunda línea.
    style_customer_name = ParagraphStyle(
        "Customer_Name",
        parent=style_normal,
        fontSize=9,
        leading=10.5,
    )

    # --- 1. HEADER SECTION (Logo + Company vs Invoice Metadata) ---
    resolution_text = (
        f"Resolución de Facturación No. {settings.DIAN_RESOLUTION_NUMBER or '18760000001'} "
        f"del {settings.DIAN_RESOLUTION_DATE or '2026-01-01'}. "
        f"Prefijo {invoice.prefix} del No. {settings.DIAN_RESOLUTION_RANGE_FROM} al {settings.DIAN_RESOLUTION_RANGE_TO}."
    )

    company_info = [
        Paragraph(settings.COMPANY_NAME, style_title),
        Spacer(1, 4),
        Paragraph(f"<b>NIT:</b> {settings.COMPANY_NIT}", style_normal),
        Paragraph(f"<b>Dirección:</b> {settings.COMPANY_ADDRESS}, {settings.COMPANY_CITY}", style_normal),
        Paragraph(f"<b>Teléfono:</b> {settings.COMPANY_PHONE} | <b>Email:</b> {settings.COMPANY_EMAIL}", style_normal),
        Spacer(1, 4),
        Paragraph(f"<font size=7 color='#64748B'>{resolution_text}</font>", style_normal),
    ]

    invoice_meta = [
        Paragraph("FACTURA ELECTRÓNICA DE VENTA", style_header_right),
        Spacer(1, 6),
        Paragraph(f"<font size=14 color='#0F766E'>{invoice.full_number}</font>", style_header_right),
        Spacer(1, 8),
        Paragraph(f"<b>Fecha Emisión:</b> {invoice.issued_at.strftime('%Y-%m-%d %H:%M')}", style_text_right),
        Paragraph(
            f"<b>Fecha Vencimiento:</b> {invoice.due_date.strftime('%Y-%m-%d') if invoice.due_date else 'N/A'}",
            style_text_right,
        ),
        Paragraph(f"<b>Estado:</b> {invoice.status.upper()}", style_text_right),
        Paragraph(f"<b>Método de Pago:</b> {invoice.payment_method}", style_text_right),
        Paragraph(f"<b>Medio de Pago:</b> Código DIAN {invoice.payment_means}", style_text_right),
        Paragraph(f"<b>Moneda:</b> {invoice.currency}", style_text_right),
    ]

    logo_flowable = _load_company_logo_flowable()

    if logo_flowable is not None:
        header_row = [[logo_flowable, company_info, invoice_meta]]
        header_col_widths = [1.2 * inch, 2.8 * inch, 3.5 * inch]
    else:
        header_row = [[company_info, invoice_meta]]
        header_col_widths = [4.6 * inch, 2.9 * inch]

    header_table = Table(header_row, colWidths=header_col_widths)
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (-1, 0), (-1, 0), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    story.append(header_table)
    story.append(Spacer(1, 15))

    # --- 2. CUSTOMER / RECEPTOR SECTION ---
    customer = invoice.customer
    customer_name = customer.business_name
    customer_id_str = f"{customer.id_type}: {customer.id_number}" + (f"-{customer.dv}" if customer.dv else "")

    # Grilla única de 4 filas x 2 columnas: la columna derecha arranca en la
    # MISMA fila que el nombre/razón social (en vez de empezar más abajo),
    # así se aprovecha el espacio en blanco que quedaba junto al nombre.
    # Fila 1: Nombre/Razón Social | Ciudad
    # Fila 2: Identificación      | Email
    # Fila 3: Régimen/Resp. IVA   | Teléfono
    # Fila 4: Dirección           | (vacío)
    grid_data = [
        [
            Paragraph(f"<b>Nombre/Razón Social:</b> {customer_name}", style_customer_name),
            Paragraph(f"<b>Dirección:</b> {customer.location.address if customer.location else 'N/A'}", style_normal)            
        ],
        [
            Paragraph(f"<b>Identificación:</b> {customer_id_str}", style_normal),
            Paragraph(f"<b>Ciudad:</b> {(customer.location.city if customer.location else 'N/A')} - {(customer.location.state if customer.location else 'N/A')}", style_normal)
            
        ],
        [
            Paragraph(f"<b>Régimen:</b> {customer.tax_regime}", style_normal),
            Paragraph(f"<b>Email:</b> {customer.email}", style_normal)            
        ],
        [
            Paragraph(f"<b>Resp. IVA:</b> {'Sí' if customer.is_tax_responsible else 'No'}", style_normal),
            Paragraph(f"<b>Teléfono:</b> {customer.phone or 'N/A'}", style_normal)
        ],
    ]

    # Ancho total disponible dentro del contenedor = 7.5" - paddings laterales (28pt) = ~7.1"
    inner_table = Table(
        grid_data,
        colWidths=[4.3 * inch, 2.8 * inch],
    )
    inner_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (1, 0), (1, -1), 20), 
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    # Contenido unificado para el recuadro gris
    outer_content = [
        Paragraph("<b>DATOS DEL CLIENTE:</b>", style_subtitle),
        Spacer(1, 8),
        inner_table
    ]

    # Contenedor exterior (1 sola columna) para pintar el fondo, bordes y padding general
    customer_table = Table(
        [[outer_content]],
        colWidths=[7.5 * inch]
    )
    customer_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), c_light_bg),
                ("BOX", (0, 0), (-1, -1), 0.5, c_border),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
            ]
        )
    )

    story.append(customer_table)
    story.append(Spacer(1, 15))

    # --- 3. ITEMS TABLE ---
    # Header row — se repite automáticamente en cada página con repeatRows=1
    table_data = [
        [
            Paragraph("Item", style_table_header),
            Paragraph("Código / Descripción", style_table_header),
            Paragraph("Cant.", style_table_header_right),
            Paragraph("Precio Unit.", style_table_header_right),
            Paragraph("IVA %", style_table_header_right),
            Paragraph("Subtotal", style_table_header_right),
        ]
    ]

    for idx, item in enumerate(invoice.items, start=1):
        desc = item.description
        if item.code:
            desc = f"[{item.code}] {desc}"

        table_data.append(
            [
                Paragraph(str(idx), style_normal),
                Paragraph(desc, style_normal),
                Paragraph(f"{item.quantity:,.2f}", style_text_right),
                Paragraph(f"${item.unit_price:,.2f}", style_text_right),
                Paragraph(f"{item.tax_rate:.0f}%", style_text_right),
                Paragraph(f"${item.subtotal:,.2f}", style_text_right),
            ]
        )

    items_table = Table(
        table_data,
        colWidths=[0.5 * inch, 3.4 * inch, 0.7 * inch, 1.0 * inch, 0.7 * inch, 1.2 * inch],
        repeatRows=1,  # Repite el encabezado en cada página cuando hay muchos ítems
    )
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), c_primary),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light_bg]),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, c_border),
            ]
        )
    )
    story.append(items_table)
    story.append(Spacer(1, 10))

    # --- 4. TOTALS & QR CODE & NOTES SECTION ---
    # Prepare QR code content (fallbacks if qr_data is not present)
    if not verify_base_url:
        verify_base_url = getattr(settings, "PUBLIC_VERIFY_BASE_URL", "https://tudominio.com/verify")
    verify_identifier = invoice.cufe or str(invoice.id)
    qr_content = f"{verify_base_url}/{verify_identifier}"

    qr_stream = _generate_qr_code_image(qr_content)
    qr_flowable = RLImage(qr_stream, width=1.2 * inch, height=1.2 * inch)

    # Totals column
    discount_p = Paragraph(f"${invoice.discount_total:,.2f}", style_text_right)
    tax_base_p = Paragraph(f"${invoice.tax_base:,.2f}", style_text_right)
    tax_total_p = Paragraph(f"${invoice.tax_total:,.2f}", style_text_right)
    total_p = Paragraph(f"<font color='#0F766E'><b>${invoice.total:,.2f}</b></font>", style_text_bold_right)

    totals_data = [
        [Paragraph("<b>Subtotal:</b>", style_normal), Paragraph(f"${invoice.subtotal:,.2f}", style_text_right)],
    ]
    if invoice.discount_total > 0:
        totals_data.append([Paragraph("<b>Descuento:</b>", style_normal), discount_p])

    totals_data.extend([
        [Paragraph("<b>Base Gravable (IVA):</b>", style_normal), tax_base_p],
        [Paragraph("<b>Impuestos (IVA):</b>", style_normal), tax_total_p],
        [Paragraph("<b>Total a Pagar:</b>", style_bold), total_p],
    ])

    totals_table = Table(
        totals_data,
        colWidths=[1.8 * inch, 1.2 * inch],
    )
    totals_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.5, c_border),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
            ]
        )
    )

    # CUFE box + Notes
    cufe_str = invoice.cufe or "N/A"
    dian_status_label = "MODO DE PRUEBAS - SIMULADO" if invoice.dian_status == "none" else invoice.dian_status.upper()
    cufe_notes_col = [
        Paragraph("<b>CUFE (Código Único de Factura Electrónica):</b>", style_bold),
        Paragraph(f"<font size=7 color='#475569'>{cufe_str}</font>", style_normal),
        Spacer(1, 6),
        Paragraph(f"<b>Estado DIAN:</b> <font color='#0F766E'><b>{dian_status_label}</b></font>", style_normal),
        Spacer(1, 6),
    ]

    if invoice.notes:
        cufe_notes_col.extend([
            Paragraph("<b>Notas / Observaciones:</b>", style_bold),
            Paragraph(invoice.notes, style_normal),
        ])

    # Combine QR, CUFE/Notes, and Totals in a single table
    summary_table = Table(
        [[qr_flowable, cufe_notes_col, totals_table]],
        colWidths=[1.4 * inch, 3.1 * inch, 3.0 * inch],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    story.append(Spacer(1, 10))
    story.append(KeepTogether([summary_table]))

    # --- 5. FOOTER / LEGAL DISCLOSURE ---
    story.append(Spacer(1, 20))
    footer_text = (
        "Esta factura es una representación gráfica de un documento electrónico autorizado por la DIAN. "
        "Servinow API v0.1.0 — Módulo de Facturación Electrónica. ¡Gracias por su confianza!"
    )
    story.append(Paragraph(f"<center><font size=7 color='#94A3B8'>{footer_text}</font></center>", style_normal))

    # Build the document
    doc.build(story)


def render_invoice_pdf_bytes(invoice: Invoice, verify_base_url: str = None) -> bytes:
    """
    Renderiza el PDF de la factura en memoria, a partir de su estado actual.
    Acepta de forma opcional una URL de origen dinámica para los códigos QR.
    """
    buffer = BytesIO()
    _build_invoice_pdf(invoice, buffer, verify_base_url=verify_base_url)
    buffer.seek(0)
    return buffer.read()


def generate_invoice_pdf(invoice: Invoice) -> str:
    """
    Genera el PDF y lo guarda como copia de conveniencia en disco
    (uploads/invoices/{id}.pdf), actualizando `invoice.pdf_url`.

    Se usa como "pre-generación" al crear/actualizar una factura (ver
    router.py). NO se usa para servir descargas — para eso se usa
    `render_invoice_pdf_bytes`, que siempre renderiza en tiempo real.

    Returns:
        La URL pública del PDF generado (ej. /uploads/invoices/{id}.pdf).
    """
    directory = os.path.join("uploads", "invoices")
    os.makedirs(directory, exist_ok=True)

    filename = f"{invoice.id}.pdf"
    filepath = os.path.join(directory, filename)
    public_url = f"/uploads/invoices/{filename}"

    _build_invoice_pdf(invoice, filepath)

    invoice.pdf_url = public_url
    return public_url
