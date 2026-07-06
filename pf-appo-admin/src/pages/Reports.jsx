import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/dateFormat";
import DateField from "../components/DateField";

export default function Reports() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [providers, setProviders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    date_from: iso(monthStart),
    date_to: iso(today),
    provider_id: "",
    service_id: "",
    status: "",
  });

  const STATUS_LABEL = {
    pending:   "მოლოდინში",
    confirmed: "დადასტურებული",
    cancelled: "გაუქმებული",
    completed: "დასრულებული",
    no_show:   "არ გამოცხადდა",
  };
  const STATUS_COLOR = {
    pending:   "#f39c12",
    confirmed: "#3498db",
    cancelled: "#e74c3c",
    completed: "#1D9E75",
    no_show:   "#95a5a6",
  };

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };

  const buildParams = () => {
    const p = { tenant_id: user.tenant_id };
    if (filters.date_from)   p.date_from = filters.date_from;
    if (filters.date_to)     p.date_to = filters.date_to;
    if (filters.provider_id) p.provider_id = filters.provider_id;
    if (filters.service_id)  p.service_id = filters.service_id;
    if (filters.status)      p.status = filters.status;
    return p;
  };

  const load = async (pg = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/", {
        params: { ...buildParams(), limit: LIMIT, offset: pg * LIMIT },
      });
      setRows(data.rows);
      setSummary(data.summary);
      setTotal(data.total);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    api.get("/providers/", { params: { tenant_id: user.tenant_id } }).then(r => setProviders(r.data));
    api.get("/services/",  { params: { tenant_id: user.tenant_id } }).then(r => setServices(r.data));
  }, []);

  const exportFile = async (format) => {
    setExporting(true);
    try {
      const res = await api.get("/reports/export", {
        params: { ...buildParams(), format },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      a.href = url;
      a.download = `report_${stamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export შეცდომა: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ label, value, color }) => (
    <div style={{ background: "#fff", borderRadius: 10, padding: "14px 18px", flex: "1 1 120px", minWidth: 110, boxShadow: "0 1px 4px #0001", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: "bold", color }}>{value}</div>
    </div>
  );

  const pages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <h2 style={{ margin: 0 }}>📊 ანგარიშები</h2>

      {/* ფილტრები */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", boxShadow: "0 1px 4px #0001" }}>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>თარიღიდან</label>
          <DateField value={filters.date_from} onChange={v => setFilters(f => ({ ...f, date_from: v }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>თარიღამდე</label>
          <DateField value={filters.date_to} onChange={v => setFilters(f => ({ ...f, date_to: v }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>ექიმი</label>
          <select style={inp} value={filters.provider_id} onChange={e => setFilters(f => ({ ...f, provider_id: e.target.value }))}>
            <option value="">ყველა</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>სერვისი</label>
          <select style={inp} value={filters.service_id} onChange={e => setFilters(f => ({ ...f, service_id: e.target.value }))}>
            <option value="">ყველა</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name_ka}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>სტატუსი</label>
          <select style={inp} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">ყველა</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => load(0)} disabled={loading}
          style={{ padding: "9px 20px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "..." : "🔍 ძებნა"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => exportFile("xlsx")} disabled={exporting || !rows.length}
            style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #1D9E75", background: "#fff", color: "#1D9E75", cursor: "pointer", fontWeight: "bold" }}>
            ⬇ Excel
          </button>
          <button onClick={() => exportFile("csv")} disabled={exporting || !rows.length}
            style={{ padding: "9px 16px", borderRadius: 6, border: "1px solid #888", background: "#fff", color: "#555", cursor: "pointer" }}>
            ⬇ CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label="სულ" value={summary.all} color="#333" />
          <StatCard label="მოლოდინში" value={summary.pending} color={STATUS_COLOR.pending} />
          <StatCard label="დადასტურებული" value={summary.confirmed} color={STATUS_COLOR.confirmed} />
          <StatCard label="დასრულებული" value={summary.completed} color={STATUS_COLOR.completed} />
          <StatCard label="გაუქმებული" value={summary.cancelled} color={STATUS_COLOR.cancelled} />
          <StatCard label="არ გამოცხადდა" value={summary.no_show} color={STATUS_COLOR.no_show} />
        </div>
      )}

      {/* ცხრილი */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, flex: 1, overflowY: "auto", minHeight: 0, boxShadow: "0 1px 4px #0001" }}>
        {loading ? <p>იტვირთება...</p> : !rows.length ? <p style={{ color: "#888" }}>ჩანაწერები ვერ მოიძებნა</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                <th style={{ padding: 8 }}>თარიღი</th>
                <th style={{ padding: 8 }}>დრო</th>
                <th style={{ padding: 8 }}>კლიენტი</th>
                <th style={{ padding: 8 }}>ტელეფონი</th>
                <th style={{ padding: 8 }}>ექიმი</th>
                <th style={{ padding: 8 }}>სერვისი</th>
                <th style={{ padding: 8 }}>სტატუსი</th>
                <th style={{ padding: 8 }}>შეიქმნა</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 8 }}>{formatDate(r.date)}</td>
                  <td style={{ padding: 8 }}>{r.time}</td>
                  <td style={{ padding: 8 }}>{r.client_name}</td>
                  <td style={{ padding: 8 }}>{r.client_phone}</td>
                  <td style={{ padding: 8 }}>{r.provider_name}</td>
                  <td style={{ padding: 8 }}>{r.service_name}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ background: STATUS_COLOR[r.status] + "22", color: STATUS_COLOR[r.status], padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" }}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: 8, color: "#888", fontSize: 13 }}>{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} onClick={() => load(i)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer",
                  background: i === page ? "#1D9E75" : "#fff", color: i === page ? "#fff" : "#333" }}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}