import { useState, useEffect, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

function StatCard({ icon, label, value, color="#1D9E75", sub }) {
  return (
    <div style={{
      background:"#fff", borderRadius:12, padding:16,
      borderLeft: `4px solid ${color}`, boxShadow:"0 2px 8px #0001"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:12, color:"#999", marginBottom:4 }}>{label}</div>
          <div style={{ fontSize:28, fontWeight:"bold", color }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{sub}</div>}
        </div>
        <span style={{ fontSize:24 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({
    today: [], week: [], providers: [], clients: []
  });

  const today = new Date().toISOString().slice(0,10);

  const weekStart = (() => {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d.toISOString().slice(0,10);
  })();

  const weekEnd = (() => {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow + 6);
    return d.toISOString().slice(0,10);
  })();

  const loadStats = useCallback(async () => {
    const tid = user.tenant_id;
    try {
      const [t, w, p, c] = await Promise.all([
        api.get("/appointments/", { params: { tenant_id: tid, date_from: today, date_to: today } }),
        api.get("/appointments/", { params: { tenant_id: tid, date_from: weekStart, date_to: weekEnd } }),
        api.get("/providers/",    { params: { tenant_id: tid } }),
        api.get("/clients/",      { params: { tenant_id: tid } }),
      ]);
      setStats({ today: t.data, week: w.data, providers: p.data, clients: c.data });
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.tenant_id]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  if (loading) return <p>იტვირთება...</p>;

  const todayByStatus = Object.keys(STATUS_LABEL).reduce((acc, s) => {
    acc[s] = stats.today.filter(a => a.status === s).length;
    return acc;
  }, {});

  const todayConfirmed  = stats.today.filter(a => a.status === "confirmed").length;
  const todayPending    = stats.today.filter(a => a.status === "pending").length;
  const todayCompleted  = stats.today.filter(a => a.status === "completed").length;
  const activeProviders = stats.providers.filter(p => p.active).length;

  const byHour = Array.from({length: 24}, (_, h) => ({
    hour: h,
    count: stats.today.filter(a => parseInt(a.starts_at?.slice(11,13)||0) === h).length
  })).filter(x => x.count > 0 || (x.hour >= 8 && x.hour <= 18));

  const maxCount = Math.max(...byHour.map(x => x.count), 1);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize: isMobile ? 20 : 24 }}>Dashboard</h2>
          <div style={{ color:"#999", fontSize: isMobile ? 11 : 13 }}>
            {new Date().toLocaleDateString("ka-GE", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            {!isMobile && (
              <span style={{ marginLeft:12, fontSize:11, color:"#bbb" }}>
                განახლდა: {lastUpdate.toLocaleTimeString("ka-GE")}
              </span>
            )}
          </div>
        </div>
        <button onClick={loadStats} style={{
          background:"#fff", border:"1px solid #ddd", borderRadius:8,
          padding:"6px 12px", cursor:"pointer", fontSize:12, color:"#666"
        }}>🔄</button>
      </div>

      {/* Stats — 2x2 მობილურზე, 4x1 desktop-ზე */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap:10, marginBottom:12 }}>
        <StatCard icon="📋" label="დღის ჩაწერები" value={stats.today.length} color="#1D9E75"
          sub={`${todayConfirmed} დადასტ.`} />
        <StatCard icon="⏳" label="მოლოდინში" value={todayPending} color="#f39c12" />
        <StatCard icon="✅" label="დასრულებული" value={todayCompleted} color="#3498db" />
        <StatCard icon="📅" label="კვირის ჩაწერები" value={stats.week.length} color="#8e44ad"
          sub={isMobile ? null : `${formatDate(weekStart)} — ${formatDate(weekEnd)}`} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2,1fr)", gap:10, marginBottom:16 }}>
        <StatCard icon="👨‍⚕️" label="პროვაიდერები" value={activeProviders} color="#2c3e50"
          sub={`სულ: ${stats.providers.length}`} />
        <StatCard icon="👥" label="კლიენტები" value={stats.clients.length} color="#1D9E75" />
      </div>

      {/* Charts + Status */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:12 }}>

        {/* სტატუსები */}
        <div style={{ background:"#fff", borderRadius:12, padding:16 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14 }}>სტატუსების მიხედვით</h3>
          {Object.entries(STATUS_LABEL).map(([s, label]) => (
            <div key={s} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:10, height:10, borderRadius:2, background: STATUS_COLOR[s], flexShrink:0 }} />
              <span style={{ flex:1, fontSize:13 }}>{label}</span>
              <div style={{ flex:2, background:"#f5f5f5", borderRadius:4, height:16, position:"relative" }}>
                <div style={{
                  width: `${(todayByStatus[s] / Math.max(stats.today.length, 1)) * 100}%`,
                  background: STATUS_COLOR[s], height:"100%", borderRadius:4
                }} />
              </div>
              <span style={{ fontSize:13, fontWeight:"bold", minWidth:20, textAlign:"right" }}>{todayByStatus[s]}</span>
            </div>
          ))}
        </div>

        {/* საათობრივი — მობილურზე ოდნავ პატარა */}
        <div style={{ background:"#fff", borderRadius:12, padding:16 }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14 }}>განაწილება საათების მიხედვით</h3>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height: isMobile ? 80 : 120 }}>
            {byHour.map(({ hour, count }) => (
              <div key={hour} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                {count > 0 && <div style={{ fontSize:9, color:"#999" }}>{count}</div>}
                <div style={{
                  width:"100%", borderRadius:"3px 3px 0 0",
                  background: count > 0 ? "#1D9E75" : "#f0f0f0",
                  height: `${(count / maxCount) * (isMobile ? 60 : 90) + (count > 0 ? 10 : 4)}px`,
                }} />
                <div style={{ fontSize:8, color:"#aaa" }}>{String(hour).padStart(2,"0")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* დღის სია */}
        <div style={{ background:"#fff", borderRadius:12, padding:16, gridColumn: isMobile ? "1" : "1/-1" }}>
          <h3 style={{ margin:"0 0 12px", fontSize:14 }}>დღის ჩაწერები</h3>
          {stats.today.length === 0 && <p style={{ color:"#999", fontSize:13 }}>დღეს ჩაწერები არ არის</p>}
          <div style={{ display:"grid", gap:6 }}>
            {stats.today
              .sort((a,b) => (a.starts_at||"").localeCompare(b.starts_at||""))
              .map(a => (
              <div key={a.id} style={{
                display:"flex", alignItems:"center", gap:8,
                padding:"8px 10px", borderRadius:8, background:"#f8f8f8",
                borderLeft: `3px solid ${STATUS_COLOR[a.status]}`
              }}>
                <span style={{ fontSize:12, fontWeight:"bold", color:"#666", minWidth:36 }}>
                  {a.starts_at?.slice(11,16)}
                </span>
                <span style={{ fontSize:13, fontWeight:"bold", flex:1 }}>{a.client_name}</span>
                {!isMobile && <span style={{ fontSize:12, color:"#666" }}>{a.provider_name}</span>}
                {a.code && <span style={{ fontSize:11, color:"#1D9E75", fontWeight:"bold" }}>{a.code}</span>}
                <span style={{
                  background: STATUS_COLOR[a.status] + "22",
                  color: STATUS_COLOR[a.status],
                  padding:"2px 8px", borderRadius:20, fontSize:11
                }}>{isMobile ? a.status.slice(0,3) : STATUS_LABEL[a.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
