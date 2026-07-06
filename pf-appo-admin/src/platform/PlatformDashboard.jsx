import { useState, useEffect } from "react";
import api from "../api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const COLORS = ["#1D9E75", "#3498db", "#f39c12", "#e74c3c", "#9b59b6", "#5ab0d0"];

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/platform/stats")
      .then(r => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  const Big = ({ label, value, color }) => (
    <div style={{ background: "#1a2530", borderRadius: 12, padding: "20px 24px", flex: "1 1 150px", minWidth: 130 }}>
      <div style={{ fontSize: 32, fontWeight: "bold", color: color || "#1D9E75" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#7a8a99", marginTop: 4 }}>{label}</div>
    </div>
  );

  const Card = ({ title, children }) => (
    <div style={{ background: "#1a2530", borderRadius: 12, padding: 20 }}>
      <div style={{ color: "#fff", fontSize: 15, fontWeight: "bold", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );

  if (loading) return <div style={{ padding: 24, color: "#7a8a99" }}>იტვირთება...</div>;
  if (!stats) return <div style={{ padding: 24, color: "#e74c3c" }}>მონაცემები ვერ ჩაიტვირთა</div>;

  const t = stats.totals;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ color: "#fff", margin: "0 0 4px", fontSize: 22 }}>📊 სტატისტიკა</h1>
        <div style={{ color: "#7a8a99", fontSize: 13, marginBottom: 20 }}>პლატფორმის მიმოხილვა</div>

        {/* Totals */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
          <Big label="სულ კომპანია" value={t.tenants} />
          <Big label="აქტიური" value={t.active_tenants} color="#3498db" />
          <Big label="მომხმარებელი" value={t.users} color="#9b59b6" />
          <Big label="სულ ჩაწერა" value={t.appointments} color="#f39c12" />
        </div>

        {/* Growth line chart */}
        <div style={{ marginBottom: 20 }}>
          <Card title="ჩაწერების დინამიკა (ბოლო 6 თვე)">
            {stats.growth.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={stats.growth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3540" />
                  <XAxis dataKey="month" stroke="#7a8a99" fontSize={12} />
                  <YAxis stroke="#7a8a99" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f1419", border: "1px solid #2a3540", borderRadius: 8, color: "#fff" }} />
                  <Line type="monotone" dataKey="count" stroke="#1D9E75" strokeWidth={2} dot={{ fill: "#1D9E75", r: 4 }} name="ჩაწერები" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div style={{ color: "#7a8a99", fontSize: 13 }}>მონაცემები არ არის</div>}
          </Card>
        </div>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card title="ჩაწერები კომპანიების მიხედვით">
            {stats.by_tenant.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.by_tenant} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3540" />
                  <XAxis type="number" stroke="#7a8a99" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#7a8a99" fontSize={11} width={100} />
                  <Tooltip contentStyle={{ background: "#0f1419", border: "1px solid #2a3540", borderRadius: 8, color: "#fff" }} cursor={{ fill: "#ffffff08" }} />
                  <Bar dataKey="count" fill="#3498db" radius={[0, 4, 4, 0]} name="ჩაწერები" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ color: "#7a8a99", fontSize: 13 }}>მონაცემები არ არის</div>}
          </Card>

          <Card title="სტატუსების განაწილება">
            {stats.by_status.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`} labelLine={false} fontSize={11}>
                    {stats.by_status.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f1419", border: "1px solid #2a3540", borderRadius: 8, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ color: "#7a8a99", fontSize: 13 }}>მონაცემები არ არის</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}