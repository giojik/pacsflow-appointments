/**
 * PacsFlow Chat — embeddable widget.
 *
 * გამოსაყენებელია ორივე პროდუქტში (Appointments, Core PacsFlow) იდენტურად —
 * იღებს მხოლოდ base URL-ს და მოკლევადიან chat token-ს (იხ. README.md
 * "ინტეგრაცია — JWT bridge ტოკენი"). არ არის დამოკიდებული არც ერთი
 * პროდუქტის auth/store-ზე პირდაპირ — ტოკენს/refresh-ს parent კომპონენტი
 * აწვდის, რომ ერთი და იგივე widget ორივეგან იმუშაოს ცვლილებების გარეშე.
 *
 * "თანამშრომლების" სია (directoryUsers) ასევე parent-ისგან მოდის — ვინაიდან
 * user directory თითოეულ პროდუქტში სხვადასხვა endpoint-ზეა (Appointments-ში
 * GET /api/v1/auth/users, Core-ში სავარაუდოდ სხვა) — widget-მა არაფერი არ
 * უნდა იცოდეს ამის შესახებ, მხოლოდ მზა სია მიიღოს.
 *
 * სტილი: inline styles, Tailwind-ის გარეშე — შესაბამისობაშია
 * pf-appo-admin/src-ის არსებულ კონვენციასთან.
 *
 * Props:
 *   chatBaseUrl      e.g. "https://chat-api.pacsflow.ge/api/v1"
 *   chatWsUrl        e.g. "wss://chat-api.pacsflow.ge/api/v1/ws"
 *   token             მოკლევადიანი chat JWT (განახლდება parent-ის მიერ, exp-ის მიხედვით)
 *   currentUserId     string
 *   directoryUsers    [{ id, name, role }]  — tenant-ის კოლეგების სია (არასავალდებულო)
 *   compact           boolean — true მაშინ, როცა widget ვიწრო კონტეინერშია
 *                      (მაგ. floating popup ~380px). ამ რეჟიმში sidebar და
 *                      chat ერთდროულად აღარ ჩანს (280px sidebar + chat
 *                      ვიწრო container-ში იჭყლიტება/იმალება) — ამის ნაცვლად
 *                      ერთდროულად მხოლოდ ერთი ჩანს, "← უკან" ღილაკით
 *                      გადართვისთვის. სრულ გვერდზე (compact=false, default)
 *                      ორივე გვერდიგვერდ ჩანს, როგორც აქამდე.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😉", "😍", "🥰", "😘", "😎",
  "🤔", "😐", "😴", "😢", "😭", "😡", "😱", "🥳", "😇", "🙃",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "👌", "✌️", "🤞", "👋",
  "❤️", "💔", "🔥", "⭐", "🎉", "✅", "❌", "⏰", "📌", "💬",
];

const styles = {
  wrapper: { display: "flex", height: "100%", minHeight: 480, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden", fontFamily: "inherit" },
  sidebar: { width: 280, borderRight: "1px solid #e2e2e2", overflowY: "auto", background: "#fafafa", display: "flex", flexDirection: "column" },
  tabs: { display: "flex", borderBottom: "1px solid #e2e2e2" },
  tab: (active) => ({
    flex: 1, textAlign: "center", padding: "10px 0", fontSize: 13, cursor: "pointer",
    color: active ? "#2563eb" : "#777",
    borderBottom: active ? "2px solid #2563eb" : "2px solid transparent",
    fontWeight: active ? 600 : 400,
  }),
  sidebarList: { flex: 1, overflowY: "auto" },
  sidebarItem: (active) => ({
    padding: "12px 14px",
    cursor: "pointer",
    background: active ? "#eef3ff" : "transparent",
    borderBottom: "1px solid #eee",
  }),
  title: { fontWeight: 600, fontSize: 14, marginBottom: 2 },
  preview: { fontSize: 12, color: "#777", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  roleTag: { fontSize: 11, color: "#999" },
  unreadBadge: { display: "inline-block", background: "#2563eb", color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 7px", marginLeft: 6 },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  messages: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  bubbleRow: (mine) => ({ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }),
  bubble: (mine) => ({
    maxWidth: "70%",
    padding: "8px 12px",
    borderRadius: 12,
    background: mine ? "#2563eb" : "#f0f0f0",
    color: mine ? "#fff" : "#111",
    fontSize: 14,
    lineHeight: 1.4,
  }),
  meta: { fontSize: 10, color: "#999", marginTop: 2 },
  typing: { fontSize: 12, color: "#999", padding: "0 16px 8px" },
  inputRow: { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e2e2e2", position: "relative" },
  input: { flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14 },
  sendBtn: { padding: "8px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 14 },
  attachBtn: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16 },
  empty: { padding: 24, color: "#999", fontSize: 14, textAlign: "center" },
  attachmentImage: { maxWidth: 220, maxHeight: 220, borderRadius: 8, display: "block", marginTop: 4 },
  attachmentFile: { display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 13, textDecoration: "none", color: "inherit" },
  emojiBtn: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 16 },
  emojiPopover: {
    position: "absolute", bottom: 54, right: 10, background: "#fff", border: "1px solid #e2e2e2",
    borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: 8, display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)", gap: 4, zIndex: 10,
  },
  emojiOption: { fontSize: 18, cursor: "pointer", padding: 4, borderRadius: 4, textAlign: "center", lineHeight: 1 },
  backRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e2e2e2", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#2563eb" },
};

async function apiFetch(baseUrl, token, path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Chat API error ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

async function uploadFile(baseUrl, token, file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`ატვირთვის შეცდომა ${res.status}`);
  return res.json();
}

function withToken(baseUrl, token, url) {
  return `${baseUrl}${url}?token=${encodeURIComponent(token)}`;
}

export default function ChatWidget({ chatBaseUrl, chatWsUrl, token, currentUserId, directoryUsers = [], compact = false }) {
  const [tab, setTab] = useState("conversations"); // "conversations" | "directory"
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat" — მხოლოდ compact-ში გამოიყენება
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const loadConversationsRef = useRef(() => {});
  const loadMessagesRef = useRef(() => {});
  const activeIdRef = useRef(null);
  const emojiPopoverRef = useRef(null);
  const emojiBtnRef = useRef(null);

  // popover-ის გარეთ დაწკაპებისას დაიხუროს
  useEffect(() => {
    if (!emojiOpen) return undefined;
    const onClickOutside = (e) => {
      if (
        emojiPopoverRef.current && !emojiPopoverRef.current.contains(e.target) &&
        emojiBtnRef.current && !emojiBtnRef.current.contains(e.target)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [emojiOpen]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch(chatBaseUrl, token, "/conversations");
    setConversations(data);
    if (!activeId && data.length) setActiveId(data[0].id);
  }, [chatBaseUrl, token, activeId]);

  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!token || !conversationId) return;
      const data = await apiFetch(chatBaseUrl, token, `/conversations/${conversationId}/messages`);
      setMessages(data);
      await apiFetch(chatBaseUrl, token, `/conversations/${conversationId}/read`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    [chatBaseUrl, token]
  );

  useEffect(() => {
    loadMessagesRef.current = loadMessages;
  }, [loadMessages]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  // WebSocket — real-time push + typing indicator
  useEffect(() => {
    if (!token || !chatWsUrl) return undefined;
    const ws = new WebSocket(`${chatWsUrl}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "message.new") {
        // push-ით ჩამატების ნაცვლად აქტიური საუბრის მესიჯებს სერვერიდან
        // ხელახლა ვტვირთავთ — უფრო სანდოა, ვიდრე setMessages((prev) => [...prev, ...])
        // ref-ის საშუალებით, რომ ყოველთვის ყველაზე ახალი activeId-ით გავიხადოთ
        if (data.conversation_id === activeIdRef.current) {
          loadMessagesRef.current(activeIdRef.current);
        }
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === data.conversation_id);
          if (!exists) {
            // ეს საუბარი ჯერ არ გვქონდა ჩატვირთული (მაგ. ვიღაცამ ახლახან
            // დაგვიწყო ახალი direct chat) — მთელი სია თავიდან ჩავტვირთოთ,
            // რომ განახლების გარეშეც გამოჩნდეს
            loadConversationsRef.current();
            return prev;
          }
          return prev.map((c) =>
            c.id === data.conversation_id
              ? { ...c, last_message: data.message, unread_count: c.id === activeId ? 0 : (c.unread_count || 0) + 1 }
              : c
          );
        });
      } else if (data.type === "typing" && data.conversation_id === activeId) {
        setTypingUser(data.user_name || "მოსაუბრე");
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    };

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, chatWsUrl, activeId]);

  const sendTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && activeId) {
      wsRef.current.send(JSON.stringify({ type: "typing", conversation_id: activeId }));
    }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft("");
    const msg = await apiFetch(chatBaseUrl, token, `/conversations/${activeId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setMessages((prev) => [...prev, msg]);
  };

  const fileInputRef = useRef(null);

  const insertEmoji = (emoji) => {
    setDraft((prev) => prev + emoji);
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // იმავე ფაილის ხელახლა არჩევაც იმუშაოს
    if (!file || !activeId) return;
    try {
      const uploaded = await uploadFile(chatBaseUrl, token, file);
      const msg = await apiFetch(chatBaseUrl, token, `/conversations/${activeId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          attachment_url: uploaded.url,
          attachment_name: uploaded.name,
          attachment_mime: uploaded.mime,
        }),
      });
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      alert(err.message || "ატვირთვა ვერ მოხერხდა");
    }
  };

  // "თანამშრომლებზე" დაწკაპებით — direct საუბრის შექმნა/გახსნა.
  // ბექენდი (pacsflow-chat) თავად უზრუნველყოფს, რომ ერთსა და იმავე
  // ორ user-ს შორის ერთზე მეტი direct საუბარი არ შეიქმნას.
  const startConversation = async (u) => {
    const convo = await apiFetch(chatBaseUrl, token, "/conversations", {
      method: "POST",
      body: JSON.stringify({
        type: "direct",
        participants: [{ user_id: u.id, user_name: u.name, user_role: u.role }],
      }),
    });
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convo.id);
      return exists ? prev.map((c) => (c.id === convo.id ? convo : c)) : [convo, ...prev];
    });
    setActiveId(convo.id);
    setTab("conversations");
    if (compact) setMobileView("chat");
  };

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const showSidebar = !compact || mobileView === "list";
  const showMain = !compact || mobileView === "chat";

  return (
    <div style={styles.wrapper}>
      {showSidebar && (
      <div style={compact ? { ...styles.sidebar, width: "100%", borderRight: "none" } : styles.sidebar}>
        <div style={styles.tabs}>
          <div style={styles.tab(tab === "conversations")} onClick={() => setTab("conversations")}>საუბრები</div>
          <div style={styles.tab(tab === "directory")} onClick={() => setTab("directory")}>თანამშრომლები</div>
        </div>

        <div style={styles.sidebarList}>
          {tab === "conversations" && (
            <>
              {conversations.length === 0 && <div style={styles.empty}>საუბრები არ არის</div>}
              {conversations.map((c) => (
                <div
                  key={c.id}
                  style={styles.sidebarItem(c.id === activeId)}
                  onClick={() => {
                    setActiveId(c.id);
                    if (compact) setMobileView("chat");
                  }}
                >
                  <div style={styles.title}>
                    {c.title || c.participants?.find((p) => p.user_id !== currentUserId)?.user_name || "საუბარი"}
                    {c.unread_count > 0 && <span style={styles.unreadBadge}>{c.unread_count}</span>}
                  </div>
                  <div style={styles.preview}>{c.last_message?.body || "..."}</div>
                </div>
              ))}
            </>
          )}

          {tab === "directory" && (
            <>
              {directoryUsers.length === 0 && <div style={styles.empty}>თანამშრომლები არ მოიძებნა</div>}
              {directoryUsers
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <div key={u.id} style={styles.sidebarItem(false)} onClick={() => startConversation(u)}>
                    <div style={styles.title}>{u.name}</div>
                    <div style={styles.roleTag}>{u.role}</div>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
      )}

      {showMain && (
      <div style={styles.main}>
        {compact && (
          <div style={styles.backRow} onClick={() => setMobileView("list")}>
            ← საუბრები
          </div>
        )}
        <div style={styles.messages}>
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} style={styles.bubbleRow(mine)}>
                <div>
                  {m.body && <div style={styles.bubble(mine)}>{m.body}</div>}
                  {m.attachment_url && m.attachment_mime?.startsWith("image/") && (
                    <a href={withToken(chatBaseUrl, token, m.attachment_url)} target="_blank" rel="noreferrer">
                      <img src={withToken(chatBaseUrl, token, m.attachment_url)} alt={m.attachment_name || "სურათი"} style={styles.attachmentImage} />
                    </a>
                  )}
                  {m.attachment_url && !m.attachment_mime?.startsWith("image/") && (
                    <a href={withToken(chatBaseUrl, token, m.attachment_url)} target="_blank" rel="noreferrer" style={styles.attachmentFile}>
                      📎 {m.attachment_name || "ფაილი"}
                    </a>
                  )}
                  <div style={{ ...styles.meta, textAlign: mine ? "right" : "left" }}>
                    {!mine && (m.sender_name || "")} {new Date(m.created_at).toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {typingUser && <div style={styles.typing}>{typingUser} წერს...</div>}
        <div style={styles.inputRow}>
          {emojiOpen && (
            <div ref={emojiPopoverRef} style={styles.emojiPopover}>
              {EMOJIS.map((em) => (
                <span key={em} style={styles.emojiOption} onClick={() => insertEmoji(em)}>
                  {em}
                </span>
              ))}
            </div>
          )}
          <button
            ref={emojiBtnRef}
            style={styles.emojiBtn}
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={!activeConversation}
            title="სმაილი"
            type="button"
          >
            😊
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFilePicked}
            accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          />
          <button
            style={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeConversation}
            title="ფაილის მიმაგრება"
          >
            📎
          </button>
          <input
            style={styles.input}
            placeholder="დაწერეთ შეტყობინება..."
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              sendTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={!activeConversation}
          />
          <button style={styles.sendBtn} onClick={sendMessage} disabled={!activeConversation}>
            გაგზავნა
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
