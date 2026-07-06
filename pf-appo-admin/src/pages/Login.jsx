import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { loadBranding } from "../api/branding";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [branding, setBranding] = useState({
    app_name: "PacsFlow",
    app_subtitle: "Appointments",
    login_title: "ჩაწერის მართვის სისტემა",
    login_subtitle: "მართეთ ჩაწერები, განრიგები და კლიენტები — ერთი პლატფორმიდან.",
    primary_color: "#1D9E75",
    login_bg_color: "#1a1a2e",
    login_bg_image: "",
    logo_url: "",
    favicon_url: "",
    clinic_name: "PacsFlow",
    footer_text: "",
    login_phone: "",
    login_address: "",
    show_powered_by: true,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBranding().then(b => {
      setBranding(b);
      if (b.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
        link.rel = "icon";
        link.href = b.favicon_url;
        document.head.appendChild(link);
      }
      if (b.clinic_name) {
        document.title = b.clinic_name + " — ჩაწერის სისტემა";
      }
    });
    document.body.style.overflow = "hidden";
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);
      const { data } = await api.post("/auth/login", params);
      login(data, data.access_token);

      // platform admin (global superadmin, tenant_id=null) → console
      if (data.role === "superadmin" && !data.tenant_id) {
        navigate("/platform");
      } else {
        navigate("/app");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || "მომხმარებელი ან პაროლი არასწორია";
      setError(msg);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setBlocked(true);
        setError("5 წარუმატებელი მცდელობა. დაელოდეთ 15 წუთს.");
        setTimeout(() => { setBlocked(false); setAttempts(0); }, 15 * 60 * 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const p = branding.primary_color || "#1D9E75";
  const bg = branding.login_bg_color || "#1a1a2e";
  const bgImage = branding.login_bg_image;

  const leftBg = bgImage
    ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${bgImage}) center/cover no-repeat fixed`
    : `linear-gradient(135deg, ${bg} 0%, ${bg}dd 50%, ${bg}aa 100%)`;

  const FooterInfo = () => (
    <div style={{ marginTop: 20, textAlign: "center" }}>
      {branding.login_phone && (
        <div style={{ color: "#aaa", fontSize: 12, marginBottom: 4 }}>
          📞 {branding.login_phone}
        </div>
      )}
      {branding.login_address && (
        <div style={{ color: "#aaa", fontSize: 12, marginBottom: 8 }}>
          📍 {branding.login_address}
        </div>
      )}
      <p style={{ color: "#555", fontSize: 11, margin: "0 0 4px" }}>
        {branding.footer_text || `${branding.clinic_name || "PacsFlow"} © 2026 · ყველა უფლება დაცულია`}
      </p>
      {branding.show_powered_by !== false && (
        <p style={{ color: "#444", fontSize: 10, margin: 0 }}>Powered by PacsFlow</p>
      )}
    </div>
  );

  // ── Mobile ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: leftBg, padding: 24, overflow: "hidden", position: "fixed", width: "100%"
      }}>
        <div style={{ width: "100%", maxWidth: 380, overflowY: "auto", maxHeight: "100vh", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            {branding.logo_url ? (
              <img src={branding.logo_url} style={{ width: 36, height: 36, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 8, background: p, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: "bold", color: "#fff" }}>
                {(branding.app_name || "P")[0]}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>{branding.app_name || "PacsFlow"}</div>
              <div style={{ fontSize: 10, color: p }}>{branding.app_subtitle || "Appointments"}</div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", borderRadius: 16, padding: 24, border: "1px solid rgba(255,255,255,0.12)" }}>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: "bold", margin: "0 0 6px" }}>შესვლა</h2>
            <p style={{ color: "#aaa", fontSize: 13, margin: "0 0 20px" }}>შეიყვანეთ თქვენი მონაცემები</p>

            {attempts > 0 && attempts < 5 && (
              <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12, background: "rgba(243,156,18,0.15)", color: "#f39c12", border: "1px solid rgba(243,156,18,0.3)" }}>
                ⚠️ {5 - attempts} მცდელობა დარჩა
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>მომხმარებელი</label>
                <input value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="username" autoComplete="username" disabled={blocked}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = p}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>პაროლი</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password" disabled={blocked}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 15, outline: "none" }}
                  onFocus={e => e.target.style.borderColor = p}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
              </div>
              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(231,76,60,0.15)", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" }}>⚠️ {error}</div>
              )}
              <button type="submit" disabled={loading || blocked} style={{
                marginTop: 4, padding: "13px", borderRadius: 10, border: "none",
                background: blocked ? "#555" : loading ? "#555" : p,
                color: "#fff", fontSize: 15, fontWeight: "bold",
                cursor: loading || blocked ? "not-allowed" : "pointer",
              }}>
                {blocked ? "🔒 დაბლოკილია" : loading ? "⏳ შემოდის..." : "შესვლა →"}
              </button>
            </form>
          </div>
          <FooterInfo />
        </div>
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", position: "fixed", width: "100%" }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 48, color: "#fff", background: leftBg,
        overflowY: "hidden"
      }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            {branding.logo_url ? (
              <img src={branding.logo_url} style={{ width: 48, height: 48, objectFit: "contain" }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 12, background: p, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", color: "#fff" }}>
                {(branding.app_name || "P")[0]}
              </div>
            )}
            <div>
              <div style={{ fontSize: 24, fontWeight: "bold" }}>{branding.app_name || "PacsFlow"}</div>
              <div style={{ fontSize: 13, color: p }}>{branding.app_subtitle || "Appointments"}</div>
            </div>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: "bold", margin: "0 0 12px", lineHeight: 1.2, color: "#fff" }}>
            {branding.login_title || "ჩაწერის მართვის სისტემა"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.6, margin: "0 0 40px" }}>
            {branding.login_subtitle || "მართეთ ჩაწერები, განრიგები და კლიენტები — ერთი პლატფორმიდან."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📅", text: "კალენდარი — დღე, კვირა, თვე" },
              { icon: "👥", text: "კლიენტების მართვა" },
              { icon: "🔐", text: "როლების სისტემა" },
              { icon: "🎫", text: "QMS ინტეგრაცია" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{icon}</div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: 480, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 48, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        overflowY: "auto"
      }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <h2 style={{ color: "#fff", fontSize: 26, fontWeight: "bold", margin: "0 0 8px" }}>შესვლა</h2>
          <p style={{ color: "#888", fontSize: 14, margin: "0 0 32px" }}>შეიყვანეთ თქვენი სისტემის მონაცემები</p>

          {attempts > 0 && attempts < 5 && (
            <div style={{ padding: "8px 14px", borderRadius: 8, fontSize: 12, marginBottom: 12, background: "rgba(243,156,18,0.15)", color: "#f39c12", border: "1px solid rgba(243,156,18,0.3)" }}>
              ⚠️ {5 - attempts} მცდელობა დარჩა
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: "#aaa", display: "block", marginBottom: 6 }}>მომხმარებელი</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username" autoComplete="username" disabled={blocked}
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 15, outline: "none", opacity: blocked ? 0.5 : 1 }}
                onFocus={e => e.target.style.borderColor = p}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#aaa", display: "block", marginBottom: 6 }}>პაროლი</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" disabled={blocked}
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 15, outline: "none", opacity: blocked ? 0.5 : 1 }}
                onFocus={e => e.target.style.borderColor = p}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
              />
            </div>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(231,76,60,0.15)", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" }}>⚠️ {error}</div>
            )}
            <button type="submit" disabled={loading || blocked} style={{
              marginTop: 8, padding: "13px", borderRadius: 10, border: "none",
              background: blocked ? "#555" : loading ? "#555" : p,
              color: "#fff", fontSize: 15, fontWeight: "bold",
              cursor: loading || blocked ? "not-allowed" : "pointer",
            }}>
              {blocked ? "🔒 დაბლოკილია" : loading ? "⏳ შემოდის..." : "შესვლა →"}
            </button>
          </form>

          <FooterInfo />
        </div>
      </div>
    </div>
  );
}
