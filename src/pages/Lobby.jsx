import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, arrayRemove, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { startHeartbeat } from "../heartbeat";
import { getPlayerSession, clearPlayerSession } from "../playerIdentity";

function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const { playerId, isHost, roomCode } = getPlayerSession();

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) {
        navigate("/");
        return;
      }
      const data = snap.data();
      setRoomData(data);
      setLoading(false);

      if (data.status === "started" && !data.selectedGame) {
        navigate(`/game-select/${roomId}`);
      }
      if (data.selectedGame) {
        navigate(`/game/${roomId}/${data.selectedGame}`);
      }
    });

    return () => unsub();
  }, [roomId, navigate]);

  async function startGame() {
    if (!isHost) return;
    await updateDoc(doc(db, "rooms", roomId), { status: "started" });
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function leaveRoom() {
    try {
      const players = roomData?.players || [];
      const me = players.find((p) => p.playerId === playerId);

      if (me) {
        const remaining = players.filter((p) => p.playerId !== playerId);

        if (remaining.length === 0) {
          await deleteDoc(doc(db, "rooms", roomId));
        } else {
          const updates = { players: arrayRemove(me) };
          if (me.isHost) {
            const newHost = remaining[0];
            updates.players = [
              { ...newHost, isHost: true },
              ...remaining.slice(1),
            ];
            updates.hostNickname = newHost.nickname;
            updates.hostPlayerId = newHost.playerId;
          }
          await updateDoc(doc(db, "rooms", roomId), updates);
        }
      }
    } catch (err) {
      console.error("Error leaving room:", err);
    } finally {
      clearPlayerSession();
      navigate("/");
    }
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>Loading room…</p>
      </div>
    );
  }

  const players = roomData?.players || [];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.header}>
          <div style={styles.badge}>🎮 Waiting for players</div>
          <h1 style={styles.title}>Game Lobby</h1>

          <div style={styles.codeBox} onClick={copyCode}>
            <span style={styles.codeLabel}>Room Code</span>
            <span style={styles.code}>{roomCode}</span>
            <span style={styles.copyHint}>{copied ? "✅ Copied!" : "Tap to copy"}</span>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>Players</span>
            <span style={styles.playerCount}>{players.length} joined</span>
          </div>

          <div style={styles.playerGrid}>
            {players.map((p) => (
              <div
                key={p.playerId}
                style={{
                  ...styles.playerCard,
                  ...(p.playerId === playerId ? styles.playerCardSelf : {}),
                  ...(p.isHost ? styles.playerCardHost : {}),
                }}
              >
                <div style={styles.avatar}>
                  {p.nickname.charAt(0).toUpperCase()}
                </div>
                <span style={styles.playerName}>{p.nickname}</span>
                <div style={styles.playerTags}>
                  {p.playerId === playerId && (
                    <span style={styles.tagYou}>You</span>
                  )}
                  {p.isHost && (
                    <span style={styles.tagHost}>👑 Host</span>
                  )}
                </div>
              </div>
            ))}

            {players.length < 4 &&
              Array.from({ length: 4 - players.length }).map((_, i) => (
                <div key={`empty-${i}`} style={styles.playerCardEmpty}>
                  <div style={styles.avatarEmpty}>?</div>
                  <span style={styles.waitingText}>Waiting…</span>
                </div>
              ))}
          </div>
        </div>

        <div style={styles.infoStrip}>
          <span>📋 Share the code with friends</span>
          <span>•</span>
          <span>Min 2 players to start</span>
        </div>

        <div style={styles.actions}>
          {isHost ? (
            <button
              style={{
                ...styles.startBtn,
                opacity: players.length < 2 ? 0.5 : 1,
                cursor: players.length < 2 ? "not-allowed" : "pointer",
              }}
              onClick={startGame}
              disabled={players.length < 2}
            >
              {players.length < 2 ? "Waiting for more players…" : "🚀 Start Game"}
            </button>
          ) : (
            <div style={styles.waitingBanner}>
              <div style={styles.dot} />
              <span>Waiting for the host to start the game…</span>
            </div>
          )}

          <button style={styles.leaveBtn} onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px",
  },
  container: { width: "100%", maxWidth: "520px" },
  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #a855f7",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  header: { textAlign: "center", marginBottom: "28px" },
  badge: {
    display: "inline-block",
    background: "rgba(168,85,247,0.2)",
    border: "1px solid rgba(168,85,247,0.4)",
    color: "#c084fc",
    borderRadius: "999px",
    padding: "6px 16px",
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.5px",
    marginBottom: "12px",
    textTransform: "uppercase",
  },
  title: { color: "#fff", fontSize: "32px", fontWeight: "800", margin: "0 0 20px" },
  codeBox: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: "16px",
    padding: "16px 32px",
    cursor: "pointer",
    transition: "background 0.2s",
    gap: "4px",
  },
  codeLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  code: { color: "#fff", fontSize: "36px", fontWeight: "800", letterSpacing: "8px" },
  copyHint: { color: "rgba(255,255,255,0.35)", fontSize: "11px" },
  section: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: "20px",
    padding: "20px",
    marginBottom: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  sectionTitle: { color: "#fff", fontWeight: "700", fontSize: "16px" },
  playerCount: {
    background: "rgba(168,85,247,0.2)",
    color: "#c084fc",
    borderRadius: "999px",
    padding: "3px 12px",
    fontSize: "12px",
    fontWeight: "600",
  },
  playerGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  playerCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    transition: "transform 0.2s",
  },
  playerCardSelf: {
    border: "1px solid rgba(168,85,247,0.5)",
    background: "rgba(168,85,247,0.1)",
  },
  playerCardHost: {
    border: "1px solid rgba(250,204,21,0.4)",
    background: "rgba(250,204,21,0.05)",
  },
  playerCardEmpty: {
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: "18px",
  },
  avatarEmpty: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(255,255,255,0.2)",
    fontWeight: "800",
    fontSize: "18px",
  },
  playerName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    textAlign: "center",
    wordBreak: "break-all",
  },
  waitingText: { color: "rgba(255,255,255,0.2)", fontSize: "12px" },
  playerTags: { display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" },
  tagYou: {
    background: "rgba(168,85,247,0.3)",
    color: "#c084fc",
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "600",
  },
  tagHost: {
    background: "rgba(250,204,21,0.2)",
    color: "#fbbf24",
    borderRadius: "999px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: "600",
  },
  infoStrip: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    color: "rgba(255,255,255,0.3)",
    fontSize: "12px",
    marginBottom: "20px",
  },
  actions: { display: "flex", flexDirection: "column", gap: "12px" },
  startBtn: {
    padding: "18px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #a855f7, #6366f1)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
    transition: "transform 0.1s",
  },
  waitingBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "16px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "14px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#a855f7",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  leaveBtn: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    color: "rgba(255,255,255,0.35)",
    padding: "12px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default Lobby;
