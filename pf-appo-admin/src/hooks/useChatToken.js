import { useState, useEffect } from "react";
import api from "../api";

/**
 * PacsFlow Chat-ის მოკლევადიანი (5წთ) JWT bridge-ტოკენის მართვა.
 * ტოკენს გასცემს pacsflow-appointments-ის /chat-token endpoint (იხ.
 * app/api/v1/endpoints/chat_bridge.py) — ChatWidget-ს/FloatingChat-ს
 * პირდაპირ ჩვენი auth-ის შესახებ არაფერი სჭირდება ცოდნა.
 *
 * @param {boolean} enabled - false-ზე hook არაფერს აკეთებს (მაგ. სანამ
 *   მომხმარებელი ავტორიზებული არაა)
 */
export default function useChatToken(enabled) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setToken(null);
      return undefined;
    }

    let cancelled = false;

    const fetchToken = async () => {
      try {
        const { data } = await api.get("/chat-token");
        if (!cancelled) setToken(data.token);
      } catch (e) {
        console.error("chat-token fetch failed", e);
      }
    };

    fetchToken();
    const interval = setInterval(fetchToken, 4 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  return token;
}
