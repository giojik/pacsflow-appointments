import { useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ current_password:"", new_password:"", confirm_password:"" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setMessage({ type:"error", text:"პაროლები არ ემთხვევა" });
      return;
    }
    if (form.new_password.length < 6) {
      setMessage({ type:"error", text:"პაროლი მინიმუმ 6 სიმბოლო" });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/auth/users/${user.user_id}`, { password: form.new_password });
      setMessage({ type:"success", text:"პაროლი წარმატებით შეიცვალა!" });
      setForm({ current_password:"", new_password:"", confirm_password:"" });
    } catch (err) {
      setMessage({ type:"error", text:"შეცდომა: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth:480 }}>
      <h2 style={{ margin:"0 0 20px" }}>პროფილი</h2>

      {/* User info */}
      <div style={{ background:"#fff", borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
          <div style={{
            width:56, height:56, borderRadius:"50%", background:"#1D9E75",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, color:"#fff", fontWeight:"bold"
          }}>
            {user?.full_name?.[0] || user?.username?.[0] || "?"}
          </div>
          <div>
            <div style={{ fontWeight:"bold", fontSize:18 }}>{user?.full_name || user?.username}</div>
            <div style={{ color:"#666", fontSize:13 }}>@{user?.username}</div>
            <div style={{ fontSize:12, color:"#1D9E75", marginTop:2 }}>{user?.role}</div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background:"#fff", borderRadius:12, padding:20 }}>
        <h3 style={{ margin:"0 0 16px", fontSize:16 }}>პაროლის შეცვლა</h3>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ახალი პაროლი *</label>
            <input type="password" required value={form.new_password}
              onChange={e => setForm({...form, new_password: e.target.value})}
              style={inp} placeholder="მინიმუმ 6 სიმბოლო" />
          </div>
          <div>
            <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>გაიმეორე პაროლი *</label>
            <input type="password" required value={form.confirm_password}
              onChange={e => setForm({...form, confirm_password: e.target.value})}
              style={inp} />
          </div>
          {message && (
            <div style={{
              padding:"10px 14px", borderRadius:8, fontSize:13,
              background: message.type === "success" ? "#e8f8f3" : "#fde8e8",
              color: message.type === "success" ? "#1D9E75" : "#e74c3c"
            }}>{message.text}</div>
          )}
          <button type="submit" disabled={saving} style={{
            background:"#1D9E75", color:"#fff", border:"none",
            padding:"10px", borderRadius:8, cursor:"pointer", fontSize:14
          }}>{saving ? "ინახება..." : "შეცვლა"}</button>
        </form>
      </div>
    </div>
  );
}