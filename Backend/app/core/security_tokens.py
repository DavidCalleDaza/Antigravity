from cryptography.fernet import Fernet
from app.core.config import settings

# Initialize Fernet suite. Raises ValueError if key is invalid.
# Note: Changing FIELD_ENCRYPTION_KEY will make previously encrypted tokens irretrievable.
_fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode('utf-8'))

def encrypt_token(value: str) -> str:
    """Encrypts a string token using Fernet."""
    if not value:
        return value
    return _fernet.encrypt(value.encode('utf-8')).decode('utf-8')

def decrypt_token(value: str) -> str:
    """Decrypts a Fernet encrypted string token."""
    if not value:
        return value
    return _fernet.decrypt(value.encode('utf-8')).decode('utf-8')
