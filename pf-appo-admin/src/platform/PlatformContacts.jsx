import { useState, useEffect } from "react";
import api from "../api";

const STATUS_MAP = {
  new: { label: "ახალი", color: "#1D9E75" },
  contacted: { label: "დაკავშირებული", color: "#3498db" },
  closed: { label: "დახურული", color: "#888" },
};

export default function PlatformContacts() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/platform/contacts")
      .then(r => setRequests(r.data))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/platform/contacts/${id}`, { status });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>📬 შეკვეთები</h1>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20 }}>Landing page-იდან შემოსული მოთხოვნები</div>

        {loading ? <p style={{ color: "#7a8a99" }}>იტვირთება...</p> : !requests.length ? <p style={{ color: "#7a8a99" }}>შეკვეთები ჯერ არ არის</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map(r => {
              const s = STATUS_MAP[r.status] || STATUS_MAP.new;
              return (
                <div key={r.id} style={{ background: "#1a2530", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{r.first_name} {r.last_name}</span>
                        {r.plan && <span style={{ padding: "3px 10px", borderRadius: 10, background: "rgba(29,158,117,0.15)", color: "#1D9E75", fontSize: 12, fontWeight: 600 }}>{r.plan}</span>}
                        <span style={{ padding: "3px 10px", borderRadius: 10, background: s.color + "22", color: s.color, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                      </div>
                      {r.company && <div style={{ color: "#9fb3c8", fontSize: 14, marginBottom: 4 }}>🏢 {r.company}</div>}
                      <div style={{ color: "#7a8a99", fontSize: 13 }}>
                        {r.phone && <span>📞 {r.phone} </span>}
                        {r.email && <span>✉️ {r.email}</span>}
                      </div>
                      {r.message && <div style={{ color: "#7a8a99", fontSize: 13, marginTop: 8, fontStyle: "italic" }}>"{r.message}"</div>}
                      <div style={{ color: "#5a6b7a", fontSize: 11, marginTop: 8 }}>{r.created_at}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.status !== "contacted" && (
                        <button onClick={() => updateStatus(r.id, "contacted")}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2a4a5a", background: "transparent", color: "#3498db", cursor: "pointer", fontSize: 12 }}>
                          დაკავშირებული
                        </button>
                      )}
                      {r.status !== "closed" && (
                        <button onClick={() => updateStatus(r.id, "closed")}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #3a4550", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12 }}>
                          დახურვა
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}