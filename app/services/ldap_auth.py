"""
Active Directory / LDAP authentication service.
LDAP_ENABLED=true .env-ში რომ გაააქტიუროთ.
"""
from typing import Optional
from dataclasses import dataclass
from app.core.config import settings

@dataclass
class LDAPUser:
    username:  str
    email:     Optional[str]
    full_name: Optional[str]
    dn:        str

def ldap_authenticate(username: str, password: str) -> Optional[LDAPUser]:
    """
    AD-ში შესვლა — წარმატებისას LDAPUser, წარუმატებლობისას None.
    საჭიროა: pip install ldap3
    """
    if not settings.LDAP_ENABLED:
        return None

    try:
        from ldap3 import Server, Connection, ALL, NTLM, SUBTREE
        from ldap3.core.exceptions import LDAPBindError, LDAPException
    except ImportError:
        raise RuntimeError("ldap3 არ არის დაინსტალირებული. დაამატე requirements.txt-ში")

    try:
        server = Server(
            settings.LDAP_SERVER,
            port=settings.LDAP_PORT,
            use_ssl=settings.LDAP_USE_SSL,
            get_info=ALL,
        )

        # Step 1: service account-ით ვუერთდებით და ვეძებთ user-ს
        with Connection(
            server,
            user=settings.LDAP_BIND_DN,
            password=settings.LDAP_BIND_PASSWORD,
            auto_bind=True,
        ) as conn:
            user_filter = settings.LDAP_USER_FILTER.format(username=username)
            conn.search(
                search_base=settings.LDAP_SEARCH_BASE,
                search_filter=user_filter,
                search_scope=SUBTREE,
                attributes=[
                    settings.LDAP_ATTR_EMAIL,
                    settings.LDAP_ATTR_FULLNAME,
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
                email=getattr(entry, settings.LDAP_ATTR_EMAIL).value if hasattr(entry, settings.LDAP_ATTR_EMAIL) else None,
                full_name=getattr(entry, settings.LDAP_ATTR_FULLNAME).value if hasattr(entry, settings.LDAP_ATTR_FULLNAME) else None,
                dn=user_dn,
            )

    except Exception:
        return None


def sync_ldap_user(ldap_user: LDAPUser, db, tenant_id: str) -> "User":
    """
    AD-ის მომხმარებელი DB-ში ქმნის ან განაახლებს.
    Role-ს ხელით ანიჭებს admin — AD-იდან role არ მოდის.
    """
    from app.models.user import User, UserRole, AuthProvider
    from app.core.config import settings

    user = db.query(User).filter(User.username == ldap_user.username).first()
    if not user:
        user = User(
            username=ldap_user.username,
            email=ldap_user.email,
            full_name=ldap_user.full_name,
            tenant_id=tenant_id,
            role=UserRole(settings.LDAP_DEFAULT_ROLE),
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
