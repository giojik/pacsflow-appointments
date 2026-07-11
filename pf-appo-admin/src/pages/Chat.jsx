import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import useChatToken from "../hooks/useChatToken";
import ChatWidget from "../components/ChatWidget";
import api from "../api";

const CHAT_BASE_URL = "https://chat-api.pacsflow.ge/api/v1";
const CHAT_WS_URL = "wss://chat-api.pacsflow.ge/api/v1/ws";

export default function Chat() {
  const { user, token } = useAuth();
  const chatToken = useChatToken(!!token);
  const [directoryUsers, setDirectoryUsers] = useState([]);

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

  if (!chatToken) {
    return <div style={{ padding: 24, color: "#999" }}>ჩატი იტვირთება...</div>;
  }

  return (
    <div style={{ padding: 16, height: "calc(100vh - 32px)" }}>
      <ChatWidget
        chatBaseUrl={CHAT_BASE_URL}
        chatWsUrl={CHAT_WS_URL}
        token={chatToken}
        currentUserId={user?.id}
        directoryUsers={directoryUsers}
      />
    </div>
  );
}
