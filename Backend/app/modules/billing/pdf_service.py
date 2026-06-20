"""
Servinow API — Billing Module: PDF Generation Service.

Generates professional, regulatory-compliant PDFs for invoices using ReportLab.
Includes styling, item tables, totals, payment details, and QR codes for DIAN.
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


def generate_invoice_pdf(invoice: Invoice) -> str:
    """
    Generate an invoice PDF and save it in the uploads folder.

    Returns:
        The public URL/path of the generated PDF (e.g., /uploads/invoices/{id}.pdf).
    """
    # Ensure directory exists
    directory = os.path.join("uploads", "invoices")
    os.makedirs(directory, exist_ok=True)

    filename = f"{invoice.id}.pdf"
    filepath = os.path.join(directory, filename)
    public_url = f"/uploads/invoices/{filename}"

    # Setup document
    # letter is 8.5 x 11 inches (612 x 792 points)
    doc = SimpleDocTemplate(
        filepath,
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

    # --- 1. HEADER SECTION (Two Column: Company vs Invoice Metadata) ---
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
        Paragraph(f"<b>Método de Pago:</b> {invoice.payment_method}", style_text_right),
        Paragraph(f"<b>Moneda:</b> {invoice.currency}", style_text_right),
    ]

    header_table = Table(
        [[company_info, invoice_meta]],
        colWidths=[4.0 * inch, 3.5 * inch],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 0),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
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

    cust_col_1 = [
        Paragraph("<b>ADQUIRIENTE / CLIENTE:</b>", style_subtitle),
        Spacer(1, 4),
        Paragraph(f"<b>Nombre/Razon Social:</b> {customer_name}", style_normal),
        Paragraph(f"<b>Identificación:</b> {customer_id_str}", style_normal),
        Paragraph(f"<b>Régimen:</b> {customer.tax_regime} | <b>Resp. IVA:</b> {'Sí' if customer.is_tax_responsible else 'No'}", style_normal),
    ]

    cust_col_2 = [
        Spacer(1, 12),
        Paragraph(f"<b>Dirección:</b> {customer.address or 'N/A'}", style_normal),
        Paragraph(f"<b>Ciudad:</b> {customer.city or 'N/A'} - {customer.department or 'N/A'}", style_normal),
        Paragraph(f"<b>Email:</b> {customer.email}", style_normal),
        Paragraph(f"<b>Teléfono:</b> {customer.phone or 'N/A'}", style_normal),
    ]

    customer_table = Table(
        [[cust_col_1, cust_col_2]],
        colWidths=[3.75 * inch, 3.75 * inch],
    )
    customer_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), c_light_bg),
                ("BOX", (0, 0), (-1, -1), 0.5, c_border),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )

    story.append(customer_table)
    story.append(Spacer(1, 15))

    # --- 3. ITEMS TABLE ---
    # Header row
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
    qr_content = invoice.qr_data or (
        f"NumFac: {invoice.full_number}\n"
        f"NitOfe: {settings.COMPANY_NIT}\n"
        f"NitAdq: {customer.id_number}\n"
        f"ValFac: {invoice.subtotal:.2f}\n"
        f"ValIva: {invoice.tax_total:.2f}\n"
        f"ValTot: {invoice.total:.2f}\n"
        f"CUFE: {invoice.cufe or 'N/A'}"
    )

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
        [Paragraph("<b>Impuestos (IVA 19%):</b>", style_normal), tax_total_p],
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
        Spacer(1, 8),
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
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
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

    # Update invoice pdf_url
    invoice.pdf_url = public_url

    return public_url
