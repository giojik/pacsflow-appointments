import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import DateField from "../components/DateField";
import { formatDate } from "../utils/dateFormat";

const STATUS_COLOR = {
  pending:   "#f39c12",
  confirmed: "#1D9E75",
  cancelled: "#e74c3c",
  completed: "#3498db",
  no_show:   "#95a5a6",
};
const STATUS_LABEL = {
  pending:   "მოლოდინში",
  confirmed: "დადასტურებული",
  cancelled: "გაუქმებული",
  completed: "დასრულებული",
  no_show:   "არ მოვიდა",
};
const KA_DAYS   = ["კვი","ორშ","სამ","ოთხ","ხუთ","პარ","შაბ"];
const KA_MONTHS = ["იანვარი","თებერვალი","მარტი","აპრილი","მაისი","ივნისი","ივლისი","აგვისტო","სექტემბერი","ოქტომბერი","ნოემბერი","დეკემბერი"];

function NewClientModal({ onClose, onCreated, tenantId }) {
  const [form, setForm] = useState({ first_name:"", last_name:"", phone:"", personal_id:"", dob:"" });
  const [saving, setSaving] = useState(false);
  const [addToWaitlist, setAddToWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({
    preferred_date_from: "",
    preferred_date_to: "",
    preferred_time_from: "09:00",
    preferred_time_to: "17:00",
  });
  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/clients/", { ...form, tenant_id: tenantId });
      onCreated(data);
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:480 }}>
        <h3 style={{ margin:"0 0 16px" }}>ახალი კლიენტი</h3>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სახელი *</label>
              <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} style={inp} /></div>
            <div><label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>გვარი *</label>
              <input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} style={inp} /></div>
            <div><label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ტელეფონი *</label>
              <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inp} /></div>
            <div><label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>პირადი ნომერი</label>
              <input value={form.personal_id} onChange={e => setForm({...form, personal_id: e.target.value})} style={inp} /></div>
            <div><label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>დაბ. თარიღი</label>
              <DateField value={form.dob} onChange={v => setForm({...form, dob: v})} style={inp} /></div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button type="submit" disabled={saving} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer", flex:1 }}>{saving ? "ინახება..." : "შენახვა"}</button>
            <button type="button" onClick={onClose} style={{ background:"#f5f5f5", color:"#333", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer" }}>გაუქმება</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewAppointmentModal({ onClose, onCreated, tenantId, defaultDate }) {
  const [providers, setProviders] = useState([]);
  const [slots, setSlots] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [form, setForm] = useState({ client_id:"", slot_id:"", notes:"" });
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);
  const [addToWaitlist, setAddToWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({
    preferred_date_from: "",
    preferred_date_to: "",
    preferred_time_from: "09:00",
    preferred_time_to: "17:00",
  });
  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" };

  useEffect(() => {
    api.get("/providers/", { params: { tenant_id: tenantId, active: true } }).then(r => setProviders(r.data));
  }, []);

  useEffect(() => {
    if (!selectedProvider) return;
    api.get("/slots/", { params: { provider_id: selectedProvider, date_from: date, date_to: date, status: "available" } })
      .then(r => setSlots(r.data));
  }, [selectedProvider, date]);

  useEffect(() => {
    if (clientSearch.length < 2) { setClients([]); return; }
    api.get("/clients/", { params: { tenant_id: tenantId, search: clientSearch } }).then(r => setClients(r.data));
  }, [clientSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/appointments/", { ...form, tenant_id: tenantId });

      // Waitlist-ში ჩამატება
      if (addToWaitlist && selectedProvider) {
        await api.post("/waitlist/", {
          tenant_id: tenantId,
          client_id: form.client_id,
          provider_id: selectedProvider,
          ...waitlistForm,
          notes: "ჩაწერისას მოლოდინის სიაში დამატებული"
        });
      }

      onCreated(data);
    } catch (err) {
      alert("შეცდომა: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      {showNewClient && <NewClientModal tenantId={tenantId} onClose={() => setShowNewClient(false)} onCreated={c => {
        setSelectedClient(c); setForm({...form, client_id: c.id});
        setClientSearch(`${c.first_name} ${c.last_name} · ${c.phone}`);
        setClients([]); setShowNewClient(false);
      }} />}
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:560, maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ margin:"0 0 16px" }}>ახალი ჩაწერა</h3>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>კლიენტი</label>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, position:"relative" }}>
                <input placeholder="ძიება: სახელი / ტელ / პირადი ნომ."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setForm({...form, client_id:""}); }}
                  style={inp} />
                {clients.length > 0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, border:"1px solid #ddd", borderRadius:6, background:"#fff", zIndex:10, maxHeight:150, overflowY:"auto", boxShadow:"0 4px 12px #0001" }}>
                    {clients.map(c => (
                      <div key={c.id}
                        onClick={() => { setSelectedClient(c); setForm({...form, client_id: c.id}); setClientSearch(`${c.first_name} ${c.last_name} · ${c.phone}`); setClients([]); }}
                        style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, borderBottom:"1px solid #f0f0f0" }}
                        onMouseOver={e => e.currentTarget.style.background="#f5f5f5"}
                        onMouseOut={e => e.currentTarget.style.background="transparent"}>
                        {c.first_name} {c.last_name} · {c.phone}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setShowNewClient(true)} style={{ background:"#2c3e50", color:"#fff", border:"none", padding:"8px 12px", borderRadius:6, cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>+ ახალი</button>
            </div>
            {selectedClient && <div style={{ fontSize:12, color:"#1D9E75", marginTop:4 }}>✓ {selectedClient.first_name} {selectedClient.last_name}</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>თარიღი</label>
              <DateField value={date} onChange={setDate} style={inp} />
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>პროვაიდერი</label>
              <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} style={inp}>
                <option value="">აირჩიე...</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სლოტი</label>
              <select required value={form.slot_id} onChange={e => setForm({...form, slot_id: e.target.value})} style={inp}>
                <option value="">აირჩიე...</option>
                {slots.map(s => <option key={s.id} value={s.id}>{s.starts_at.slice(11,16)} — {s.ends_at.slice(11,16)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>შენიშვნა</label>
              <input placeholder="სურვილისამებრ" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={inp} />
            </div>
          </div>
          {/* Waitlist სექცია */}
          <div style={{ background:"#f8f8f8", borderRadius:8, padding:12 }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom: addToWaitlist ? 12 : 0 }}>
              <input type="checkbox" checked={addToWaitlist} onChange={e => setAddToWaitlist(e.target.checked)} />
              <span style={{ fontSize:14, fontWeight:"bold" }}>⏰ Waitlist-შიც ჩავაწეროთ</span>
            </label>
            {addToWaitlist && (
              <div>
                <p style={{ fontSize:12, color:"#999", margin:"0 0 8px" }}>სასურველი დრო გათავისუფლებისას შეატყობინებს</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სასურველი თარიღი (დასაწყისი)</label>
                    <DateField value={waitlistForm.preferred_date_from}
                      onChange={v => setWaitlistForm({...waitlistForm, preferred_date_from: v})}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>სასურველი თარიღი (დასასრული)</label>
                    <DateField value={waitlistForm.preferred_date_to}
                      onChange={v => setWaitlistForm({...waitlistForm, preferred_date_to: v})}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>საათიდან</label>
                    <input type="time" value={waitlistForm.preferred_time_from}
                      onChange={e => setWaitlistForm({...waitlistForm, preferred_time_from: e.target.value})}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>საათამდე</label>
                    <input type="time" value={waitlistForm.preferred_time_to}
                      onChange={e => setWaitlistForm({...waitlistForm, preferred_time_to: e.target.value})}
                      style={inp} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button type="submit" disabled={saving || !form.client_id || !form.slot_id} style={{
              background: !form.client_id || !form.slot_id ? "#ccc" : "#1D9E75",
              color:"#fff", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer", flex:1
            }}>{saving ? "ინახება..." : "ჩაწერა"}</button>
            <button type="button" onClick={onClose} style={{ background:"#f5f5f5", color:"#333", border:"none", padding:"10px 20px", borderRadius:8, cursor:"pointer" }}>გაუქმება</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DayView({ dates, appointments, onApptClick, onEmptyClick }) {
  const startHour = 8;
  const endHour   = 20;
  const hours = Array.from({length: endHour - startHour}, (_, i) => i + startHour);

  const getApptStyle = (appt) => {
    const start    = parseInt(appt.starts_at?.slice(11,13) || 0);
    const startMin = parseInt(appt.starts_at?.slice(14,16) || 0);
    const top    = ((start - startHour) * 60 + startMin) * (50/60);
    const height = 50;
    return { top, height };
  };

  return (
    <div style={{ display:"flex", flex:1, overflowX:"auto" }}>
      <div style={{ width:50, flexShrink:0 }}>
        <div style={{ height:40 }} />
        {hours.map(h => (
          <div key={h} style={{ height:50, borderTop:"1px solid #f0f0f0", paddingRight:8, fontSize:11, color:"#999", textAlign:"right", lineHeight:"50px" }}>
            {String(h).padStart(2,"0")}:00
          </div>
        ))}
      </div>
      {dates.map((date, di) => {
        const dateStr  = date.toISOString().slice(0,10);
        const dayAppts = appointments.filter(a => a.starts_at?.slice(0,10) === dateStr);
        const isToday  = dateStr === new Date().toISOString().slice(0,10);
        return (
          <div key={di} style={{ flex:1, minWidth:120, borderLeft:"1px solid #e0e0e0" }}>
            <div style={{
              height:40, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center",
              background: isToday ? "#1D9E75" : "#f8f8f8",
              color: isToday ? "#fff" : "#333", fontSize:12, borderBottom:"1px solid #e0e0e0"
            }}>
              <span style={{ fontWeight:"bold" }}>{KA_DAYS[date.getDay()]}</span>
              <span style={{ fontSize:11, opacity:0.8 }}>{date.getDate()}</span>
            </div>
            <div style={{ position:"relative" }}>
              {hours.map(h => (
                <div key={h}
                  onClick={() => onEmptyClick && onEmptyClick(date, h)}
                  style={{ height:50, borderTop:"1px solid #f0f0f0", cursor:"pointer" }}
                  onMouseOver={e => e.currentTarget.style.background="#f0faf6"}
                  onMouseOut={e => e.currentTarget.style.background="transparent"}
                />
              ))}
              {dayAppts.map(a => {
                const { top, height } = getApptStyle(a);
                return (
                  <div key={a.id}
                    onClick={() => onApptClick(a)}
                    style={{
                      position:"absolute", left:2, right:2, top, height,
                      background: STATUS_COLOR[a.status] + "dd",
                      borderRadius:4, padding:"2px 6px", fontSize:11,
                      color:"#fff", overflow:"hidden", cursor:"pointer",
                      borderLeft: `3px solid ${STATUS_COLOR[a.status]}`
                    }} title={`${a.client_name} · ${STATUS_LABEL[a.status]}`}>
                    <div style={{ fontWeight:"bold", fontSize:11 }}>{a.starts_at?.slice(11,16)} {a.client_name}</div>
                    {a.provider_name && <div style={{ opacity:0.85, fontSize:10 }}>{a.provider_name}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ date, appointments, onDayClick }) {
  const year     = date.getFullYear();
  const month    = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

  return (
    <div style={{ flex:1 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #e0e0e0" }}>
        {KA_DAYS.slice(1).concat(KA_DAYS[0]).map(d => (
          <div key={d} style={{ padding:"8px", textAlign:"center", fontSize:12, color:"#666", fontWeight:"bold" }}>{d}</div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gridAutoRows:"100px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ background:"#fafafa", border:"1px solid #f0f0f0" }} />;
          const dateStr  = d.toISOString().slice(0,10);
          const dayAppts = appointments.filter(a => a.starts_at?.slice(0,10) === dateStr);
          const isToday  = dateStr === new Date().toISOString().slice(0,10);
          return (
            <div key={i} onClick={() => onDayClick(d)} style={{
              border:"1px solid #f0f0f0", padding:4, cursor:"pointer",
              background: isToday ? "#e8f8f3" : "#fff",
            }}
            onMouseOver={e => e.currentTarget.style.background="#f5f5f5"}
            onMouseOut={e => e.currentTarget.style.background= isToday ? "#e8f8f3" : "#fff"}>
              <div style={{ fontWeight: isToday ? "bold" : "normal", color: isToday ? "#1D9E75" : "#333", fontSize:13, marginBottom:4 }}>{d.getDate()}</div>
              {dayAppts.slice(0,3).map(a => (
                <div key={a.id} style={{
                  background: STATUS_COLOR[a.status], color:"#fff", borderRadius:3,
                  padding:"1px 5px", fontSize:10, marginBottom:2, overflow:"hidden",
                  whiteSpace:"nowrap", textOverflow:"ellipsis"
                }}>{a.starts_at?.slice(11,16)} {a.client_name}</div>
              ))}
              {dayAppts.length > 3 && <div style={{ fontSize:10, color:"#999" }}>+{dayAppts.length-3} სხვა</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [providers, setProviders]       = useState([]);
  const [showNewAppt, setShowNewAppt]   = useState(false);
  const [view, setView]                 = useState("week");
  const [anchor, setAnchor]             = useState(new Date());
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [search, setSearch]             = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching]       = useState(false);

  // Reschedule
  const [showReschedule, setShowReschedule]   = useState(false);
  const [rescheduleDate, setRescheduleDate]   = useState("");
  const [rescheduleSlots, setRescheduleSlots] = useState([]);

  useEffect(() => {
    api.get("/providers/", { params: { tenant_id: user.tenant_id, active: true } }).then(r => setProviders(r.data));
  }, []);

  const getDates = useCallback(() => {
    const d = new Date(anchor);
    if (view === "day")   return [new Date(d)];
    if (view === "3day")  return [0,1,2].map(i => { const x = new Date(d); x.setDate(d.getDate()+i); return x; });
    if (view === "week") {
      const dow = (d.getDay() + 6) % 7;
      const mon = new Date(d); mon.setDate(d.getDate() - dow);
      return Array.from({length:7}, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate()+i); return x; });
    }
    return [];
  }, [anchor, view]);

  const getRange = useCallback(() => {
    if (view === "month") {
      const y = anchor.getFullYear(), m = anchor.getMonth();
      return { from: new Date(y,m,1).toISOString().slice(0,10), to: new Date(y,m+1,0).toISOString().slice(0,10) };
    }
    const dates = getDates();
    return { from: dates[0].toISOString().slice(0,10), to: dates[dates.length-1].toISOString().slice(0,10) };
  }, [anchor, view, getDates]);

  useEffect(() => { load(); }, [anchor, view, filterProvider, filterStatus]);

  const load = async () => {
    setLoading(true);
    setSearchResults(null);
    setSearch("");
    const { from, to } = getRange();
    try {
      const params = { tenant_id: user.tenant_id, date_from: from, date_to: to };
      if (filterProvider) params.provider_id = filterProvider;
      if (filterStatus) params.status = filterStatus;
      const { data } = await api.get("/appointments/", { params });
      setAppointments(filterStatus ? data : data.filter(a => a.status !== "cancelled"));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val) => {
    setSearch(val);
    setSearchResults(null);
    if (!val.trim()) return;

    const local = appointments.filter(a =>
      a.client_name?.toLowerCase().includes(val.toLowerCase()) ||
      a.provider_name?.toLowerCase().includes(val.toLowerCase()) ||
      a.code?.toLowerCase().includes(val.toLowerCase())
    );

    if (local.length > 0) {
      setSearchResults(local);
      return;
    }

    setSearching(true);
    try {
      const { data } = await api.get("/appointments/", {
        params: { tenant_id: user.tenant_id, search: val }
      });
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/appointments/${id}`, { status });
    setSelectedAppt(null);
    load();
  };

  const resendCode = async (id) => {
    const { data } = await api.post(`/appointments/${id}/resend-code`);
    setSelectedAppt(prev => prev ? {...prev, code: data.code} : prev);
  };

  const navigate = (dir) => {
    const d = new Date(anchor);
    if (view === "day")   d.setDate(d.getDate() + dir);
    else if (view === "3day") d.setDate(d.getDate() + dir * 3);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  const getTitle = () => {
    if (view === "month") return `${KA_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    const dates = getDates();
    if (dates.length === 1) return `${dates[0].getDate()} ${KA_MONTHS[dates[0].getMonth()]}`;
    return `${dates[0].getDate()} — ${dates[dates.length-1].getDate()} ${KA_MONTHS[dates[dates.length-1].getMonth()]}`;
  };

  const btnStyle = (active) => ({
    padding:"6px 14px", borderRadius:6, border:"1px solid #ddd", cursor:"pointer", fontSize:13,
    background: active ? "#1D9E75" : "#fff", color: active ? "#fff" : "#333"
  });

  const inp = { padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14 };
  const displayAppointments = searchResults ?? appointments;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 48px)" }}>
      {showNewAppt && (
        <NewAppointmentModal
          tenantId={user.tenant_id}
          defaultDate={anchor.toISOString().slice(0,10)}
          onClose={() => setShowNewAppt(false)}
          onCreated={() => { setShowNewAppt(false); load(); }}
        />
      )}

      {/* Appointment detail modal */}
      {selectedAppt && (
        <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={() => { setSelectedAppt(null); load(); }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin:"0 0 12px" }}>{selectedAppt.client_name}</h3>
            <div style={{ fontSize:14, color:"#666", marginBottom:4 }}>{selectedAppt.provider_name} · {selectedAppt.starts_at?.slice(11,16)}</div>
            {selectedAppt.service_name && <div style={{ fontSize:13, color:"#999", marginBottom:8 }}>{selectedAppt.service_name}</div>}
            {selectedAppt.code && <div style={{ fontSize:14, color:"#1D9E75", fontWeight:"bold", marginBottom:12 }}>კოდი: {selectedAppt.code}</div>}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
              {selectedAppt.status === "pending" && (
                <button onClick={() => changeStatus(selectedAppt.id, "confirmed")} style={{ background:"#1D9E75", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>დადასტურება</button>
              )}
              {["pending","confirmed"].includes(selectedAppt.status) && (
                <button onClick={() => changeStatus(selectedAppt.id, "cancelled")} style={{ background:"#e74c3c", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>გაუქმება</button>
              )}
              {selectedAppt.status === "confirmed" && (
                <button onClick={() => changeStatus(selectedAppt.id, "completed")} style={{ background:"#3498db", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>დასრულება</button>
              )}
              {["pending","confirmed"].includes(selectedAppt.status) && (
                <button onClick={() => { setShowReschedule(true); setRescheduleDate(selectedAppt.starts_at?.slice(0,10) || new Date().toISOString().slice(0,10)); }} style={{ background:"#8e44ad", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>📅 გადატანა</button>
              )}
              <button onClick={() => resendCode(selectedAppt.id)} style={{ background:"#f39c12", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>კოდი 🔄</button>
              <button onClick={() => { setSelectedAppt(null); load(); }} style={{ background:"#f5f5f5", color:"#333", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>დახურვა</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {showReschedule && selectedAppt && (
        <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1001 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:420 }}>
            <h3 style={{ margin:"0 0 12px" }}>ჩაწერის გადატანა</h3>
            <p style={{ color:"#666", fontSize:13, marginBottom:16 }}>
              {selectedAppt.client_name} · ახლა: {selectedAppt.starts_at?.slice(11,16)}
            </p>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:4 }}>ახალი თარიღი</label>
              <DateField value={rescheduleDate}
                onChange={async v => {
                  setRescheduleDate(v);
                  const pid = selectedAppt.provider_id ||
                    providers.find(p => `${p.first_name} ${p.last_name}` === selectedAppt.provider_name)?.id;
                  if (!pid) return;
                  const { data } = await api.get("/slots/", { params: {
                    provider_id: pid,
                    date_from: e.target.value,
                    date_to: e.target.value,
                    status: "available"
                  }});
                  setRescheduleSlots(data);
                }}
                style={{ padding:"8px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:14, width:"100%", boxSizing:"border-box" }} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:8 }}>ახალი სლოტი</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                {rescheduleSlots.length === 0 && (
                  <p style={{ color:"#999", fontSize:13, gridColumn:"1/-1" }}>
                    {rescheduleDate ? "თავისუფალი სლოტი არ არის" : "აირჩიე თარიღი"}
                  </p>
                )}
                {rescheduleSlots.map(s => (
                  <button key={s.id} onClick={async () => {
                    try {
                      await api.patch(`/appointments/${selectedAppt.id}/reschedule`, null, { params: { slot_id: s.id } });
                      setShowReschedule(false);
                      setSelectedAppt(null);
                      setRescheduleSlots([]);
                      load();
                    } catch (err) {
                      alert("შეცდომა: " + err.message);
                    }
                  }} style={{
                    padding:"8px", borderRadius:6, border:"1px solid #1D9E75",
                    background:"#fff", color:"#1D9E75", cursor:"pointer", fontSize:13,
                    fontWeight:"bold"
                  }}>
                    {s.starts_at.slice(11,16)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setShowReschedule(false); setRescheduleSlots([]); }}
              style={{ background:"#f5f5f5", color:"#333", border:"none", padding:"8px 16px", borderRadius:8, cursor:"pointer" }}>
              გაუქმება
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <h2 style={{ margin:0 }}>ჩაწერები</h2>
        <div style={{ display:"flex", gap:4 }}>
          {[["day","დღე"],["3day","3 დღე"],["week","კვირა"],["month","თვე"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={btnStyle(view===v)}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, alignItems:"center" }}>
          <button onClick={() => navigate(-1)} style={btnStyle(false)}>◀</button>
          <span style={{ fontWeight:"bold", minWidth:160, textAlign:"center", fontSize:14 }}>{getTitle()}</span>
          <button onClick={() => navigate(1)} style={btnStyle(false)}>▶</button>
          <button onClick={() => setAnchor(new Date())} style={btnStyle(false)}>დღეს</button>
        </div>
        <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)}
          style={{ padding:"6px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
          <option value="">ყველა პროვაიდერი</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:"6px 12px", borderRadius:6, border:"1px solid #ddd", fontSize:13 }}>
          <option value="">ყველა სტატუსი</option>
          <option value="pending">მოლოდინში</option>
          <option value="confirmed">დადასტურებული</option>
          <option value="completed">დასრულებული</option>
          <option value="cancelled">გაუქმებული</option>
          <option value="no_show">არ გამოცხადდა</option>
        </select>
        <div style={{ position:"relative" }}>
          <input
            placeholder="🔍 კლიენტი / ექიმი / კოდი..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ ...inp, minWidth:220, paddingRight:search ? 30 : 12 }}
          />
          {search && (
            <span onClick={() => { setSearch(""); setSearchResults(null); }}
              style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", cursor:"pointer", color:"#999", fontSize:16 }}>✕</span>
          )}
          {searching && <div style={{ position:"absolute", fontSize:11, color:"#999", marginTop:2 }}>backend-ში ვეძებთ...</div>}
          {search && searchResults !== null && !searching && (
            <div style={{ position:"absolute", fontSize:11, marginTop:2, color: searchResults.length > 0 ? "#1D9E75" : "#e74c3c" }}>
              {searchResults.length > 0 ? `${searchResults.length} შედეგი` : "ვერ მოიძებნა"}
            </div>
          )}
        </div>
        <button onClick={() => setShowNewAppt(true)} style={{
          background:"#1D9E75", color:"#fff", border:"none",
          padding:"8px 16px", borderRadius:8, cursor:"pointer", marginLeft:"auto"
        }}>+ ჩაწერა</button>
      </div>

      {/* Calendar */}
      {loading ? <p>იტვირთება...</p> : (
        <div style={{ flex:1, background:"#fff", borderRadius:12, overflow:"auto", display:"flex", flexDirection:"column" }}>
          {view === "month" ? (
            <MonthView
              date={anchor}
              appointments={displayAppointments}
              onDayClick={(d) => { setAnchor(d); setView("day"); }}
            />
          ) : (
            <DayView
              dates={getDates()}
              appointments={displayAppointments}
              onApptClick={setSelectedAppt}
              onEmptyClick={(date) => { setAnchor(date); setShowNewAppt(true); }}
            />
          )}
        </div>
      )}

      {/* Search results */}
      {search && searchResults !== null && (
        <div style={{ background:"#fff", borderRadius:12, padding:20, marginTop:12 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:15 }}>
            ძიების შედეგები — "{search}"
            <span style={{ fontSize:13, fontWeight:"normal", color:"#999", marginLeft:8 }}>{searchResults.length} ჩაწერა</span>
          </h3>
          {searchResults.length === 0 && <p style={{ color:"#999" }}>ვერ მოიძებნა</p>}
          <div style={{ display:"grid", gap:8 }}>
            {searchResults.map(a => (
              <div key={a.id} onClick={() => setSelectedAppt(a)} style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 16px", borderRadius:8, background:"#f8f8f8",
                borderLeft: `3px solid ${STATUS_COLOR[a.status]}`,
                cursor:"pointer"
              }}
              onMouseOver={e => e.currentTarget.style.background="#f0f0f0"}
              onMouseOut={e => e.currentTarget.style.background="#f8f8f8"}>
                <span style={{ fontSize:13, color:"#666", minWidth:80 }}>{a.starts_at?.slice(0,10)}</span>
                <span style={{ fontSize:13, fontWeight:"bold", color:"#666", minWidth:40 }}>{a.starts_at?.slice(11,16)}</span>
                <span style={{ fontSize:14, fontWeight:"bold", flex:1 }}>{a.client_name}</span>
                <span style={{ fontSize:13, color:"#666" }}>{a.provider_name}</span>
                {a.code && <span style={{ fontSize:12, color:"#1D9E75", fontWeight:"bold" }}>{a.code}</span>}
                <span style={{
                  background: STATUS_COLOR[a.status] + "22",
                  color: STATUS_COLOR[a.status],
                  padding:"2px 10px", borderRadius:20, fontSize:12
                }}>{STATUS_LABEL[a.status]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
