"""
Active Directory / LDAP authentication service.
Multi-tenant: LDAP config თითოეული tenant-ისთვის ცალ-ცალკეა
(tenant_settings.settings JSON-ში), არა გლობალური .env-ით.
"""
from typing import Optional
from dataclasses import dataclass

@dataclass
class LDAPUser:
    username:  str
    email:     Optional[str]
    full_name: Optional[str]
    dn:        str


def get_tenant_ldap_config(tenant_id: str, db) -> Optional[dict]:
    """tenant_settings-დან LDAP config-ს კითხულობს კონკრეტული tenant-ისთვის.
    დააბრუნებს None-ს თუ ldap_enabled არ არის true — ამ შემთხვევაში
    login()-მა საერთოდ არ უნდა სცადოს LDAP fallback."""
    import json
    from sqlalchemy import text
    row = db.execute(
        text("SELECT settings FROM tenant_settings WHERE tenant_id = :tid"),
        {"tid": tenant_id},
    ).fetchone()
    if not row:
        return None
    data = json.loads(row[0])
    if not data.get("ldap_enabled"):
        return None
    return {
        "server":         data.get("ldap_server", ""),
        "port":           int(data.get("ldap_port", 389)),
        "use_ssl":        bool(data.get("ldap_use_ssl", False)),
        "bind_dn":        data.get("ldap_bind_dn", ""),
        "bind_password":  data.get("ldap_bind_password", ""),
        "search_base":    data.get("ldap_search_base", ""),
        "user_filter":    data.get("ldap_user_filter", "(sAMAccountName={username})"),
        "attr_email":     data.get("ldap_attr_email", "mail"),
        "attr_fullname":  data.get("ldap_attr_fullname", "displayName"),
        "default_role":   data.get("ldap_default_role", "viewer"),
    }


def ldap_authenticate(username: str, password: str, config: dict) -> Optional[LDAPUser]:
    """
    AD-ში შესვლა კონკრეტული tenant-ის LDAP config-ით.
    წარმატებისას LDAPUser, წარუმატებლობისას None.
    საჭიროა: pip install ldap3
    """
    try:
        from ldap3 import Server, Connection, ALL, SUBTREE
    except ImportError:
        raise RuntimeError("ldap3 არ არის დაინსტალირებული. დაამატე requirements.txt-ში")

    try:
        server = Server(
            config["server"],
            port=config["port"],
            use_ssl=config["use_ssl"],
            get_info=ALL,
        )

        # Step 1: service account-ით ვუერთდებით და ვეძებთ user-ს
        with Connection(
            server,
            user=config["bind_dn"],
            password=config["bind_password"],
            auto_bind=True,
        ) as conn:
            user_filter = config["user_filter"].format(username=username)
            conn.search(
                search_base=config["search_base"],
                search_filter=user_filter,
                search_scope=SUBTREE,
                attributes=[
                    config["attr_email"],
                    config["attr_fullname"],
                    "sAMAccountName",
                    "distinguishedName",
                ],
            )
            if not conn.entries:
                return None

            entry = conn.entries[0]
            user_dn = entry.distinguishedName.value

        # Step 2: მომხმარებლის პაროლით ვადასტურებთ
        with Connection(server, user=user_dn, password=password, auto_bind=True):
            return LDAPUser(
                username=username,
                email=getattr(entry, config["attr_email"]).value if hasattr(entry, config["attr_email"]) else None,
                full_name=getattr(entry, config["attr_fullname"]).value if hasattr(entry, config["attr_fullname"]) else None,
                dn=user_dn,
            )

    except Exception:
        return None


def sync_ldap_user(ldap_user: LDAPUser, db, tenant_id: str, default_role: str = "viewer") -> "User":
    """
    AD-ის მომხმარებელი DB-ში ქმნის ან განაახლებს.
    Role-ს ხელით ანიჭებს (tenant-ის LDAP config-იდან) — AD-იდან role არ მოდის.
    """
    from app.models.user import User, UserRole, AuthProvider

    user = db.query(User).filter(
        User.username == ldap_user.username,
        User.tenant_id == tenant_id,
    ).first()
    if not user:
        user = User(
            username=ldap_user.username,
            email=ldap_user.email,
            full_name=ldap_user.full_name,
            tenant_id=tenant_id,
            role=UserRole(default_role),
            auth_provider=AuthProvider.ldap,
            hashed_password=None,
        )
        db.add(user)
    else:
        # email და სახელი sync-დება AD-იდან
        user.email     = ldap_user.email or user.email
        user.full_name = ldap_user.full_name or user.full_name

    db.commit()
    db.refresh(user)
    return user
