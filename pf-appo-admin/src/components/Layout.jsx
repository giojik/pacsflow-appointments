import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loadBranding } from "../api/branding";

function ImpersonationBanner() {
  const raw = localStorage.getItem("pf_impersonating");
  if (!raw) return null;
  let info = {};
  try { info = JSON.parse(raw); } catch { return null; }

  const exit = () => {
    const pToken = localStorage.getItem("pf_platform_token");
    const pUser = localStorage.getItem("pf_platform_user");
    if (pToken) localStorage.setItem("pf_token", pToken);
    if (pUser) localStorage.setItem("pf_user", pUser);
    localStorage.removeItem("pf_platform_token");
    localStorage.removeItem("pf_platform_user");
    localStorage.removeItem("pf_impersonating");
    window.location.href = "/platform";
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#c0392b", color: "#fff", padding: "8px 16px",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
    }}>
      <span>⚠️ ხედავ <b>{info.tenant_name}</b>-ს platform admin-ის სახელით</span>
      <button onClick={exit} style={{
        padding: "4px 14px", borderRadius: 6, border: "1px solid #fff",
        background: "transparent", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: "bold"
      }}>← platform-ზე დაბრუნება</button>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [branding, setBranding] = useState({
    app_name: "PacsFlow",
    app_subtitle: "Appointments",
    primary_color: "#1D9E75",
    sidebar_color: "#1a1a2e",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadBranding().then(b => {
      setBranding(b);
      if (b.clinic_name) {
        document.title = b.clinic_name + " — ჩაწერის სისტემა";
      }
      if (b.favicon_url) {
        const link = document.getElementById("favicon") || document.querySelector("link[rel~='icon']");
        if (link) link.href = b.favicon_url;
      }
    });
  }, []);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // გვერდის შეცვლისას sidebar დაიხუროს
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const p = branding.primary_color || "#1D9E75";
  const sb = branding.sidebar_color || "#1a1a2e";

  const links = [
    { to: "/app", label: "Dashboard", icon: "🏠", roles: ["superadmin", "admin", "receptionist", "provider", "viewer"] },
    { to: "/app/providers", label: "პროვაიდერები", icon: "👨‍⚕️", roles: ["superadmin", "admin"] },
    { to: "/app/services", label: "სერვისები", icon: "🩺", roles: ["superadmin", "admin"] },
    { to: "/app/slots", label: "სლოტები", icon: "📅", roles: ["superadmin", "admin", "provider"] },
    { to: "/app/appointments", label: "ჩაწერები", icon: "📋", roles: ["superadmin", "admin", "receptionist", "provider"] },
    { to: "/app/clients", label: "კლიენტები", icon: "👥", roles: ["superadmin", "admin", "receptionist"] },
    { to: "/app/waitlist", label: "Waitlist", icon: "⏰", roles: ["superadmin", "admin", "receptionist"] },
    { to: "/app/reports", label: "ანგარიშები", icon: "📊", roles: ["superadmin", "admin", "provider"] },
    { to: "/app/audit", label: "Audit Log", icon: "📜", roles: ["superadmin", "admin"] },
    { to: "/app/users", label: "მომხმარებლები", icon: "🔐", roles: ["superadmin", "admin"] },
    { to: "/app/settings", label: "პარამეტრები", icon: "⚙️", roles: ["superadmin", "admin"] },
  ].filter(l => l.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <>
      <div style={{ padding: "12px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>{branding.app_name || "PacsFlow"}</div>
        <div style={{ fontSize: 10, color: p, marginTop: 1 }}>{branding.app_subtitle || "Appointments"}</div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{user?.full_name}</div>
        <div style={{ fontSize: 10, color: p, marginTop: 1 }}>{user?.role}</div>
      </div>

      <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto", scrollbarWidth: "none" }}>
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === "/app"}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8, marginBottom: 2,
              textDecoration: "none", fontSize: 13,
              color: isActive ? "#fff" : "#aaa",
              background: isActive ? p : "transparent",
            })}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", gap: 6 }}>
        <NavLink to="/app/profile"
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8,
            textDecoration: "none", fontSize: 13,
            color: isActive ? "#fff" : "#aaa",
            background: isActive ? p : "transparent",
          })}>
          <span>👤</span><span>პროფილი</span>
        </NavLink>
        <button onClick={handleLogout} style={{
          width: "100%", padding: "8px", background: "#c0392b",
          color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontSize: 13
        }}>გასვლა</button>
      </div>
    </>
  );

  return (
  <div style={{ display:"flex", height:"100vh", fontFamily:"sans-serif", overflow:"hidden", position:"fixed", width:"100%" }}>
    <ImpersonationBanner />
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 100
          }}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <div id="app-sidebar" style={{
        width: 220, background: sb, color: "#fff",
        display: "flex", flexDirection: "column",
        position: isMobile ? "fixed" : "sticky",
        top: 0, left: 0, bottom: 0,
        height: isMobile ? "100vh" : "100vh",
        zIndex: isMobile ? 101 : 1,
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        transition: isMobile ? "transform 0.25s ease" : "none",
        boxShadow: isMobile && sidebarOpen ? "4px 0 20px rgba(0,0,0,0.3)" : "none",
        flexShrink: 0,
      }}>
        <SidebarContent />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Mobile header */}
        {isMobile && (
          <div style={{
            height: 56, background: sb, display: "flex",
            alignItems: "center", padding: "0 16px", gap: 12,
            flexShrink: 0
          }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: "none", border: "none", color: "#fff",
              fontSize: 24, cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center"
            }}>☰</button>
            <div style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{branding.app_name || "PacsFlow"}</div>
            <div style={{ marginLeft: "auto", color: "#aaa", fontSize: 12 }}>{user?.full_name}</div>
          </div>
        )}

        <div id="main-content" style={{ flex: 1, overflowY : "auto", background: "#f5f5f5", padding: isMobile ? 12 : 24, height: 2 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
