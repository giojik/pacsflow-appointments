import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SB = "#0f1419";
const SB_CARD = "#1a2530";
const ACCENT = "#1D9E75";

const links = [
  { to: "/platform", label: "სტატისტიკა", icon: "📊", end: true },
  { to: "/platform/tenants", label: "კომპანიები", icon: "🏢" },
  { to: "/platform/users", label: "Admins", icon: "👤" },
  { to: "/platform/audit", label: "Audit Log", icon: "📜" },
  { to: "/platform/pricing", label: "ფასები", icon: "💰" },
  { to: "/platform/contacts", label: "შეკვეთები", icon: "📬" },
];

export default function PlatformLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0f14", fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 230, background: SB, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "18px 18px 16px", borderBottom: "1px solid #1e2a35" }}>
          <div style={{ color: "#fff", fontSize: 17, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}>
            🛰️ Platform
          </div>
          <div style={{ color: "#5a6b7a", fontSize: 11, marginTop: 3 }}>PacsFlow Console</div>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, marginBottom: 3,
                textDecoration: "none", fontSize: 14,
                color: isActive ? "#fff" : "#7a8a99",
                background: isActive ? ACCENT : "transparent",
              })}>
              <span style={{ fontSize: 17 }}>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid #1e2a35" }}>
          <div style={{ color: "#7a8a99", fontSize: 12, marginBottom: 8, padding: "0 4px" }}>
            {user?.full_name || user?.username}
            <div style={{ color: "#5a6b7a", fontSize: 10 }}>Platform Admin</div>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "9px", background: "#c0392b", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13
          }}>გასვლა</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}