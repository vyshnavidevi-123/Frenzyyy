// GameSelect.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerSession } from "../playerIdentity";

const GAMES = [
  {
    id: "sketch-guess",
    name: "Sketch & Guess",
    desc: "Draw it. Guess it. Panic.",
    emoji: "🎨",
    players: "2–12",
    color: "#f97316",
    glow: "rgba(249,115,22,0.35)",
    tag: "Creative",
  },
  {
    id: "quick-trivia",
    name: "Quick Trivia",
    desc: "10 seconds. No Googling.",
    emoji: "🧠",
    players: "2–20",
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.35)",
    tag: "Brain",
  },
  {
    id: "truth-or-dare",
    name: "Truth or Dare",
    desc: "How brave are you, really?",
    emoji: "😈",
    players: "2–10",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.35)",
    tag: "Social",
  },
  {
    id: "bingo",
    name: "Bingo",
    desc: "Mark your card. Shout first.",
    emoji: "🎱",
    players: "2–30",
    color: "#06b6d4",
    glow: "rgba(6,182,212,0.35)",
    tag: "Luck",
  },
  {
    id: "would-you-rather",
    name: "Would You Rather",
    desc: "No right answers. Just chaos.",
    emoji: "🤔",
    players: "2–50",
    color: "#10b981",
    glow: "rgba(16,185,129,0.35)",
    tag: "Vote",
  },
  {
    id: "secret-imposter",
    name: "Secret Imposter",
    desc: "One of you doesn't know the word.",
    emoji: "🕵️",
    players: "4–10",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.35)",
    tag: "Deception",
  },
];

export default function GameSelect() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [selecting, setSelecting] = useState(null);
  const [hovered, setHovered] = useState(null);

  const { playerId, isHost, nickname } = getPlayerSession();

  useEffect(() => {
    if (!roomId) { navigate("/"); return; }

    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      const data = snap.data();
      setRoomData(data);

      if (data.gameStatus === "starting" && data.selectedGame) {
      navigate(`/game/${roomId}/${data.selectedGame}`);

}
    });

    return () => unsub();
  }, [roomId, navigate]);

  async function pickGame(gameId) {
    if (!isHost || selecting) return;
    setSelecting(gameId);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        selectedGame: gameId,
        gameStatus: "starting",
      });
    } catch (err) {
      console.error(err);
      setSelecting(null);
    }
  }

  const players = roomData?.players || [];

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
      `}</style>

      <div style={s.inner}>

        {/* Top bar */}
        <div style={s.topBar}>
          <div style={s.roomPill}>
            🎮 {roomData?.roomCode || "------"}
          </div>
          <div style={s.playerPills}>
            {players.slice(0, 5).map((p) => (
              <div key={p.playerId} style={{
                ...s.avatarPill,
                background: p.playerId === playerId
                  ? "linear-gradient(135deg,#a855f7,#6366f1)"
                  : "rgba(255,255,255,0.1)",
              }}>
                {p.nickname.charAt(0).toUpperCase()}
              </div>
            ))}
            {players.length > 5 && (
              <div style={s.avatarPill}>+{players.length - 5}</div>
            )}
          </div>
        </div>

        {/* Heading */}
        <div style={s.heading}>
          {isHost ? (
            <>
              <h1 style={s.title}>Pick a game, <span style={s.nameAccent}>{nickname}</span></h1>
              <p style={s.sub}>Everyone in the room will play what you choose.</p>
            </>
          ) : (
            <>
              <h1 style={s.title}>Waiting for host…</h1>
              <p style={s.sub}>
                <span style={s.waitDot} /> {roomData?.hostNickname || "The host"} is choosing a game.
              </p>
            </>
          )}
        </div>

        {/* Game grid */}
        <div style={s.grid}>
          {GAMES.map((game, i) => {
            const isSelecting = selecting === game.id;
            const isDisabled = !isHost || !!selecting;

            return (
              <div
                key={game.id}
                style={{
                  ...s.card,
                  animationDelay: `${i * 60}ms`,
                  cursor: isDisabled ? "default" : "pointer",
                  opacity: selecting && !isSelecting ? 0.4 : 1,
                  border: hovered === game.id
                    ? `1px solid ${game.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: hovered === game.id
                    ? `0 0 28px ${game.glow}`
                    : "none",
                  transform: hovered === game.id && !isDisabled
                    ? "translateY(-4px) scale(1.02)"
                    : "translateY(0) scale(1)",
                }}
                onClick={() => !isDisabled && pickGame(game.id)}
                onMouseEnter={() => !isDisabled && setHovered(game.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ ...s.tag, background: `${game.color}22`, color: game.color }}>
                  {game.tag}
                </div>

                <div style={{
                  ...s.emojiWrap,
                  background: `${game.color}18`,
                  boxShadow: hovered === game.id ? `0 0 20px ${game.glow}` : "none",
                }}>
                  <span style={s.emoji}>{game.emoji}</span>
                </div>

                <h2 style={s.gameName}>{game.name}</h2>
                <p style={s.gameDesc}>{game.desc}</p>

                <div style={s.cardFooter}>
                  <span style={s.playersBadge}>👥 {game.players} players</span>
                  {isSelecting && (
                    <span style={s.loadingDot}>Launching…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isHost && (
          <div style={s.guestBanner}>
            <div style={s.guestDot} />
            Hang tight — you'll jump in automatically when the host picks.
          </div>
        )}

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
  },
  inner: { maxWidth: "780px", margin: "0 auto" },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "36px",
  },
  roomPill: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "999px",
    color: "rgba(255,255,255,0.6)",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "2px",
  },
  playerPills: { display: "flex", gap: "6px" },
  avatarPill: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
  },
  heading: { textAlign: "center", marginBottom: "40px" },
  title: {
    color: "#fff",
    fontSize: "clamp(24px, 4vw, 36px)",
    fontWeight: "800",
    margin: "0 0 10px",
    lineHeight: 1.2,
  },
  nameAccent: {
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "15px",
    margin: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  waitDot: {
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#a855f7",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    borderRadius: "20px",
    padding: "22px 18px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease, opacity 0.2s ease",
    animation: "fadeUp 0.4s ease both",
    position: "relative",
  },
  tag: {
    alignSelf: "flex-start",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: "999px",
  },
  emojiWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "box-shadow 0.2s ease",
  },
  emoji: { fontSize: "24px" },
  gameName: { color: "#fff", fontSize: "16px", fontWeight: "700", margin: 0, lineHeight: 1.3 },
  gameDesc: { color: "rgba(255,255,255,0.45)", fontSize: "13px", margin: 0, lineHeight: 1.5, flexGrow: 1 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" },
  playersBadge: { color: "rgba(255,255,255,0.3)", fontSize: "11px", fontWeight: "600" },
  loadingDot: { color: "#a855f7", fontSize: "11px", fontWeight: "700", animation: "pulse 0.8s ease-in-out infinite" },
  guestBanner: {
    marginTop: "32px",
    textAlign: "center",
    color: "rgba(255,255,255,0.35)",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  guestDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#a855f7",
    animation: "pulse 1.2s ease-in-out infinite",
  },
};
