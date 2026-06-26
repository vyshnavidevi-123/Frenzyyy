import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerId, setPlayerSession } from "../playerIdentity";

function JoinRoom() {
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(null);
  const navigate = useNavigate();

  async function handleJoin() {
    const name = nickname.trim();
    const roomCode = code.trim().toUpperCase();

    setError("");

    if (!name) {
      setError("Please enter a nickname.");
      return;
    }
    if (!roomCode) {
      setError("Please enter a room code.");
      return;
    }
    if (joining) return;
    setJoining(true);

    try {
      const roomsRef = collection(db, "rooms");
      const q = query(roomsRef, where("roomCode", "==", roomCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("No room found with that code. Double-check and try again.");
        setJoining(false);
        return;
      }

      const roomDoc = snap.docs[0];
      const roomData = roomDoc.data();
      const players = roomData.players || [];
      const playerId = getPlayerId();

      const alreadyIn = players.some((p) => p.playerId === playerId);

      if (!alreadyIn) {
        if (players.some((p) => p.nickname.toLowerCase() === name.toLowerCase())) {
          setError("That nickname is already taken in this room. Pick another.");
          setJoining(false);
          return;
        }
        if (roomData.status !== "waiting") {
          setError("This room has already started — you can't join mid-game.");
          setJoining(false);
          return;
        }
        await updateDoc(doc(db, "rooms", roomDoc.id), {
          players: arrayUnion({ playerId, nickname: name, isHost: false }),
        });
      }

      setPlayerSession({
        nickname: name,
        isHost: false,
        roomCode,
        roomId: roomDoc.id,
      });

      navigate(`/lobby/${roomDoc.id}`);
    } catch (err) {
      setError(err.message);
      console.error(err);
      setJoining(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleJoin();
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-6px); }
          75%      { transform: translateX(6px); }
        }
      `}</style>

      <div style={s.inner}>
        <div style={s.heading}>
          <div style={s.doorWrap}>
            <span style={s.doorEmoji}>🚪</span>
          </div>
          <h1 style={s.title}>
            Join a <span style={s.titleAccent}>Room</span>
          </h1>
          <p style={s.sub}>Got a code? Drop into a friend's session.</p>
        </div>

        <div style={s.card}>
          <label style={s.label} htmlFor="nickname">
            Nickname
          </label>
          <input
            id="nickname"
            style={{
              ...s.input,
              border: focused === "nickname"
                ? "1px solid #a855f7"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: focused === "nickname"
                ? "0 0 20px rgba(168,85,247,0.25)"
                : "none",
            }}
            placeholder="How should we call you?"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onFocus={() => setFocused("nickname")}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            maxLength={20}
          />

          <label style={{ ...s.label, marginTop: "18px" }} htmlFor="code">
            Room code
          </label>
          <input
            id="code"
            style={{
              ...s.input,
              ...s.codeInput,
              border: focused === "code"
                ? "1px solid #6366f1"
                : "1px solid rgba(255,255,255,0.08)",
              boxShadow: focused === "code"
                ? "0 0 20px rgba(99,102,241,0.25)"
                : "none",
            }}
            placeholder="• • • • • •"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onFocus={() => setFocused("code")}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            maxLength={6}
          />

          {error && (
            <div style={s.errorBox}>
              <span style={s.errorDot} />
              {error}
            </div>
          )}

          <button
            style={{
              ...s.joinBtn,
              opacity: joining ? 0.7 : 1,
              cursor: joining ? "default" : "pointer",
            }}
            onClick={handleJoin}
            disabled={joining}
          >
            {joining ? "Joining…" : "Join Room"}
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
  doorWrap: {
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
  doorEmoji: { fontSize: "30px" },
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
  codeInput: {
    letterSpacing: "4px",
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  errorBox: {
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#f87171",
    fontSize: "13px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: "10px",
    padding: "10px 14px",
    animation: "shake 0.3s ease",
  },
  errorDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#f87171",
    flexShrink: 0,
  },
  joinBtn: {
    marginTop: "22px",
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

export default JoinRoom;