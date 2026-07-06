from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from app.models.tenant import Tenant

# fallback — თუ DB-ში domain ვერ მოიძებნა
DEFAULT_TENANT_SLUG = "pacsflow"


def resolve_slug_by_host(host: str, db: Session) -> str:
    """Host header-ით tenant-ის slug — DB-დან (domains ველი)."""
    host = (host or "").split(":")[0].strip().lower()
    if not host:
        return DEFAULT_TENANT_SLUG

    # ყველა აქტიური tenant, ვამოწმებთ domains-ში
    for t in db.query(Tenant).filter(Tenant.active == True).all():
        if not t.domains:
            continue
        domain_list = [d.strip().lower() for d in t.domains.split(",") if d.strip()]
        if host in domain_list:
            return t.slug

    return DEFAULT_TENANT_SLUG


def get_tenant_by_request(request: Request, db: Session) -> Tenant:
    host = request.headers.get("host", "")
    slug = resolve_slug_by_host(host, db)
    tenant = db.query(Tenant).filter(Tenant.slug == slug, Tenant.active == True).first()
    if not tenant:
        raise HTTPException(404, f"Tenant ვერ მოიძებნა: {host}")
    return tenant