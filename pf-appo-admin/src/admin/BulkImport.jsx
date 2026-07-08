import { useState, useRef } from "react";
import api from "../api";

export default function BulkImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) { setError("მხოლოდ .xlsx ფაილი მიიღება"); return; }
    setFile(f); setError(""); setResults(null);
  };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]); };
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(""); setResults(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/admin/import/bulk-upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setResults(res.data.results);
    } catch (err) { setError(err.response?.data?.detail || "ატვირთვა ვერ მოხერხდა"); }
    finally { setLoading(false); }
  };
  const handleReset = () => { setFile(null); setResults(null); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  const totalCreated = results ? (results.providers?.created||0)+(results.services?.created||0)+(results.mappings?.created||0) : 0;
  const totalUpdated = results ? (results.providers?.updated||0)+(results.services?.updated||0) : 0;
  const totalErrors = results ? (results.providers?.errors?.length||0)+(results.services?.errors?.length||0)+(results.mappings?.errors?.length||0) : 0;

  const s = {
    page: { maxWidth: 640, margin: "0 auto", fontFamily: "sans-serif" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    title: { fontSize: 20, fontWeight: 600, color: "#1f2937" },
    dlBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, textDecoration: "none", cursor: "pointer" },
    dropzone: (active, hasFile) => ({ border: "2px dashed", borderColor: active ? "#60a5fa" : hasFile ? "#4ade80" : "#d1d5db", background: active ? "#eff6ff" : hasFile ? "#f0fdf4" : "#f9fafb", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", transition: "all 0.2s" }),
    fileName: { fontSize: 14, fontWeight: 500, color: "#15803d" },
    fileSize: { fontSize: 12, color: "#6b7280", marginTop: 4 },
    hint: { fontSize: 14, color: "#4b5563" },
    hintSub: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
    btns: { display: "flex", gap: 12, marginTop: 16 },
    primary: { flex: 1, padding: "10px 16px", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
    cancel: { padding: "10px 16px", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, cursor: "pointer" },
    error: { marginTop: 16, padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 14, color: "#b91c1c" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 24 },
    statCard: (bg, border) => ({ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 16, textAlign: "center" }),
    statNum: (color) => ({ fontSize: 24, fontWeight: 700, color }),
    statLabel: (color) => ({ fontSize: 12, color, marginTop: 4 }),
    section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginTop: 12 },
    sectionTitle: { fontWeight: 500, color: "#1f2937", marginBottom: 8, fontSize: 15 },
    tag: (color) => ({ fontSize: 13, color }),
    errLine: { fontSize: 12, color: "#b91c1c", background: "#fef2f2", borderRadius: 4, padding: "4px 8px", marginTop: 4 },
    resetBtn: { width: "100%", padding: "10px 0", background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, cursor: "pointer", marginTop: 12 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h2 style={s.title}>მასობრივი იმპორტი</h2>
        <a href="/static/pacsflow_import_template.xlsx" download style={s.dlBtn}>📥 შაბლონის ჩამოტვირთვა</a>
      </div>

      <div style={s.dropzone(dragOver, !!file)} onDragOver={(e)=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop} onClick={()=>inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={(e)=>handleFile(e.target.files[0])} />
        {file ? (
          <div>
            <div style={{fontSize:40,marginBottom:8}}>✅</div>
            <p style={s.fileName}>{file.name}</p>
            <p style={s.fileSize}>{(file.size/1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <div style={{fontSize:40,marginBottom:8}}>📂</div>
            <p style={s.hint}>ჩააგდეთ Excel ფაილი ან <span style={{color:"#2563eb",textDecoration:"underline"}}>აირჩიეთ</span></p>
            <p style={s.hintSub}>.xlsx ფორმატი</p>
          </div>
        )}
      </div>

      {file && !results && (
        <div style={s.btns}>
          <button onClick={handleUpload} disabled={loading} style={s.primary}>{loading ? "იტვირთება..." : "იმპორტი"}</button>
          <button onClick={handleReset} style={s.cancel}>გაუქმება</button>
        </div>
      )}

      {error && <div style={s.error}>{error}</div>}

      {results && (
        <div>
          <div style={s.grid}>
            <div style={s.statCard("#f0fdf4","#bbf7d0")}><div style={s.statNum("#15803d")}>{totalCreated}</div><div style={s.statLabel("#16a34a")}>შექმნილი</div></div>
            <div style={s.statCard("#eff6ff","#bfdbfe")}><div style={s.statNum("#1d4ed8")}>{totalUpdated}</div><div style={s.statLabel("#2563eb")}>განახლებული</div></div>
            <div style={s.statCard(totalErrors>0?"#fef2f2":"#f9fafb",totalErrors>0?"#fecaca":"#e5e7eb")}><div style={s.statNum(totalErrors>0?"#b91c1c":"#9ca3af")}>{totalErrors}</div><div style={s.statLabel(totalErrors>0?"#dc2626":"#6b7280")}>შეცდომა</div></div>
          </div>

          {[{key:"providers",label:"პროვაიდერები",icon:"👤"},{key:"services",label:"სერვისები",icon:"🔧"},{key:"mappings",label:"კავშირები",icon:"🔗"}].map(({key,label,icon})=>{
            const r=results[key]; if(!r) return null;
            const hasData=r.created>0||r.updated>0||r.skipped>0||r.errors?.length>0;
            if(!hasData) return null;
            return (
              <div key={key} style={s.section}>
                <div style={s.sectionTitle}>{icon} {label}</div>
                <div style={{display:"flex",gap:16}}>
                  {r.created>0 && <span style={s.tag("#16a34a")}>+{r.created} შექმნილი</span>}
                  {r.updated>0 && <span style={s.tag("#2563eb")}>↻{r.updated} განახლებული</span>}
                  {r.skipped>0 && <span style={s.tag("#6b7280")}>⊘{r.skipped} გამოტოვებული</span>}
                </div>
                {r.errors?.length>0 && r.errors.map((err,i)=>(<div key={i} style={s.errLine}>{err}</div>))}
              </div>
            );
          })}
          <button onClick={handleReset} style={s.resetBtn}>ახალი იმპორტი</button>
        </div>
      )}
    </div>
  );
}
