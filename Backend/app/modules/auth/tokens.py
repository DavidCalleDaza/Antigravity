"""
DonApp API — Auth Module: Timed Token Serializers and Helpers.
"""

import uuid
import urllib.parse
from fastapi import Request
from itsdangerous import URLSafeTimedSerializer
from app.core.config import settings

# Serializers
email_change_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="email-change-approval")
activation_forward_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="user-activation-forward")


def build_activation_approval_context(
    user_id: uuid.UUID | str,
    email: str,
    full_name: str,
    role_label: str,
    activation_code: str,
    created_at: str,
    request: Request | None = None,
) -> dict:
    """
    Build context dictionary for new_user_approval.html, including secure timed
    one-click link for the administrator to forward the activation code to the user.
    """
    token_payload = {
        "user_id": str(user_id),
        "email": email,
        "code": activation_code,
    }
    token = activation_forward_serializer.dumps(token_payload)

    if request:
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.headers.get("host", f"localhost:{settings.PORT}"))
        base_url = f"{proto}://{host}"
    else:
        base_url = f"http://localhost:{settings.PORT}"

    forward_url = f"{base_url}/api/v1/auth/forward-activation-code?token={token}"

    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    login_url = f"{frontend_url}/login"

    mailto_subject = urllib.parse.quote(f"[DonApp] Código de activación para tu cuenta: {activation_code}")
    mailto_body = urllib.parse.quote(
        f"Hola {full_name},\n\n"
        f"Tu solicitud de registro en DonApp ha sido aprobada.\n"
        f"Tu código de activación personal es: {activation_code}\n\n"
        f"Para ingresar, accede a la plataforma en:\n"
        f"{login_url}\n\n"
        f"Ingresa tu correo y contraseña registrados, e introduce el código cuando te sea solicitado.\n\n"
        f"Atentamente,\nEquipo DonApp"
    )
    mailto_url = f"mailto:{email}?subject={mailto_subject}&body={mailto_body}"

    return {
        "full_name": full_name,
        "email": email,
        "role_label": role_label,
        "created_at": created_at,
        "activation_code": activation_code,
        "forward_url": forward_url,
        "mailto_url": mailto_url,
        "login_url": login_url,
    }
