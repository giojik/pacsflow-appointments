import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // production-ში console-ში მაინც დარჩეს ჩანაწერი დებაგისთვის
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        padding: 24, textAlign: "center", fontFamily: "inherit",
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ margin: 0, fontSize: 20 }}>რაღაც შეცდომა მოხდა</h2>
        <p style={{ margin: 0, color: "#666", maxWidth: 420 }}>
          გვერდის ჩატვირთვისას მოულოდნელი შეცდომა დაფიქსირდა. სცადეთ გვერდის განახლება,
          ხოლო თუ პრობლემა გაგრძელდა — მიმართეთ ადმინისტრატორს.
        </p>
        <button
          onClick={this.handleReload}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: "#2563eb", color: "#fff", fontSize: 14,
            fontWeight: "bold", cursor: "pointer",
          }}
        >
          გვერდის განახლება
        </button>
      </div>
    );
  }
}
