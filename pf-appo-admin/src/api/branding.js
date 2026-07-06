export async function loadBranding() {
  try {
    const response = await fetch("/api/v1/settings/public/branding");
    const data = await response.json();
    return data;
  } catch {
    return {
      app_name: "PacsFlow",
      app_subtitle: "Appointments",
      login_title: "ჩაწერის მართვის სისტემა",
      login_subtitle: "მართეთ ჩაწერები, განრიგები და კლიენტები.",
      primary_color: "#1D9E75",
      sidebar_color: "#1a1a2e",
      login_bg_color: "#1a1a2e",
      clinic_name: "Innova Medical",
    };
  }
}