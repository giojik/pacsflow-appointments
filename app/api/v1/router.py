from fastapi import APIRouter
from app.api.v1.endpoints import (
    appointments, clients, providers,
    services, slots, codes, calendar_auth, auth
)
from app.api.v1.endpoints import settings
from app.api.v1.endpoints import waitlist
from app.api.v1.endpoints import upload
from app.api.v1.endpoints import reports
from app.api.v1.endpoints import audit
from app.api.v1.endpoints import bulk_import
from app.api.v1.endpoints import platform
from app.api.v1.endpoints import public_booking

api_router = APIRouter()
api_router.include_router(auth.router,           prefix="/auth",          tags=["auth"])
api_router.include_router(appointments.router,   prefix="/appointments",  tags=["appointments"])
api_router.include_router(clients.router,        prefix="/clients",       tags=["clients"])
api_router.include_router(providers.router,      prefix="/providers",     tags=["providers"])
api_router.include_router(services.router,       prefix="/services",      tags=["services"])
api_router.include_router(slots.router,          prefix="/slots",         tags=["slots"])
api_router.include_router(codes.router,          prefix="/codes",         tags=["codes"])
api_router.include_router(calendar_auth.router,  prefix="/auth/calendar", tags=["calendar-auth"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(waitlist.router, prefix="/waitlist", tags=["waitlist"])
api_router.include_router(upload.router,   prefix="/upload",   tags=["upload"])
api_router.include_router(reports.router,  prefix="/reports",  tags=["reports"])
api_router.include_router(audit.router,    prefix="/audit",    tags=["audit"])
api_router.include_router(bulk_import.router, tags=["bulk-import"])
api_router.include_router(platform.router, prefix="/platform", tags=["platform"])
api_router.include_router(public_booking.router, prefix="/public", tags=["public-booking"])