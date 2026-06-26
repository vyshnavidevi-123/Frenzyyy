// SecretImposter.jsx
// Roles assigned secretly → everyone gives a 1-word hint in turn order → discuss → vote → hilarious reveal
// Kept SHORT: hint phase has a tight timer, voting is quick, reveal is the punchline.

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getRandomTopic } from "../imposterTopics";

const HINT_SECONDS = 15;
const VOTE_SECONDS = 20;
const MIN_PLAYERS = 4;

const FUNNY_REVEAL_LINES = [
  "busted with their pants down 🩳",
  "got caught faking it the whole time 🎭",
  "fooled NOBODY but thought they did 😭",
  "deserves an Oscar for that performance 🏆",
  "is never living this down 💀",
  "got exposed harder than a bad WiFi connection 📡",
];

export default function SecretImposter() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hintInput, setHintInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(HINT_SECONDS);
  const [selectedVote, setSelectedVote] = useState(null);

  const nickname = sessionStorage.getItem("playverse_nickname") || "Player";
  const isHost = sessionStorage.getItem("playverse_isHost") === "true";

  useEffect(() => {
    if (!roomId) { navigate("/"); return; }
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      setRoom(snap.data());
      setLoading(false);
    });
    return () => unsub();
  }, [roomId, navigate]);

  const game = room?.imposterGame;
  const players = room?.players || [];
  const myRole = game?.roles?.[nickname];
  const isImposter = myRole === "imposter";

  useEffect(() => {
    setHintInput("");
    setSelectedVote(null);
  }, [game?.round, game?.phase]);

  // ── Start game: assign roles ────────────────────────────────────────────
  async function startGame() {
    if (!isHost) return;
    if (players.length < MIN_PLAYERS) return;

    const topic = getRandomTopic();
    const order = players.map((p) => p.nickname).sort(() => Math.random() - 0.5);
    const imposterIndex = Math.floor(Math.random() * order.length);
    const imposterName = order[imposterIndex];

    const roles = {};
    order.forEach((name) => {
      roles[name] = name === imposterName ? "imposter" : "regular";
    });

    await updateDoc(doc(db, "rooms", roomId), {
      imposterGame: {
        topic: topic.category,
        word: topic.word,
        roles,
        order,
        hintIndex: 0,
        round: 1,
        phase: "reveal-role", // reveal-role | hints | voting | results
        hints: {}, // { nickname: hintText }
        votes: {}, // { voterNickname: votedForNickname }
        hintEndsAt: null,
        voteEndsAt: null,
      },
    });
  }

  async function readyToHints() {
    if (!isHost) return;
    await updateDoc(doc(db, "rooms", roomId), {
      "imposterGame.phase": "hints",
      "imposterGame.hintEndsAt": Date.now() + HINT_SECONDS * 1000,
    });
  }

  // Hint timer
  useEffect(() => {
    if (!game || game.phase !== "hints" || !game.hintEndsAt) return;
    function tick() {
      const remaining = Math.max(0, Math.round((game.hintEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [game?.phase, game?.hintEndsAt]);

  const currentHintPlayer = game?.order?.[game.hintIndex];
  const isMyHintTurn = currentHintPlayer === nickname;

  async function submitHint() {
    const text = hintInput.trim();
    if (!text || !isMyHintTurn) return;

    const roomRef = doc(db, "rooms", roomId);
    const nextIndex = game.hintIndex + 1;
    const allDone = nextIndex >= game.order.length;

    await updateDoc(roomRef, {
      [`imposterGame.hints.${nickname}`]: text,
      "imposterGame.hintIndex": nextIndex,
      ...(allDone
        ? { "imposterGame.phase": "voting", "imposterGame.voteEndsAt": Date.now() + VOTE_SECONDS * 1000 }
        : {}),
    });
    setHintInput("");
  }

  // Vote timer
  useEffect(() => {
    if (!game || game.phase !== "voting" || !game.voteEndsAt) return;
    function tick() {
      const remaining = Math.max(0, Math.round((game.voteEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && isHost) finishVoting();
    }
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.voteEndsAt, isHost]);

  async function castVote(targetName) {
    if (selectedVote || game.phase !== "voting") return;
    setSelectedVote(targetName);
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, { [`imposterGame.votes.${nickname}`]: targetName });

    if (isHost) {
      const snap = await getDoc(roomRef);
      const g = snap.data()?.imposterGame;
      if (Object.keys(g.votes || {}).length >= players.length) {
        finishVoting();
      }
    }
  }

  const finishVoting = useCallback(async () => {
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    const g = snap.data()?.imposterGame;
    if (!g || g.phase !== "voting") return;
    await updateDoc(roomRef, { "imposterGame.phase": "results" });
  }, [roomId]);

  async function playAgain() {
    if (!isHost) return;
    const topic = getRandomTopic();
    const order = players.map((p) => p.nickname).sort(() => Math.random() - 0.5);
    const imposterName = order[Math.floor(Math.random() * order.length)];
    const roles = {};
    order.forEach((name) => { roles[name] = name === imposterName ? "imposter" : "regular"; });

    await updateDoc(doc(db, "rooms", roomId), {
      imposterGame: {
        topic: topic.category, word: topic.word, roles, order,
        hintIndex: 0, round: (game?.round || 0) + 1,
        phase: "reveal-role", hints: {}, votes: {},
        hintEndsAt: null, voteEndsAt: null,
      },
    });
  }

  async function backToLobby() {
    await updateDoc(doc(db, "rooms", roomId), {
      status: "waiting", selectedGame: null, imposterGame: null,
    });
    navigate(`/lobby/${roomId}`);
  }

  if (loading) {
    return (
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "16px" }}>Loading…</p>
      </div>
    );
  }

  // ── PRE-GAME ──────────────────────────────────────────────────────────────
  if (!game) {
    return (
      <div style={s.page}>
        <style>{globalAnim}</style>
        <div style={s.container}>
          <div style={s.center2}>
            <div style={s.bigEmoji}>🕵️</div>
            <h1 style={s.title}>Secret Imposter</h1>
            <p style={s.sub}>
              One of you won't know the secret word. Give hints. Don't get caught. 😈
            </p>
            {players.length < MIN_PLAYERS && (
              <p style={s.warnNote}>Need at least {MIN_PLAYERS} players ({players.length}/{MIN_PLAYERS})</p>
            )}
            {isHost ? (
              <button
                style={{ ...s.startBtn, opacity: players.length < MIN_PLAYERS ? 0.4 : 1 }}
                onClick={startGame}
                disabled={players.length < MIN_PLAYERS}
              >
                Start Game 🚀
              </button>
            ) : (
              <p style={s.waitHostNote}>Waiting for host to start…</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const votesArr = Object.values(game.votes || {});
  const voteCounts = {};
  votesArr.forEach((v) => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
  const mostVoted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
  const caughtImposter = mostVoted && game.roles[mostVoted[0]] === "imposter";
  const actualImposter = Object.entries(game.roles).find(([, r]) => r === "imposter")?.[0];
  const funnyLine = FUNNY_REVEAL_LINES[game.round % FUNNY_REVEAL_LINES.length];

  return (
    <div style={s.page}>
      <style>{globalAnim}</style>
      <div style={s.container}>

        {game.phase !== "reveal-role" && (
          <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate(`/game-select/${roomId}`)}>
  ← Games
</button>
            <div style={s.roundBadge}>🕵️ Round {game.round}</div>
            {(game.phase === "hints" || game.phase === "voting") && (
              <div style={{ ...s.timer, color: timeLeft <= 5 ? "#f87171" : "#fff" }}>⏱ {timeLeft}s</div>
            )}
          </div>
        )}

        {/* REVEAL ROLE PHASE (private to each player) */}
        {game.phase === "reveal-role" && (
          <div style={s.center2}>
            {isImposter ? (
              <>
                <div style={s.bigEmoji}>🤫</div>
                <h2 style={s.qTitle}>You're the IMPOSTER!</h2>
                <p style={s.sub}>
                  Topic: <strong style={{ color: "#fff" }}>{game.topic}</strong><br />
                  You don't know the word — bluff your way through hints!
                </p>
              </>
            ) : (
              <>
                <div style={s.bigEmoji}>✅</div>
                <h2 style={s.qTitle}>You're safe!</h2>
                <p style={s.sub}>Topic: <strong style={{ color: "#fff" }}>{game.topic}</strong></p>
                <div style={s.wordCard}>{game.word}</div>
                <p style={s.tinyNote}>Give a hint that proves you know it — without making it too obvious.</p>
              </>
            )}

            {isHost ? (
              <button style={s.startBtn} onClick={readyToHints}>Everyone's Ready — Begin Hints 🎬</button>
            ) : (
              <p style={s.waitHostNote}>Waiting for host to begin…</p>
            )}
          </div>
        )}

        {/* HINTS PHASE */}
        {game.phase === "hints" && (
          <div style={s.center2}>
            <div style={s.bigEmoji}>💬</div>
            <h2 style={s.qTitle}>
              {isMyHintTurn ? "Your turn — give a hint!" : `${currentHintPlayer} is thinking…`}
            </h2>

            {isMyHintTurn && (
              <div style={s.hintInputRow}>
                <input
                  style={s.hintInput}
                  placeholder="One word or short phrase…"
                  maxLength={30}
                  value={hintInput}
                  autoFocus
                  onChange={(e) => setHintInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitHint()}
                />
                <button style={s.sendHintBtn} onClick={submitHint}>Submit</button>
              </div>
            )}

            <div style={s.hintsFeed}>
              {Object.entries(game.hints).map(([name, hint]) => (
                <div key={name} style={s.hintChip}>
                  <strong>{name}:</strong> {hint}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VOTING PHASE */}
        {game.phase === "voting" && (
          <div style={s.center2}>
            <div style={s.bigEmoji}>🗳️</div>
            <h2 style={s.qTitle}>Who's the imposter?!</h2>

            <div style={s.hintsFeed}>
              {Object.entries(game.hints).map(([name, hint]) => (
                <div key={name} style={s.hintChip}>
                  <strong>{name}:</strong> {hint}
                </div>
              ))}
            </div>

            <div style={s.voteGrid}>
              {game.order.map((name) => (
                <button
                  key={name}
                  style={{
                    ...s.voteBtn,
                    ...(selectedVote === name ? s.voteBtnSelected : {}),
                    opacity: selectedVote && selectedVote !== name ? 0.4 : 1,
                  }}
                  onClick={() => castVote(name)}
                  disabled={!!selectedVote || name === nickname}
                >
                  {name} {name === nickname && "(you)"}
                </button>
              ))}
            </div>
            {selectedVote && <p style={s.tinyNote}>✓ Vote locked — waiting for others…</p>}
          </div>
        )}

        {/* RESULTS PHASE — the punchline */}
        {game.phase === "results" && (
          <div style={s.center2}>
            <div style={s.bigEmoji}>{caughtImposter ? "🎉" : "😂"}</div>
            <h2 style={s.qTitle}>
              {caughtImposter ? "Busted!" : "The imposter got away with it!"}
            </h2>
            <p style={s.sub}>
              <strong style={{ color: "#ef4444" }}>{actualImposter}</strong> was the imposter and {funnyLine}
            </p>
            <p style={s.tinyNote}>The word was: <strong style={{ color: "#fff" }}>{game.word}</strong></p>

            <div style={s.voteTallyBox}>
              {Object.entries(voteCounts).sort((a,b)=>b[1]-a[1]).map(([name, count]) => (
                <div key={name} style={s.tallyRow}>
                  <span>{name === actualImposter ? "🕵️ " : ""}{name}</span>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>{count} vote{count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button style={s.startBtn} onClick={playAgain}>🔁 Play Again</button>
                <button style={s.endBtn} onClick={backToLobby}>Back to Lobby</button>
              </div>
            ) : (
              <p style={s.waitHostNote}>Waiting for host…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const globalAnim = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes popIn { from{opacity:0; transform:scale(0.95)} to{opacity:1; transform:scale(1)} }
`;

const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0d0d1a 0%, #1f0f2e 50%, #2e0d1a 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 16px 40px",
  },
  container: { maxWidth: "600px", margin: "0 auto" },
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "linear-gradient(160deg, #0d0d1a 0%, #1f0f2e 50%, #2e0d1a 100%)",
  },
  center2: { textAlign: "center", padding: "20px 10px", animation: "popIn 0.3s ease" },
  spinner: {
    width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #8b5cf6", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  bigEmoji: { fontSize: "52px", marginBottom: "10px" },
  title: { color: "#fff", fontSize: "30px", fontWeight: "800", margin: "0 0 10px" },
  qTitle: { color: "#fff", fontSize: "22px", fontWeight: "800", margin: "0 0 14px" },
  sub: { color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: "0 0 20px", lineHeight: 1.6 },
  tinyNote: { color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "12px" },
  warnNote: { color: "#fbbf24", fontSize: "13px", marginBottom: "16px" },
  wordCard: {
    display: "inline-block", background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.4)", borderRadius: "16px",
    padding: "16px 32px", color: "#c4b5fd", fontSize: "26px", fontWeight: "800",
    marginBottom: "16px",
  },
  startBtn: {
    padding: "16px 32px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff",
    fontSize: "15px", fontWeight: "700", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
  },
  endBtn: {
    padding: "16px 32px", borderRadius: "14px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.6)", fontSize: "15px", fontWeight: "700", cursor: "pointer",
  },
  waitHostNote: { color: "rgba(255,255,255,0.3)", fontSize: "13px" },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "20px",
  },
  roundBadge: {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "999px", padding: "8px 16px", color: "rgba(255,255,255,0.7)",
    fontSize: "13px", fontWeight: "700",
  },
  timer: {
    fontSize: "20px", fontWeight: "800", background: "rgba(255,255,255,0.06)",
    padding: "6px 18px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.1)",
  },
  hintInputRow: { display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" },
  hintInput: {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px", color: "#fff", padding: "12px 16px", fontSize: "15px",
    outline: "none", maxWidth: "240px",
  },
  sendHintBtn: {
    padding: "12px 20px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff",
    fontWeight: "700", cursor: "pointer",
  },
  hintsFeed: {
    display: "flex", flexDirection: "column", gap: "6px",
    background: "rgba(255,255,255,0.04)", borderRadius: "14px",
    padding: "14px", marginBottom: "20px", maxHeight: "180px", overflowY: "auto",
  },
  hintChip: {
    textAlign: "left", color: "rgba(255,255,255,0.8)", fontSize: "13px",
    background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "6px 10px",
  },
  voteGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
  },
  voteBtn: {
    padding: "14px", borderRadius: "12px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer",
  },
  voteBtnSelected: { border: "1px solid #ef4444", background: "rgba(239,68,68,0.15)" },
  voteTallyBox: {
    background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "14px",
    display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px",
    maxWidth: "320px", margin: "0 auto 24px",
  },
  tallyRow: {
    display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.75)",
    fontSize: "13px", fontWeight: "600",
  },
};
