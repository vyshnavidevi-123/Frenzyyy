// QuickTrivia.jsx
// Category select (host) → 10s-per-question rounds → streak bonus scoring → leaderboard

import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { TRIVIA_CATEGORIES, getRandomQuestions } from "../triviaBank";

const QUESTION_SECONDS = 10;
const QUESTIONS_PER_GAME = 8;
const BASE_POINTS = 100;
const STREAK_BONUS = 20; // extra points per consecutive correct answer

export default function QuickTrivia() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const nickname = sessionStorage.getItem("playverse_nickname") || "Player";
  const isHost = sessionStorage.getItem("playverse_isHost") === "true";
  const timerRef = useRef(null);

  // ── Subscribe to room ───────────────────────────────────────────────────
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

  const game = room?.triviaGame;
  const players = room?.players || [];

  // Reset local answer state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
  }, [game?.currentIndex]);

  // ── Host: start game with chosen category ────────────────────────────────
  async function startTrivia(category) {
    if (!isHost) return;
    const questions = getRandomQuestions(category, QUESTIONS_PER_GAME);
    await updateDoc(doc(db, "rooms", roomId), {
      triviaGame: {
        category,
        questions,
        currentIndex: 0,
        phase: "question", // question | reveal | finished
        questionEndsAt: Date.now() + QUESTION_SECONDS * 1000,
        answers: {}, // { questionIndex: { nickname: { option, correct, timeMs } } }
        scores: Object.fromEntries(players.map((p) => [p.nickname, 0])),
        streaks: Object.fromEntries(players.map((p) => [p.nickname, 0])),
      },
    });
  }

  // ── Countdown timer (host drives reveal) ──────────────────────────────────
  useEffect(() => {
    if (!game || game.phase !== "question" || !game.questionEndsAt) return;

    function tick() {
      const remaining = Math.max(0, Math.round((game.questionEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && isHost) {
        revealAnswer();
      }
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.phase, game?.questionEndsAt, isHost]);

  // ── Submit an answer ──────────────────────────────────────────────────────
  async function submitAnswer(optionIndex) {
    if (hasAnswered || game.phase !== "question") return;
    setSelectedOption(optionIndex);
    setHasAnswered(true);

    const q = game.questions[game.currentIndex];
    const correct = optionIndex === q.answer;
    const timeMs = Date.now();

    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    const g = snap.data()?.triviaGame;
    if (!g || g.phase !== "question") return;

    const key = `triviaGame.answers.${g.currentIndex}.${nickname}`;
    await updateDoc(roomRef, {
      [key]: { option: optionIndex, correct, timeMs },
    });

    // If everyone has answered, auto-reveal (host only checks this)
    if (isHost) {
      const updatedSnap = await getDoc(roomRef);
      const updatedGame = updatedSnap.data()?.triviaGame;
      const answeredCount = Object.keys(updatedGame.answers[g.currentIndex] || {}).length;
      if (answeredCount >= players.length) {
        revealAnswer();
      }
    }
  }

  // ── Reveal + score ─────────────────────────────────────────────────────────
  const revealAnswer = useCallback(async () => {
    clearInterval(timerRef.current);
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    const g = snap.data()?.triviaGame;
    if (!g || g.phase !== "question") return;

    const qAnswers = g.answers[g.currentIndex] || {};
    const newScores = { ...g.scores };
    const newStreaks = { ...g.streaks };

    players.forEach((p) => {
      const a = qAnswers[p.nickname];
      if (a?.correct) {
        newStreaks[p.nickname] = (newStreaks[p.nickname] || 0) + 1;
        const streakMultiplier = Math.min(newStreaks[p.nickname] - 1, 5);
        newScores[p.nickname] = (newScores[p.nickname] || 0) + BASE_POINTS + streakMultiplier * STREAK_BONUS;
      } else {
        newStreaks[p.nickname] = 0;
      }
    });

    await updateDoc(roomRef, {
      "triviaGame.phase": "reveal",
      "triviaGame.scores": newScores,
      "triviaGame.streaks": newStreaks,
    });
  }, [roomId, players]);

  // ── Next question ──────────────────────────────────────────────────────────
  async function nextQuestion() {
    if (!isHost) return;
    const nextIndex = game.currentIndex + 1;
    if (nextIndex >= game.questions.length) {
      await updateDoc(doc(db, "rooms", roomId), { "triviaGame.phase": "finished" });
      return;
    }
    await updateDoc(doc(db, "rooms", roomId), {
      "triviaGame.currentIndex": nextIndex,
      "triviaGame.phase": "question",
      "triviaGame.questionEndsAt": Date.now() + QUESTION_SECONDS * 1000,
    });
  }

  async function goToGames() {
    await updateDoc(doc(db, "rooms", roomId), {
      gameStatus: "selecting",
    });

    navigate(`/game-select/${roomId}`);
  }

  async function backToLobby() {
    await updateDoc(doc(db, "rooms", roomId), {
      status: "waiting", selectedGame: null, triviaGame: null,
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

  // ── CATEGORY SELECT (no game started yet) ──────────────────────────────────
  if (!game) {
    return (
      <div style={s.page}>
        <style>{globalAnim}</style>
        <div style={s.container}>
          <div style={s.center2}>
            <div style={s.bigEmoji}>🧠</div>
            <h1 style={s.title}>Quick Trivia</h1>
            {isHost ? (
              <>
                <p style={s.sub}>Pick a category to start the game</p>
                <div style={s.categoryGrid}>
                  {Object.entries(TRIVIA_CATEGORIES).map(([key, cat]) => (
                    <button key={key} style={s.catBtn} onClick={() => startTrivia(key)}>
                      <span style={{ fontSize: "28px" }}>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={s.sub}>Waiting for host to pick a category…</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = game.questions[game.currentIndex];
  const myAnswer = game.answers?.[game.currentIndex]?.[nickname];
  const answeredCount = Object.keys(game.answers?.[game.currentIndex] || {}).length;
  const sortedScores = Object.entries(game.scores || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div style={s.page}>
      <style>{globalAnim}</style>
      <div style={s.container}>

        {/* Top bar */}
        {game.phase !== "finished" && (
          <div style={s.topBar}>
          <button style={s.backBtn} onClick={goToGames}>

← Games

</button>
            <div style={s.roundBadge}>
              {TRIVIA_CATEGORIES[game.category].emoji} Q{game.currentIndex + 1}/{game.questions.length}
            </div>
            {game.phase === "question" && (
              <div style={{ ...s.timer, color: timeLeft <= 3 ? "#f87171" : "#fff" }}>⏱ {timeLeft}s</div>
            )}
            <div style={s.answeredBadge}>{answeredCount}/{players.length} answered</div>
          </div>
        )}

        {/* QUESTION PHASE */}
        {game.phase === "question" && (
          <div style={s.questionWrap}>
            <h2 style={s.questionText}>{q.q}</h2>
            <div style={s.options}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  style={{
                    ...s.optionBtn,
                    ...(selectedOption === i ? s.optionSelected : {}),
                    opacity: hasAnswered && selectedOption !== i ? 0.4 : 1,
                    cursor: hasAnswered ? "default" : "pointer",
                  }}
                  onClick={() => submitAnswer(i)}
                  disabled={hasAnswered}
                >
                  <span style={s.optionLetter}>{"ABCD"[i]}</span>
                  {opt}
                </button>
              ))}
            </div>
            {hasAnswered && (
              <p style={s.lockedNote}>✓ Answer locked in — waiting for others…</p>
            )}
          </div>
        )}

        {/* REVEAL PHASE */}
        {game.phase === "reveal" && (
          <div style={s.questionWrap}>
            <h2 style={s.questionText}>{q.q}</h2>
            <div style={s.options}>
              {q.options.map((opt, i) => {
                const isCorrect = i === q.answer;
                const isMine = myAnswer?.option === i;
                return (
                  <div
                    key={i}
                    style={{
                      ...s.optionBtn,
                      cursor: "default",
                      ...(isCorrect ? s.optionCorrect : {}),
                      ...(isMine && !isCorrect ? s.optionWrong : {}),
                    }}
                  >
                    <span style={s.optionLetter}>{"ABCD"[i]}</span>
                    {opt}
                    {isCorrect && <span style={{ marginLeft: "auto" }}>✅</span>}
                    {isMine && !isCorrect && <span style={{ marginLeft: "auto" }}>❌</span>}
                  </div>
                );
              })}
            </div>

            <p style={{
              ...s.lockedNote,
              color: myAnswer?.correct ? "#4ade80" : "#f87171",
              fontWeight: "700",
            }}>
              {myAnswer?.correct
                ? `+${BASE_POINTS + Math.min((game.streaks[nickname] - 1) * STREAK_BONUS, 5 * STREAK_BONUS)} pts${game.streaks[nickname] > 1 ? ` 🔥 ${game.streaks[nickname]} streak!` : ""}`
                : myAnswer ? "Incorrect" : "No answer submitted"}
            </p>

            {/* Mini live scoreboard */}
            <div style={s.miniScoreboard}>
              {sortedScores.slice(0, 5).map(([name, score], i) => (
                <div key={name} style={s.miniScoreRow}>
                  <span>{i === 0 ? "👑" : `#${i + 1}`} {name}</span>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>{score}</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button style={s.nextBtn} onClick={nextQuestion}>
                {game.currentIndex + 1 >= game.questions.length ? "🏆 Final Results" : "Next Question →"}
              </button>
            ) : (
              <p style={s.waitHostNote}>Waiting for host to continue…</p>
            )}
          </div>
        )}

        {/* FINISHED PHASE */}
        {game.phase === "finished" && (
          <div style={s.center2}>
          <button style={s.backBtn} onClick={() => navigate(`/game-select/${roomId}`)}>← Games</button>
            <div style={s.bigEmoji}>🏆</div>
            <h2 style={s.title}>Game Over!</h2>
            <p style={s.sub}>
              <strong style={{ color: "#facc15" }}>{sortedScores[0]?.[0]}</strong> wins with {sortedScores[0]?.[1]} points!
            </p>
            <div style={s.scoreboard}>
              {sortedScores.map(([name, score], i) => (
                <div key={name} style={{ ...s.scoreRow, ...(i === 0 ? s.scoreRowWinner : {}) }}>
                  <span style={s.scoreRank}>{i === 0 ? "👑" : `#${i + 1}`}</span>
                  <span style={s.scoreName}>{name}</span>
                  <span style={s.scorePoints}>{score} pts</span>
                </div>
              ))}
            </div>
            {isHost ? (
              <button style={s.nextBtn} onClick={backToLobby}>Back to Lobby</button>
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
    background: "linear-gradient(160deg, #0d0d1a 0%, #14213d 50%, #0d1a2e 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 16px 40px",
  },
  container: { maxWidth: "680px", margin: "0 auto" },
  center: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "linear-gradient(160deg, #0d0d1a 0%, #14213d 50%, #0d1a2e 100%)",
  },
  center2: { textAlign: "center", padding: "40px 10px", animation: "popIn 0.3s ease" },
  spinner: {
    width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  bigEmoji: { fontSize: "56px", marginBottom: "10px" },
  title: { color: "#fff", fontSize: "30px", fontWeight: "800", margin: "0 0 10px" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: "14px", margin: "0 0 28px" },
  categoryGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))",
    gap: "12px",
  },
  catBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px", padding: "20px 12px", color: "#fff", fontWeight: "700",
    fontSize: "13px", cursor: "pointer", transition: "transform 0.15s, border 0.15s",
  },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: "10px", marginBottom: "24px",
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
    background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
    color: "#93c5fd", borderRadius: "999px", padding: "8px 16px",
    fontSize: "13px", fontWeight: "700",
  },
  questionWrap: { animation: "popIn 0.25s ease" },
  questionText: {
    color: "#fff", fontSize: "22px", fontWeight: "800", textAlign: "center",
    margin: "10px 0 28px", lineHeight: 1.4,
  },
  options: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" },
  optionBtn: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px", padding: "16px 18px", color: "#fff", fontSize: "15px",
    fontWeight: "600", textAlign: "left", transition: "all 0.15s",
  },
  optionLetter: {
    width: "28px", height: "28px", borderRadius: "8px",
    background: "rgba(255,255,255,0.08)", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "13px",
    fontWeight: "800", flexShrink: 0,
  },
  optionSelected: { border: "1px solid #3b82f6", background: "rgba(59,130,246,0.15)" },
  optionCorrect: { border: "1px solid #4ade80", background: "rgba(74,222,128,0.15)" },
  optionWrong: { border: "1px solid #f87171", background: "rgba(248,113,113,0.15)" },
  lockedNote: { textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: "12px 0" },
  miniScoreboard: {
    background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "12px 16px",
    display: "flex", flexDirection: "column", gap: "6px", margin: "16px 0",
  },
  miniScoreRow: {
    display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)",
    fontSize: "13px", fontWeight: "600",
  },
  nextBtn: {
    width: "100%", padding: "16px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff",
    fontSize: "16px", fontWeight: "700", cursor: "pointer",
    boxShadow: "0 4px 20px rgba(59,130,246,0.4)", marginTop: "8px",
  },
  waitHostNote: { textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px", marginTop: "8px" },
  scoreboard: { maxWidth: "400px", margin: "0 auto 28px", display: "flex", flexDirection: "column", gap: "8px" },
  scoreRow: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px", padding: "12px 16px",
  },
  scoreRowWinner: { border: "1px solid rgba(250,204,21,0.4)", background: "rgba(250,204,21,0.08)" },
  scoreRank: { color: "rgba(255,255,255,0.4)", fontWeight: "700", width: "30px" },
  scoreName: { color: "#fff", fontWeight: "600", flex: 1, textAlign: "left" },
  scorePoints: { color: "#a78bfa", fontWeight: "800" },
};
