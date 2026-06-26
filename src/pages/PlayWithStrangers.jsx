// PlayWithStrangers.jsx
// Lists all public rooms currently in "waiting" status so anyone can hop in
// without needing a room code. Host opts in via the "List publicly" checkbox
// on Create Room.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerId, setPlayerSession } from "../playerIdentity";

export default function PlayWithStrangers() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "rooms"),
      where("isPublic", "==", true),
      where("status", "==", "waiting")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRooms(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function joinRoom(room) {
    const name = nickname.trim();
    setError("");

    if (!name) {
      setError("Enter a nickname first.");
      return;
    }
    if (joiningId) return;
    setJoiningId(room.id);

    try {
      const players = room.players || [];
      const playerId = getPlayerId();
      const alreadyIn = players.some((p) => p.playerId === playerId);

      if (!alreadyIn) {
        if (players.some((p) => p.nickname.toLowerCase() === name.toLowerCase())) {
          setError("Someone in that room already has that nickname. Try another.");
          setJoiningId(null);
          return;
        }
        await updateDoc(doc(db, "rooms", room.id), {
          players: arrayUnion({ playerId, nickname: name, isHost: false }),
        });
      }

      setPlayerSession({
        nickname: name,
        isHost: false,
        roomCode: room.roomCode,
        roomId: room.id,
      });

      navigate(`/lobby/${room.id}`);
    } catch (err) {
      setError(err.message);
      console.error(err);
      setJoiningId(null);
    }
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={s.inner}>
        <div style={s.heading}>
          <div style={s.globeWrap}>
            <span style={s.globeEmoji}>🌐</span>
          </div>
          <h1 style={s.title}>
            Play with <span style={s.titleAccent}>Strangers</span>
          </h1>
          <p style={s.sub}>Jump into any open public room — no code needed.</p>
        </div>

        <div style={s.nickCard}>
          <label style={s.label} htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            style={{
              ...s.input,
              border: focused
                ? "1px solid #a855f7"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: focused
                ? "0 0 20px rgba(168,85,247,0.25)"
                : "none",
            }}
            placeholder="How should we call you?"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (error) setError("");
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={20}
          />
          {error && (
            <div style={s.errorBox}>
              <span style={s.errorDot} />
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={s.loadingText}>Loading public rooms…</p>
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <div style={s.emptyState}>
            <span style={s.emptyEmoji}>🕳️</span>
            <p style={s.emptyTitle}>No public rooms open right now</p>
            <p style={s.emptyDesc}>
              Create one and switch on "List publicly" to be the first.
            </p>
            <button style={s.createBtn} onClick={() => navigate("/create-room")}>
              Create a Room
            </button>
          </div>
        )}

        {!loading && rooms.length > 0 && (
          <div style={s.roomList}>
            {rooms.map((room, i) => {
              const count = (room.players || []).length;
              const isJoining = joiningId === room.id;
              const disabled = !!joiningId;

              return (
                <div
                  key={room.id}
                  style={{
                    ...s.roomCard,
                    animationDelay: `${i * 60}ms`,
                    opacity: joiningId && !isJoining ? 0.4 : 1,
                  }}
                >
                  <div style={s.avatar}>
                    {room.hostNickname?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div style={s.roomInfo}>
                    <span style={s.roomName}>{room.hostNickname}'s room</span>
                    <span style={s.roomMeta}>
                      <span style={s.liveDot} />
                      {count} player{count === 1 ? "" : "s"} waiting
                    </span>
                  </div>
                  <button
                    style={{
                      ...s.joinBtn,
                      opacity: disabled && !isJoining ? 0.5 : 1,
                      cursor: disabled ? "default" : "pointer",
                    }}
                    onClick={() => joinRoom(room)}
                    disabled={disabled}
                  >
                    {isJoining ? "Joining…" : "Join"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button style={s.backBtn} onClick={() => navigate("/")}>
          ← Back home
        </button>
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
    justifyContent: "center",
  },
  inner: { width: "100%", maxWidth: "480px" },
  heading: { textAlign: "center", marginBottom: "24px", animation: "fadeUp 0.4s ease both" },
  globeWrap: {
    width: "64px",
    height: "64px",
    borderRadius: "18px",
    background: "rgba(99,102,241,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    boxShadow: "0 0 24px rgba(99,102,241,0.25)",
  },
  globeEmoji: { fontSize: "30px" },
  title: {
    color: "#fff",
    fontSize: "clamp(24px, 5vw, 32px)",
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
  nickCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "20px 22px",
    marginBottom: "24px",
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
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 0",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #a855f7",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "rgba(255,255,255,0.45)", marginTop: "14px", fontSize: "14px" },
  emptyState: {
    textAlign: "center",
    background: "rgba(255,255,255,0.04)",
    border: "1px dashed rgba(255,255,255,0.12)",
    borderRadius: "20px",
    padding: "36px 24px",
    animation: "fadeUp 0.4s ease 0.15s both",
  },
  emptyEmoji: { fontSize: "32px", display: "block", marginBottom: "10px" },
  emptyTitle: { color: "#fff", fontWeight: "700", fontSize: "16px", margin: "0 0 6px" },
  emptyDesc: { color: "rgba(255,255,255,0.45)", fontSize: "13px", margin: "0 0 20px" },
  createBtn: {
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    border: "none",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "700",
    padding: "12px 24px",
    cursor: "pointer",
  },
  roomList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  roomCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "14px 16px",
    animation: "fadeUp 0.4s ease both",
    transition: "opacity 0.2s ease",
  },
  avatar: {
    flexShrink: 0,
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: "16px",
  },
  roomInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },
  roomName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  roomMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "rgba(255,255,255,0.4)",
    fontSize: "12px",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#34d399",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  joinBtn: {
    flexShrink: 0,
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    border: "none",
    borderRadius: "999px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    padding: "10px 20px",
  },
  backBtn: {
    marginTop: "24px",
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