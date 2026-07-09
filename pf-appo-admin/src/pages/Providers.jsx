import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Providers() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(user.tenant_id);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", specialty: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState({});

  useEffect(() => {
    const init = async () => {
      let tid = user.tenant_id;
      if (!tid) { try { await api.get("/auth/me"); } catch {} tid = null; }
      setTenantId(tid);
      await load(tid);
    };
    init();
  }, []);

  // OAuth popup-იდან შეტყობინების მოსმენა
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "calendar_connected") {
        load(tenantId);
        loadAllCalendarStatus();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [tenantId]);

  const load = async (tid) => {
    try {
      const params = {};
      if (tid) params.tenant_id = tid;
      const { data } = await api.get("/providers/", { params });
      setProviders(data);
      // calendar status ავტომატურად provider data-ში
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAllCalendarStatus = async () => {
    const statuses = {};
    for (const p of providers) {
      try {
        const { data: st } = await api.get(`/auth/calendar/status/${p.id}`);
        statuses[p.id] = st;
      } catch { statuses[p.id] = { connected: false }; }
    }
    setCalendarStatus(statuses);
  };

  const resetForm = () => {
    setForm({ first_name: "", last_name: "", specialty: "", phone: "", email: "" });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (p) => {
    setForm({ first_name: p.first_name, last_name: p.last_name, specialty: p.specialty || "", phone: p.phone || "", email: p.email || "" });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) { alert("Tenant ID არ არის"); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/providers/${editId}`, form);
      } else {
        await api.post("/providers/", { ...form, tenant_id: tenantId });
      }
      resetForm();
      load(tenantId);
    } catch (e) { alert("შეცდომა: " + (e.response?.data?.detail || e.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    if (!confirm(`წაიშალოს ${p.first_name} ${p.last_name}?`)) return;
    try {
      await api.delete(`/providers/${p.id}`);
      load(tenantId);
    } catch (e) { alert("შეცდომა: " + (e.response?.data?.detail || e.message)); }
  };

  const toggleActive = async (p) => {
    await api.patch(`/providers/${p.id}`, { active: !p.active });
    load(tenantId);
  };

  const connectCalendar = (providerId) => {
    const token = localStorage.getItem("token");
    const url = `/api/v1/auth/calendar/connect/google?provider_id=${providerId}&token=${token}`;
    window.open(url, "calendar_connect", "width=500,height=600,scrollbars=yes");
  };

  const disconnectCalendar = async (providerId) => {
    if (!confirm("Google Calendar-ის მიბმა გაუქმდეს?")) return;
    try {
      await api.delete(`/auth/calendar/disconnect/${providerId}`);
      setCalendarStatus(prev => ({ ...prev, [providerId]: { connected: false } }));
    } catch (e) { alert("შეცდომა: " + (e.response?.data?.detail || e.message)); }
  };

  if (loading) return <p>იტვირთება...</p>;

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };
  const btnSm = (bg) => ({ background:bg, color:"#fff", border:"none", padding:"6px 12px", borderRadius:6, cursor:"pointer", fontSize:13 });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0 }}>პროვაიდერები</h2>
        <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }} style={{
          background:"#1D9E75", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer"
        }}>
          {showForm ? "გაუქმება" : "+ დამატება"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background:"#fff", padding:20, borderRadius:12, marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>{editId ? "✏️ შესწორება" : "➕ ახალი პროვაიდერი"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <input placeholder="სახელი *" required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} style={inp} />
            <input placeholder="გვარი *" required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} style={inp} />
            <input placeholder="სპეციალობა" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} style={inp} />
            <input placeholder="ტელეფონი" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inp} />
            <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inp} />
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button type="submit" disabled={saving} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"10px 24px", borderRadius:8, cursor:"pointer" }}>
              {saving ? "ინახება..." : editId ? "განახლება" : "შენახვა"}
            </button>
            {editId && <button type="button" onClick={resetForm} style={{ background:"#6b7280", color:"#fff", border:"none", padding:"10px 24px", borderRadius:8, cursor:"pointer" }}>გაუქმება</button>}
          </div>
        </form>
      )}

      <div style={{ display:"grid", gap:12 }}>
        {providers.length === 0 && <p>პროვაიდერები არ არის</p>}
        {providers.map(p => {
          const cal = calendarStatus[p.id] || {};
          return (
            <div key={p.id} style={{
              background:"#fff", padding:16, borderRadius:12,
              opacity: p.active ? 1 : 0.5
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:"bold", fontSize:16 }}>{p.first_name} {p.last_name}</div>
                  <div style={{ color:"#666", fontSize:13 }}>{p.specialty}</div>
                  <div style={{ color:"#999", fontSize:12 }}>{p.phone} {p.email}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => startEdit(p)} style={btnSm("#3b82f6")}>✏️</button>
                  <button onClick={() => handleDelete(p)} style={btnSm("#ef4444")}>🗑️</button>
                  <button onClick={() => toggleActive(p)} style={btnSm(p.active ? "#f59e0b" : "#1D9E75")}>
                    {p.active ? "⏸" : "▶"}
                  </button>
                </div>
              </div>
              {/* Calendar sync */}
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f0f0f0", display:"flex", alignItems:"center", gap:10 }}>
                {cal.connected ? (
                  <>
                    <span style={{ fontSize:13, color:"#1D9E75" }}>📅 Google Calendar დაკავშირებულია</span>
                    <button onClick={() => disconnectCalendar(p.id)} style={{
                      background:"none", border:"1px solid #e74c3c", color:"#e74c3c",
                      padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:12
                    }}>გათიშვა</button>
                  </>
                ) : (
                  <button onClick={() => connectCalendar(p.id)} style={{
                    background:"none", border:"1px solid #4285f4", color:"#4285f4",
                    padding:"4px 12px", borderRadius:6, cursor:"pointer", fontSize:13,
                    display:"flex", alignItems:"center", gap:6
                  }}>
                    📅 Google Calendar-ის მიბმა
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
