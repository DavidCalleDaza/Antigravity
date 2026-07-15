"""Unit tests for _coerce_price() in whatsapp/tasks.py."""

import pytest
from decimal import Decimal

from app.modules.whatsapp.tasks import _coerce_price


class TestCoercePrice:
    """Direct unit tests for the price coercion helper."""

    def test_integer_string(self):
        assert _coerce_price("3000") == Decimal("3000")

    def test_integer_value(self):
        assert _coerce_price(500) == Decimal("500")

    def test_float_value(self):
        assert _coerce_price(3000.5) == Decimal("3000.5")

    def test_none_returns_none(self):
        assert _coerce_price(None) is None

    def test_non_numeric_string_returns_none(self):
        assert _coerce_price("gratis") is None

    def test_empty_string_returns_none(self):
        assert _coerce_price("") is None

    def test_currency_symbol_string(self):
        assert _coerce_price("$3000") == Decimal("3000")

    def test_currency_with_dot_decimal(self):
        assert _coerce_price("$3.50") == Decimal("3.50")

    def test_string_with_text_and_number(self):
        assert _coerce_price("3000 pesos") == Decimal("3000")

    def test_decimal_string(self):
        assert _coerce_price("15.99") == Decimal("15.99")

    def test_string_with_thousand_separators(self):
        # Dots are preserved as decimal separators; multiple dots = invalid
        result = _coerce_price("1.234.567")
        assert result is None

    def test_negative_number_string(self):
        # Negative signs are not digits or dots, so stripped
        assert _coerce_price("-3000") == Decimal("3000")
