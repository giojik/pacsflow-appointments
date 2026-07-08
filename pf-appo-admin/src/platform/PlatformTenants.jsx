import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function PlatformTenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDomains, setEditDomains] = useState("");
  const [editNameId, setEditNameId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [form, setForm] = useState({
    name: "", slug: "", domains: "", path_slug: "",
    admin_username: "", admin_password: "", admin_full_name: "",
  });

  const inp = { padding: "9px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box" };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/platform/tenants");
      setTenants(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createTenant = async () => {
    if (!form.name || !form.slug) { alert("სახელი და slug სავალდებულოა"); return; }
    setSaving(true);
    try {
      await api.post("/platform/tenants", form);
      setShowForm(false);
      setForm({ name: "", slug: "", domains: "", path_slug: "", admin_username: "", admin_password: "", admin_full_name: "" });
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      await api.patch(`/platform/tenants/${t.id}`, { active: !t.active });
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveDomains = async (id) => {
    try {
      await api.patch(`/platform/tenants/${id}`, { domains: editDomains });
      setEditId(null);
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  const saveName = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/platform/tenants/${id}`, { name: editName.trim() });
      setEditNameId(null);
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  const deleteTenant = async (t) => {
    if (deleteConfirm !== t.slug) {
      alert(`დასადასტურებლად აკრიფე slug: ${t.slug}`);
      return;
    }
    try {
      await api.delete(`/platform/tenants/${t.id}`, { params: { confirm_slug: deleteConfirm } });
      setDeleteId(null);
      setDeleteConfirm("");
      load();
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  const impersonate = async (t) => {
    if (!t.active) { alert("გამორთული კომპანიაში შესვლა შეუძლებელია"); return; }
    if (!confirm(`შეხვალ "${t.name}"-ის პანელში ამ კომპანიის ადმინის სახელით. გაგრძელება?`)) return;
    try {
      const { data } = await api.post(`/platform/tenants/${t.id}/impersonate`);
      localStorage.setItem("pf_platform_token", localStorage.getItem("pf_token"));
      localStorage.setItem("pf_platform_user", localStorage.getItem("pf_user"));
      localStorage.setItem("pf_impersonating", JSON.stringify({ tenant_name: data.tenant_name }));
      localStorage.setItem("pf_token", data.access_token);
      localStorage.setItem("pf_user", JSON.stringify({
        user_id: data.user_id, username: data.username, role: data.role,
        tenant_id: data.tenant_id, full_name: data.full_name,
      }));
      window.location.href = "/app";
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    }
  };

  const Stat = ({ label, value }) => (
    <div style={{ textAlign: "center", minWidth: 60 }}>
      <div style={{ fontSize: 20, fontWeight: "bold", color: "#1D9E75" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#999" }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>🏢 კომპანიები</h1>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20 }}>tenant-ების მართვა</div>

        <button onClick={() => setShowForm(s => !s)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold", marginBottom: 20 }}>
          {showForm ? "✕ დახურვა" : "➕ ახალი კომპანია"}
        </button>

        {showForm && (
          <div style={{ background: "#1a2530", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ color: "#fff", fontWeight: "bold", marginBottom: 16 }}>ახალი კომპანიის დამატება</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>კომპანიის სახელი *</label>
                <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ABC Clinic" />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Slug * (ლათინურად, უნიკალური)</label>
                <input style={inp} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") }))} placeholder="abcclinic" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>დომეინები (მძიმით გამოყოფილი)</label>
                <input style={inp} value={form.domains} onChange={e => setForm(f => ({ ...f, domains: e.target.value }))} placeholder="booking.abc.ge,abc.local" />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Booking Slug (appointment.pacsflow.ge/b/slug)</label>
                <input style={inp} value={form.path_slug} onChange={e => setForm(f => ({ ...f, path_slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} placeholder="im" maxLength={20} />
              </div>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #2a3540", paddingTop: 14, marginTop: 4 }}>
                <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 10 }}>პირველი ადმინისტრატორი (არასავალდებულო)</div>
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Admin username</label>
                <input style={inp} value={form.admin_username} onChange={e => setForm(f => ({ ...f, admin_username: e.target.value }))} placeholder="abc_admin" />
              </div>
              <div>
                <label style={{ color: "#7a8a99", fontSize: 12, display: "block", marginBottom: 4 }}>Admin პაროლი (მინ. 8)</label>
                <input type="password" style={inp} value={form.admin_password} onChange={e => setForm(f => ({ ...f, admin_password: e.target.value }))} />
              </div>
            </div>
            <button onClick={createTenant} disabled={saving}
              style={{ marginTop: 16, padding: "10px 24px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
              {saving ? "იქმნება..." : "შექმნა"}
            </button>
          </div>
        )}

        {loading ? <p style={{ color: "#7a8a99" }}>იტვირთება...</p> : (
          <div style={{ display: "grid", gap: 14 }}>
            {tenants.map(t => (
              <div key={t.id} style={{ background: "#1a2530", borderRadius: 12, padding: 20, opacity: t.active ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {editNameId === t.id ? (
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <input value={editName} onChange={e => setEditName(e.target.value)}
                            style={{ ...inp, width: 200 }} autoFocus />
                          <button onClick={() => saveName(t.id)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 12 }}>✓</button>
                          <button onClick={() => setEditNameId(null)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #3a4550", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </span>
                      ) : (
                        <span style={{ color: "#fff", fontSize: 18, fontWeight: "bold", cursor: "pointer" }}
                          onClick={() => { setEditNameId(t.id); setEditName(t.name); }} title="დააკლიკე რედაქტირებისთვის">
                          {t.name} <span style={{ fontSize: 12, color: "#4a5560" }}>✎</span>
                        </span>
                      )}
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: t.active ? "#1D9E7533" : "#c0392b33", color: t.active ? "#1D9E75" : "#e74c3c" }}>
                        {t.active ? "აქტიური" : "გამორთული"}
                      </span>
                    </div>
                    <div style={{ color: "#7a8a99", fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>slug: {t.slug} · {t.created_at}</div>
                    {t.path_slug && <div style={{ color: "#5ab0d0", fontSize: 12, marginTop: 4, fontFamily: "monospace" }}>🔗 appointment.pacsflow.ge/b/{t.path_slug}</div>}

                    <div style={{ marginTop: 10 }}>
                      {editId === t.id ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <input style={{ ...inp, width: 320 }} value={editDomains} onChange={e => setEditDomains(e.target.value)} placeholder="domain1,domain2" />
                          <button onClick={() => saveDomains(t.id)} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 12 }}>შენახვა</button>
                          <button onClick={() => setEditId(null)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #3a4550", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 12 }}>გაუქმება</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: "#9fb3c8", fontSize: 13, fontFamily: "monospace" }}>🌐 {t.domains || "(დომეინი არ არის)"}</span>
                          <button onClick={() => { setEditId(t.id); setEditDomains(t.domains); }}
                            style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #3a4550", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 11 }}>
                            ✎ რედაქტირება
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <Stat label="მომხმ." value={t.stats.users} />
                    <Stat label="ექიმი" value={t.stats.providers} />
                    <Stat label="სერვისი" value={t.stats.services} />
                    <Stat label="კლიენტი" value={t.stats.clients} />
                    <Stat label="ჩაწერა" value={t.stats.appointments} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignSelf: "center" }}>
                    <button onClick={() => toggleActive(t)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                        background: t.active ? "#c0392b" : "#1D9E75", color: "#fff" }}>
                      {t.active ? "გამორთვა" : "ჩართვა"}
                    </button>
                    <button onClick={() => { setDeleteId(deleteId === t.id ? null : t.id); setDeleteConfirm(""); }}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #5a2530", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 13 }}>
                      🗑 წაშლა
                    </button>
                    <button onClick={() => impersonate(t)} disabled={!t.active}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #2a4a5a", background: "transparent", color: t.active ? "#5ab0d0" : "#3a4550", cursor: t.active ? "pointer" : "not-allowed", fontSize: 13 }}>
                      🔑 შესვლა
                    </button>
                    <button onClick={() => navigate(`/platform/tenants/${t.id}`)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3a4550", background: "transparent", color: "#9fb3c8", cursor: "pointer", fontSize: 13 }}>
                      📋 დეტალები
                    </button>
                  </div>

                  {deleteId === t.id && (
                    <div style={{ marginTop: 14, padding: 14, background: "#2a1518", borderRadius: 8, border: "1px solid #5a2530", width: "100%" }}>
                      <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 10 }}>
                        ⚠️ ეს წაშლის <b>{t.name}</b>-ს და მთელ მონაცემებს (მომხმარებლები, სერვისები, ჩაწერები). ეს <b>შეუქცევადია</b>.
                        <br />დასადასტურებლად აკრიფე slug: <code style={{ background: "#3a1a1e", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{t.slug}</code>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                          placeholder={t.slug} style={{ ...inp, width: 200 }} />
                        <button onClick={() => deleteTenant(t)} disabled={deleteConfirm !== t.slug}
                          style={{ padding: "9px 18px", borderRadius: 6, border: "none", cursor: deleteConfirm === t.slug ? "pointer" : "not-allowed",
                            background: deleteConfirm === t.slug ? "#c0392b" : "#4a2530", color: "#fff", fontSize: 13, fontWeight: "bold" }}>
                          საბოლოოდ წაშლა
                        </button>
                        <button onClick={() => { setDeleteId(null); setDeleteConfirm(""); }}
                          style={{ padding: "9px 14px", borderRadius: 6, border: "1px solid #3a4550", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 13 }}>
                          გაუქმება
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}