from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.modules.country_settings.models import CountrySetting
from app.modules.country_settings.schemas import CountrySettingUpsert, CountrySettingResponse

router = APIRouter()


@router.get(
    "/country-settings/{country_code}",
    response_model=CountrySettingResponse,
    summary="Get country tax settings",
    description="Returns the tax configuration for a given ISO country code."
)
def get_country_settings(
    country_code: str,
    db: Session = Depends(get_db),
):
    setting = (
        db.query(CountrySetting)
        .filter(func.upper(CountrySetting.country_code) == country_code.upper())
        .first()
    )
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No existe configuración para este país.")
    return setting


@router.put(
    "/country-settings/{country_code}",
    response_model=CountrySettingResponse,
    summary="Create or update country tax settings",
    description="Upserts the tax configuration for a given ISO country code."
)
def upsert_country_settings(
    country_code: str,
    payload: CountrySettingUpsert,
    db: Session = Depends(get_db),
):
    code = country_code.upper()
    setting = (
        db.query(CountrySetting)
        .filter(func.upper(CountrySetting.country_code) == code)
        .first()
    )

    if setting:
        setting.country_name = payload.country_name
        setting.default_tax_rate = payload.default_tax_rate
        setting.currency_code = payload.currency_code
        setting.currency_symbol = payload.currency_symbol
        setting.is_active = payload.is_active
    else:
        setting = CountrySetting(
            country_code=code,
            country_name=payload.country_name,
            default_tax_rate=payload.default_tax_rate,
            currency_code=payload.currency_code,
            currency_symbol=payload.currency_symbol,
            is_active=payload.is_active,
        )
        db.add(setting)

    db.commit()
    db.refresh(setting)
    return setting