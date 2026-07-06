import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { loadBranding } from "../api/branding";
import DateField from "../components/DateField";
import { formatDate } from "../utils/dateFormat";

const DAYS = ["ორშ", "სამ", "ოთხ", "ხუთ", "პარ", "შაბ", "კვი"];
const STATUS_COLOR = { available: "#1D9E75", booked: "#e74c3c", blocked: "#95a5a6" };
const STATUS_LABEL = { available: "თავისუფალი", booked: "დაჯავშნული", blocked: "დაბლოკილი" };

export default function Slots() {
  const { user } = useAuth();
  const canBlock = ["admin", "superadmin", "provider"].includes(user.role);

  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("view"); // view | bulk | block
  const [weekOffset, setWeekOffset] = useState(0);

  const [bulk, setBulk] = useState({
    service_id: "", date_from: "", date_to: "",
    weekdays: [0, 1, 2, 3, 4], time_from: "09:00", time_to: "17:00", slot_duration: 30
  });

  useEffect(() => {
    loadBranding().then(b => {
      setBulk(prev => ({
        ...prev,
        weekdays: b.work_days || [0, 1, 2, 3, 4],
        time_from: b.work_hours_from || "09:00",
        time_to: b.work_hours_to || "17:00",
      }));
    });
  }, []);

  const [block, setBlock] = useState({ date_from: "", date_to: "", time_from: "00:00", time_to: "23:59" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/providers/", { params: { tenant_id: user.tenant_id, active: true } })
      .then(r => {
        setProviders(r.data);
        if (user.role === "provider" && r.data.length > 0) setSelectedProvider(r.data[0].id);
      });
    api.get("/services/", { params: { tenant_id: user.tenant_id, active: true } })
      .then(r => setServices(r.data));
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    loadSlots();
  }, [selectedProvider, weekOffset]);

  const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - day + 1 + weekOffset * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      from: mon.toISOString().slice(0, 10),
      to: sun.toISOString().slice(0, 10),
    };
  };

  const loadSlots = async () => {
    setLoading(true);
    const { from, to } = getWeekRange();
    try {
      const { data } = await api.get("/slots/", {
        params: {
          provider_id: selectedProvider, date_from: from, date_to: to
        }
      });
      setSlots(data);
    } finally {
      setLoading(false);
    }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/slots/bulk", {
        ...bulk,
        provider_id: selectedProvider,
        slot_duration: Number(bulk.slot_duration),
      });
      alert(`შეიქმნა ${data.created} სლოტი`);
      setTab("view");
      loadSlots();
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const d_from = new Date(block.date_from + "T" + block.time_from);
      const d_to = new Date(block.date_to + "T" + block.time_to);
      let cur = new Date(d_from);
      let count = 0;
      while (cur < d_to) {
        const end = new Date(cur);
        end.setMinutes(end.getMinutes() + 30);
        await api.post("/slots/", {
          provider_id: selectedProvider,
          service_id: services[0]?.id,
          starts_at: cur.toISOString(),
          ends_at: end.toISOString(),
          status: "blocked",
        });
        cur = end;
        count++;
        if (count > 200) break;
      }
      alert(`დაიბლოკა ${count} სლოტი`);
      setTab("view");
      loadSlots();
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSlotStatus = async (slot) => {
    if (slot.status === "booked") return;
    const newStatus = slot.status === "blocked" ? "available" : "blocked";
    await api.patch(`/slots/${slot.id}`, { status: newStatus });
    loadSlots();
  };

  // დღეების დაჯგუფება
  const { from } = getWeekRange();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return d;
  });

  const slotsByDay = weekDays.map(d => ({
    date: d,
    slots: slots.filter(s => s.starts_at.slice(0, 10) === d.toISOString().slice(0, 10))
  }));

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>სლოტები / განრიგი</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {canBlock && <>
            <button onClick={() => setTab(tab === "bulk" ? "view" : "bulk")} style={{
              background: tab === "bulk" ? "#2c3e50" : "#1D9E75", color: "#fff",
              border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer"
            }}>📅 სლოტების გენერაცია</button>
            <button onClick={() => setTab(tab === "block" ? "view" : "block")} style={{
              background: tab === "block" ? "#2c3e50" : "#e74c3c", color: "#fff",
              border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer"
            }}>🚫 დაბლოკვა</button>
          </>}
        </div>
      </div>

      {/* Provider selector */}
      <div style={{ background: "#fff", padding: 16, borderRadius: 12, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 14, color: "#666" }}>პროვაიდერი:</label>
        <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
          style={{ ...inp, minWidth: 200 }}>
          <option value="">აირჩიე...</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>
      </div>

      {/* Bulk form */}
      {tab === "bulk" && (
        <form onSubmit={handleBulk} style={{ background: "#fff", padding: 20, borderRadius: 12, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 16px" }}>სლოტების ავტო-გენერაცია</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სერვისი *</label>
              <select required value={bulk.service_id} onChange={e => setBulk({ ...bulk, service_id: e.target.value })} style={{ ...inp, width: "100%" }}>
                <option value="">აირჩიე...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name_ka}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დასაწყისი</label>
              <DateField value={bulk.date_from} onChange={v => setBulk({ ...bulk, date_from: v })} required style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დასასრული</label>
              <DateField value={bulk.date_to} onChange={v => setBulk({ ...bulk, date_to: v })} required style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დაწყება</label>
              <input type="time" value={bulk.time_from} onChange={e => setBulk({ ...bulk, time_from: e.target.value })} style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დასრულება</label>
              <input type="time" value={bulk.time_to} onChange={e => setBulk({ ...bulk, time_to: e.target.value })} style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>სლოტის ხანგრძლივობა (წთ)</label>
              <input type="number" min="5" value={bulk.slot_duration} onChange={e => setBulk({ ...bulk, slot_duration: e.target.value })} style={{ ...inp, width: 100 }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 8 }}>კვირის დღეები</label>
            <div style={{ display: "flex", gap: 8 }}>
              {DAYS.map((d, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={bulk.weekdays.includes(i)}
                    onChange={e => setBulk({
                      ...bulk, weekdays: e.target.checked
                        ? [...bulk.weekdays, i]
                        : bulk.weekdays.filter(x => x !== i)
                    })} />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving || !selectedProvider} style={{
            background: "#1D9E75", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer"
          }}>{saving ? "იქმნება..." : "შექმნა"}</button>
        </form>
      )}

      {/* Block form */}
      {tab === "block" && canBlock && (
        <form onSubmit={handleBlock} style={{ background: "#fff", padding: 20, borderRadius: 12, marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 16px" }}>დროის დაბლოკვა (შვებულება / მივლინება)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დღიდან</label>
              <DateField value={block.date_from} onChange={v => setBlock({ ...block, date_from: v })} required style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>დამდე</label>
              <DateField value={block.date_to} onChange={v => setBlock({ ...block, date_to: v })} required style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>საათიდან</label>
              <input type="time" value={block.time_from} onChange={e => setBlock({ ...block, time_from: e.target.value })} style={{ ...inp, width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>საათამდე</label>
              <input type="time" value={block.time_to} onChange={e => setBlock({ ...block, time_to: e.target.value })} style={{ ...inp, width: "100%" }} />
            </div>
          </div>
          <button type="submit" disabled={saving || !selectedProvider} style={{
            background: "#e74c3c", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer"
          }}>{saving ? "იბლოკება..." : "დაბლოკვა"}</button>
        </form>
      )}

      {/* Calendar view */}
      {selectedProvider && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>◀</button>
            <span style={{ fontWeight: "bold" }}>{formatDate(from)} კვირა</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer" }}>▶</button>
            <button onClick={() => setWeekOffset(0)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", fontSize: 12 }}>დღეს</button>
          </div>

          {loading ? <p>იტვირთება...</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {slotsByDay.map(({ date, slots: daySlots }, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    background: date.toDateString() === new Date().toDateString() ? "#1D9E75" : "#2c3e50",
                    color: "#fff", padding: "8px", textAlign: "center", fontSize: 13
                  }}>
                    <div>{DAYS[i]}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{formatDate(date.toISOString().slice(0,10))}</div>
                  </div>
                  <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4, minHeight: 120 }}>
                    {daySlots.length === 0 && <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", margin: "8px 0" }}>—</p>}
                    {daySlots.map(s => (
                      <div key={s.id}
                        onClick={() => canBlock && s.status !== "booked" && toggleSlotStatus(s)}
                        style={{
                          background: STATUS_COLOR[s.status] + "22",
                          border: `1px solid ${STATUS_COLOR[s.status]}`,
                          borderRadius: 4, padding: "3px 6px", fontSize: 11,
                          cursor: canBlock && s.status !== "booked" ? "pointer" : "default",
                          color: STATUS_COLOR[s.status]
                        }}
                        title={STATUS_LABEL[s.status]}
                      >
                        {s.starts_at.slice(11, 16)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}