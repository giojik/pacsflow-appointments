"""
Dynamic CORS origin resolution.

Starlette-ის ჩვეულებრივი CORSMiddleware-ის `allow_origins` სია სტატიკურია
(app startup-ზე ფიქსირდება), მაგრამ ჩვენ დომენები DB-ში ინახება
(`tenants.domains` სვეტი) და დინამიურად იცვლება ახალი tenant-ის/დომენის
დამატებისას. ამიტომ საკუთარი middleware გვჭირდება, რომელიც:

1. სტატიკურ სიას (`settings.CORS_ALLOWED_ORIGINS`) უერთებს
2. DB-დან `tenants.domains`-ს (ყველა აქტიური tenant-ის https:// ვარიანტს)
3. 60 წამით ქეშავს DB query-ს, რომ ყოველ request-ზე არ დავამძიმოთ DB

`allow_origins=["*"]` + `allow_credentials=True` კომბინაცია საშიშია, რადგან
ამ დროს ბრაუზერი/სერვერი ფაქტობრივად ნებისმიერი origin-ის reflect-ს
credentials-ითურთ (cross-site credentialed requests შესაძლებელი ხდება).
"""
import time
from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp

_cache: dict = {"origins": set(), "expires": 0.0}
_CACHE_TTL_SECONDS = 60


def _load_dynamic_origins() -> set[str]:
    from app.core.config import settings
    from app.db.session import SessionLocal
    from app.models.tenant import Tenant

    origins = {o.strip() for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o.strip()}

    db = SessionLocal()
    try:
        for t in db.query(Tenant).filter(Tenant.active == True).all():
            if not t.domains:
                continue
            for d in t.domains.split(","):
                d = d.strip().lower()
                if not d:
                    continue
                origins.add(f"https://{d}")
                origins.add(f"http://{d}")  # ლოკალური/staging გამოცდისთვის
    except Exception as e:
        print(f"[cors] tenant domains ჩატვირთვის შეცდომა: {e}")
    finally:
        db.close()

    return origins


def get_allowed_origins() -> set[str]:
    now = time.time()
    if now >= _cache["expires"]:
        _cache["origins"] = _load_dynamic_origins()
        _cache["expires"] = now + _CACHE_TTL_SECONDS
    return _cache["origins"]


class DynamicCORSMiddleware:
    """CORSMiddleware wrapper, რომელიც allow_origins-ს request-ის დროს
    დინამიურად ითვლის (DB + static სია) ნაცვლად სტატიკური ["*"]-ისა."""

    def __init__(self, app: ASGIApp, **kwargs):
        self.app = app
        self.kwargs = kwargs
        self._inner_cache: dict[frozenset, CORSMiddleware] = {}

    def _get_inner(self, origins: set[str]) -> CORSMiddleware:
        key = frozenset(origins)
        inner = self._inner_cache.get(key)
        if inner is None:
            inner = CORSMiddleware(self.app, allow_origins=sorted(origins), **self.kwargs)
            # მხოლოდ ერთი ჩანაწერი ვინახოთ ქეშში — ავარიდოთ memory leak, თუ
            # origin-სიები ხშირად იცვლება (60წმ-ში ერთხელ ხდება ესეც)
            self._inner_cache = {key: inner}
        return inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        origins = get_allowed_origins()
        inner = self._get_inner(origins)
        await inner(scope, receive, send)
