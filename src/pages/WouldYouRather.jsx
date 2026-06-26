// WouldYouRather.jsx
// Everyone votes A or B → live percentage bars → discussion → next round

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getRandomWYR } from "../wouldYouRatherBank";

const ROUNDS = 8;
const VOTE_SECONDS = 15;

export default function WouldYouRather() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myVote, setMyVote] = useState(null);
  const [timeLeft, setTimeLeft] = useState(VOTE_SECONDS);

  const nickname = sessionStorage.getItem("playverse_nickname") || "Player";
  const isHost = sessionStorage.getItem("playverse_isHost") === "true";

  useEffect(() => {
    if (!roomId) { navigate("/"); return; }
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      const data = snap.data();
      setRoom(data);
      setLoading(false);
    });
    return () => unsub();
  }, [roomId, navigate]);

  const game = room?.wyrGame;
  const players = room?.players || [];

  useEffect(() => {
    setMyVote(null);
  }, [game?.currentIndex]);

  async function startGame() {
    if (!isHost) return;
    const questions = getRandomWYR(ROUNDS);
    await updateDoc(doc(db, "rooms", roomId), {
      wyrGame: {
        questions,
        currentIndex: 0,
        phase: "voting", // voting | results | finished
        votes: {}, // { questionIndex: { nickname: "a" | "b" } }
        roundEndsAt: Date.now() + VOTE_SECONDS * 1000,
      },
    });
  }

  // Countdown
  useEffect(() => {
    if (!game || game.phase !== "voting" || !game.roundEndsAt) return;
    function tick() {
      const remaining = Math.max(0, Math.round((game.roundEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && isHost) showResults();
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.roundEndsAt, isHost]);

  async function castVote(choice) {
    if (myVote || game.phase !== "voting") return;
    setMyVote(choice);

    const roomRef = doc(db, "rooms", roomId);
    const key = `wyrGame.votes.${game.currentIndex}.${nickname}`;
    await updateDoc(roomRef, { [key]: choice });

    if (isHost) {
      const snap = await getDoc(roomRef);
      const g = snap.data()?.wyrGame;
      const votesThisRound = Object.keys(g.votes[g.currentIndex] || {}).length;
      if (votesThisRound >= players.length) {
        showResults();
      }
    }
  }

  const showResults = useCallback(async () => {
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    const g = snap.data()?.wyrGame;
    if (!g || g.phase !== "voting") return;
    await updateDoc(roomRef, { "wyrGame.phase": "results" });
  }, [roomId]);

  async function goToGames() {
    await updateDoc(doc(db, "rooms", roomId), {
      gameStatus: "selecting",
    });

    navigate(`/game-select/${roomId}`);
  }

  async function nextRound() {
    if (!isHost) return;
    const nextIndex = game.currentIndex + 1;
    if (nextIndex >= game.questions.length) {
      await updateDoc(doc(db, "rooms", roomId), { "wyrGame.phase": "finished" });
      return;
    }
    await updateDoc(doc(db, "rooms", roomId), {
      "wyrGame.currentIndex": nextIndex,
      "wyrGame.phase": "voting",
      "wyrGame.roundEndsAt": Date.now() + VOTE_SECONDS * 1000,
    });
  }

  async function backToLobby() {
    await updateDoc(doc(db, "rooms", roomId), {
      status: "waiting", selectedGame: null, wyrGame: null,
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

  if (!game) {
    return (
      <div style={s.page}>
        <style>{globalAnim}</style>
        <div style={s.container}>
          <div style={s.center2}>
            <div style={s.bigEmoji}>🤔</div>
            <h1 style={s.title}>Would You Rather</h1>
            <p style={s.sub}>
              {isHost ? "Start the game when everyone's ready" : "Waiting for host to start…"}
            </p>
            {isHost && (
              <button style={s.startBtn} onClick={startGame}>Start Game 🚀</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = game.questions[game.currentIndex];
  const roundVotes = game.votes?.[game.currentIndex] || {};
  const votedCount = Object.keys(roundVotes).length;
  const aCount = Object.values(roundVotes).filter((v) => v === "a").length;
  const bCount = Object.values(roundVotes).filter((v) => v === "b").length;
  const total = aCount + bCount || 1;
  const aPct = Math.round((aCount / total) * 100);
  const bPct = Math.round((bCount / total) * 100);

  return (
    <div style={s.page}>
      <style>{globalAnim}</style>
      <div style={s.container}>

        {game.phase !== "finished" && (
          <div style={s.topBar}>
          <button style={s.backBtn} onClick={goToGames}>

← Games

</button>
            <div style={s.roundBadge}>🤔 Round {game.currentIndex + 1}/{game.questions.length}</div>
            {game.phase === "voting" && (
              <div style={{ ...s.timer, color: timeLeft <= 3 ? "#f87171" : "#fff" }}>⏱ {timeLeft}s</div>
            )}
            <div style={s.answeredBadge}>{votedCount}/{players.length} voted</div>
          </div>
        )}

        {/* VOTING PHASE */}
        {game.phase === "voting" && (
          <div style={s.voteWrap}>
            <h2 style={s.vsTitle}>Would you rather…</h2>
            <div style={s.vsGrid}>
              <button
                style={{
                  ...s.choiceBtn, ...s.choiceA,
                  ...(myVote === "a" ? s.choiceSelected : {}),
                  opacity: myVote && myVote !== "a" ? 0.4 : 1,
                  cursor: myVote ? "default" : "pointer",
                }}
                onClick={() => castVote("a")}
                disabled={!!myVote}
              >
                {q.a}
              </button>
              <div style={s.orDivider}>OR</div>
              <button
                style={{
                  ...s.choiceBtn, ...s.choiceB,
                  ...(myVote === "b" ? s.choiceSelected : {}),
                  opacity: myVote && myVote !== "b" ? 0.4 : 1,
                  cursor: myVote ? "default" : "pointer",
                }}
                onClick={() => castVote("b")}
                disabled={!!myVote}
              >
                {q.b}
              </button>
            </div>
            {myVote && <p style={s.lockedNote}>✓ Vote locked in — waiting for others…</p>}
          </div>
        )}

        {/* RESULTS PHASE */}
        {game.phase === "results" && (
          <div style={s.voteWrap}>
            <h2 style={s.vsTitle}>Here's how everyone voted</h2>

            <div style={s.resultBar}>
              <div style={s.resultLabelRow}>
                <span style={s.resultLabel}>{q.a}</span>
                <span style={s.resultPct}>{aPct}%</span>
              </div>
              <div style={s.barTrack}>
                <div style={{ ...s.barFillA, width: `${aPct}%` }} />
              </div>
            </div>

            <div style={s.resultBar}>
              <div style={s.resultLabelRow}>
                <span style={s.resultLabel}>{q.b}</span>
                <span style={s.resultPct}>{bPct}%</span>
              </div>
              <div style={s.barTrack}>
                <div style={{ ...s.barFillB, width: `${bPct}%` }} />
              </div>
            </div>

            <div style={s.discussNote}>💬 Talk it out — why'd you pick yours?</div>

            {isHost ? (
              <button style={s.nextBtn} onClick={nextRound}>
                {game.currentIndex + 1 >= game.questions.length ? "🏁 Finish" : "Next Round →"}
              </button>
            ) : (
              <p style={s.waitHostNote}>Waiting for host to continue…</p>
            )}
          </div>
        )}

        {/* FINISHED */}
        {game.phase === "finished" && (
          <div style={s.center2}>
            <div style={s.bigEmoji}>🎉</div>
            <h2 style={s.title}>That's a wrap!</h2>
            <p style={s.sub}>You made it through {game.questions.length} tough choices.</p>
            {isHost ? (
              <button style={s.startBtn} onClick={backToLobby}>Back to Lobby</button>
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
  @keyframes growBar { from{width:0} }
`;

const s = {
  backBtn: {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "999px",
  padding: "8px 16px",
  color: "rgba(255,255,255,0.65)",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
},
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0d0d1a 0%, #0f2e1f 50%, #0d1a2e 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 16px 40px",
  },
  container: { maxWidth: "640px", margin: "0 auto" },
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "linear-gradient(160deg, #0d0d1a 0%, #0f2e1f 50%, #0d1a2e 100%)",
  },
  center2: { textAlign: "center", padding: "60px 10px", animation: "popIn 0.3s ease" },
  spinner: {
    width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  bigEmoji: { fontSize: "56px", marginBottom: "10px" },
  title: { color: "#fff", fontSize: "30px", fontWeight: "800", margin: "0 0 10px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: "14px", margin: "0 0 28px" },
  startBtn: {
    padding: "16px 36px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
    fontSize: "16px", fontWeight: "700", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
  },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: "10px", marginBottom: "28px",
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
  answeredBadge: {
    background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
    color: "#6ee7b7", borderRadius: "999px", padding: "8px 16px",
    fontSize: "13px", fontWeight: "700",
  },
  voteWrap: { animation: "popIn 0.25s ease" },
  vsTitle: { color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center", margin: "0 0 24px" },
  vsGrid: { display: "flex", flexDirection: "column", gap: "0", alignItems: "stretch" },
  choiceBtn: {
    padding: "28px 24px", borderRadius: "18px", border: "2px solid transparent",
    color: "#fff", fontSize: "17px", fontWeight: "700", textAlign: "center",
    transition: "all 0.15s", lineHeight: 1.4,
  },
  choiceA: { background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.25)" },
  choiceB: { background: "rgba(236,72,153,0.12)", border: "2px solid rgba(236,72,153,0.25)" },
  choiceSelected: { border: "2px solid #fff", transform: "scale(1.02)" },
  orDivider: {
    textAlign: "center", color: "rgba(255,255,255,0.3)", fontWeight: "800",
    fontSize: "13px", letterSpacing: "2px", margin: "12px 0",
  },
  lockedNote: { textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "16px" },
  resultBar: { marginBottom: "20px" },
  resultLabelRow: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  resultLabel: { color: "#fff", fontSize: "14px", fontWeight: "600", maxWidth: "80%" },
  resultPct: { color: "#a78bfa", fontWeight: "800", fontSize: "14px" },
  barTrack: {
    height: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden",
  },
  barFillA: {
    height: "100%", background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    borderRadius: "999px", animation: "growBar 0.6s ease",
  },
  barFillB: {
    height: "100%", background: "linear-gradient(90deg, #ec4899, #f472b6)",
    borderRadius: "999px", animation: "growBar 0.6s ease",
  },
  discussNote: {
    textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: "13px",
    margin: "20px 0", fontStyle: "italic",
  },
  nextBtn: {
    width: "100%", padding: "16px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
    fontSize: "16px", fontWeight: "700", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(16,185,129,0.4)", marginTop: "8px",
  },
  waitHostNote: { textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "8px" },
};
