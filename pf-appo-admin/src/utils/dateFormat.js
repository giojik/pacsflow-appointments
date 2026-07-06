import { loadBranding } from "../api/branding";

let cachedFormat = "dd.mm.yyyy";

export async function initDateFormat() {
  const b = await loadBranding();
  cachedFormat = b.date_format || "dd.mm.yyyy";
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  switch (cachedFormat) {
    case "yyyy-mm-dd": return `${yyyy}-${mm}-${dd}`;
    case "dd/mm/yyyy": return `${dd}/${mm}/${yyyy}`;
    case "mm/dd/yyyy": return `${mm}/${dd}/${yyyy}`;
    default:           return `${dd}.${mm}.${yyyy}`;
  }
}