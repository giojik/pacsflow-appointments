import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import useChatToken from "../hooks/useChatToken";
import ChatWidget from "./ChatWidget";
import api from "../api";

const CHAT_BASE_URL = "https://chat-api.pacsflow.ge/api/v1";
const CHAT_WS_URL = "wss://chat-api.pacsflow.ge/api/v1/ws";

/**
 * Floating chat bubble — Layout.jsx-ში ერთხელაა ჩამატებული, ამიტომ ყველა
 * admin გვერდზე ჩანს. registrar/provider-ს აღარ სჭირდება /app/chat-ზე
 * გადასვლა უბრალო შეტყობინების სანახავად/დასაწერად — popup პირდაპირ
 * მიმდინარე გვერდზე იხსნება. სრული გვერდი (pages/Chat.jsx) პარალელურად
 * კვლავ არსებობს.
 *
 * @param {string} primaryColor - tenant-ის branding ფერი (Layout.jsx-დან)
 * @param {boolean} hidden - true, როცა უკვე /app/chat გვერდზე ვართ
 *   (რომ ორმაგი UI არ დაგროვდეს)
 */
export default function FloatingChat({ primaryColor = "#2563eb", hidden = false }) {
  const { user, token } = useAuth();
  const chatToken = useChatToken(!!token);
  const [open, setOpen] = useState(false);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const openRef = useRef(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Browser notification-ის უფლების მოთხოვნა (ერთხელ) — NotificationBell-ის
  // იგივე პატერნით
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // მოკლე "ding" ხმა Web Audio API-ით — ცალკე audio ფაილი არ სჭირდება,
  // ამიტომ დეპლოი/hosting-ის საკითხი არ ჩნდება
  const playDing = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // noop — ხმის დაკვრის შეცდომამ ჩატი არ უნდა შეაფერხოს
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    api
      .get("/auth/users")
      .then(({ data }) => {
        setDirectoryUsers(
          data.map((u) => ({ id: u.id, name: u.full_name || u.username, role: u.role }))
        );
      })
      .catch((e) => console.error("directory fetch failed", e));
  }, [token]);

  // ჯამური წაუკითხავი მესიჯების რაოდენობა — badge-ისთვის, პანელის
  // დახურული მდგომარეობაშიც. chat service-ის დროებითი მიუწვდომლობა
  // admin panel-ს არ უნდა აზარალებდეს, ამიტომ ჩუმად ვჩავარდებით.
  const pollUnread = useCallback(async () => {
    if (!chatToken) return;
    try {
      const res = await fetch(CHAT_BASE_URL + "/conversations", {
        headers: { Authorization: "Bearer " + chatToken },
      });
      if (!res.ok) return;
      const data = await res.json();
      const total = data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadTotal(total);
    } catch (e) {
      // noop
    }
  }, [chatToken]);

  useEffect(() => {
    pollUnread();
    const interval = setInterval(pollUnread, 20000);
    return () => clearInterval(interval);
  }, [pollUnread]);

  // მუდმივი (popup-ის დახურვის დროსაც ცოცხალი) WebSocket კავშირი — მხოლოდ
  // ხმის/notification-ის და unread badge-ის დაუყოვნებელი განახლებისთვის.
  // ChatWidget-ს თავისი, ცალკე WS კავშირი აქვს, რომელიც მხოლოდ popup
  // ღიაობისას ეშვება (სრული საუბრის სიის/მესიჯების რეალურ დროში
  // განახლებისთვის) — ორივე ერთდროულად არსებობა უსაფრთხოა.
  useEffect(() => {
    if (!chatToken) return undefined;
    const ws = new WebSocket(CHAT_WS_URL + "?token=" + encodeURIComponent(chatToken));

    ws.onmessage = (evt) => {
      let data;
      try {
        data = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      if (data.type === "message.new" && data.message?.sender_id !== user?.id) {
        playDing();
        pollUnread();
        const notifyAllowed =
          "Notification" in window &&
          Notification.permission === "granted" &&
          (!openRef.current || document.visibilityState !== "visible");
        if (notifyAllowed) {
          new Notification(data.message?.sender_name || "ახალი შეტყობინება", {
            body: data.message?.body || (data.message?.attachment_name ? "📎 " + data.message.attachment_name : "ახალი შეტყობინება"),
            icon: "/favicon.svg",
          });
        }
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [chatToken, user?.id, playDing, pollUnread]);

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!token || hidden) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="ჩატი"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 2000,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: primaryColor, color: "#fff", fontSize: 24,
          cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {open ? "✕" : "💬"}
        {!open && unreadTotal > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            background: "#e74c3c", color: "#fff", fontSize: 11,
            borderRadius: "50%", width: 20, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", border: "2px solid #fff",
          }}>{unreadTotal > 9 ? "9+" : unreadTotal}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "fixed", bottom: 92, right: 24, zIndex: 2000,
            width: 380, maxWidth: "calc(100vw - 32px)",
            height: 560, maxHeight: "calc(100vh - 140px)",
            background: "#fff", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", background: primaryColor, color: "#fff",
            fontSize: 14, fontWeight: 600, flexShrink: 0,
          }}>
            <span>ჩატი</span>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >✕</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {chatToken ? (
              <ChatWidget
                chatBaseUrl={CHAT_BASE_URL}
                chatWsUrl={CHAT_WS_URL}
                token={chatToken}
                currentUserId={user?.id}
                directoryUsers={directoryUsers}
                compact
              />
            ) : (
              <div style={{ padding: 24, color: "#999" }}>ჩატი იტვირთება...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
