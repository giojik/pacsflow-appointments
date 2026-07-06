"""SMS სერვისი — TextMagic, Twilio, Custom API"""
import httpx
from app.core.config import settings

def send_sms(phone: str, message: str) -> bool:
    """SMS გაგზავნა settings-ის მიხედვით"""
    try:
        provider = settings.SMS_PROVIDER.lower()
        
        if provider == "textmagic":
            return _send_textmagic(phone, message)
        elif provider == "twilio":
            return _send_twilio(phone, message)
        elif provider == "custom":
            return _send_custom(phone, message)
        else:
            print(f"[SMS] უცნობი პროვაიდერი: {provider}")
            return False
    except Exception as e:
        print(f"[SMS] შეცდომა: {e}")
        return False

def _send_textmagic(phone: str, message: str) -> bool:
    r = httpx.post(
        "https://rest.textmagic.com/api/v2/messages",
        auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
        json={"text": message, "phones": phone}
    )
    print(f"[SMS TextMagic] {phone} → {r.status_code}")
    return r.status_code in (200, 201)

def _send_twilio(phone: str, message: str) -> bool:
    import base64
    auth = base64.b64encode(f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()).decode()
    r = httpx.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
        headers={"Authorization": f"Basic {auth}"},
        data={"From": settings.SMS_FROM, "To": phone, "Body": message}
    )
    print(f"[SMS Twilio] {phone} → {r.status_code}")
    return r.status_code == 201

def _send_custom(phone: str, message: str) -> bool:
    r = httpx.post(
        settings.SMS_FROM,  # custom API URL
        json={"phone": phone, "message": message}
    )
    return r.status_code == 200

def build_appointment_sms(client_name: str, provider_name: str, date: str, time: str, code: str,
                          event: str = "booking", service: str = "", clinic: str = "",
                          settings_data: dict = None) -> str:
    from app.services.templates import render, get_template
    context = {
        "name": client_name, "provider": provider_name, "service": service,
        "date": date, "time": time, "code": code, "clinic": clinic,
    }
    # ძველ SMS_TEMPLATE-ს fallback-ად ვინარჩუნებთ booking-ისთვის
    if settings_data:
        text = get_template(settings_data, "sms", event)
    else:
        text = settings.SMS_TEMPLATE if getattr(settings, "SMS_TEMPLATE", None) else \
            "გამარჯობა {name}! თქვენი ჩაწერა: {provider}, {date} {time}. კოდი: {code}"
    return render(text, context)