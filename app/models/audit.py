from sqlalchemy import Column, DateTime, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .base import Base, gen_uuid


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tenant_id   = Column(UUID(as_uuid=False), index=True)
    user_id     = Column(UUID(as_uuid=False), index=True)
    username    = Column(String(128))
    user_role   = Column(String(32))
    method      = Column(String(20))
    path        = Column(String(512))
    entity      = Column(String(64), index=True)
    status_code = Column(Integer)
    ip          = Column(String(64))
    body        = Column(Text)
    details     = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)
