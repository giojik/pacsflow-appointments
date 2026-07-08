import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Providers from "./pages/Providers";
import Services from "./pages/Services";
import Slots from "./pages/Slots";
import Appointments from "./pages/Appointments";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Waitlist from "./pages/Waitlist";
import Reports from "./pages/Reports";
import { initDateFormat } from "./utils/dateFormat";
import { setDatePickerFormat } from "./components/DateField";
import { loadBranding } from "./api/branding";
import AuditLog from "./pages/AuditLog";
import BulkImport from "./admin/BulkImport";
import PlatformLayout from "./platform/PlatformLayout";
import PlatformDashboard from "./platform/PlatformDashboard";
import PlatformTenants from "./platform/PlatformTenants";
import PlatformAudit from "./platform/PlatformAudit";
import PlatformUsers from "./platform/PlatformUsers";
import PlatformTenantDetail from "./platform/PlatformTenantDetail";
import PublicBooking from "./pages/PublicBooking";
import PlatformPricing from "./platform/PlatformPricing";
import PlatformContacts from "./platform/PlatformContacts";

initDateFormat();

loadBranding().then(b => {
  setDatePickerFormat(b.date_format || "dd.mm.yyyy");
  if (b.custom_css) {
    let el = document.getElementById("custom-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "custom-css";
      document.head.appendChild(el);
    }
    el.textContent = b.custom_css;
  }
});

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PublicBooking />} />
      <Route path="/b/:slug" element={<PublicBooking />} />
      <Route path="/platform" element={
        <ProtectedRoute>
          <PlatformLayout />
        </ProtectedRoute>
      }>
        <Route index element={<PlatformDashboard />} />
        <Route path="tenants" element={<PlatformTenants />} />
        <Route path="tenants/:id" element={<PlatformTenantDetail />} />
        <Route path="audit" element={<PlatformAudit />} />
        <Route path="users" element={<PlatformUsers />} />
        <Route path="pricing" element={<PlatformPricing />} />
        <Route path="contacts" element={<PlatformContacts />} />
      </Route>

      <Route path="/app" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="providers" element={<Providers />} />
        <Route path="services" element={<Services />} />
        <Route path="slots" element={<Slots />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="clients" element={<Clients />} />
        <Route path="users" element={<Users />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
        <Route path="waitlist" element={<Waitlist />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="import" element={<BulkImport />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}