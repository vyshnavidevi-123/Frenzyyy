// GuessChat.jsx
// Non-drawers type guesses. Correct guess = points awarded, round ends.

import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";

export default function GuessChat({ roomId, isDrawer, currentWord, nickname, onCorrectGuess }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  // Listen to chat messages in Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      const data = snap.data();
      setMessages(data?.chatMessages || []);
    });
    return () => unsub();
  }, [roomId]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendGuess() {
    const text = input.trim();
    if (!text || isDrawer) return;
    setInput("");

    const isCorrect =
      currentWord &&
      text.toLowerCase().replace(/\s+/g, "") ===
        currentWord.toLowerCase().replace(/\s+/g, "");

    const msg = {
      nickname,
      text: isCorrect ? "✅ " + text : text,
      correct: isCorrect,
      ts: Date.now(),
    };

    await updateDoc(doc(db, "rooms", roomId), {
      chatMessages: arrayUnion(msg),
    });

    if (isCorrect) {
      onCorrectGuess(nickname);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>💬 Guesses</div>

      <div style={s.feed}>
        {messages.length === 0 && (
          <p style={s.empty}>Type your guess below…</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              ...s.msg,
              ...(m.correct ? s.msgCorrect : {}),
              ...(m.nickname === nickname ? s.msgSelf : {}),
            }}
          >
            <span style={s.name}>{m.nickname}</span>
            <span style={s.text}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input — hidden for drawer */}
      {!isDrawer && (
        <div style={s.inputRow}>
          <input
            style={s.input}
            placeholder="Type your guess…"
            value={input}
            maxLength={60}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendGuess()}
          />
          <button style={s.sendBtn} onClick={sendGuess}>→</button>
        </div>
      )}

      {isDrawer && (
        <div style={s.drawerNote}>You're drawing — no peeking at answers 👀</div>
      )}
    </div>
  );
}

const s = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    overflow: "hidden",
    height: "100%",
    minHeight: "300px",
  },
  header: {
    padding: "12px 16px",
    fontWeight: "700",
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  feed: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  empty: {
    color: "rgba(255,255,255,0.2)",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "20px",
  },
  msg: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    padding: "6px 10px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.04)",
  },
  msgCorrect: {
    background: "rgba(74,222,128,0.15)",
    border: "1px solid rgba(74,222,128,0.3)",
  },
  msgSelf: {
    background: "rgba(168,85,247,0.12)",
  },
  name: {
    color: "#a78bfa",
    fontWeight: "700",
    fontSize: "12px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  text: {
    color: "rgba(255,255,255,0.8)",
    fontSize: "13px",
    wordBreak: "break-word",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "10px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    color: "#fff",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
  },
  sendBtn: {
    padding: "10px 16px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    border: "none",
    color: "#fff",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
  },
  drawerNote: {
    padding: "12px",
    textAlign: "center",
    color: "rgba(255,255,255,0.25)",
    fontSize: "12px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
};
