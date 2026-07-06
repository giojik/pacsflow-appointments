import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Services() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name_ka: "", name_en: "", duration_min: 30, color: "#1D9E75" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/services/", { params: { tenant_id: user.tenant_id } });
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/services/", { ...form, tenant_id: user.tenant_id, duration_min: Number(form.duration_min) });
      setShowForm(false);
      setForm({ code: "", name_ka: "", name_en: "", duration_min: 30, color: "#1D9E75" });
      load();
    } catch (e) {
      alert("შეცდომა: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s) => {
    await api.patch(`/services/${s.id}`, { active: !s.active });
    load();
  };

  if (loading) return <p>იტვირთება...</p>;

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0 }}>სერვისები</h2>
        <button onClick={() => setShowForm(!showForm)} style={{
          background:"#1D9E75", color:"#fff", border:"none",
          padding:"8px 16px", borderRadius:8, cursor:"pointer"
        }}>
          {showForm ? "გაუქმება" : "+ დამატება"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background:"#fff", padding:20, borderRadius:12, marginBottom:20
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>კოდი *</label>
              <input placeholder="CONSULT" required value={form.code}
                onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სახელი (ქართ.) *</label>
              <input placeholder="კონსულტაცია" required value={form.name_ka}
                onChange={e => setForm({...form, name_ka: e.target.value})}
                style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სახელი (ინგლ.)</label>
              <input placeholder="Consultation" value={form.name_en}
                onChange={e => setForm({...form, name_en: e.target.value})}
                style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ხანგრძლივობა (წთ)</label>
              <input type="number" min="5" max="480" value={form.duration_min}
                onChange={e => setForm({...form, duration_min: e.target.value})}
                style={{...inp, maxWidth:120}} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ფერი</label>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="color" value={form.color}
                  onChange={e => setForm({...form, color: e.target.value})}
                  style={{ width:40, height:36, border:"none", cursor:"pointer", borderRadius:6 }} />
                <span style={{ fontSize:13, color:"#666" }}>{form.color}</span>
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} style={{
            background:"#1D9E75", color:"#fff", border:"none",
            padding:"10px 24px", borderRadius:8, cursor:"pointer", fontSize:14
          }}>
            {saving ? "ინახება..." : "შენახვა"}
          </button>
        </form>
      )}

      <div style={{ display:"grid", gap:12 }}>
        {services.length === 0 && <p style={{color:"#999"}}>სერვისები არ არის</p>}
        {services.map(s => (
          <div key={s.id} style={{
            background:"#fff", padding:16, borderRadius:12,
            display:"flex", justifyContent:"space-between", alignItems:"center",
            opacity: s.active ? 1 : 0.5,
            borderLeft: `4px solid ${s.color}`
          }}>
            <div>
              <div style={{ fontWeight:"bold", fontSize:16 }}>{s.name_ka}</div>
              {s.name_en && <div style={{ color:"#666", fontSize:13 }}>{s.name_en}</div>}
              <div style={{ color:"#999", fontSize:12, marginTop:4 }}>
                კოდი: <b>{s.code}</b> · ⏱ {s.duration_min} წთ
              </div>
            </div>
            <button onClick={() => toggleActive(s)} style={{
              background: s.active ? "#e74c3c" : "#1D9E75",
              color:"#fff", border:"none", padding:"6px 14px",
              borderRadius:6, cursor:"pointer", fontSize:13
            }}>
              {s.active ? "დეაქტივაცია" : "აქტივაცია"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}