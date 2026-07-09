import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import DateField from "../components/DateField";

export default function AuditLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [entities, setEntities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 50;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    date_from: iso(weekAgo),
    date_to: iso(today),
    user_q: "",
    entity: "",
    method: "",
  });

  const METHOD_COLOR = { POST: "#1D9E75", PATCH: "#f39c12", PUT: "#f39c12", DELETE: "#e74c3c" };
  const METHOD_LABEL = { POST: "შექმნა", PATCH: "შეცვლა", PUT: "შეცვლა", DELETE: "წაშლა" };
  const ENTITY_LABEL = {
    appointments: "ჩაწერები", clients: "კლიენტები", providers: "პროვაიდერები",
    services: "სერვისები", slots: "სლოტები", users: "მომხმარებლები",
    settings: "პარამეტრები", waitlist: "Waitlist", upload: "ატვირთვა", codes: "კოდები",
  };

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" };

  const buildParams = () => {
    const p = { tenant_id: user.tenant_id };
    if (filters.date_from) p.date_from = filters.date_from;
    if (filters.date_to)   p.date_to = filters.date_to;
    if (filters.user_q)    p.user_q = filters.user_q;
    if (filters.entity)    p.entity = filters.entity;
    if (filters.method)    p.method = filters.method;
    return p;
  };

  const load = async (pg = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get("/audit/", {
        params: { ...buildParams(), limit: LIMIT, offset: pg * LIMIT },
      });
      setRows(data.rows);
      setEntities(data.entities || []);
      setTotal(data.total);
      setPage(pg);
      setExpanded(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const pages = Math.ceil(total / LIMIT);

  const prettyBody = (b) => {
    if (!b) return "";
    try { return JSON.stringify(JSON.parse(b), null, 2); } catch { return b; }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <h2 style={{ margin: 0 }}>📜 Audit Log</h2>

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
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>მომხმარებელი</label>
          <input style={inp} placeholder="username..." value={filters.user_q}
            onChange={e => setFilters(f => ({ ...f, user_q: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>ობიექტი</label>
          <select style={inp} value={filters.entity} onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}>
            <option value="">ყველა</option>
            {entities.map(en => <option key={en} value={en}>{ENTITY_LABEL[en] || en}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>მოქმედება</label>
          <select style={inp} value={filters.method} onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}>
            <option value="">ყველა</option>
            <option value="POST">შექმნა</option>
            <option value="PATCH">შეცვლა</option>
            <option value="DELETE">წაშლა</option>
          </select>
        </div>
        <button onClick={() => load(0)} disabled={loading}
          style={{ padding: "9px 20px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "..." : "🔍 ძებნა"}
        </button>
        <div style={{ marginLeft: "auto", color: "#888", fontSize: 13, alignSelf: "center" }}>
          სულ: <b>{total}</b>
        </div>
      </div>

      {/* ცხრილი */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, flex: 1, overflowY: "auto", minHeight: 0, boxShadow: "0 1px 4px #0001" }}>
        {loading ? <p>იტვირთება...</p> : !rows.length ? <p style={{ color: "#888" }}>ჩანაწერები ვერ მოიძებნა</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                <th style={{ padding: 8 }}>დრო</th>
                <th style={{ padding: 8 }}>მოქმედება</th>
                <th style={{ padding: 8 }}>დეტალები</th>
                <th style={{ padding: 8 }}>Status</th>
                <th style={{ padding: 8 }}>IP</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <>
                  <tr key={r.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 8, whiteSpace: "nowrap", color: "#666", fontSize: 12 }}>{r.created_at}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ background: (METHOD_COLOR[r.method] || "#888") + "22", color: METHOD_COLOR[r.method] || "#888", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" }}>
                        {METHOD_LABEL[r.method] || r.method}
                      </span>
                    </td>
                    <td style={{ padding: 8, maxWidth: 500 }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{r.details || ""}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {ENTITY_LABEL[r.entity] || r.entity}
                        <span style={{ margin: "0 4px" }}>·</span>
                        <span style={{ fontFamily: "monospace" }}>{r.path}</span>
                      </div>
                    </td>
                    <td style={{ padding: 8 }}>
                      <span style={{ color: r.status_code < 400 ? "#1D9E75" : "#e74c3c", fontWeight: "bold" }}>{r.status_code}</span>
                    </td>
                    <td style={{ padding: 8, fontSize: 12, color: "#888" }}>{r.ip}</td>
                    <td style={{ padding: 8 }}>
                      {r.body && (
                        <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12 }}>
                          {expanded === r.id ? "▲" : "▼"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={r.id + "_detail"}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <pre style={{ margin: 0, padding: 14, background: "#f8f9fa", fontSize: 12, overflowX: "auto", borderBottom: "1px solid #eee" }}>
                          {prettyBody(r.body)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
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
