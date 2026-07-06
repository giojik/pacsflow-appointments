import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateFormat";
import DateField from "../components/DateField";

export default function Waitlist() {
  const { user } = useAuth();
  const [waitlist, setWaitlist] = useState([]);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    provider_id: "", service_id: "",
    preferred_date_from: "", preferred_date_to: "",
    preferred_time_from: "09:00", preferred_time_to: "17:00",
    notes: ""
  });

  const STATUS_COLOR = { waiting: "#f39c12", notified: "#3498db", booked: "#1D9E75", expired: "#95a5a6" };
  const STATUS_LABEL = { waiting: "მოლოდინში", notified: "შეტყობინება გაიგზავნა", booked: "დაჯავშნული", expired: "ვადა გასულია" };

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box" };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/waitlist/", { params: { tenant_id: user.tenant_id } });
      setWaitlist(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get("/providers/", { params: { tenant_id: user.tenant_id, active: true } }).then(r => setProviders(r.data));
    api.get("/services/", { params: { tenant_id: user.tenant_id, active: true } }).then(r => setServices(r.data));
  }, []);

  useEffect(() => {
    if (clientSearch.length < 2) { setClients([]); return; }
    api.get("/clients/", { params: { tenant_id: user.tenant_id, search: clientSearch } }).then(r => setClients(r.data));
  }, [clientSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient) { alert("კლიენტი არ არის არჩეული"); return; }
    setSaving(true);
    try {
      await api.post("/waitlist/", {
        ...form,
        tenant_id: user.tenant_id,
        client_id: selectedClient.id,
      });
      setShowForm(false);
      setSelectedClient(null);
      setClientSearch("");
      setForm({ provider_id: "", service_id: "", preferred_date_from: "", preferred_date_to: "", preferred_time_from: "09:00", preferred_time_to: "17:00", notes: "" });
      load();
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("წაიშალოს?")) return;
    await api.delete(`/waitlist/${id}`);
    load();
  };

  if (loading) return <p>იტვირთება...</p>;

  return (
    <div>
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000066", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 540, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px" }}>Waitlist-ში დამატება</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>კლიენტი *</label>
                <div style={{ position: "relative" }}>
                  <input placeholder="ძიება: სახელი / ტელ / პირადი ნომ."
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); }}
                    style={inp} />
                  {clients.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, border: "1px solid #ddd", borderRadius: 6, background: "#fff", zIndex: 10, maxHeight: 150, overflowY: "auto", boxShadow: "0 4px 12px #0001" }}>
                      {clients.map(c => (
                        <div key={c.id}
                          onClick={() => { setSelectedClient(c); setClientSearch(`${c.first_name} ${c.last_name} · ${c.phone}`); setClients([]); }}
                          style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f0f0f0" }}
                          onMouseOver={e => e.currentTarget.style.background = "#f5f5f5"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                          {c.first_name} {c.last_name} · {c.phone}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedClient && <div style={{ fontSize: 12, color: "#1D9E75", marginTop: 4 }}>✓ {selectedClient.first_name} {selectedClient.last_name}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>პროვაიდერი *</label>
                  <select required value={form.provider_id} onChange={e => setForm({ ...form, provider_id: e.target.value })} style={inp}>
                    <option value="">აირჩიე...</option>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სერვისი</label>
                  <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} style={inp}>
                    <option value="">ნებისმიერი</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ka}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სასურველი თარიღი (დასაწყისი)</label>
                  <DateField value={form.preferred_date_from} onChange={v => setForm({ ...form, preferred_date_from: v })} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სასურველი თარიღი (დასასრული)</label>
                  <DateField value={form.preferred_date_to} onChange={v => setForm({ ...form, preferred_date_to: v })} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სასურველი საათი (დასაწყისი)</label>
                  <input type="time" value={form.preferred_time_from} onChange={e => setForm({ ...form, preferred_time_from: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სასურველი საათი (დასასრული)</label>
                  <input type="time" value={form.preferred_time_to} onChange={e => setForm({ ...form, preferred_time_to: e.target.value })} style={inp} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>შენიშვნა</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={{ ...inp, height: 60, resize: "vertical" }} placeholder="სურვილისამებრ" />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving} style={{ background: "#1D9E75", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer", flex: 1 }}>
                  {saving ? "ინახება..." : "დამატება"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: "#f5f5f5", color: "#333", border: "none", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
                  გაუქმება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Waitlist</h2>
        <button onClick={() => setShowForm(true)} style={{ background: "#1D9E75", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>
          + დამატება
        </button>
      </div>

      {waitlist.length === 0 && <p style={{ color: "#999" }}>Waitlist ცარიელია</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {waitlist.map(w => (
          <div key={w.id} style={{
            background: "#fff", padding: 16, borderRadius: 12,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderLeft: `4px solid ${STATUS_COLOR[w.status]}`
          }}>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 15 }}>{w.client_name}</div>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                {w.provider_name}
                {w.preferred_date_from && <span> · {formatDate(w.preferred_date_from)}</span>}
                {w.preferred_date_to && w.preferred_date_to !== w.preferred_date_from && <span> — {formatDate(w.preferred_date_to)}</span>}
                {w.preferred_time_from && <span> · {w.preferred_time_from}</span>}
                {w.preferred_time_to && <span> — {w.preferred_time_to}</span>}
              </div>
              {w.notes && <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{w.notes}</div>}
              <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
                დამატდა: {formatDate(w.created_at)}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span style={{
                background: STATUS_COLOR[w.status] + "22",
                color: STATUS_COLOR[w.status],
                padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: "bold"
              }}>{STATUS_LABEL[w.status]}</span>
              <button onClick={() => remove(w.id)} style={{
                background: "#fde8e8", color: "#e74c3c", border: "none",
                padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12
              }}>წაშლა</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}