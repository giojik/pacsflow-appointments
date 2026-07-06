import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function PlatformUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwId, setPwId] = useState(null);
  const [pwValue, setPwValue] = useState("");
  const [form, setForm] = useState({ username: "", password: "", full_name: "", email: "" });

  const inp = { padding: "9px 12px", borderRadius: 6, border: "1px solid #2a3540", fontSize: 14, width: "100%", boxSizing: "border-box", background: "#0f1419", color: "#fff" };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/platform/users");
      setUsers(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.username || form.password.length < 8) { alert("username და პაროლი (მინ. 8) სავალდებულოა"); return; }
    setSaving(true);
    try {
      await api.post("/platform/users", form);
      setShowForm(false);
      setForm({ username: "", password: "", full_name: "", email: "" });
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/platform/users/${u.id}`, { active: !u.active });
      load();
    } catch (err) { alert("შეცდომა: " + (err.response?.data?.detail || err.message)); }
  };

  const changePassword = async (id) => {
    if (pwValue.length < 8) { alert("პაროლი მინიმუმ 8 სიმბოლო"); return; }
    try {
      await api.patch(`/platform/users/${id}`, { password: pwValue });
      setPwId(null); setPwValue("");
      alert("პაროლი შეიცვალა");
    } catch (err) { alert("შეცდომა: " + (err.response?.data?.detail || err.message)); }
  };

  const remove = async (u) => {
    if (!confirm(`წაიშალოს platform admin "${u.username}"?`)) return;
    try {
      await api.delete(`/platform/users/${u.id}`);
      load();
    } catch (err) { alert("შეცდომა: " + (err.response?.data?.detail || err.message)); }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>👤 Platform Admins</h1>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20 }}>პლატფორმის ადმინისტრატორები</div>

        <button onClick={() => setShowForm(s => !s)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold", marginBottom: 20 }}>
          {showForm ? "✕ დახურვა" : "➕ ახალი admin"}
        </button>

        {showForm && (
          <div style={{ background: "#1a2530", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Username *</label>
                <input style={inp} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>პაროლი * (მინ. 8)</label>
                <input type="password" style={inp} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>სახელი გვარი</label>
                <input style={inp} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Email</label>
                <input style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <button onClick={create} disabled={saving}
              style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
              {saving ? "იქმნება..." : "შექმნა"}
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#7a8a99" }}>იტვირთება...</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            {users.map(u => (
              <div key={u.id} style={{ background: "#1a2530", borderRadius: 12, padding: 18, opacity: u.active ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{u.full_name || u.username}</span>
                      {u.id === me?.user_id && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#1D9E7533", color: "#1D9E75" }}>თქვენ</span>}
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: u.active ? "#1D9E7533" : "#c0392b33", color: u.active ? "#1D9E75" : "#e74c3c" }}>
                        {u.active ? "აქტიური" : "გამორთული"}
                      </span>
                    </div>
                    <div style={{ color: "#7a8a99", fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>
                      {u.username} {u.email && `· ${u.email}`} · {u.created_at}
                    </div>
                    {pwId === u.id && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                        <input type="password" placeholder="ახალი პაროლი" value={pwValue} onChange={e => setPwValue(e.target.value)} style={{ ...inp, width: 200 }} />
                        <button onClick={() => changePassword(u.id)} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 12 }}>შენახვა</button>
                        <button onClick={() => { setPwId(null); setPwValue(""); }} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #3a4550", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 12 }}>გაუქმება</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setPwId(pwId === u.id ? null : u.id); setPwValue(""); }}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2a4a5a", background: "transparent", color: "#5ab0d0", cursor: "pointer", fontSize: 13 }}>
                      🔑 პაროლი
                    </button>
                    {u.id !== me?.user_id && (
                      <>
                        <button onClick={() => toggleActive(u)}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                            background: u.active ? "#c0392b" : "#1D9E75", color: "#fff" }}>
                          {u.active ? "გამორთვა" : "ჩართვა"}
                        </button>
                        <button onClick={() => remove(u)}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #5a2530", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 13 }}>
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}