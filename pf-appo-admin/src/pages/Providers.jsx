import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Providers() {
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState(user.tenant_id);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", specialty: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      let tid = user.tenant_id;
      if (!tid) {
        // superadmin — პირველი tenant-ი ავიღოთ
        try {
          const { data } = await api.get("/auth/me");
          // tenants endpoint არ გვაქვს ჯერ — DB-იდან ვიღებთ innova-ს
          // დროებით: providers-ს ყველა tenant-ზე ვთხოვთ
          tid = null;
        } catch {}
      }
      setTenantId(tid);
      await load(tid);
    };
    init();
  }, []);

  const load = async (tid) => {
    try {
      const params = {};
      if (tid) params.tenant_id = tid;
      const { data } = await api.get("/providers/", { params });
      setProviders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) {
      alert("Tenant ID არ არის — superadmin-ს tenant უნდა მიენიჭოს");
      return;
    }
    setSaving(true);
    try {
      await api.post("/providers/", { ...form, tenant_id: tenantId });
      setShowForm(false);
      setForm({ first_name: "", last_name: "", specialty: "", phone: "", email: "" });
      load(tenantId);
    } catch (e) {
      alert("შეცდომა: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    await api.patch(`/providers/${p.id}`, { active: !p.active });
    load(tenantId);
  };

  if (loading) return <p>იტვირთება...</p>;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0 }}>პროვაიდერები</h2>
        <button onClick={() => setShowForm(!showForm)} style={{
          background:"#1D9E75", color:"#fff", border:"none",
          padding:"8px 16px", borderRadius:8, cursor:"pointer"
        }}>
          {showForm ? "გაუქმება" : "+ დამატება"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background:"#fff", padding:20, borderRadius:12,
          marginBottom:20, display:"flex", flexDirection:"column", gap:10
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <input placeholder="სახელი *" required value={form.first_name}
              onChange={e => setForm({...form, first_name: e.target.value})}
              style={{ padding:8, borderRadius:6, border:"1px solid #ddd" }} />
            <input placeholder="გვარი *" required value={form.last_name}
              onChange={e => setForm({...form, last_name: e.target.value})}
              style={{ padding:8, borderRadius:6, border:"1px solid #ddd" }} />
            <input placeholder="სპეციალობა" value={form.specialty}
              onChange={e => setForm({...form, specialty: e.target.value})}
              style={{ padding:8, borderRadius:6, border:"1px solid #ddd" }} />
            <input placeholder="ტელეფონი" value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              style={{ padding:8, borderRadius:6, border:"1px solid #ddd" }} />
            <input placeholder="Email" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              style={{ padding:8, borderRadius:6, border:"1px solid #ddd" }} />
          </div>
          <button type="submit" disabled={saving} style={{
            background:"#1D9E75", color:"#fff", border:"none",
            padding:"10px", borderRadius:8, cursor:"pointer"
          }}>
            {saving ? "ინახება..." : "შენახვა"}
          </button>
        </form>
      )}

      <div style={{ display:"grid", gap:12 }}>
        {providers.length === 0 && <p>პროვაიდერები არ არის</p>}
        {providers.map(p => (
          <div key={p.id} style={{
            background:"#fff", padding:16, borderRadius:12,
            display:"flex", justifyContent:"space-between", alignItems:"center",
            opacity: p.active ? 1 : 0.5
          }}>
            <div>
              <div style={{ fontWeight:"bold", fontSize:16 }}>
                {p.first_name} {p.last_name}
              </div>
              <div style={{ color:"#666", fontSize:13 }}>{p.specialty}</div>
              <div style={{ color:"#999", fontSize:12 }}>{p.phone} {p.email}</div>
            </div>
            <button onClick={() => toggleActive(p)} style={{
              background: p.active ? "#e74c3c" : "#1D9E75",
              color:"#fff", border:"none", padding:"6px 12px",
              borderRadius:6, cursor:"pointer", fontSize:13
            }}>
              {p.active ? "დეაქტივაცია" : "აქტივაცია"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}