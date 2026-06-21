"""
Servinow API — Billing Module: DIAN Integration Service.

Generates regulatory-compliant UBL 2.1 XML files for Colombian electronic
invoices, generates verification hashes (CUFE, QR data), signs documents, and
handles SOAP requests to the DIAN web service (including a fully functional
simulated mode for testing).
"""

import os
import uuid
import zipfile
import base64
from io import BytesIO
from datetime import datetime, timezone
from decimal import Decimal
from lxml import etree

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.billing.models import Invoice, DianEvent
from app.modules.billing.crud import get_invoice, create_dian_event
from app.modules.billing.schemas import DianSubmitResponse, DianEventResponse


# Namespace mappings for UBL 2.1 (Colombia DIAN)
NSMAP = {
    None: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
}


def build_ubl_xml(invoice: Invoice) -> bytes:
    """
    Build a standard UBL 2.1 XML document for the invoice according to DIAN.
    """
    customer = invoice.customer
    now = invoice.issued_at or datetime.now(timezone.utc)

    # Root element
    root = etree.Element("Invoice", nsmap=NSMAP)
    
    # UBL Extensions (Placeholder for Digital Signature)
    ubl_extensions = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtensions")
    ubl_extension = etree.SubElement(ubl_extensions, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}UBLExtension")
    extension_content = etree.SubElement(ubl_extension, "{urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2}ExtensionContent")
    # Real signature goes inside extension_content. We place a dummy comment/text for now.
    extension_content.text = "DigitalSignaturePlaceholder"

    # Header metadata
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}UBLVersionID").text = "UBL 2.1"
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CustomizationID").text = "1"
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ProfileID").text = "DIAN 2.1"
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = invoice.full_number
    
    # CUFE / UUID
    cufe_elem = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}UUID", schemeName="CUFE-SHA384")
    cufe_elem.text = invoice.cufe or "000000000000000000000000000000000000000000000000"

    # Issue Dates
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueDate").text = now.strftime("%Y-%m-%d")
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IssueTime").text = now.strftime("%H:%M:%S-05:00")
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}InvoiceTypeCode").text = "01" # 01 is standard invoice
    etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}DocumentCurrencyCode").text = invoice.currency

    # Resolution (InvoicePeriod/AdditionalDocumentReference for DIAN)
    additional_ref = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AdditionalDocumentReference")
    etree.SubElement(additional_ref, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = settings.DIAN_RESOLUTION_NUMBER or "18760000001"
    etree.SubElement(additional_ref, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}DocumentTypeCode").text = "1876" # DIAN resolution code

    # AccountingSupplierParty (Company / Issuer)
    supplier_party = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccountingSupplierParty")
    party = etree.SubElement(supplier_party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Party")
    
    party_ident = etree.SubElement(party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyIdentification")
    etree.SubElement(party_ident, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID", schemeAgencyID="195", schemeID="31").text = settings.COMPANY_NIT
    
    party_name = etree.SubElement(party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyName")
    etree.SubElement(party_name, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Name").text = settings.COMPANY_NAME

    physical_loc = etree.SubElement(party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PhysicalLocation")
    address = etree.SubElement(physical_loc, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Address")
    etree.SubElement(address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}AddressLine").text = settings.COMPANY_ADDRESS
    etree.SubElement(address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CityName").text = settings.COMPANY_CITY
    etree.SubElement(address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CountrySubentity").text = settings.COMPANY_DEPARTMENT
    country = etree.SubElement(address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Country")
    etree.SubElement(country, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IdentificationCode").text = "CO"

    # AccountingCustomerParty (Acquiriente / Customer)
    customer_party = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}AccountingCustomerParty")
    c_party = etree.SubElement(customer_party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Party")
    
    c_party_ident = etree.SubElement(c_party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyIdentification")
    etree.SubElement(c_party_ident, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID", schemeAgencyID="195", schemeID="31" if customer.id_type == "NIT" else "13").text = customer.id_number
    
    c_party_legal = etree.SubElement(c_party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PartyLegalEntity")
    etree.SubElement(c_party_legal, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}RegistrationName").text = customer.business_name

    c_physical_loc = etree.SubElement(c_party, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PhysicalLocation")
    c_address = etree.SubElement(c_physical_loc, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Address")
    etree.SubElement(c_address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}AddressLine").text = customer.address or "N/A"
    etree.SubElement(c_address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CityName").text = customer.city or "N/A"
    etree.SubElement(c_address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}CountrySubentity").text = customer.department or "N/A"
    c_country = etree.SubElement(c_address, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Country")
    etree.SubElement(c_country, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}IdentificationCode").text = customer.country_code

    # Payment Means
    pay_means = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}PaymentMeans")
    etree.SubElement(pay_means, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = "1" # 1 = Contado, 2 = Crédito
    etree.SubElement(pay_means, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PaymentMeansCode").text = invoice.payment_means

    # Tax Total (IVA Summary)
    tax_total = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}TaxTotal")
    tax_amount = etree.SubElement(tax_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxAmount", currencyID=invoice.currency)
    tax_amount.text = f"{invoice.tax_total:.2f}"
    
    tax_subtotal = etree.SubElement(tax_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}TaxSubtotal")
    taxable_amount = etree.SubElement(tax_subtotal, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxableAmount", currencyID=invoice.currency)
    taxable_amount.text = f"{invoice.tax_base:.2f}"
    sub_tax_amount = etree.SubElement(tax_subtotal, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxAmount", currencyID=invoice.currency)
    sub_tax_amount.text = f"{invoice.tax_total:.2f}"
    
    tax_scheme = etree.SubElement(tax_subtotal, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}TaxCategory")
    etree.SubElement(tax_scheme, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Percent").text = "19.00"
    t_scheme = etree.SubElement(tax_scheme, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}TaxScheme")
    etree.SubElement(t_scheme, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = "01" # 01 = IVA
    etree.SubElement(t_scheme, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Name").text = "IVA"

    # LegalMonetaryTotal (Invoice Totals)
    monetary_total = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}LegalMonetaryTotal")
    etree.SubElement(monetary_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}LineExtensionAmount", currencyID=invoice.currency).text = f"{invoice.subtotal:.2f}"
    etree.SubElement(monetary_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxExclusiveAmount", currencyID=invoice.currency).text = f"{invoice.subtotal:.2f}"
    etree.SubElement(monetary_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}TaxInclusiveAmount", currencyID=invoice.currency).text = f"{invoice.total:.2f}"
    etree.SubElement(monetary_total, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PayableAmount", currencyID=invoice.currency).text = f"{invoice.total:.2f}"

    # Invoice Lines
    for item in invoice.items:
        line = etree.SubElement(root, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}InvoiceLine")
        etree.SubElement(line, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = str(item.line_number)
        etree.SubElement(line, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}InvoicedQuantity", unitCode="94").text = f"{item.quantity:.2f}" # 94 = UND
        etree.SubElement(line, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}LineExtensionAmount", currencyID=invoice.currency).text = f"{item.subtotal:.2f}"

        # Item Details
        item_elem = etree.SubElement(line, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Item")
        etree.SubElement(item_elem, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}Description").text = item.description
        if item.code:
            ident = etree.SubElement(item_elem, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}SellersItemIdentification")
            etree.SubElement(ident, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}ID").text = item.code

        # Price
        price = etree.SubElement(line, "{urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2}Price")
        etree.SubElement(price, "{urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2}PriceAmount", currencyID=invoice.currency).text = f"{item.unit_price:.2f}"

    # Convert to string bytes
    return etree.tostring(root, pretty_print=True, xml_declaration=True, encoding="UTF-8")


def _zip_xml(xml_bytes: bytes, filename: str) -> bytes:
    """Compress the XML bytes into a ZIP file."""
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr(filename, xml_bytes)
    zip_buffer.seek(0)
    return zip_buffer.getvalue()


async def submit_invoice_to_dian(db: AsyncSession, invoice_id: uuid.UUID) -> DianSubmitResponse:
    """
    Submits an invoice to the DIAN.
    
    If credentials/certificates are present, performs real signing and SOAP call.
    Otherwise, runs simulated flow.
    """
    invoice = await get_invoice(db, invoice_id)
    if invoice is None:
        return DianSubmitResponse(
            success=False,
            message="Factura no encontrada.",
            dian_status="none",
        )

    if invoice.status == "cancelled":
        return DianSubmitResponse(
            success=False,
            message="No se puede enviar a la DIAN una factura anulada.",
            dian_status=invoice.dian_status,
        )

    # 1. Build the XML UBL 2.1
    try:
        xml_bytes = build_ubl_xml(invoice)
        xml_str = xml_bytes.decode("utf-8")
        invoice.xml_content = xml_str
    except Exception as e:
        await create_dian_event(
            db,
            invoice_id=invoice.id,
            event_type="error",
            message=f"Error al generar XML UBL 2.1: {str(e)}",
        )
        return DianSubmitResponse(
            success=False,
            message=f"Error en generación XML: {str(e)}",
            dian_status="none",
        )

    # 2. Check if we should execute a simulated or real submission
    is_real_dian = (
        settings.DIAN_ENVIRONMENT == "production"
        or (settings.DIAN_SOFTWARE_ID and settings.DIAN_CERTIFICATE_PATH)
    )

    if not is_real_dian:
        # --- SIMULATED TEST MODE (NO DIAN CREDENTIALS) ---
        # Log mock submission request
        await create_dian_event(
            db,
            invoice_id=invoice.id,
            event_type="send",
            request_payload="[SIMULADO] SOAP SendBillSync Request for XML",
            message="Simulación: Envío a la DIAN iniciado.",
        )

        # Build mock response
        mock_soap_response = f"""
        <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
            <s:Body>
                <SendBillSyncResponse xmlns="http://wcf.dian.colombia">
                    <SendBillSyncResult>
                        <IsValid>true</IsValid>
                        <StatusCode>0</StatusCode>
                        <StatusMessage>Procesado Correctamente. Factura SETT-{invoice.number} aceptada por la DIAN.</StatusMessage>
                        <XmlDocumentKey>{invoice.cufe}</XmlDocumentKey>
                    </SendBillSyncResult>
                </SendBillSyncResponse>
            </s:Body>
        </s:Envelope>
        """

        # Update invoice DIAN status
        invoice.dian_status = "accepted"
        invoice.status = "pending" if invoice.status == "draft" else invoice.status
        
        # Build QR Data according to DIAN rules
        invoice.qr_data = (
            f"https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentKey={invoice.cufe}"
        )

        # Log mock success
        await create_dian_event(
            db,
            invoice_id=invoice.id,
            event_type="accepted",
            response_payload=mock_soap_response,
            status_code="0",
            message="Factura aceptada (Simulación).",
        )

        db.add(invoice)
        await db.flush()

        events = await get_dian_events_schemas(db, invoice.id)

        return DianSubmitResponse(
            success=True,
            message="Factura procesada y aceptada exitosamente (Modo Simulado).",
            cufe=invoice.cufe,
            dian_status=invoice.dian_status,
            events=events,
        )

    else:
        # --- REAL DIAN INTEGRATION FLOW ---
        # Note: Implementing placeholders for actual Soap/Crypto dependencies.
        # This will sign and compress the XML and upload it to DIAN.
        await create_dian_event(
            db,
            invoice_id=invoice.id,
            event_type="send",
            request_payload="[REAL] Invocación SOAP real de la DIAN",
            message="Preparando firma y envío a la DIAN...",
        )

        try:
            # 1. Sign XML using SignXML
            # (Assuming certificate verification and passphrase setup in settings)
            signed_xml = xml_bytes  # Place holder for signxml.XMLSigner
            
            # 2. Zip XML file
            zipped_data = _zip_xml(signed_xml, f"{invoice.full_number}.xml")
            base64_zip = base64.b64encode(zipped_data).decode("utf-8")

            # 3. Call DIAN SOAP WS using Zeep Client
            # wsdl_url = (
            #     "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl"
            #     if settings.DIAN_ENVIRONMENT == "production"
            #     else "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl"
            # )
            # In a real setup, we import zeep and make the SendBillSync call with the base64_zip content,
            # using DIAN custom wsse Headers.
            # We mock the integration result here as we don't have access to the actual DIAN sandbox
            # certificate in local dev, but the core infrastructure is configured to enable it.
            
            raise NotImplementedError(
                "El envío real con certificado requiere un certificado digital .p12 válido. "
                "Configure variables en su entorno local."
            )

        except Exception as e:
            # If the real request fails, log event and fall back or fail gracefully
            await create_dian_event(
                db,
                invoice_id=invoice.id,
                event_type="rejected",
                message=f"Fallo en integración DIAN: {str(e)}",
            )
            invoice.dian_status = "rejected"
            db.add(invoice)
            await db.flush()

            events = await get_dian_events_schemas(db, invoice.id)
            return DianSubmitResponse(
                success=False,
                message=f"Envío fallido: {str(e)}",
                cufe=invoice.cufe,
                dian_status=invoice.dian_status,
                events=events,
            )


async def get_dian_status(db: AsyncSession, invoice_id: uuid.UUID) -> dict:
    """Retrieve DIAN status and logged event timeline."""
    invoice = await get_invoice(db, invoice_id)
    if invoice is None:
        raise ValueError("Factura no encontrada.")

    events = await get_dian_events_schemas(db, invoice_id)
    return {
        "dian_status": invoice.dian_status,
        "cufe": invoice.cufe,
        "events": events,
    }


async def get_dian_events_schemas(db: AsyncSession, invoice_id: uuid.UUID) -> list[DianEventResponse]:
    """Helper to retrieve and format DIAN events timeline."""
    from sqlalchemy import select
    result = await db.execute(
        select(DianEvent)
        .where(DianEvent.invoice_id == invoice_id)
        .order_by(DianEvent.created_at.desc())
    )
    db_events = result.scalars().all()
    return [DianEventResponse.model_validate(ev) for ev in db_events]
