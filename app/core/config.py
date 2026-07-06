from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://pacsflow:pacsflow@db:5432/pacsflow_appointments"

    # JWT
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480   # 8 საათი

    # Tenant
    TENANT_SLUG: str = "innova"
    TENANT_NAME: str = "Innova Medical"
    PROVIDER_LABEL: str = "Provider"
    CLIENT_LABEL: str = "Client"
    REQUIRE_PERSONAL_ID: bool = False
    REQUIRE_DOB: bool = False

    # LDAP / Active Directory
    LDAP_ENABLED: bool = False
    LDAP_SERVER: str = ""              # "ldap://dc.innova.local"
    LDAP_PORT: int = 389
    LDAP_USE_SSL: bool = False
    LDAP_BIND_DN: str = ""             # "CN=svc-pacsflow,OU=Services,DC=innova,DC=local"
    LDAP_BIND_PASSWORD: str = ""
    LDAP_SEARCH_BASE: str = ""         # "DC=innova,DC=local"
    LDAP_USER_FILTER: str = "(sAMAccountName={username})"
    LDAP_ATTR_EMAIL: str = "mail"
    LDAP_ATTR_FULLNAME: str = "displayName"
    LDAP_DEFAULT_ROLE: str = "viewer"  # AD-ით შემოსულის default role

    # Google Calendar
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    # Outlook
    OUTLOOK_CLIENT_ID: str = ""
    OUTLOOK_CLIENT_SECRET: str = ""
    OUTLOOK_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/outlook/callback"

    # SMS
    SMS_PROVIDER: str = "twilio"
    SMS_FROM: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""

    # Appointment code
    CODE_PREFIX: str = "PF"
    CODE_LENGTH: int = 6
    CODE_EXPIRES_HOURS: int = 24

    # QMS
    QMS_WEBHOOK_URL: str = ""
    QMS_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
def load_settings_from_db(tenant_id: str) -> None:
    """DB-დან tenant settings-ი ჩავტვირთოთ და settings ობიექტი განვაახლოთ"""
    import json
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT settings FROM tenant_settings WHERE tenant_id = :tid"),
                {"tid": tenant_id}
            ).fetchone()
            if not row:
                return
            data = json.loads(row[0])

            # LDAP
            if "ldap_enabled" in data:
                settings.LDAP_ENABLED = bool(data["ldap_enabled"])
            if "ldap_server" in data:
                settings.LDAP_SERVER = data["ldap_server"]
            if "ldap_port" in data:
                settings.LDAP_PORT = int(data["ldap_port"])
            if "ldap_use_ssl" in data:
                settings.LDAP_USE_SSL = bool(data["ldap_use_ssl"])
            if "ldap_bind_dn" in data:
                settings.LDAP_BIND_DN = data["ldap_bind_dn"]
            if "ldap_bind_password" in data:
                settings.LDAP_BIND_PASSWORD = data["ldap_bind_password"]
            if "ldap_search_base" in data:
                settings.LDAP_SEARCH_BASE = data["ldap_search_base"]
            if "ldap_default_role" in data:
                settings.LDAP_DEFAULT_ROLE = data["ldap_default_role"]

            # SMS
            if "sms_provider" in data:
                settings.SMS_PROVIDER = data["sms_provider"]
            if "sms_from" in data:
                settings.SMS_FROM = data["sms_from"]
            if "sms_account_sid" in data:
                settings.TWILIO_ACCOUNT_SID = data["sms_account_sid"]
            if "sms_auth_token" in data:
                settings.TWILIO_AUTH_TOKEN = data["sms_auth_token"]

            # Google Calendar
            if "google_client_id" in data:
                settings.GOOGLE_CLIENT_ID = data["google_client_id"]
            if "google_client_secret" in data:
                settings.GOOGLE_CLIENT_SECRET = data["google_client_secret"]

            # Outlook
            if "outlook_client_id" in data:
                settings.OUTLOOK_CLIENT_ID = data["outlook_client_id"]
            if "outlook_client_secret" in data:
                settings.OUTLOOK_CLIENT_SECRET = data["outlook_client_secret"]

            # QMS
            if "qms_url" in data:
                settings.QMS_WEBHOOK_URL = data["qms_url"]
            if "qms_webhook_secret" in data:
                settings.QMS_WEBHOOK_SECRET = data["qms_webhook_secret"]
            if "code_prefix" in data:
                settings.CODE_PREFIX = data["code_prefix"]
            if "code_expires_hours" in data:
                settings.CODE_EXPIRES_HOURS = int(data["code_expires_hours"])

    except Exception as e:
        print(f"[settings] DB-დან ჩატვირთვის შეცდომა: {e}")