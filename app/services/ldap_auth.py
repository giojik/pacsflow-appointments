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


def bulk_sync_users(tenant_id: str, db) -> dict:
    """
    ყველა AD user-ს search_base-დან წამოიღებს და sync-ავს — 'სინქრონიზაცია'
    ღილაკისთვის, რომ admin-ს არ სჭირდებოდეს თითოეული user-ის login-ის ლოდინი.
    დისკის/computer ანგარიშებს (objectCategory=person-ის გარეშე) და
    გათიშულ ანგარიშებს (userAccountControl-ის disabled bit) გამორიცხავს.
    """
    from ldap3 import Server, Connection, ALL, SUBTREE
    from app.models.user import User, UserRole, AuthProvider

    config = get_tenant_ldap_config(tenant_id, db)
    if not config:
        raise ValueError("LDAP ამ tenant-ისთვის გამორთულია ან კონფიგურირებული არაა")

    server = Server(config["server"], port=config["port"], use_ssl=config["use_ssl"], get_info=ALL)
    conn = Connection(
        server,
        user=config["bind_dn"],
        password=config["bind_password"],
        auto_bind=True,
    )

    # objectCategory=person + userAccountControl-ის disabled bit (2) გამორთვა —
    # რომ computer/service ანგარიშები (INNOVA-AD$ და მსგ.) და გათიშული user-ები არ შემოვიდეს
    conn.search(
        search_base=config["search_base"],
        search_filter="(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
        search_scope=SUBTREE,
        attributes=["sAMAccountName", config["attr_email"], config["attr_fullname"]],
    )

    created, updated, skipped = 0, 0, 0
    for entry in conn.entries:
        if not hasattr(entry, "sAMAccountName") or not entry.sAMAccountName.value:
            skipped += 1
            continue
        username = str(entry.sAMAccountName.value)
        email = str(getattr(entry, config["attr_email"]).value) if hasattr(entry, config["attr_email"]) and entry[config["attr_email"]] else None
        full_name = str(getattr(entry, config["attr_fullname"]).value) if hasattr(entry, config["attr_fullname"]) and entry[config["attr_fullname"]] else None

        user = db.query(User).filter(User.username == username, User.tenant_id == tenant_id).first()
        if not user:
            user = User(
                username=username,
                email=email,
                full_name=full_name,
                tenant_id=tenant_id,
                role=UserRole(config["default_role"]),
                auth_provider=AuthProvider.ldap,
                hashed_password=None,
                active=True,
            )
            db.add(user)
            created += 1
        elif user.auth_provider == AuthProvider.ldap:
            # role-ს არ ვეხებით — admin-ის ხელით მინიჭებული role უცვლელი რჩება
            user.email     = email or user.email
            user.full_name = full_name or user.full_name
            updated += 1
        else:
            # local auth_provider-ის user-ს იგივე username-ით არ ვეხებით (კონფლიქტის თავიდან ასაცილებლად)
            skipped += 1

    db.commit()
    return {"created": created, "updated": updated, "skipped": skipped, "total_found": len(conn.entries)}


def run_ldap_sync_all_tenants():
    """ყოველდღიური scheduled job — ყველა tenant-ს, ვისაც ldap_enabled=true აქვს, sync-ავს.
    ერთი tenant-ის ხარვეზი (მაგ. AD ხელმიუწვდომელია) დანარჩენებს არ აჩერებს."""
    import json
    from app.db.session import SessionLocal
    from sqlalchemy import text

    db = SessionLocal()
    try:
        rows = db.execute(text("SELECT tenant_id, settings FROM tenant_settings")).fetchall()
        for tenant_id, settings_json in rows:
            try:
                data = json.loads(settings_json)
            except Exception:
                continue
            if not data.get("ldap_enabled"):
                continue
            try:
                result = bulk_sync_users(tenant_id, db)
                print(f"[ldap-sync] tenant={tenant_id}: {result}")
            except Exception as e:
                print(f"[ldap-sync] tenant={tenant_id} FAILED: {type(e).__name__}: {e}")
                db.rollback()
    finally:
        db.close()
