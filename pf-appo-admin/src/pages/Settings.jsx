import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const Toggle = ({ value, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
    <div style={{
      width: 44, height: 24, borderRadius: 12, transition: "background 0.2s",
      background: value ? "#1D9E75" : "#ddd", position: "relative"
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: "#fff",
        position: "absolute", top: 2, transition: "left 0.2s",
        left: value ? 22 : 2, boxShadow: "0 1px 4px #0003"
      }} />
    </div>
    <span style={{ fontSize: 14, color: value ? "#1D9E75" : "#666" }}>
      {value ? "ჩართულია" : "გამორთულია"}
    </span>
  </div>
);

const Field = ({ label, help, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ fontSize: 13, fontWeight: "bold", color: "#333", display: "block", marginBottom: 4 }}>{label}</label>
    {help && <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>{help}</div>}
    {children}
  </div>
);

const CSS_SNIPPETS = [
  { cat: "🎨 ფერები", items: [
    { label: "სათაურები — წითელი", code: "h2 { color: #c0392b !important; }" },
    { label: "ღილაკები — იისფერი", code: "button { background: #8e44ad !important; }" },
    { label: "Sidebar — მუქი ლურჯი", code: "#app-sidebar { background: #0d1b2a !important; }" },
    { label: "ფონი — ღია ნაცრისფერი", code: "#main-content { background: #eef2f5 !important; }" },
    { label: "ცხრილის ჰედერი — მწვანე", code: "thead tr { background: #f0f9f5 !important; }" },
  ]},
  { cat: "🔤 შრიფტი & ზომა", items: [
    { label: "მთელი აპლიკაცია — Georgia", code: "body { font-family: 'Georgia', serif !important; }" },
    { label: "სათაურები — დიდი", code: "h2 { font-size: 28px !important; letter-spacing: 1px !important; }" },
    { label: "ცხრილი — დიდი ტექსტი", code: "table { font-size: 15px !important; }" },
    { label: "ღილაკები — მთავრული", code: "button { text-transform: uppercase !important; font-weight: bold !important; }" },
  ]},
  { cat: "🚫 დამალვა", items: [
    { label: "Scrollbar დამალვა", code: "#main-content::-webkit-scrollbar { display: none !important; }" },
  ]},
];

const CssHelp = ({ onInsert }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: "10px 14px", background: "#f8f9fa", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: "bold", color: "#444" }}>
        <span>📖 დახმarება & მზა მაგალითები (დააკლიკე ჩასამატებლად)</span>
        <span>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 14, lineHeight: 1.6 }}>
            დააკლიკე ნებისმიერ მაგალითს — ავტომატურად ჩაემატება რედაქტორში. შემდეგ შეცვალე ფერი/ზომა და დააჭირე <b>შენახვა</b>-ს. ცვლილება გამოჩნდება <b>F5</b>-ის შემდეგ.
            <br />⚠️ თუ წესმა არ იმუშავა — ბოლოში დაამატე <code style={{ background: "#eee", padding: "1px 4px", borderRadius: 3 }}>!important</code>.
          </div>

          {CSS_SNIPPETS.map(group => (
            <div key={group.cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 8 }}>{group.cat}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {group.items.map(s => (
                  <button key={s.label} type="button" onClick={() => onInsert(s.code)}
                    title={s.code}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, color: "#444" }}>
                    + {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid #eee" }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 8 }}>🎯 რომელი selector-ები მუშაობს</div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["#app-sidebar", "გვერდითი მენიუ"],
                  ["#main-content", "მთავარი სამუშაო არე"],
                  ["#settings-content", "პარამეტრების ფანჯარა"],
                  ["h2, h3", "სათაურები"],
                  ["button", "ღილაკები"],
                  ["table, thead, td", "ცხრილები"],
                  ["input, select, textarea", "ფორმის ველები"],
                  ["body", "მთელი გვერდი (შრიფტი, ფონი)"],
                ].map(([sel, desc]) => (
                  <tr key={sel} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: "5px 8px", fontFamily: "monospace", color: "#1D9E75", whiteSpace: "nowrap" }}>{sel}</td>
                    <td style={{ padding: "5px 8px", color: "#666" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const TPL_PLACEHOLDERS = [
  { tag: "{name}", desc: "კლიენტის სახელი" },
  { tag: "{provider}", desc: "ექიმი" },
  { tag: "{service}", desc: "სერვისი" },
  { tag: "{date}", desc: "თარიღი" },
  { tag: "{time}", desc: "დრო" },
  { tag: "{code}", desc: "კოდი" },
  { tag: "{clinic}", desc: "კლინიკის სახელი" },
];

const TPL_EVENTS = [
  { id: "booking",  label: "🆕 ახალი ჩაწერა" },
  { id: "confirm",  label: "✅ დადასტურება" },
  { id: "cancel",   label: "❌ გაუქმება" },
  { id: "reminder", label: "⏰ შეხსენება (დღით ადრე)" },
];

// placeholder-ის ჩასმა კურსორის ადგილას
const insertAtCursor = (textareaId, tag, current, onChange) => {
  const el = document.getElementById(textareaId);
  if (!el) { onChange((current || "") + tag); return; }
  const start = el.selectionStart ?? (current || "").length;
  const end = el.selectionEnd ?? start;
  const next = (current || "").slice(0, start) + tag + (current || "").slice(end);
  onChange(next);
  setTimeout(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + tag.length;
  }, 0);
};

const PlaceholderChips = ({ textareaId, current, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
    {TPL_PLACEHOLDERS.map(p => (
      <button key={p.tag} type="button" title={p.desc}
        onClick={() => insertAtCursor(textareaId, p.tag, current, onChange)}
        style={{ padding: "3px 9px", borderRadius: 6, border: "1px solid #d0e8dd", background: "#f0f9f5", color: "#1D9E75", cursor: "pointer", fontSize: 12, fontFamily: "monospace" }}>
        {p.tag}
      </button>
    ))}
  </div>
);

const TemplateEditor = ({ channel, settings, set, withSubject = false }) => {
  const [ev, setEv] = useState("booking");
  const smsKey = `tpl_${channel}_${ev}`;
  const subjKey = `tpl_email_subject_${ev}`;
  const taId = `tpl-${channel}-${ev}`;

  const DEFAULTS = {
    sms: {
      booking:  "გამარჯობა {name}! თქვენი ჩაწერა: {provider}, {date} {time}. კოდი: {code}",
      confirm:  "{name}, თქვენი ჩაწერა დადასტურდა: {provider}, {date} {time}.",
      cancel:   "{name}, თქვენი ჩაწერა {date} {time} გაუქმდა. {clinic}",
      reminder: "შეხსენება: ხვალ {time}-ზე გაქვთ ჩაწერა — {provider}. {clinic}",
    },
    email: {
      booking:  "ძვირფასო {name},\n\nთქვენი ჩაწერა წარმატებით შეიქმნა.\n\nექიმი: {provider}\nსერვისი: {service}\nთარიღი: {date}\nდრო: {time}\nკოდი: {code}\n\n{clinic}",
      confirm:  "ძვირფასო {name},\n\nთქვენი ჩაწერა დადასტურდა.\n\nექიმი: {provider}\nთარიღი: {date} {time}\n\n{clinic}",
      cancel:   "ძვირფასო {name},\n\nთქვენი ჩაწერა ({date} {time}) გაუქმდა.\n\n{clinic}",
      reminder: "ძვირფასო {name},\n\nგახსენებთ, რომ ხვალ ({date}) {time}-ზე გაქვთ ჩაწერა.\n\nექიმი: {provider}\n\n{clinic}",
    },
  };

  const value = settings[smsKey] ?? DEFAULTS[channel][ev];

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 14, marginTop: 12 }}>
      {/* event tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TPL_EVENTS.map(e => (
          <button key={e.id} type="button" onClick={() => setEv(e.id)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", fontSize: 13,
              background: ev === e.id ? "#1D9E75" : "#fff", color: ev === e.id ? "#fff" : "#444",
              fontWeight: ev === e.id ? "bold" : "normal" }}>
            {e.label}
          </button>
        ))}
      </div>

      {withSubject && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Email სათაური (subject)</label>
          <input
            value={settings[subjKey] ?? ""}
            onChange={e => set(subjKey, e.target.value)}
            placeholder="ჩაწერა დადასტურებულია — {clinic}"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box" }} />
        </div>
      )}

      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
        ტექსტი {TPL_EVENTS.find(e => e.id === ev)?.label}
      </label>
      <textarea
        id={taId}
        value={value}
        onChange={e => set(smsKey, e.target.value)}
        rows={channel === "email" ? 8 : 3}
        style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: channel === "email" ? "inherit" : "monospace", lineHeight: 1.5 }} />

      <PlaceholderChips textareaId={taId} current={value} onChange={v => set(smsKey, v)} />

      <button type="button" onClick={() => set(smsKey, DEFAULTS[channel][ev])}
        style={{ marginTop: 8, padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, color: "#888" }}>
        ↺ default-ზე დაბრუნება
      </button>
    </div>
  );
};

const TABS = [
  { id: "general", icon: "🏢", label: "ზოგადი" },
  { id: "branding", icon: "🎨", label: "Branding" },
  { id: "ldap", icon: "🔐", label: "Active Directory" },
  { id: "calendar", icon: "📅", label: "კალენდარი" },
  { id: "sms", icon: "💬", label: "SMS" },
  { id: "email", icon: "✉️", label: "Email" },
  { id: "qms", icon: "🎫", label: "QMS" },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncingLdap, setSyncingLdap] = useState(false);
  const [ldapSyncResult, setLdapSyncResult] = useState(null);

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, width: "100%", boxSizing: "border-box" };

  useEffect(() => {
    api.get(`/settings/${user.tenant_id}`)
      .then(r => setSettings(r.data))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/settings/${user.tenant_id}`, { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const syncLdap = async () => {
    setSyncingLdap(true);
    setLdapSyncResult(null);
    try {
      const res = await api.post(`/auth/ldap-sync/${user.tenant_id}`);
      setLdapSyncResult({ ok: true, ...res.data });
    } catch (err) {
      setLdapSyncResult({ ok: false, message: err.response?.data?.detail || err.message });
    } finally {
      setSyncingLdap(false);
    }
  };

  const uploadImage = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/v1/upload/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("pf_token")}` },
        body: formData,
      });
      const data = await res.json();
      set(key, data.url);
    } catch {
      alert("ატვირთვის შეცდომა");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) return <p>იტვირთება...</p>;

  const renderTab = () => {
    switch (activeTab) {

      case "general": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>ზოგადი პარამეტრები</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="კლინიკის სახელი">
              <input value={settings.clinic_name || ""} onChange={e => set("clinic_name", e.target.value)} style={inp} placeholder="Innova Medical" />
            </Field>
            <Field label="Timezone">
              <select value={settings.timezone || "Asia/Tbilisi"} onChange={e => set("timezone", e.target.value)} style={inp}>
                <option value="Asia/Tbilisi">Asia/Tbilisi (GMT+4)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
                <option value="Europe/Berlin">Europe/Berlin (GMT+1)</option>
              </select>
            </Field>
            <Field label="პროვაიდერის სახელი" help="მაგ: ექიმი, სტილისტი, მენეჯერი">
              <input value={settings.provider_label || ""} onChange={e => set("provider_label", e.target.value)} style={inp} placeholder="ექიმი" />
            </Field>
            <Field label="კლიენტის სახელი" help="მაგ: პაციენტი, კლიენტი">
              <input value={settings.client_label || ""} onChange={e => set("client_label", e.target.value)} style={inp} placeholder="პაციენტი" />
            </Field>
            <Field label="პირადი ნომერი სავალდებულოა">
              <Toggle value={!!settings.require_personal_id} onChange={v => set("require_personal_id", v)} />
            </Field>
            <Field label="დაბადების თარიღი სავალდებულოა">
              <Toggle value={!!settings.require_dob} onChange={v => set("require_dob", v)} />
            </Field>
            <Field label="Session timeout (წუთი)" help="რამდენი წუთი უქმობის შემდეგ გამოვიდეს">
              <input type="number" min="15" max="480"
                value={settings.session_timeout_minutes || 60}
                onChange={e => set("session_timeout_minutes", e.target.value)}
                style={{ ...inp, width: 120 }} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="სამუშაო საათები">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="time" value={settings.work_hours_from || "09:00"}
                  onChange={e => set("work_hours_from", e.target.value)}
                  style={{ ...inp, width: 120 }} />
                <span style={{ color: "#666" }}>—</span>
                <input type="time" value={settings.work_hours_to || "18:00"}
                  onChange={e => set("work_hours_to", e.target.value)}
                  style={{ ...inp, width: 120 }} />
              </div>
            </Field>

            <Field label="თარიღის ფორმატი">
              <select value={settings.date_format || "dd.mm.yyyy"} onChange={e => set("date_format", e.target.value)} style={{ ...inp, width: 220 }}>
                <option value="dd.mm.yyyy">დღე.თვე.წელი (31.12.2026)</option>
                <option value="yyyy-mm-dd">წელი-თვე-დღე (2026-12-31)</option>
                <option value="dd/mm/yyyy">დღე/თვე/წელი (31/12/2026)</option>
                <option value="mm/dd/yyyy">თვე/დღე/წელი (12/31/2026)</option>
              </select>
            </Field>
          </div>

          <Field label="სამუშაო დღეები">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[["ორშ", 0], ["სამ", 1], ["ოთხ", 2], ["ხუთ", 3], ["პარ", 4], ["შაბ", 5], ["კვი", 6]].map(([label, idx]) => {
                const days = settings.work_days || [0, 1, 2, 3, 4];
                const active = days.includes(idx);
                return (
                  <button key={idx} type="button" onClick={() => {
                    const current = settings.work_days || [0, 1, 2, 3, 4];
                    set("work_days", active ? current.filter(d => d !== idx) : [...current, idx].sort());
                  }} style={{
                    padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd",
                    background: active ? "#1D9E75" : "#fff",
                    color: active ? "#fff" : "#333", cursor: "pointer", fontSize: 13
                  }}>{label}</button>
                );
              })}
            </div>
          </Field>
        </div>
      );

      case "branding": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>Branding & დიზაინი</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Login გვერდის სათაური">
              <input value={settings.login_title || ""} onChange={e => set("login_title", e.target.value)} style={inp} placeholder="ჩაწერის მართვის სისტემა" />
            </Field>
            <Field label="Login გვერდის ქვესათაური">
              <input value={settings.login_subtitle || ""} onChange={e => set("login_subtitle", e.target.value)} style={inp} placeholder="მართეთ ჩაწერები..." />
            </Field>
            <Field label="სისტემის სახელი (sidebar)">
              <input value={settings.app_name || ""} onChange={e => set("app_name", e.target.value)} style={inp} placeholder="PacsFlow" />
            </Field>
            <Field label="სისტემის ქვე-სახელი">
              <input value={settings.app_subtitle || ""} onChange={e => set("app_subtitle", e.target.value)} style={inp} placeholder="Appointments" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 8 }}>
            <Field label="Primary ფერი" help="ღილაკები, active links">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={settings.primary_color || "#1D9E75"}
                  onChange={e => set("primary_color", e.target.value)}
                  style={{ width: 48, height: 40, border: "none", cursor: "pointer", borderRadius: 6 }} />
                <input value={settings.primary_color || "#1D9E75"}
                  onChange={e => set("primary_color", e.target.value)}
                  style={{ ...inp, width: 120 }} placeholder="#1D9E75" />
              </div>
            </Field>
            <Field label="Sidebar ფერი">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={settings.sidebar_color || "#1a1a2e"}
                  onChange={e => set("sidebar_color", e.target.value)}
                  style={{ width: 48, height: 40, border: "none", cursor: "pointer", borderRadius: 6 }} />
                <input value={settings.sidebar_color || "#1a1a2e"}
                  onChange={e => set("sidebar_color", e.target.value)}
                  style={{ ...inp, width: 120 }} placeholder="#1a1a2e" />
              </div>
            </Field>
            <Field label="Login ფონის ფერი">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={settings.login_bg_color || "#1a1a2e"}
                  onChange={e => set("login_bg_color", e.target.value)}
                  style={{ width: 48, height: 40, border: "none", cursor: "pointer", borderRadius: 6 }} />
                <input value={settings.login_bg_color || "#1a1a2e"}
                  onChange={e => set("login_bg_color", e.target.value)}
                  style={{ ...inp, width: 120 }} placeholder="#1a1a2e" />
              </div>
            </Field>
          </div>

          {/* Image uploads */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            <Field label="Login ფონის სურათი" help="JPG, PNG, WEBP — მაქს. 5MB">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="file" accept="image/*"
                  onChange={e => uploadImage(e, "login_bg_image")}
                  style={{ fontSize: 13 }} disabled={uploading} />
                {settings.login_bg_image && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={settings.login_bg_image}
                      style={{ width: 120, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} />
                    <button onClick={() => set("login_bg_image", "")} style={{
                      background: "#fde8e8", color: "#e74c3c", border: "none",
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12
                    }}>წაშლა</button>
                  </div>
                )}
                {uploading && <div style={{ fontSize: 12, color: "#999" }}>იტვირთება...</div>}
              </div>
            </Field>

            <Field label="ლოგო (sidebar)" help="PNG, SVG — მაქს. 2MB">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="file" accept="image/*"
                  onChange={e => uploadImage(e, "logo_url")}
                  style={{ fontSize: 13 }} disabled={uploading} />
                {settings.logo_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={settings.logo_url}
                      style={{ width: 80, height: 40, objectFit: "contain", borderRadius: 6, border: "1px solid #ddd", background: "#f5f5f5" }} />
                    <button onClick={() => set("logo_url", "")} style={{
                      background: "#fde8e8", color: "#e74c3c", border: "none",
                      padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12
                    }}>წაშლა</button>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Favicon" help="ICO, PNG — 32x32px">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="file" accept="image/*,.ico"
                  onChange={e => uploadImage(e, "favicon_url")}
                  style={{ fontSize: 13 }} disabled={uploading} />
                {settings.favicon_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={settings.favicon_url} style={{ width: 32, height: 32, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4 }} />
                    <button onClick={() => set("favicon_url", "")} style={{ background: "#fde8e8", color: "#e74c3c", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>წაშლა</button>
                  </div>
                )}
              </div>
            </Field>
          </div>

          {/* Footer / contact */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
            <Field label="Footer ტექსტი" help="Login გვერდის ქვედა წარწერა">
              <input value={settings.footer_text || ""} onChange={e => set("footer_text", e.target.value)} style={inp} placeholder="© 2026 Innova Medical" />
            </Field>
            <Field label='"Powered by PacsFlow"'>
              <Toggle value={settings.show_powered_by !== false} onChange={v => set("show_powered_by", v)} />
            </Field>
            <Field label="კლინიკის ტელეფონი (Login გვერდზე)">
              <input value={settings.login_phone || ""} onChange={e => set("login_phone", e.target.value)} style={inp} placeholder="+995 32 XXX XXXX" />
            </Field>
            <Field label="კლინიკის მისამართი (Login გვერდზე)">
              <input value={settings.login_address || ""} onChange={e => set("login_address", e.target.value)} style={inp} placeholder="თბილისი, ..." />
            </Field>
          </div>

          {/* Custom CSS */}
          <div style={{ marginTop: 8 }}>
            <Field label="Custom CSS (advanced)" help="მოქმედებს მთელ აპლიკაციაზე — ცვლილება ჩანს გვერდის გადატვირთვის (F5) შემდეგ. ფრთხილად!">
              <textarea
                id="custom-css-editor"
                value={settings.custom_css || ""}
                onChange={e => set("custom_css", e.target.value)}
                rows={10}
                spellCheck={false}
                placeholder={"h2 { color: #c0392b !important; }\n#app-sidebar { background: #0d1b2a !important; }\nbutton { text-transform: uppercase !important; }"}
                style={{ ...inp, fontFamily: "monospace", fontSize: 13, resize: "vertical", lineHeight: 1.5, background: "#fafafa" }}
              />
            </Field>

            <CssHelp onInsert={(snippet) => set("custom_css", ((settings.custom_css || "") + (settings.custom_css ? "\n" : "") + snippet))} />
          </div>

          {/* Preview */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 12 }}>Preview — Login გვერდი</div>
            <div style={{
              borderRadius: 12, overflow: "hidden", border: "1px solid #e0e0e0",
              height: 200, display: "flex"
            }}>
              <div style={{
                flex: 1,
                background: settings.login_bg_image
                  ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${settings.login_bg_image}) center/cover`
                  : (settings.login_bg_color || "#1a1a2e"),
                display: "flex", flexDirection: "column", justifyContent: "center", padding: 24
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  {settings.logo_url ? (
                    <img src={settings.logo_url} style={{ width: 28, height: 28, objectFit: "contain" }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: settings.primary_color || "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                      {(settings.app_name || "P")[0]}
                    </div>
                  )}
                  <div>
                    <div style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>{settings.app_name || "PacsFlow"}</div>
                    <div style={{ color: settings.primary_color || "#1D9E75", fontSize: 11 }}>{settings.app_subtitle || "Appointments"}</div>
                  </div>
                </div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{settings.login_title || "ჩაწერის მართვის სისტემა"}</div>
                <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{settings.login_subtitle || "მართეთ ჩაწერები..."}</div>
              </div>
              <div style={{
                width: 180, background: "rgba(255,255,255,0.05)",
                display: "flex", flexDirection: "column", justifyContent: "center",
                padding: 20, borderLeft: "1px solid rgba(255,255,255,0.1)"
              }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginBottom: 12 }}>შესვლა</div>
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", marginBottom: 8, fontSize: 12, color: "#aaa" }}>username</div>
                <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", marginBottom: 12, fontSize: 12, color: "#aaa" }}>••••••••</div>
                <div style={{ background: settings.primary_color || "#1D9E75", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#fff", textAlign: "center" }}>შესვლა →</div>
              </div>
            </div>
          </div>

          {/* Sidebar preview */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 12 }}>Preview — Sidebar</div>
            <div style={{
              width: 200, borderRadius: 12, overflow: "hidden",
              background: settings.sidebar_color || "#1a1a2e",
              padding: "12px 8px", border: "1px solid #e0e0e0"
            }}>
              <div style={{ padding: "0 8px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                {settings.logo_url ? (
                  <img src={settings.logo_url} style={{ width: 24, height: 24, objectFit: "contain" }} />
                ) : null}
                <div>
                  <div style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>{settings.app_name || "PacsFlow"}</div>
                  <div style={{ color: settings.primary_color || "#1D9E75", fontSize: 11 }}>{settings.app_subtitle || "Appointments"}</div>
                </div>
              </div>
              {["Dashboard", "ჩაწერები", "კლიენტები"].map((item, i) => (
                <div key={item} style={{
                  padding: "8px 10px", borderRadius: 6, marginBottom: 4, fontSize: 13,
                  background: i === 0 ? (settings.primary_color || "#1D9E75") : "transparent",
                  color: i === 0 ? "#fff" : "#aaa"
                }}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      );

      case "ldap": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>Active Directory / LDAP</h3>
          <Field label="ჩართვა"><Toggle value={!!settings.ldap_enabled} onChange={v => set("ldap_enabled", v)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="სერვერი" help="მაგ: ldap://dc.company.local">
              <input value={settings.ldap_server || ""} onChange={e => set("ldap_server", e.target.value)} style={inp} placeholder="ldap://dc.company.local" />
            </Field>
            <Field label="პორტი">
              <input type="number" value={settings.ldap_port || 389} onChange={e => set("ldap_port", e.target.value)} style={{ ...inp, width: 120 }} />
            </Field>
            <Field label="Bind DN">
              <input value={settings.ldap_bind_dn || ""} onChange={e => set("ldap_bind_dn", e.target.value)} style={inp} placeholder="CN=svc-pacsflow,DC=company,DC=local" />
            </Field>
            <Field label="Bind პაროლი">
              <input type="password" value={settings.ldap_bind_password || ""} onChange={e => set("ldap_bind_password", e.target.value)} style={inp} />
            </Field>
            <Field label="Search Base">
              <input value={settings.ldap_search_base || ""} onChange={e => set("ldap_search_base", e.target.value)} style={inp} placeholder="DC=company,DC=local" />
            </Field>
            <Field label="Default Role">
              <select value={settings.ldap_default_role || "viewer"} onChange={e => set("ldap_default_role", e.target.value)} style={inp}>
                <option value="viewer">მაყურებელი</option>
                <option value="receptionist">რეგისტრატორი</option>
                <option value="provider">პროვაიდერი</option>
                <option value="admin">ადმინი</option>
              </select>
            </Field>
          </div>
          <Field label="SSL"><Toggle value={!!settings.ldap_use_ssl} onChange={v => set("ldap_use_ssl", v)} /></Field>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #eee" }}>
            <button
              onClick={syncLdap}
              disabled={syncingLdap || !settings.ldap_enabled}
              style={{
                padding: "10px 20px", borderRadius: 6, border: "none",
                background: syncingLdap ? "#ccc" : "#1D9E75", color: "#fff",
                fontSize: 14, fontWeight: "bold", cursor: syncingLdap ? "default" : "pointer",
              }}
            >
              {syncingLdap ? "სინქრონიზაცია მიმდინარეობს..." : "🔄 სინქრონიზაცია ახლავე"}
            </button>
            <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
              წამოიღებს ყველა user-ს Active Directory-დან (Search Base-ის მიხედვით) და დაამატებს/განაახლებს PacsFlow-ში.
              არსებული user-ების role არ შეიცვლება.
            </div>
            {ldapSyncResult && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 6, fontSize: 13,
                background: ldapSyncResult.ok ? "#f0f9f5" : "#fdf0f0",
                color: ldapSyncResult.ok ? "#1D9E75" : "#c0392b",
                border: `1px solid ${ldapSyncResult.ok ? "#1D9E75" : "#c0392b"}`,
              }}>
                {ldapSyncResult.ok
                  ? `✅ დასრულდა — ახალი: ${ldapSyncResult.created}, განახლებული: ${ldapSyncResult.updated}, გამოტოვებული: ${ldapSyncResult.skipped} (სულ ნაპოვნი: ${ldapSyncResult.total_found})`
                  : `❌ შეცდომა: ${ldapSyncResult.message}`}
              </div>
            )}
          </div>
        </div>
      );

      case "calendar": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>კალენდარის სინქრონიზაცია</h3>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Google Calendar</div>
            <Field label="ჩართვა"><Toggle value={!!settings.google_calendar_enabled} onChange={v => set("google_calendar_enabled", v)} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Client ID"><input value={settings.google_client_id || ""} onChange={e => set("google_client_id", e.target.value)} style={inp} /></Field>
              <Field label="Client Secret"><input type="password" value={settings.google_client_secret || ""} onChange={e => set("google_client_secret", e.target.value)} style={inp} /></Field>
            </div>
          </div>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Microsoft Outlook</div>
            <Field label="ჩართვა"><Toggle value={!!settings.outlook_enabled} onChange={v => set("outlook_enabled", v)} /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Client ID"><input value={settings.outlook_client_id || ""} onChange={e => set("outlook_client_id", e.target.value)} style={inp} /></Field>
              <Field label="Client Secret"><input type="password" value={settings.outlook_client_secret || ""} onChange={e => set("outlook_client_secret", e.target.value)} style={inp} /></Field>
            </div>
          </div>
          <div style={{ background: "#f8f8f8", borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>CalDAV (Apple / Nextcloud)</div>
            <Field label="ჩართვა"><Toggle value={!!settings.caldav_enabled} onChange={v => set("caldav_enabled", v)} /></Field>
          </div>
        </div>
      );

      case "sms": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>SMS სერვისი</h3>
          <Field label="ჩართვა"><Toggle value={!!settings.sms_enabled} onChange={v => set("sms_enabled", v)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="პროვაიდერი">
              <select value={settings.sms_provider || "textmagic"} onChange={e => set("sms_provider", e.target.value)} style={inp}>
                <option value="textmagic">TextMagic</option>
                <option value="twilio">Twilio</option>
                <option value="custom">Custom API</option>
              </select>
            </Field>
            <Field label="გამგზავნი ნომერი">
              <input value={settings.sms_from || ""} onChange={e => set("sms_from", e.target.value)} style={inp} placeholder="+995XXXXXXXXX" />
            </Field>
            <Field label="API Username / Account SID">
              <input value={settings.sms_account_sid || ""} onChange={e => set("sms_account_sid", e.target.value)} style={inp} />
            </Field>
            <Field label="API Key / Auth Token">
              <input type="password" value={settings.sms_auth_token || ""} onChange={e => set("sms_auth_token", e.target.value)} style={inp} />
            </Field>
            {settings.sms_provider === "custom" && (
              <Field label="API URL">
                <input value={settings.sms_api_url || ""} onChange={e => set("sms_api_url", e.target.value)} style={inp} placeholder="https://api.sms.ge/send" />
              </Field>
            )}
          </div>

          {/* ავტომატური შეხსენება */}
          <div style={{ marginTop: 16, padding: 14, background: "#f8f9fa", borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 10 }}>⏰ ავტომატური შეხსენება</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="შეხსენება დღით ადრე">
                <Toggle value={settings.reminder_enabled !== false} onChange={v => set("reminder_enabled", v)} />
              </Field>
              <Field label="გაგზავნის საათი" help="ყოველ დღე ამ საათზე (dry-run credentials-ის გარეშე)">
                <input type="number" min="0" max="23"
                  value={settings.reminder_hour ?? 10}
                  onChange={e => set("reminder_hour", e.target.value)}
                  style={{ ...inp, width: 100 }} />
              </Field>
            </div>
          </div>

          {/* SMS შაბლონები */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 4 }}>SMS შაბლონები</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
              თითო მოვლენას თავისი ტექსტი. ცვლადების ჩასამატებლად დააკლიკე ჩიპებს.
            </div>
            <TemplateEditor channel="sms" settings={settings} set={set} />
          </div>
        </div>
      );
      
      case "email": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>Email ნოტიფიკაცია</h3>
          <Field label="ჩართვა"><Toggle value={!!settings.email_enabled} onChange={v => set("email_enabled", v)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="SMTP სერვერი">
              <input value={settings.smtp_host || ""} onChange={e => set("smtp_host", e.target.value)} style={inp} placeholder="smtp.gmail.com" />
            </Field>
            <Field label="პორტი">
              <input type="number" value={settings.smtp_port || 587} onChange={e => set("smtp_port", e.target.value)} style={{ ...inp, width: 120 }} />
            </Field>
            <Field label="მომხმარებელი">
              <input value={settings.smtp_user || ""} onChange={e => set("smtp_user", e.target.value)} style={inp} />
            </Field>
            <Field label="პაროლი">
              <input type="password" value={settings.smtp_password || ""} onChange={e => set("smtp_password", e.target.value)} style={inp} />
            </Field>
            <Field label="გამგზავნი">
              <input value={settings.email_from || ""} onChange={e => set("email_from", e.target.value)} style={inp} placeholder="noreply@clinic.ge" />
            </Field>
          </div>
          <Field label="TLS"><Toggle value={!!settings.smtp_tls} onChange={v => set("smtp_tls", v)} /></Field>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#333", marginBottom: 12 }}>ნოტიფიკაციები</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["email_notify_booking", "ჩაწერისას კლიენტს"],
                ["email_notify_confirm", "დადასტურებისას კლიენტს"],
                ["email_notify_cancel", "გაუქმებისას კლიენტს"],
                ["email_notify_provider", "ჩაწერისას პროვაიდერს"],
              ].map(([key, label]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: 14 }}>{label}</span>
                  <Toggle value={!!settings[key]} onChange={v => set(key, v)} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 4 }}>Email შაბლონები</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>
              თითო მოვლენას სათაური + ტექსტი. ცვლადების ჩასამატებლად დააკლიკე ჩიპებს.
            </div>
            <TemplateEditor channel="email" settings={settings} set={set} withSubject />
          </div>
          </div>
        </div>
      );

      case "qms": return (
        <div>
          <h3 style={{ margin: "0 0 20px", fontSize: 16 }}>QMS / Ticket სისტემა</h3>
          <Field label="ჩართვა"><Toggle value={!!settings.qms_enabled} onChange={v => set("qms_enabled", v)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="QMS API URL">
              <input value={settings.qms_url || ""} onChange={e => set("qms_url", e.target.value)} style={inp} placeholder="http://qms-server:8000" />
            </Field>
            <Field label="Webhook Secret">
              <input type="password" value={settings.qms_webhook_secret || ""} onChange={e => set("qms_webhook_secret", e.target.value)} style={inp} />
            </Field>
            <Field label="კოდის პრეფიქსი">
              <input value={settings.code_prefix || "PF"} onChange={e => set("code_prefix", e.target.value.toUpperCase())} style={{ ...inp, width: 100 }} maxLength={5} />
            </Field>
            <Field label="კოდის მოქმედების ვადა (საათი)">
              <input type="number" min="1" max="72" value={settings.code_expires_hours || 24} onChange={e => set("code_expires_hours", e.target.value)} style={{ ...inp, width: 100 }} />
            </Field>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
        <h2 style={{ margin: 0 }}>პარამეტრები</h2>
        <button onClick={save} disabled={saving} style={{
          background: saved ? "#27ae60" : "#1D9E75", color: "#fff", border: "none",
          padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontSize: 14
        }}>
          {saved ? "✓ შენახულია" : saving ? "ინახება..." : "შენახვა"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap", flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 13, display: "flex", alignItems: "center", gap: 6,
            background: activeTab === tab.id ? "#1D9E75" : "#fff",
            color: activeTab === tab.id ? "#fff" : "#333",
            boxShadow: "0 1px 4px #0001",
            fontWeight: activeTab === tab.id ? "bold" : "normal",
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div id="settings-content" style={{ background: "#fff", borderRadius: 12, padding: 24, flex: 1, overflowY: "auto", minHeight: 0 }}>
        {renderTab()}
      </div>
    </div>
  );
}
