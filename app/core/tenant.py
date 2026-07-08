from fastapi import Request, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.tenant import Tenant

# fallback — თუ ვერაფერი მოიძებნა
DEFAULT_TENANT_SLUG = "pacsflow"


def resolve_slug_by_host(host: str, db: Session) -> str:
    """Host header-ით tenant-ის slug — DB-დან (domains ველი)."""
    host = (host or "").split(":")[0].strip().lower()
    if not host:
        return DEFAULT_TENANT_SLUG

    for t in db.query(Tenant).filter(Tenant.active == True).all():
        if not t.domains:
            continue
        domain_list = [d.strip().lower() for d in t.domains.split(",") if d.strip()]
        if host in domain_list:
            return t.slug

    return DEFAULT_TENANT_SLUG


def resolve_slug_by_path(path_slug: str, db: Session) -> str | None:
    """path_slug-ით (მაგ. 'im', 'inv') tenant-ის slug — DB-დან raw SQL-ით."""
    if not path_slug:
        return None
    ps = path_slug.strip().lower()
    if not ps.replace("-", "").replace("_", "").isalnum():
        return None
    row = db.execute(
        text("SELECT slug FROM tenants WHERE path_slug = :ps AND active = true LIMIT 1"),
        {"ps": ps}
    ).fetchone()
    return row[0] if row else None


def resolve_slug(request: Request, db: Session) -> str:
    """
    Tenant resolution priority:
    1. X-Tenant-Slug header (გამოაგზავნა frontend-მა როცა URL /b/{path_slug} აქვს)
    2. Host header via `domains` (custom subdomain, მაგ. booking.innovamedical.ge)
    3. DEFAULT_TENANT_SLUG
    """
    header_slug = request.headers.get("x-tenant-slug", "").strip().lower()
    if header_slug:
        resolved = resolve_slug_by_path(header_slug, db)
        if resolved:
            return resolved

    host = request.headers.get("host", "")
    return resolve_slug_by_host(host, db)


def get_tenant_by_request(request: Request, db: Session) -> Tenant:
    slug = resolve_slug(request, db)
    tenant = db.query(Tenant).filter(Tenant.slug == slug, Tenant.active == True).first()
    if not tenant:
        raise HTTPException(404, "Tenant ვერ მოიძებნა")
    return tenant
