import { useState, useEffect } from "react";
import api from "../api";

export default function PlatformAudit() {
  const [rows, setRows] = useState([]);
  const [entities, setEntities] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(0);
  const LIMIT = 50;

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    date_from: iso(weekAgo), date_to: iso(today),
    tenant_id: "", method: "", entity: "",
  });

  const inp = { padding: "8px 12px", borderRadius: 6, border: "1px solid #2a3540", fontSize: 14, boxSizing: "border-box", background: "#0f1419", color: "#fff" };

  const METHOD_COLOR = {
    POST: "#1D9E75", PATCH: "#f39c12", PUT: "#f39c12",
    DELETE: "#e74c3c", IMPERSONATE: "#9b59b6",
  };
  const METHOD_LABEL = {
    POST: "შექმნა", PATCH: "შეცვლა", PUT: "შეცვლა",
    DELETE: "წაშლა", IMPERSONATE: "შესვლა",
  };

  const buildParams = () => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  };

  const load = async (pg = 0) => {
    setLoading(true);
    try {
      const { data } = await api.get("/platform/audit", {
        params: { ...buildParams(), limit: LIMIT, offset: pg * LIMIT },
      });
      setRows(data.rows);
      setEntities(data.entities || []);
      setTenants(data.tenants || []);
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
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>📜 Audit Log</h1>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20 }}>ყველა კომპანიის აქტივობა</div>

        {/* Filters */}
        <div style={{ background: "#1a2530", borderRadius: 12, padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "#7a8a99", display: "block", marginBottom: 4 }}>თარიღიდან</label>
            <input type="date" style={inp} value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#7a8a99", display: "block", marginBottom: 4 }}>თარიღამდე</label>
            <input type="date" style={inp} value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#7a8a99", display: "block", marginBottom: 4 }}>კომპანია</label>
            <select style={inp} value={filters.tenant_id} onChange={e => setFilters(f => ({ ...f, tenant_id: e.target.value }))}>
              <option value="">ყველა</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#7a8a99", display: "block", marginBottom: 4 }}>ობიექტი</label>
            <select style={inp} value={filters.entity} onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}>
              <option value="">ყველა</option>
              {entities.map(en => <option key={en} value={en}>{en}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#7a8a99", display: "block", marginBottom: 4 }}>მოქმედება</label>
            <select style={inp} value={filters.method} onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}>
              <option value="">ყველა</option>
              <option value="POST">შექმნა</option>
              <option value="PATCH">შეცვლა</option>
              <option value="DELETE">წაშლა</option>
              <option value="IMPERSONATE">შესვლა</option>
            </select>
          </div>
          <button onClick={() => load(0)} disabled={loading}
            style={{ padding: "9px 20px", borderRadius: 6, border: "none", background: "#1D9E75", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>
            {loading ? "..." : "🔍 ძებნა"}
          </button>
          <div style={{ marginLeft: "auto", color: "#7a8a99", fontSize: 13, alignSelf: "center" }}>სულ: <b style={{ color: "#fff" }}>{total}</b></div>
        </div>

        {/* Table */}
        <div style={{ background: "#1a2530", borderRadius: 12, padding: 16 }}>
          {loading ? <p style={{ color: "#7a8a99" }}>იტვირთება...</p> : !rows.length ? <p style={{ color: "#7a8a99" }}>ჩანაწერები ვერ მოიძებნა</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #2a3540", textAlign: "left", color: "#7a8a99" }}>
                  <th style={{ padding: 8 }}>დრო</th>
                  <th style={{ padding: 8 }}>კომპანია</th>
                  <th style={{ padding: 8 }}>მომხმარებელი</th>
                  <th style={{ padding: 8 }}>მოქმედება</th>
                  <th style={{ padding: 8 }}>ობიექტი</th>
                  <th style={{ padding: 8 }}>IP</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <>
                    <tr key={r.id} style={{ borderBottom: "1px solid #22303c", color: "#c8d4de" }}>
                      <td style={{ padding: 8, whiteSpace: "nowrap", color: "#7a8a99" }}>{r.created_at}</td>
                      <td style={{ padding: 8 }}>{r.tenant_name}</td>
                      <td style={{ padding: 8 }}>
                        <b style={{ color: "#fff" }}>{r.username}</b>
                        <div style={{ fontSize: 11, color: "#5a6b7a" }}>{r.user_role}</div>
                      </td>
                      <td style={{ padding: 8 }}>
                        <span style={{ background: (METHOD_COLOR[r.method] || "#888") + "33", color: METHOD_COLOR[r.method] || "#888", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" }}>
                          {METHOD_LABEL[r.method] || r.method}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{r.entity}</td>
                      <td style={{ padding: 8, fontSize: 12, color: "#7a8a99" }}>{r.ip}</td>
                      <td style={{ padding: 8 }}>
                        {r.body && (
                          <button onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #2a3540", background: "transparent", color: "#7a8a99", cursor: "pointer", fontSize: 12 }}>
                            {expanded === r.id ? "▲" : "▼"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr key={r.id + "_d"}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <pre style={{ margin: 0, padding: 14, background: "#0f1419", fontSize: 12, overflowX: "auto", color: "#9fb3c8", borderBottom: "1px solid #22303c" }}>
                            {"path: " + r.path + "  ·  status: " + r.status_code + "\n" + prettyBody(r.body)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}

          {pages > 1 && (
            <div style={{ display: "flex", gap: 6, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} onClick={() => load(i)}
                  style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #2a3540", cursor: "pointer",
                    background: i === page ? "#1D9E75" : "transparent", color: i === page ? "#fff" : "#7a8a99" }}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}