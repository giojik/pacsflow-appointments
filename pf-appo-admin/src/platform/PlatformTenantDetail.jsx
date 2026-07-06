import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

export default function PlatformTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/platform/tenants/${id}/detail`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  const Card = ({ title, children }) => (
    <div style={{ background: "#1a2530", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ color: "#fff", fontSize: 15, fontWeight: "bold", marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  const Big = ({ label, value, color }) => (
    <div style={{ background: "#0f1419", borderRadius: 10, padding: "14px 18px", flex: "1 1 100px", minWidth: 90 }}>
      <div style={{ fontSize: 26, fontWeight: "bold", color: color || "#1D9E75" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#7a8a99", marginTop: 2 }}>{label}</div>
    </div>
  );

  const Pill = ({ active }) => (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: active ? "#1D9E7533" : "#c0392b33", color: active ? "#1D9E75" : "#e74c3c" }}>
      {active ? "აქტიური" : "გამორთული"}
    </span>
  );

  const th = { padding: 8, textAlign: "left", color: "#7a8a99", borderBottom: "1px solid #2a3540", fontSize: 12 };
  const td = { padding: 8, color: "#c8d4de", borderBottom: "1px solid #22303c", fontSize: 13 };

  if (loading) return <div style={{ padding: 24, color: "#7a8a99" }}>იტვირთება...</div>;
  if (!data) return <div style={{ padding: 24, color: "#e74c3c" }}>მონაცემები ვერ ჩაიტვირთა</div>;

  const t = data.tenant;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <button onClick={() => navigate("/platform/tenants")}
          style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #2a3540", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
          ← კომპანიები
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ color: "#fff", margin: 0, fontSize: 24 }}>{t.name}</h1>
          <Pill active={t.active} />
        </div>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20, fontFamily: "monospace" }}>
          slug: {t.slug} · 🌐 {t.domains || "(დომეინი არ არის)"} · {t.timezone} · {t.created_at}
        </div>

        {/* Counts */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <Big label="მომხმარებელი" value={data.counts.users} />
          <Big label="პროვაიდერი" value={data.counts.providers} color="#3498db" />
          <Big label="სერვისი" value={data.counts.services} color="#9b59b6" />
          <Big label="კლიენტი" value={data.counts.clients} color="#f39c12" />
          <Big label="ჩაწერა" value={data.counts.appointments} color="#5ab0d0" />
        </div>

        {/* Users */}
        <Card title={`👤 მომხმარებლები (${data.users.length})`}>
          {data.users.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Username</th><th style={th}>სახელი</th><th style={th}>როლი</th><th style={th}>სტატუსი</th></tr></thead>
              <tbody>
                {data.users.map((u, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontFamily: "monospace" }}>{u.username}</td>
                    <td style={td}>{u.full_name}</td>
                    <td style={td}>{u.role}</td>
                    <td style={td}><Pill active={u.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: "#7a8a99", fontSize: 13 }}>მომხმარებელი არ არის</div>}
        </Card>

        {/* Providers + Services */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title={`👨‍⚕️ პროვაიდერები (${data.providers.length})`}>
            {data.providers.length ? data.providers.map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #22303c" }}>
                <div>
                  <div style={{ color: "#c8d4de", fontSize: 14 }}>{p.name}</div>
                  <div style={{ color: "#5a6b7a", fontSize: 12 }}>{p.specialty}</div>
                </div>
                <Pill active={p.active} />
              </div>
            )) : <div style={{ color: "#7a8a99", fontSize: 13 }}>არ არის</div>}
          </Card>

          <Card title={`🩺 სერვისები (${data.services.length})`}>
            {data.services.length ? data.services.map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #22303c" }}>
                <div>
                  <div style={{ color: "#c8d4de", fontSize: 14 }}>{s.name}</div>
                  <div style={{ color: "#5a6b7a", fontSize: 12, fontFamily: "monospace" }}>{s.code} · {s.duration}წთ</div>
                </div>
                <Pill active={s.active} />
              </div>
            )) : <div style={{ color: "#7a8a99", fontSize: 13 }}>არ არის</div>}
          </Card>
        </div>

        {/* Recent appointments */}
        <Card title="📋 ბოლო ჩაწერები">
          {data.recent_appointments.length ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>თარიღი</th><th style={th}>კლიენტი</th><th style={th}>ექიმი</th><th style={th}>სტატუსი</th></tr></thead>
              <tbody>
                {data.recent_appointments.map((a, i) => (
                  <tr key={i}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{a.date}</td>
                    <td style={td}>{a.client}</td>
                    <td style={td}>{a.provider}</td>
                    <td style={td}>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: "#7a8a99", fontSize: 13 }}>ჩაწერები არ არის</div>}
        </Card>
      </div>
    </div>
  );
}