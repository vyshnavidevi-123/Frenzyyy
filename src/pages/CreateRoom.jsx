// CreateRoom.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerId, setPlayerSession } from "../playerIdentity";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomChar() {
  return CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
}

function CreateRoom() {
  const [nickname, setNickname] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  async function generateRoom() {
    const name = nickname.trim();
    if (!name) {
      setErrorMsg("Enter a nickname first.");
      return;
    }
    if (creating) return;
    setErrorMsg("");
    setCreating(true);

    const code = Array.from({ length: 6 }, randomChar).join("");

    try {
      const playerId = getPlayerId();

      const docRef = await addDoc(collection(db, "rooms"), {
  roomCode: code,
  hostNickname: name,
  hostPlayerId: playerId,

  players: [
    {
      playerId,
      nickname: name,
      isHost: true,
      online: true,
      joinedAt: Date.now(),
    },
  ],

  status: "waiting",

  selectedGame: null,

  isPublic,

  createdAt: Date.now(),

  lastActivity: Date.now(),
});

      setPlayerSession({
        nickname: name,
        isHost: true,
        roomCode: code,
        roomId: docRef.id,
      });

      navigate(`/lobby/${docRef.id}`);
    } catch (error) {
      setErrorMsg(error.message || "Couldn't create the room. Try again.");
      console.error(error);
      setCreating(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") generateRoom();
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={s.inner}>
        <div style={s.heading}>
          <div style={s.iconWrap}>
            <span style={s.iconGlyph}>✦</span>
          </div>
          <h1 style={s.title}>
            Create a <span style={s.titleAccent}>Room</span>
          </h1>
          <p style={s.sub}>Start a new adventure and invite people in.</p>
        </div>

        <div style={s.card}>
          <label style={s.label} htmlFor="cr-nickname">
            Your nickname
          </label>
          <input
            id="cr-nickname"
            style={{
              ...s.input,
              border: focused
                ? "1px solid #a855f7"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: focused
                ? "0 0 20px rgba(168,85,247,0.25)"
                : "none",
            }}
            placeholder="e.g. Vyshu"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            maxLength={20}
          />

          {errorMsg && (
            <div style={s.errorBox}>
              <span style={s.errorDot} />
              {errorMsg}
            </div>
          )}

          <div
            style={{
              ...s.toggleRow,
              ...(isPublic ? s.toggleRowOn : {}),
            }}
            role="checkbox"
            aria-checked={isPublic}
            tabIndex={0}
            onClick={() => setIsPublic((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setIsPublic((v) => !v);
              }
            }}
          >
            <span style={{ ...s.switch, ...(isPublic ? s.switchOn : {}) }}>
              <span
                style={{
                  ...s.switchKnob,
                  transform: isPublic ? "translateX(16px)" : "translateX(0)",
                }}
              />
            </span>
            <span style={s.toggleText}>
              <strong style={s.toggleStrong}>List this room publicly</strong>
              Anyone can find and join — no code needed.
            </span>
          </div>

          <button
            style={{
              ...s.button,
              opacity: creating ? 0.7 : 1,
              cursor: creating ? "default" : "pointer",
            }}
            onClick={generateRoom}
            disabled={creating}
          >
            {creating ? "Creating room…" : "Generate Room"}
          </button>

          <button style={s.backBtn} onClick={() => navigate("/")}>
            ← Back home
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0d0d1a 0%, #1a0f2e 50%, #0d1a2e 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "24px 16px 48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { width: "100%", maxWidth: "420px" },
  heading: { textAlign: "center", marginBottom: "28px", animation: "fadeUp 0.4s ease both" },
  iconWrap: {
    width: "64px",
    height: "64px",
    borderRadius: "18px",
    background: "rgba(168,85,247,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    boxShadow: "0 0 24px rgba(168,85,247,0.25)",
  },
  iconGlyph: { fontSize: "26px", color: "#c084fc" },
  title: {
    color: "#fff",
    fontSize: "clamp(26px, 5vw, 34px)",
    fontWeight: "800",
    margin: "0 0 10px",
    lineHeight: 1.2,
  },
  titleAccent: {
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "15px",
    margin: 0,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "26px 22px",
    display: "flex",
    flexDirection: "column",
    animation: "fadeUp 0.4s ease 0.1s both",
  },
  label: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "15px",
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  errorBox: {
    marginTop: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#f87171",
    fontSize: "13px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "10px",
    padding: "10px 14px",
  },
  errorDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#f87171",
    flexShrink: 0,
  },
  toggleRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    margin: "20px 0 24px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
  },
  toggleRowOn: {
    borderColor: "rgba(99,102,241,0.5)",
    background: "rgba(99,102,241,0.1)",
  },
  switch: {
    position: "relative",
    flexShrink: 0,
    width: "38px",
    height: "22px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.14)",
    marginTop: "1px",
    transition: "background 0.2s ease",
  },
  switchOn: {
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
  },
  switchKnob: {
    position: "absolute",
    top: "2px",
    left: "2px",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#fff",
    transition: "transform 0.2s ease",
  },
  toggleText: {
    fontSize: "13.5px",
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.45)",
  },
  toggleStrong: {
    color: "#fff",
    fontWeight: 600,
    display: "block",
    marginBottom: "2px",
  },
  button: {
    width: "100%",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    border: "none",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    padding: "14px",
  },
  backBtn: {
    marginTop: "14px",
    width: "100%",
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.35)",
    fontSize: "13px",
    fontWeight: "600",
    padding: "8px",
    cursor: "pointer",
  },
};

export default CreateRoom;