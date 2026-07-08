import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loadBranding } from "../api/branding";
import api from "../api";

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

function NotificationBell({ primaryColor, darkMode }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setCount(data.count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications/", { params: { limit: 20 } });
      setNotifications(data);
    } catch {}
    setLoading(false);
  };

  const toggle = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  };

  // click outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "ახლა";
    if (diff < 3600) return `${Math.floor(diff/60)} წთ`;
    if (diff < 86400) return `${Math.floor(diff/3600)} სთ`;
    return `${Math.floor(diff/86400)} დღე`;
  };

  // Browser push notification
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (count > 0 && "Notification" in window && Notification.permission === "granted") {
      // მხოლოდ ახალი notification-ებისთვის
    }
  }, [count]);

  // Poll-ისას ახალი notification → browser push
  const prevCount = useRef(0);
  useEffect(() => {
    if (count > prevCount.current && "Notification" in window && Notification.permission === "granted") {
      new Notification("PacsFlow", { body: "ახალი შეტყობინება", icon: "/favicon.svg" });
    }
    prevCount.current = count;
  }, [count]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 20, padding: "4px 8px", position: "relative", color: darkMode !== false ? "#fff" : "#333"
      }}>
        🔔
        {count > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 2,
            background: "#e74c3c", color: "#fff", fontSize: 10,
            borderRadius: "50%", width: 18, height: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold"
          }}>{count > 9 ? "9+" : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, width: 320,
          background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: 1000, maxHeight: 400, overflow: "hidden",
          border: "1px solid #e0e0e0"
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #f0f0f0",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontWeight: "bold", fontSize: 14 }}>შეტყობინებები</span>
            {count > 0 && (
              <button onClick={markAllRead} style={{
                background: "none", border: "none", color: primaryColor,
                cursor: "pointer", fontSize: 12
              }}>ყველა წაკითხულია</button>
            )}
          </div>
          <div style={{ overflowY: "auto", maxHeight: 340 }}>
            {loading && <p style={{ padding: 16, color: "#999", fontSize: 13 }}>იტვირთება...</p>}
            {!loading && notifications.length === 0 && (
              <p style={{ padding: 16, color: "#999", fontSize: 13, textAlign: "center" }}>შეტყობინებები არ არის</p>
            )}
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.read && markRead(n.id)} style={{
                padding: "10px 16px", borderBottom: "1px solid #f5f5f5",
                background: n.read ? "#fff" : "#f0f8ff",
                cursor: n.read ? "default" : "pointer",
                transition: "background 0.2s"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: n.read ? 400 : 600, fontSize: 13 }}>
                    {n.title === "ახალი ჩაწერა" ? "📋 " : n.title === "ჩაწერა გაუქმდა" ? "❌ " : "🔄 "}
                    {n.title}
                  </span>
                  <span style={{ fontSize: 11, color: "#999" }}>{timeAgo(n.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
      if (b.clinic_name) document.title = b.clinic_name + " — ჩაწერის სისტემა";
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

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

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
    { to: "/app/import", label: "იმპორტი", icon: "📥", roles: ["superadmin", "admin"] },
    { to: "/app/settings", label: "პარამეტრები", icon: "⚙️", roles: ["superadmin", "admin"] },
  ].filter(l => l.roles.includes(user?.role));

  const handleLogout = () => { logout(); navigate("/login"); };

  const SidebarContent = () => (
    <>
      <div style={{ padding: "12px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>{branding.app_name || "PacsFlow"}</div>
            <div style={{ fontSize: 10, color: p, marginTop: 1 }}>{branding.app_subtitle || "Appointments"}</div>
          </div>
        </div>
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
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", overflow: "hidden", position: "fixed", width: "100%" }}>
      <ImpersonationBanner />
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} />
      )}
      <div id="app-sidebar" style={{
        width: 220, background: sb, color: "#fff",
        display: "flex", flexDirection: "column",
        position: isMobile ? "fixed" : "sticky",
        top: 0, left: 0, bottom: 0,
        height: "100vh", zIndex: isMobile ? 101 : 1,
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
        transition: isMobile ? "transform 0.25s ease" : "none",
        boxShadow: isMobile && sidebarOpen ? "4px 0 20px rgba(0,0,0,0.3)" : "none",
        flexShrink: 0,
      }}>
        <SidebarContent />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {isMobile && (
          <div style={{
            height: 56, background: sb, display: "flex",
            alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0
          }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              background: "none", border: "none", color: "#fff",
              fontSize: 24, cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center"
            }}>☰</button>
            <div style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>{branding.app_name || "PacsFlow"}</div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <NotificationBell primaryColor={p} />
              <span style={{ color: "#aaa", fontSize: 12 }}>{user?.full_name}</span>
            </div>
          </div>
        )}
        {/* Desktop topbar */}
        {!isMobile && (
          <div style={{
            height: 48, background: "#fff", display: "flex",
            alignItems: "center", justifyContent: "flex-end",
            padding: "0 24px", borderBottom: "1px solid #e8e8e8",
            flexShrink: 0, gap: 12
          }}>
            <span style={{ color: "#666", fontSize: 13 }}>{user?.full_name}</span>
            <NotificationBell primaryColor={p} darkMode={false} />
          </div>
        )}
        <div id="main-content" style={{ flex: 1, overflowY: "auto", background: "#f5f5f5", padding: isMobile ? 12 : 24, height: 2 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
