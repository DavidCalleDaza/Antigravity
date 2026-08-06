import base64
import hashlib
import json
import logging
import os
import urllib.parse
import uuid
from datetime import datetime, timezone

import httpx
import redis.asyncio as redis
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, UnauthorizedException
from app.core.security import create_access_token
from app.db.session import get_db
from app.modules.auth.crud import get_user_by_email
from app.modules.auth.models import User, UserIdentity
from app.modules.auth.schemas import TokenResponse, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/google", tags=["google-auth"])

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
signer = URLSafeTimedSerializer(settings.SECRET_KEY)

GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"


async def check_rate_limit(request: Request):
    """Simple Redis-based rate limiter: 10 requests per minute per IP."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"rate_limit:google_auth:{client_ip}"
    try:
        current = await redis_client.incr(key)
        if current == 1:
            await redis_client.expire(key, 60)
        if current > 10:
            logger.warning(f"SECURITY EVENT: Rate limit exceeded for IP {client_ip}")
            raise BadRequestException(detail="Too many requests. Please try again later.")
    except redis.RedisError:
        pass  # If redis fails, let it pass to not break auth


def generate_pkce_pair() -> tuple[str, str]:
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8").rstrip("=")
    code_challenge = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    code_challenge = base64.urlsafe_b64encode(code_challenge).decode("utf-8").rstrip("=")
    return code_verifier, code_challenge


@router.get("/authorize", dependencies=[Depends(check_rate_limit)])
async def google_authorize(request: Request, role: str = "client", intent: str = "login"):  # <-- Inyectamos 'request'
    """
    Initiate Google OAuth2 flow with PKCE and OIDC nonce.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise BadRequestException(detail="Google Auth is not configured on the server.")

    if role not in ["client", "seller", "admin"]:
        raise BadRequestException(detail="Invalid role requested.")

    if intent not in ["login", "register"]:
        raise BadRequestException(detail="Intent inválido.")

    # --- CAPTURAR ORIGEN DEL FRONTEND DINÁMICAMENTE ---
    referer = request.headers.get("referer")
    if referer:
        parsed_url = urllib.parse.urlparse(referer)
        frontend_origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
    else:
        # Fallback por si no viene el referer (usa settings o un puerto por defecto)
        frontend_origin = settings.FRONTEND_URL or "http://localhost:5173"

    code_verifier, code_challenge = generate_pkce_pair()
    state_id = uuid.uuid4().hex
    nonce = uuid.uuid4().hex

    # Guardamos también 'frontend_url' en Redis con 10 minutos TTL
    pkce_data = json.dumps({
        "code_verifier": code_verifier, 
        "nonce": nonce,
        "frontend_url": frontend_origin  # <-- Guardado en Redis
    })
    await redis_client.setex(f"pkce:{state_id}", 600, pkce_data)

    # Create signed state (only containing state_id, role and intent)
    state_payload = {"state_id": state_id, "role": role, "intent": intent}
    signed_state = signer.dumps(state_payload)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "state": signed_state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    
    url = f"{GOOGLE_AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)


# app/modules/auth/google.py

@router.get("/callback", dependencies=[Depends(check_rate_limit)])
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle Google OAuth2 callback.
    """
    # 1. Definir un fallback inicial para la URL del frontend
    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    
    # Intentamos recuperar de antemano el 'frontend_url' correcto desde Redis usando el state
    state = request.query_params.get("state")
    if state:
        try:
            state_payload = signer.loads(state, max_age=600)
            state_id = state_payload.get("state_id")
            redis_key = f"pkce:{state_id}"
            pkce_data_str = await redis_client.get(redis_key)
            if pkce_data_str:
                pkce_data = json.loads(pkce_data_str)
                frontend_url = pkce_data.get("frontend_url", frontend_url)
        except Exception:
            pass # Si falla, se mantiene el fallback por defecto

    error = request.query_params.get("error")
    if error:
        logger.warning(f"Google OAuth error: {error}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=user_cancelled")

    code = request.query_params.get("code")
    if not code or not state:
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=missing_params")

    # Validar signed state
    try:
        state_payload = signer.loads(state, max_age=600)
    except SignatureExpired:
        logger.warning("SECURITY EVENT: Expired state signature in Google callback")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=state_expired")
    except BadSignature:
        logger.warning("SECURITY EVENT: Invalid state signature in Google callback")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=state_invalid")

    state_id = state_payload.get("state_id")
    requested_role = state_payload.get("role", "client")
    requested_intent = state_payload.get("intent", "login")

    # Get and DELETE pkce_data from Redis (prevents replay)
    redis_key = f"pkce:{state_id}"
    pkce_data_str = await redis_client.get(redis_key)
    if not pkce_data_str:
        logger.warning(f"SECURITY EVENT: PKCE data not found or expired for state_id {state_id}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=pkce_missing")
    
    await redis_client.delete(redis_key)
    
    pkce_data = json.loads(pkce_data_str)
    code_verifier = pkce_data.get("code_verifier")
    expected_nonce = pkce_data.get("nonce")
    
    # Recuperamos la URL real guardada (la que usaba el cliente cuando hizo clic)
    frontend_url = pkce_data.get("frontend_url", frontend_url)

    # Exchange code for tokens
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                    "code_verifier": code_verifier,
                },
                timeout=10.0
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
    except httpx.HTTPError as e:
        logger.error(f"HTTP error during Google token exchange: {e}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=google_exchange_failed")

    id_token = token_data.get("id_token")
    if not id_token:
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=no_id_token")

    # Fetch JWKS and validate id_token
    try:
        async with httpx.AsyncClient() as client:
            jwks_resp = await client.get(GOOGLE_JWKS_URL, timeout=10.0)
            jwks_resp.raise_for_status()
            jwks = jwks_resp.json()
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Google JWKS: {e}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=google_jwks_failed")

    try:
        payload = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=settings.GOOGLE_CLIENT_ID,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            access_token=token_data.get("access_token")
        )
    except JWTError as e:
        logger.warning(f"SECURITY EVENT: Failed to validate Google id_token: {e}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=invalid_id_token")

    # Validate nonce
    token_nonce = payload.get("nonce")
    if not token_nonce or token_nonce != expected_nonce:
        logger.warning(f"SECURITY EVENT: Nonce mismatch. Expected {expected_nonce}, got {token_nonce}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=invalid_nonce")

    # Verify email is verified by Google
    email = payload.get("email")
    email_verified = payload.get("email_verified")
    google_id = payload.get("sub")

    if not email or not email_verified:
        logger.warning(f"SECURITY EVENT: Google email not verified or missing for sub {google_id}")
        return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=email_not_verified")

    # Database Upsert
    user = await get_user_by_email(db, email)
    if user:
        stmt = select(UserIdentity).where(
            UserIdentity.user_id == user.id,
            UserIdentity.provider == "google",
            UserIdentity.provider_id == google_id
        )
        result = await db.execute(stmt)
        identity = result.scalar_one_or_none()
        
        if not identity:
            new_identity = UserIdentity(user_id=user.id, provider="google", provider_id=google_id)
            db.add(new_identity)
            try:
                await db.commit()
            except IntegrityError:
                await db.rollback()
    else:
        full_name = payload.get("name", email.split("@")[0])
        avatar_url = payload.get("picture")

        user = User(
            email=email,
            full_name=full_name,
            role=requested_role,
            avatar_url=avatar_url,
            hashed_password=None,
            needs_onboarding=(requested_intent == "register"),
        )
        db.add(user)
        await db.flush()
        
        identity = UserIdentity(user_id=user.id, provider="google", provider_id=google_id)
        db.add(identity)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            logger.error(f"Database error creating new user from Google Auth for email {email}")
            return RedirectResponse(f"{frontend_url}/auth/callback?social_status=error&detail=user_creation_failed")

    # Generate one-time exchange_code
    exchange_code = uuid.uuid4().hex
    await redis_client.setex(f"exchange:{exchange_code}", 60, str(user.id))

    # REDIRECCIÓN DINÁMICA PERFECTA
    return RedirectResponse(f"{frontend_url}/auth/callback?code={exchange_code}")


class ExchangeRequest(BaseModel):
    code: str


@router.post("/exchange", dependencies=[Depends(check_rate_limit)])
async def google_exchange(payload: ExchangeRequest, db: AsyncSession = Depends(get_db)):
    """
    Exchange the short-lived one-time code for the actual JWT access_token.
    """
    code = payload.code
    redis_key = f"exchange:{code}"
    
    user_id_str = await redis_client.get(redis_key)
    if not user_id_str:
        raise UnauthorizedException(detail="Código de intercambio inválido o expirado.")
        
    # DELETE immediately so it cannot be reused
    await redis_client.delete(redis_key)

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedException(detail="Error de formato en el identificador de usuario.")

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedException(detail="Usuario no encontrado o inactivo.")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
