import { useState, useEffect, useRef } from "react";
import api from "../api";
import { loadBranding } from "../api/branding";
import { useParams } from "react-router-dom";

export default function PublicBooking() {
  const { slug } = useParams();
  const [branding, setBranding] = useState({
    app_name: "PacsFlow", app_subtitle: "Appointments",
    primary_color: "#1D9E75", login_bg_color: "#1a1a2e", login_bg_image: "",
    logo_url: "", clinic_name: "", footer_text: "", show_powered_by: true,
    login_phone: "", login_address: "",
  });
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const [sel, setSel] = useState({ service: null, provider: null, slot: null });
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", personal_id: "", notes: "", website: "" });

  const formStartTime = useRef(Date.now());
  const urlTenant = slug || new URLSearchParams(window.location.search).get("tenant");

  useEffect(() => {
    loadBranding().then(b => {
      setBranding(b);
      if (b.clinic_name) document.title = b.clinic_name + " — ონლაინ ჩაწერა";
      if (b.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
        link.rel = "icon"; link.href = b.favicon_url; document.head.appendChild(link);
      }
    });
    setLoading(true);
    api.get("/public/services").then(r => setServices(r.data)).finally(() => setLoading(false));
  }, []);

  const p = branding.primary_color || "#1D9E75";
  const bg = branding.login_bg_color || "#1a1a2e";
  const bgImage = branding.login_bg_image;
  const pageBg = bgImage
    ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bgImage}) center/cover no-repeat fixed`
    : `linear-gradient(135deg, ${bg} 0%, ${bg}dd 50%, ${bg}aa 100%)`;

  const pickService = async (service) => {
    setSel({ service, provider: null, slot: null });
    setLoading(true);
    try {
      const { data } = await api.get("/public/providers", { params: { service_id: service.id } });
      setProviders(data);
      setStep(2);
    } finally { setLoading(false); }
  };

  const pickProvider = async (provider) => {
    setSel(s => ({ ...s, provider, slot: null }));
    setLoading(true);
    try {
      const { data } = await api.get("/public/slots", { params: { provider_id: provider.id } });
      setSlots(data);
      setStep(3);
    } finally { setLoading(false); }
  };

  const pickSlot = (slot) => { setSel(s => ({ ...s, slot })); setStep(4); };

  const submit = async () => {
    setError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError("შეავსეთ სახელი, გვარი და ტელეფონი");
      return;
    }
    setSubmitting(true);
    try {
      const form_time = (Date.now() - formStartTime.current) / 1000;
      const { data } = await api.post("/public/book", { slot_id: sel.slot.id, ...form, form_time });
      setDone(data);
    } catch (err) {
      setError(err.response?.data?.detail || "ჯავშნა ვერ შესრულდა. სცადეთ თავიდან.");
    } finally { setSubmitting(false); }
  };

  // ── styles ──
  const inp = {
    width: "100%", boxSizing: "border-box", padding: "12px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
    color: "#fff", fontSize: 15, outline: "none",
  };
  const glassCard = {
    background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)",
    borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
    padding: 18, cursor: "pointer", transition: "border-color 0.15s, transform 0.1s",
  };

  const slotsByDate = {};
  slots.forEach(s => { (slotsByDate[s.date] = slotsByDate[s.date] || []).push(s); });

  const Brand = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 28 }}>
      {branding.logo_url
        ? <img src={branding.logo_url} style={{ width: 44, height: 44, objectFit: "contain" }} />
        : <div style={{ width: 44, height: 44, borderRadius: 12, background: p, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: "bold", color: "#fff" }}>{(branding.clinic_name || branding.app_name || "P")[0]}</div>}
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>{branding.clinic_name || branding.app_name}</div>
        <div style={{ fontSize: 12, color: p }}>ონლაინ ჩაწერა</div>
      </div>
    </div>
  );

  const Footer = () => (
    <div style={{ marginTop: 28, textAlign: "center" }}>
      {branding.login_phone && <div style={{ color: "#999", fontSize: 12, marginBottom: 4 }}>📞 {branding.login_phone}</div>}
      {branding.login_address && <div style={{ color: "#999", fontSize: 12, marginBottom: 8 }}>📍 {branding.login_address}</div>}
      <p style={{ color: "#555", fontSize: 11, margin: "0 0 4px" }}>
        {branding.footer_text || `${branding.clinic_name || "PacsFlow"} © 2026`}
      </p>
      {branding.show_powered_by !== false && <p style={{ color: "#444", fontSize: 10, margin: 0 }}>Powered by PacsFlow</p>}
    </div>
  );

  const StepDots = () => (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
      {[1, 2, 3, 4].map(n => (
        <div key={n} style={{ width: step === n ? 28 : 8, height: 8, borderRadius: 4, background: step >= n ? p : "rgba(255,255,255,0.15)", transition: "all 0.2s" }} />
      ))}
    </div>
  );

  const wrap = (children) => (
    <div style={{ minHeight: "100vh", background: pageBg, padding: "40px 20px", overflowY: "auto" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Brand />
        {children}
        <Footer />
      </div>
    </div>
  );

  // ── Done ──
  if (done) {
    return wrap(
      <div style={{ ...glassCard, cursor: "default", padding: 40, textAlign: "center", maxWidth: 460, margin: "0 auto" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: "0 0 12px", color: "#fff" }}>ჯავშანი მიღებულია!</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.6, margin: "0 0 20px" }}>{done.message}</p>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 16, textAlign: "left", fontSize: 15, color: "#fff" }}>
          <div style={{ marginBottom: 8 }}>📅 <b>{done.date}</b>, {done.time}</div>
          <div>👨‍⚕️ {done.provider}</div>
        </div>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 24, padding: "13px 28px", borderRadius: 10, border: "none", background: p, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: "bold" }}>
          ახალი ჩაწერა
        </button>
      </div>
    );
  }

  return wrap(
    <>
      <StepDots />

      {step > 1 && (
        <button onClick={() => setStep(step - 1)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
          ← უკან
        </button>
      )}

      {loading && <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>იტვირთება...</p>}

      {/* Step 1 — Service */}
      {step === 1 && !loading && (
        <>
          <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 24 }}>აირჩიეთ სერვისი</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {services.map(s => (
              <div key={s.id} style={{ ...glassCard, borderLeft: `3px solid ${s.color || p}` }}
                onClick={() => pickService(s)}
                onMouseEnter={e => e.currentTarget.style.borderColor = p}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                <div style={{ fontWeight: "bold", fontSize: 16, color: "#fff" }}>{s.name}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>⏱ {s.duration} წუთი</div>
              </div>
            ))}
            {!services.length && <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>სერვისები არ არის</p>}
          </div>
        </>
      )}

      {/* Step 2 — Provider */}
      {step === 2 && !loading && (
        <>
          <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 24 }}>აირჩიეთ ექიმი</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {providers.map(pr => (
              <div key={pr.id} style={glassCard} onClick={() => pickProvider(pr)}
                onMouseEnter={e => e.currentTarget.style.borderColor = p}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                <div style={{ fontWeight: "bold", fontSize: 16, color: "#fff" }}>{pr.name}</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>{pr.specialty}</div>
              </div>
            ))}
            {!providers.length && <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>ამ სერვისზე ექიმი არ არის</p>}
          </div>
        </>
      )}

      {/* Step 3 — Slot */}
      {step === 3 && !loading && (
        <>
          <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 24 }}>აირჩიეთ დრო</h2>
          {Object.keys(slotsByDate).length ? Object.entries(slotsByDate).map(([date, daySlots]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: "bold", color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>{date}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {daySlots.map(s => (
                  <button key={s.id} onClick={() => pickSlot(s)}
                    style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${p}`, background: "rgba(255,255,255,0.04)", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: "bold" }}
                    onMouseEnter={e => e.currentTarget.style.background = p}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          )) : <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>თავისუფალი დრო არ არის. სცადეთ სხვა ექიმი.</p>}
        </>
      )}

      {/* Step 4 — Form */}
      {step === 4 && !loading && (
        <>
          <h2 style={{ textAlign: "center", color: "#fff", marginBottom: 8 }}>თქვენი მონაცემები</h2>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
            📅 {sel.slot?.date}, {sel.slot?.time} · 👨‍⚕️ {sel.provider?.name}
          </div>
          <div style={{ ...glassCard, cursor: "default", padding: 24, display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input style={inp} placeholder="სახელი *" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
              <input style={inp} placeholder="გვარი *" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
            </div>
            <input style={inp} placeholder="ტელეფონი *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
            <input style={inp} placeholder="Email (არასავალდებულო)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
            <input style={inp} placeholder="პირადი ნომერი (არასავალდებულო)" value={form.personal_id} onChange={e => setForm(f => ({ ...f, personal_id: e.target.value }))}
              onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />
            <textarea style={{ ...inp, minHeight: 70, resize: "vertical" }} placeholder="შენიშვნა (არასავალდებულო)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.12)"} />

            {/* Honeypot */}
            <input tabIndex={-1} autoComplete="off" value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />

            {error && <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, background: "rgba(231,76,60,0.15)", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" }}>⚠️ {error}</div>}

            <button onClick={submit} disabled={submitting}
              style={{ padding: "14px", borderRadius: 10, border: "none", background: submitting ? "#555" : p, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", fontSize: 16, fontWeight: "bold" }}>
              {submitting ? "⏳ იგზავნება..." : "დაჯავშნა"}
            </button>
          </div>
        </>
      )}
    </>
  );
}