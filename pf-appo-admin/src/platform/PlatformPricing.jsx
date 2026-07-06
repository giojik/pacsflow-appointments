import { useState, useEffect } from "react";
import api from "../api";

export default function PlatformPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const inp = { padding: "10px 14px", borderRadius: 8, border: "1px solid #2a3540", fontSize: 14, background: "#0f1419", color: "#fff", width: "100%", boxSizing: "border-box" };

  useEffect(() => {
    api.get("/platform/settings/pricing")
      .then(r => setPlans(r.data.plans || []))
      .finally(() => setLoading(false));
  }, []);

  const update = (idx, field, value) => {
    setPlans(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const updateFeature = (planIdx, featIdx, value, type) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const arr = [...(type === "enabled" ? p.features : p.disabled)];
      arr[featIdx] = value;
      return { ...p, [type === "enabled" ? "features" : "disabled"]: arr };
    }));
  };

  const addFeature = (planIdx, type) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const key = type === "enabled" ? "features" : "disabled";
      return { ...p, [key]: [...p[key], ""] };
    }));
  };

  const removeFeature = (planIdx, featIdx, type) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const key = type === "enabled" ? "features" : "disabled";
      return { ...p, [key]: p[key].filter((_, j) => j !== featIdx) };
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/platform/settings/pricing", { plans });
      alert("შენახულია!");
    } catch (err) {
      alert("შეცდომა: " + (err.response?.data?.detail || err.message));
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 24, color: "#7a8a99" }}>იტვირთება...</div>;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>💰 ფასები</h1>
            <div style={{ color: "#7a8a99", fontSize: 13 }}>Landing page-ის ფასების მართვა</div>
          </div>
          <button onClick={save} disabled={saving}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>
            {saving ? "ინახება..." : "შენახვა"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {plans.map((plan, idx) => (
            <div key={plan.id} style={{ background: "#1a2530", borderRadius: 12, padding: 20, border: plan.popular ? "2px solid #1D9E75" : "1px solid #2a3540" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ color: "#1D9E75", fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#7a8a99", fontSize: 12, cursor: "pointer" }}>
                  <input type="checkbox" checked={plan.popular} onChange={e => update(idx, "popular", e.target.checked)} />
                  პოპულარული
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ color: "#7a8a99", fontSize: 11, display: "block", marginBottom: 4 }}>ფასი (-1 = Custom)</label>
                  <input type="number" style={inp} value={plan.price} onChange={e => update(idx, "price", Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ color: "#7a8a99", fontSize: 11, display: "block", marginBottom: 4 }}>ვალუტა</label>
                  <input style={inp} value={plan.currency} onChange={e => update(idx, "currency", e.target.value)} />
                </div>
                <div>
                  <label style={{ color: "#7a8a99", fontSize: 11, display: "block", marginBottom: 4 }}>ქვეწარწერა</label>
                  <input style={inp} value={plan.sublabel} onChange={e => update(idx, "sublabel", e.target.value)} />
                </div>
                <div>
                  <label style={{ color: "#7a8a99", fontSize: 11, display: "block", marginBottom: 4 }}>ღილაკი</label>
                  <input style={inp} value={plan.cta} onChange={e => update(idx, "cta", e.target.value)} />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#7a8a99", fontSize: 12, marginBottom: 6 }}>✅ ჩართული:</div>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <input style={{ ...inp, flex: 1 }} value={f} onChange={e => updateFeature(idx, fi, e.target.value, "enabled")} />
                    <button onClick={() => removeFeature(idx, fi, "enabled")} style={{ background: "transparent", border: "1px solid #5a2530", color: "#e74c3c", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addFeature(idx, "enabled")} style={{ background: "transparent", border: "1px solid #2a3540", color: "#7a8a99", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginTop: 4 }}>+ დამატება</button>
              </div>

              <div>
                <div style={{ color: "#7a8a99", fontSize: 12, marginBottom: 6 }}>❌ გამორთული:</div>
                {plan.disabled.map((f, fi) => (
                  <div key={fi} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                    <input style={{ ...inp, flex: 1 }} value={f} onChange={e => updateFeature(idx, fi, e.target.value, "disabled")} />
                    <button onClick={() => removeFeature(idx, fi, "disabled")} style={{ background: "transparent", border: "1px solid #5a2530", color: "#e74c3c", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addFeature(idx, "disabled")} style={{ background: "transparent", border: "1px solid #2a3540", color: "#7a8a99", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginTop: 4 }}>+ დამატება</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}