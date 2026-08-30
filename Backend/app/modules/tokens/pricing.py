"""
DonApp API — Tokens Module: Model Pricing.

Reference prices (USD) from ai.google.dev/gemini-api/docs/pricing,
consulted 2026-08-10.

NOTE: ``gemini-flash-lite-latest`` is an alias not listed in the pricing
page; it is treated as ``gemini-3.1-flash-lite`` (approximation).
``gemini-2.0-flash-lite`` was deprecated by Google on 2026-06-01 and is kept
here only to price historical usage records.
"""

from decimal import Decimal

# Prices per 1M tokens (input/output), USD.
MODEL_PRICING: dict[str, dict] = {
    "gemini-3.5-flash": {
        "input_per_1m": Decimal("1.50"),
        "output_per_1m": Decimal("9.00"),  # includes thinking
    },
    "gemini-3.1-flash-lite": {
        "input_per_1m": Decimal("0.25"),  # text/image/video
        "output_per_1m": Decimal("1.50"),
    },
    "gemini-flash-lite-latest": {
        # Alias no listado en pricing; aproximación a gemini-3.1-flash-lite.
        "input_per_1m": Decimal("0.25"),
        "output_per_1m": Decimal("1.50"),
    },
    "gemini-2.0-flash-lite": {
        # Deprecado 2026-06-01; precio solo para registros históricos.
        "input_per_1m": Decimal("0.075"),
        "output_per_1m": Decimal("0.30"),
    },
    "gemini-2.5-flash-image": {
        "input_per_1m": Decimal("0.30"),
        # La salida se cobra por imagen generada, no por token.
        "output_per_image": Decimal("0.039"),
    },
}

# Video: per second of generated video, by quality.
VIDEO_PRICING_PER_SECOND: dict[str, Decimal] = {
    "720p": Decimal("0.10"),
    "1080p": Decimal("0.12"),
    "4k": Decimal("0.30"),
}

DEFAULT_VIDEO_QUALITY = "720p"

# Costo fijo por llamada (no depende de tokens/segundos). Confirmado por
# David: ~$0.42 USD por video en GPU A100 de Replicate.
REPLICATE_VIDEO_ENHANCE_COST_USD = Decimal("0.42")

# Placeholder conservador hasta que se confirme el costo real del plan de
# Auphonic — marcar siempre is_estimated=True al registrar el uso.
AUPHONIC_ENHANCE_COST_USD = Decimal("0.05")


def estimate_cost_usd(
    model_name: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    image_count: int = 0,
    video_seconds: int = 0,
    video_quality: str = DEFAULT_VIDEO_QUALITY,
) -> Decimal:
    """
    Estimate the cost (USD) of a model call from token/image/video counts.

    Falls back to the cheapest listed model heuristic when the model is
    unknown: the caller should mark such records as ``is_estimated``.
    """
    if model_name == "veo-3.1-fast-generate-preview":
        per_second = VIDEO_PRICING_PER_SECOND.get(video_quality, VIDEO_PRICING_PER_SECOND[DEFAULT_VIDEO_QUALITY])
        return (Decimal(video_seconds) * per_second).quantize(Decimal("0.000001"))

    if model_name == "lucataco/real-esrgan-video":
        return REPLICATE_VIDEO_ENHANCE_COST_USD

    if model_name == "auphonic-enhance":
        return AUPHONIC_ENHANCE_COST_USD

    pricing = MODEL_PRICING.get(model_name)
    if pricing is None:
        return Decimal("0.00")

    if model_name == "gemini-2.5-flash-image":
        input_cost = Decimal(input_tokens) * pricing["input_per_1m"] / Decimal(1_000_000)
        image_cost = Decimal(image_count) * pricing["output_per_image"]
        return (input_cost + image_cost).quantize(Decimal("0.000001"))

    input_cost = Decimal(input_tokens) * pricing["input_per_1m"] / Decimal(1_000_000)
    output_cost = Decimal(output_tokens) * pricing["output_per_1m"] / Decimal(1_000_000)
    return (input_cost + output_cost).quantize(Decimal("0.000001"))