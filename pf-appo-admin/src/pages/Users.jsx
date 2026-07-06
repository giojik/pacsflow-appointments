import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const ROLE_COLOR = {
  superadmin:   "#8e44ad",
  admin:        "#2c3e50",
  receptionist: "#1D9E75",
  provider:     "#3498db",
  viewer:       "#95a5a6",
};
const ROLE_LABEL = {
  superadmin:   "სუპერ ადმინი",
  admin:        "ადმინი",
  receptionist: "რეგისტრატორი",
  provider:     "პროვაიდერი",
  viewer:       "მაყურებელი",
};

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username:"", password:"", email:"", full_name:"", role:"viewer", provider_id:"" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/auth/users");
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get("/providers/", { params: { tenant_id: user.tenant_id, active: true } }).then(r => setProviders(r.data));
  }, []);

  const openNew = () => {
    setEditUser(null);
    setForm({ username:"", password:"", email:"", full_name:"", role:"viewer", provider_id:"" });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username:u.username, password:"", email:u.email||"", full_name:u.full_name||"", role:u.role, provider_id:u.provider_id||"" });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      if (!body.provider_id) delete body.provider_id;
      if (editUser) {
        await api.patch(`/auth/users/${editUser.id}`, body);
      } else {
        await api.post("/auth/users", { ...body, tenant_id: user.tenant_id });
      }
      setShowForm(false);
      load();
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    await api.patch(`/auth/users/${u.id}`, { active: !u.active });
    load();
  };

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  return (
    <div>
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:480 }}>
            <h3 style={{ margin:"0 0 16px" }}>{editUser ? "მომხმარებლის რედაქტირება" : "ახალი მომხმარებელი"}</h3>
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>მომხმარებელი *</label>
                  <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                    disabled={!!editUser} style={{...inp, background: editUser ? "#f5f5f5" : "#fff"}} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>
                    {editUser ? "ახალი პაროლი (სურვილისამებრ)" : "პაროლი *"}
                  </label>
                  <input type="password" value={form.password}
                    required={!editUser}
                    onChange={e => setForm({...form, password: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სახელი გვარი</label>
                  <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>Email</label>
                  <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>Role *</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={inp}>
                    {Object.entries(ROLE_LABEL).map(([k,v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {form.role === "provider" && (
                  <div>
                    <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>პროვაიდერი</label>
                    <select value={form.provider_id} onChange={e => setForm({...form, provider_id: e.target.value})} style={inp}>
                      <option value="">აირჩიე...</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                    </select>
                  </div>
                )}
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
        <h2 style={{ margin:0 }}>მომხმარებლები</h2>
        <button onClick={openNew} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>
          + დამატება
        </button>
      </div>

      {loading ? <p>იტვირთება...</p> : (
        <div style={{ display:"grid", gap:10 }}>
          {users.map(u => (
            <div key={u.id} style={{
              background:"#fff", padding:16, borderRadius:12,
              display:"flex", justifyContent:"space-between", alignItems:"center",
              opacity: u.active ? 1 : 0.5,
              borderLeft: `4px solid ${ROLE_COLOR[u.role]}`
            }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontWeight:"bold", fontSize:16 }}>{u.full_name || u.username}</span>
                  <span style={{
                    background: ROLE_COLOR[u.role] + "22",
                    color: ROLE_COLOR[u.role],
                    padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:"bold"
                  }}>{ROLE_LABEL[u.role]}</span>
                  {u.auth_provider === "ldap" && (
                    <span style={{ background:"#e8f4fd", color:"#3498db", padding:"2px 8px", borderRadius:20, fontSize:11 }}>AD</span>
                  )}
                </div>
                <div style={{ color:"#666", fontSize:13, marginTop:4, display:"flex", gap:16 }}>
                  <span>👤 {u.username}</span>
                  {u.email && <span>✉️ {u.email}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => openEdit(u)} style={{
                  background:"#f5f5f5", color:"#333", border:"1px solid #ddd",
                  padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:13
                }}>რედაქტირება</button>
                {u.id !== user.id && (
                  <button onClick={() => toggleActive(u)} style={{
                    background: u.active ? "#e74c3c" : "#1D9E75",
                    color:"#fff", border:"none", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:13
                  }}>{u.active ? "დეაქტივაცია" : "აქტივაცია"}</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}