import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateFormat";
import DateField from "../components/DateField";


export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState({ first_name:"", last_name:"", phone:"", email:"", personal_id:"", dob:"" });
  const [saving, setSaving] = useState(false);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const params = { tenant_id: user.tenant_id };
      if (q) params.search = q;
      const { data } = await api.get("/clients/", { params });
      setClients(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => {
    setEditClient(null);
    setForm({ first_name:"", last_name:"", phone:"", email:"", personal_id:"", dob:"" });
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditClient(c);
    setForm({ first_name:c.first_name, last_name:c.last_name, phone:c.phone, email:c.email||"", personal_id:c.personal_id||"", dob:c.dob||"" });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editClient) {
        await api.patch(`/clients/${editClient.id}`, form);
      } else {
        await api.post("/clients/", { ...form, tenant_id: user.tenant_id });
      }
      setShowForm(false);
      load();
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  return (
    <div>
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:480 }}>
            <h3 style={{ margin:"0 0 16px" }}>{editClient ? "კლიენტის რედაქტირება" : "ახალი კლიენტი"}</h3>
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სახელი *</label>
                  <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>გვარი *</label>
                  <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ტელეფონი *</label>
                  <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>Email</label>
                  <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>პირადი ნომერი</label>
                  <input value={form.personal_id} onChange={e => setForm({...form, personal_id: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>დაბ. თარიღი</label>
                  <DateField value={form.dob} onChange={v => setForm({...form, dob: v})} style={inp} />
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <button type="submit" disabled={saving} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer", flex:1 }}>
                  {saving ? "ინახება..." : "შენახვა"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} style={{ background:"#f5f5f5", color:"#333", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer" }}>
                  გაუქმება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ margin:0 }}>კლიენტები</h2>
        <button onClick={openNew} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>
          + დამატება
        </button>
      </div>

      <div style={{ background:"#fff", padding:16, borderRadius:12, marginBottom:16 }}>
        <input
          placeholder="🔍 ძიება: სახელი, გვარი, ტელეფონი, პირადი ნომერი..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, fontSize:15 }}
        />
      </div>

      {loading ? <p>იტვირთება...</p> : (
        <div style={{ display:"grid", gap:10 }}>
          {clients.length === 0 && <p style={{ color:"#999" }}>კლიენტები ვერ მოიძებნა</p>}
          {clients.map(c => (
            <div key={c.id} style={{
              background:"#fff", padding:16, borderRadius:12,
              display:"flex", justifyContent:"space-between", alignItems:"center"
            }}>
              <div>
                <div style={{ fontWeight:"bold", fontSize:16 }}>{c.first_name} {c.last_name}</div>
                <div style={{ color:"#666", fontSize:13, marginTop:4, display:"flex", gap:16 }}>
                  <span>📞 {c.phone}</span>
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.personal_id && <span>🪪 {c.personal_id}</span>}
                  {c.dob && <span>🎂 {formatDate(c.dob)}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(c)} style={{
                background:"#f5f5f5", color:"#333", border:"1px solid #ddd",
                padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:13
              }}>
                რედაქტირება
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}