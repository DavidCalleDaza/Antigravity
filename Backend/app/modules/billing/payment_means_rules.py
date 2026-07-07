"""
payment_means_rules.py
-------------------------------------------------------------------------------
Reglas de negocio para filtrar y validar los "Medios de Pago" (payment_means,
códigos DIAN) válidos según el "Método de Pago" (payment_method) elegido.

Si en el futuro se necesitan reglas adicionales (monto, tipo de cliente,
localización), se agregan dentro de get_valid_payment_means sin tocar el
resto del flujo (ver sección "Extensión futura" al final).
-------------------------------------------------------------------------------
"""
from typing import Optional, List, Dict, Any

# Catálogo único de medios de pago (código DIAN -> etiqueta)
PAYMENT_MEANS_CATALOG: Dict[str, str] = {
    "10": "10 - Efectivo",
    "42": "42 - Consignación Bancaria",
    "47": "47 - Transferencia",
    "48": "48 - Tarjeta de Crédito",
    "49": "49 - Tarjeta de Débito",
}

# Mapa: método de pago -> códigos de medio de pago permitidos
METHOD_TO_MEANS_MAP: Dict[str, List[str]] = {
    "Contado": ["10", "48", "49"],
    "Crédito": ["10", "42", "47"],
    "Transferencia": ["42", "47"],
}


def get_valid_payment_means(
    payment_method: Optional[str] = None,
    amount: Optional[float] = None,
    customer: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, str]]:
    """
    Devuelve la lista de medios de pago válidos (value + label) para un
    método de pago dado, aplicando además reglas opcionales de monto/cliente.
    """
    if not payment_method or payment_method not in METHOD_TO_MEANS_MAP:
        allowed_codes = list(PAYMENT_MEANS_CATALOG.keys())
    else:
        allowed_codes = list(METHOD_TO_MEANS_MAP[payment_method])

    # ── Extensión futura: reglas por monto, tipo de cliente o localización ──
    # if amount is not None and amount >= 5_000_000:
    #     allowed_codes = [c for c in allowed_codes if c in ("42", "47")]
    #
    # if customer and customer.get("tax_regime") == "Gran Contribuyente":
    #     allowed_codes = [c for c in allowed_codes if c != "10"]
    # ──────────────────────────────────────────────────────────────────────

    return [
        {"value": code, "label": PAYMENT_MEANS_CATALOG[code]}
        for code in allowed_codes
    ]


def is_payment_means_valid(
    payment_method: Optional[str],
    payment_means: Optional[str],
    amount: Optional[float] = None,
    customer: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Valida si un código de medio de pago es válido para un método de pago dado.
    Defensa en profundidad: nunca confiar solo en lo que envía el frontend.
    """
    if not payment_means or payment_means not in PAYMENT_MEANS_CATALOG:
        return {"valid": False, "reason": "El medio de pago seleccionado no existe."}

    valid_options = get_valid_payment_means(payment_method, amount, customer)
    is_allowed = any(opt["value"] == payment_means for opt in valid_options)

    if not is_allowed:
        return {
            "valid": False,
            "reason": (
                f'El medio de pago "{PAYMENT_MEANS_CATALOG[payment_means]}" '
                f'no es válido para el método de pago "{payment_method}".'
            ),
        }

    return {"valid": True, "reason": None}