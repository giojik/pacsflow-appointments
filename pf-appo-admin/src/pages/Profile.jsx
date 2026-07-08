import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ current_password:"", new_password:"", confirm_password:"" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [calStatus, setCalStatus] = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  const isProvider = user?.role === "provider" && user?.provider_id;

  useEffect(() => {
    if (isProvider) loadCalendarStatus();
  }, []);

  // OAuth popup-იდან შეტყობინება
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "calendar_connected") {
        loadCalendarStatus();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const loadCalendarStatus = async () => {
    try {
      const { data } = await api.get(`/auth/calendar/status/${user.provider_id}`);
      setCalStatus(data);
    } catch {
      setCalStatus({ connected: false });
    }
  };

  const connectCalendar = () => {
    const url = `/api/v1/auth/calendar/connect/google?provider_id=${user.provider_id}`;
    window.open(url, "calendar_connect", "width=500,height=600,scrollbars=yes");
  };

  const disconnectCalendar = async () => {
    if (!confirm("Google Calendar-ის მიბმა გაუქმდეს?")) return;
    setCalLoading(true);
    try {
      await api.delete(`/auth/calendar/disconnect/${user.provider_id}`);
      setCalStatus({ connected: false });
    } catch (e) {
      alert("შეცდომა: " + (e.response?.data?.detail || e.message));
    } finally {
      setCalLoading(false);
    }
  };

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

      {/* Google Calendar — მხოლოდ provider-ისთვის */}
      {isProvider && (
        <div style={{ background:"#fff", borderRadius:12, padding:20, marginBottom:16 }}>
          <h3 style={{ margin:"0 0 16px", fontSize:16 }}>📅 Google Calendar</h3>
          {calStatus === null ? (
            <p style={{ color:"#999", fontSize:13 }}>იტვირთება...</p>
          ) : calStatus.connected ? (
            <div>
              <div style={{
                display:"flex", alignItems:"center", gap:8, marginBottom:12,
                padding:"10px 14px", borderRadius:8, background:"#e8f8f3"
              }}>
                <span style={{ fontSize:18 }}>✅</span>
                <div>
                  <div style={{ fontSize:14, color:"#1D9E75", fontWeight:600 }}>დაკავშირებულია</div>
                  <div style={{ fontSize:12, color:"#666" }}>ახალი ჩაწერები ავტომატურად აისახება თქვენს Google Calendar-ში</div>
                </div>
              </div>
              <button onClick={disconnectCalendar} disabled={calLoading} style={{
                background:"none", border:"1px solid #e74c3c", color:"#e74c3c",
                padding:"8px 16px", borderRadius:8, cursor:"pointer", fontSize:13
              }}>
                {calLoading ? "მიმდინარეობს..." : "მიბმის გაუქმება"}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:13, color:"#666", marginBottom:12, marginTop:0 }}>
                დააკავშირეთ Google Calendar რომ ჩაწერები ავტომატურად აისახოს თქვენს კალენდარში
              </p>
              <button onClick={connectCalendar} style={{
                background:"#4285f4", color:"#fff", border:"none",
                padding:"10px 20px", borderRadius:8, cursor:"pointer", fontSize:14,
                display:"flex", alignItems:"center", gap:8
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google Calendar-ის მიბმა
              </button>
            </div>
          )}
        </div>
      )}

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
