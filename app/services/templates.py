"""შაბლონების rendering — SMS და Email, ოთხივე event-ისთვის"""


class _SafeDict(dict):
    def __missing__(self, key):
        return ""


def render(text: str, context: dict) -> str:
    """უსაფრთხო placeholder ჩანაცვლება. უცნობი {var} → ცარიელი."""
    if not text:
        return ""
    try:
        return text.format_map(_SafeDict(context))
    except Exception:
        return text


DEFAULTS = {
    "sms": {
        "booking":  "გამარჯობა {name}! თქვენი ჩაწერა: {provider}, {date} {time}. კოდი: {code}",
        "confirm":  "{name}, თქვენი ჩაწერა დადასტურდა: {provider}, {date} {time}.",
        "cancel":   "{name}, თქვენი ჩაწერა {date} {time} გაუქმდა. {clinic}",
        "reminder": "შეხსენება: ხვალ {time}-ზე გაქვთ ჩაწერა — {provider}. {clinic}",
    },
    "email": {
        "booking":  "ძვირფასო {name},\n\nთქვენი ჩაწერა წარმატებით შეიქმნა.\n\nექიმი: {provider}\nსერვისი: {service}\nთარიღი: {date}\nდრო: {time}\nკოდი: {code}\n\n{clinic}",
        "confirm":  "ძვირფასო {name},\n\nთქვენი ჩაწერა დადასტურდა.\n\nექიმი: {provider}\nთარიღი: {date} {time}\n\n{clinic}",
        "cancel":   "ძვირფასო {name},\n\nთქვენი ჩაწერა ({date} {time}) გაუქმდა.\n\n{clinic}",
        "reminder": "ძვირფასო {name},\n\nგახსენებთ, რომ ხვალ ({date}) {time}-ზე გაქვთ ჩაწერა.\n\nექიმი: {provider}\nსერვისი: {service}\n\n{clinic}",
    },
}

EMAIL_SUBJECTS = {
    "booking":  "ჩაწერა დადასტურებულია — {clinic}",
    "confirm":  "თქვენი ჩაწერა დადასტურდა — {clinic}",
    "cancel":   "ჩაწერა გაუქმდა — {clinic}",
    "reminder": "შეხსენება: ხვალ გაქვთ ჩაწერა — {clinic}",
}


def get_template(settings_data: dict, channel: str, event: str) -> str:
    key = f"tpl_{channel}_{event}"
    val = settings_data.get(key) if settings_data else None
    if val:
        return val
    return DEFAULTS.get(channel, {}).get(event, "")


def get_email_subject(settings_data: dict, event: str) -> str:
    key = f"tpl_email_subject_{event}"
    val = settings_data.get(key) if settings_data else None
    return val or EMAIL_SUBJECTS.get(event, "")