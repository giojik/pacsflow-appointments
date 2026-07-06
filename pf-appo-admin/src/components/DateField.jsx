import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// გლობალური ფორმატი
let cachedFormat = "dd.MM.yyyy";

export function setDatePickerFormat(f) {
  // ჩვენი ფორმატი → date-fns ფორმატი
  const map = {
    "dd.mm.yyyy": "dd.MM.yyyy",
    "yyyy-mm-dd": "yyyy-MM-dd",
    "dd/mm/yyyy": "dd/MM/yyyy",
    "mm/dd/yyyy": "MM/dd/yyyy",
  };
  cachedFormat = map[f] || "dd.MM.yyyy";
}

export function getDatePickerFormat() {
  return cachedFormat;
}

// ISO string ("2026-07-01") → Date object
function isoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date object → ISO string
function dateToIso(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * DateField — არჩეულ ფორმატში აჩვენებს, ISO string-ს აბრუნებს onChange-ში
 * props:
 *   value: ISO string ("2026-07-01")
 *   onChange: (isoString) => void
 *   style: input style
 *   required, placeholder
 */
export default function DateField({ value, onChange, style, required, placeholder }) {
  return (
    <DatePicker
      selected={isoToDate(value)}
      onChange={(date) => onChange(dateToIso(date))}
      dateFormat={cachedFormat}
      placeholderText={placeholder || cachedFormat}
      required={required}
      customInput={
        <input
          style={{
            padding:"8px 12px", borderRadius:6, border:"1px solid #ddd",
            fontSize:14, width:"100%", boxSizing:"border-box",
            ...style
          }}
        />
      }
      wrapperClassName="date-field-wrapper"
    />
  );
}
