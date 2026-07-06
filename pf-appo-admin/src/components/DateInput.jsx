import { useState, useEffect } from "react";

let cachedFormat = "dd.mm.yyyy";
export function setDateFormat(f) { cachedFormat = f; }

// ISO (yyyy-mm-dd) → არჩეული ფორმატი
function isoToDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  switch (cachedFormat) {
    case "yyyy-mm-dd": return `${y}-${m}-${d}`;
    case "dd/mm/yyyy": return `${d}/${m}/${y}`;
    case "mm/dd/yyyy": return `${m}/${d}/${y}`;
    default:           return `${d}.${m}.${y}`;
  }
}

export default function DateInput({ value, onChange, style, required }) {
  return (
    <div style={{ position:"relative" }}>
      {/* რეალური date input — picker-ისთვის */}
      <input
        type="date"
        value={value || ""}
        onChange={onChange}
        required={required}
        style={style}
      />
      {/* არჩეული ფორმატის overlay ტექსტი */}
      {value && (
        <div style={{
          position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", fontSize:14, background:"#fff",
          color:"#333", paddingRight:8
        }}>
          {isoToDisplay(value)}
        </div>
      )}
    </div>
  );
}