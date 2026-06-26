import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerSession } from "../playerIdentity";

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateCard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const grid = [];
  for (let i = 0; i < 5; i++) {
    grid.push(numbers.slice(i * 5, i * 5 + 5));
  }
  return grid;
}

// Returns how many of the 7 lines (5 rows + 2 diagonals) are complete.
// Win condition: all 7 lines complete (= full card) OR alternatively
// the Indian "full house" = all 5 lines (rows 0-4) + both diagonals = 7 lines.
// Here we treat "BINGO" as completing all 5 rows + both diagonals = 7 total.
function countLines(grid, calledSet) {
  let lines = 0;

  // Rows
  for (let r = 0; r < 5; r++) {
    if (grid[r].every((n) => calledSet.has(n))) lines++;
  }

  // Columns
  for (let c = 0; c < 5; c++) {
    if (grid.every((row) => calledSet.has(row[c]))) lines++;
  }

  // Principal diagonal
  if (grid.every((row, i) => calledSet.has(row[i]))) lines++;

  // Secondary diagonal
  if (grid.every((row, i) => calledSet.has(row[4 - i]))) lines++;

  return lines; // max 12
}

// A "line" is complete when the row/col/diag is fully marked.
// We track lines separately to show which ones are done.
function getLineStatuses(grid, calledSet) {
  const rows = grid.map((row) => row.every((n) => calledSet.has(n)));
  const cols = [0, 1, 2, 3, 4].map((c) => grid.every((row) => calledSet.has(row[c])));
  const diag1 = grid.every((row, i) => calledSet.has(row[i]));
  const diag2 = grid.every((row, i) => calledSet.has(row[4 - i]));
  return { rows, cols, diag1, diag2 };
}

// Check if a cell is on a completed line
function isCellWinning(ri, ci, lineStatus) {
  return (
    lineStatus.rows[ri] ||
    lineStatus.cols[ci] ||
    (ri === ci && lineStatus.diag1) ||
    (ri + ci === 4 && lineStatus.diag2)
  );
}

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

// ─── component ────────────────────────────────────────────────────────────────

export default function BingoGame() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { playerId, isHost, nickname } = getPlayerSession();

  const [roomData, setRoomData] = useState(null);
  const [myCard, setMyCard] = useState(null);
  const [winner, setWinner] = useState(null);
  const [justCalled, setJustCalled] = useState(null);
  const [claimingBingo, setClaimingBingo] = useState(false);
  const [inputNum, setInputNum] = useState("");
  const [inputError, setInputError] = useState("");
  const [callCooldown, setCallCooldown] = useState(false);

  const inputRef = useRef(null);

  // ── listen to room ──
  useEffect(() => {
    if (!roomId) { navigate("/"); return; }
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (!snap.exists()) { navigate("/"); return; }
      const data = snap.data();
      setRoomData(data);

      const bingo = data.bingo || {};
if (bingo.winner) {
  setWinner(bingo.winner);
} else {
  setWinner(null);
}

      const called = bingo.calledNumbers || [];
      if (called.length > 0) {
        const last = called[called.length - 1];
        setJustCalled(last);
        setTimeout(() => setJustCalled(null), 2000);
      }
    });
    return () => unsub();
  }, [roomId, navigate]);

  // ── init / load card ──
  useEffect(() => {
    if (!roomId || !playerId) return;

    async function initCard() {
      const snap = await getDoc(doc(db, "rooms", roomId));
      if (!snap.exists()) return;
      const data = snap.data();
      const cards = data.bingo?.cards || {};

      if (cards[playerId]) {
        setMyCard(cards[playerId]);
      } else {
        const newCard = generateCard();
        setMyCard(newCard);
        await updateDoc(doc(db, "rooms", roomId), {
          [`bingo.cards.${playerId}`]: newCard,
        });
      }

      if (!data.bingo?.calledNumbers) {
        await updateDoc(doc(db, "rooms", roomId), {
          "bingo.calledNumbers": [],
          "bingo.winner": null,
          "bingo.gameOver": false,
          "bingo.lastCaller": null,
        });
      }
    }

    initCard();
  }, [roomId, playerId]);

  // ── call a number ──
  async function callNumber() {
    const num = parseInt(inputNum, 10);
    if (isNaN(num) || num < 1 || num > 25) {
      setInputError("Enter a number between 1 and 25.");
      return;
    }
    const calledNumbers = roomData?.bingo?.calledNumbers || [];
    if (calledNumbers.includes(num)) {
      setInputError(`${num} was already called!`);
      return;
    }
    setInputError("");
    setCallCooldown(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        "bingo.calledNumbers": arrayUnion(num),
        "bingo.lastCaller": { playerId, nickname },
      });
      setInputNum("");
      inputRef.current?.focus();
    } catch {
      setInputError("Failed to call number. Try again.");
    } finally {
      setTimeout(() => setCallCooldown(false), 800);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") callNumber();
  }

  // ── claim bingo ──
  async function claimBingo() {
    if (claimingBingo || winner || !myCard) return;
    const calledNumbers = roomData?.bingo?.calledNumbers || [];
    const calledSet = new Set(calledNumbers);
    const lines = countLines(myCard, calledSet);
    if (lines < 5) return; // Need all 12 lines (5 rows + 5 cols + 2 diags)
    setClaimingBingo(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        "bingo.winner": { playerId, nickname },
        "bingo.gameOver": true,
      });
    } finally {
      setClaimingBingo(false);
    }
  }

  // ── restart ──
  async function restartGame() {
    await updateDoc(doc(db, "rooms", roomId), {
      "bingo.calledNumbers": [],
      "bingo.winner": null,
      "bingo.gameOver": false,
      "bingo.cards": {},
      "bingo.lastCaller": null,
    });
    setMyCard(null);
    setWinner(null);

    const newCard = generateCard();
    setMyCard(newCard);
    await updateDoc(doc(db, "rooms", roomId), {
      [`bingo.cards.${playerId}`]: newCard,
    });
  }

    async function goToGames() {
  await updateDoc(doc(db, "rooms", roomId), {
    gameStatus: "selecting",
  });

  navigate(`/game-select/${roomId}`);
}


  if (!myCard) {
    return (
      <div style={s.page}>
        <div style={s.loadingWrap}>
          <div style={s.spinner} />
          <p style={s.loadingText}>Setting up your card…</p>
        </div>
      </div>
    );
  }

  const calledNumbers = roomData?.bingo?.calledNumbers || [];
  const calledSet = new Set(calledNumbers);
  const lastNum = calledNumbers[calledNumbers.length - 1];
  const lastCaller = roomData?.bingo?.lastCaller;
  const lineStatus = getLineStatuses(myCard, calledSet);
  const totalLines = countLines(myCard, calledSet);
  const hasBingo = totalLines >= 5;
  const players = roomData?.players || [];

  // Letter for last called number: B=1-5, I=6-10, N=11-15, G=16-20, O=21-25
  const letterIndex = lastNum ? Math.floor((lastNum - 1) / 5) : null;
  const callerLetter = letterIndex !== null ? BINGO_LETTERS[letterIndex] : null;

  const LETTER_COLORS = ["#f472b6", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa"];

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes popIn   { 0%{transform:scale(0.4);opacity:0} 65%{transform:scale(1.18)} 100%{transform:scale(1);opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 14px rgba(168,85,247,0.45)} 50%{box-shadow:0 0 38px rgba(168,85,247,0.9)} }
        @keyframes winBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes markPop { 0%{transform:scale(0.7);opacity:0.3} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes lineDone{ 0%{box-shadow:none} 50%{box-shadow:0 0 20px rgba(52,211,153,0.7)} 100%{box-shadow:none} }
        .num-input:focus { outline: none; border-color: #a855f7 !important; box-shadow: 0 0 0 3px rgba(168,85,247,0.25); }
        .call-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .call-btn:disabled { opacity: 0.5; cursor: default; }
        .bingo-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
      `}</style>

      <div style={s.inner}>

        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={goToGames}>← Games </button>
          <div style={s.roomPill}>🎱 {roomData?.roomCode || "------"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        </div>

        {/* Winner banner */}
        {winner && (
          <div style={{ ...s.winnerBanner, animation: "winBounce 1.5s ease-in-out infinite" }}>
            <span style={{ fontSize: "36px" }}>🎉</span>
            <div style={{ textAlign: "center" }}>
              <div style={s.winnerTitle}>BINGO!</div>
              <div style={s.winnerSub}>
                {winner.playerId === playerId ? "🏆 You won!" : `${winner.nickname} won!`}
              </div>
            </div>
            <span style={{ fontSize: "36px" }}>🎉</span>
            {isHost && (
              <button style={s.restartBtn} onClick={restartGame}>Play Again</button>
            )}
          </div>
        )}

        <div style={s.layout}>

          {/* ── LEFT: Bingo Card ── */}
          <div style={s.cardSection}>
            <div style={s.cardTopRow}>
              <span style={s.cardLabelText}>YOUR CARD</span>
              <span style={s.nickBadge}>{nickname}</span>
            </div>

            {/* BINGO header letters */}
            <div style={s.bingoHeader}>
              {BINGO_LETTERS.map((l, i) => (
                <div key={l} style={{ ...s.headerCell, color: LETTER_COLORS[i] }}>
                  {l}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={s.grid}>
              {myCard.map((row, ri) =>
                row.map((cell, ci) => {
                  const isMarked = calledSet.has(cell);
                  const isJust = cell === justCalled;
                  const isWinLine = isMarked && isCellWinning(ri, ci, lineStatus);
                  const letterCol = Math.floor((cell - 1) / 5); // which BINGO letter column

                  return (
                    <div
                      key={`${ri}-${ci}`}
                      style={{
                        ...s.cell,
                        background: isWinLine
                          ? `linear-gradient(135deg, rgba(52,211,153,0.35), rgba(16,185,129,0.25))`
                          : isMarked
                            ? "rgba(168,85,247,0.22)"
                            : "rgba(255,255,255,0.04)",
                        border: isWinLine
                          ? "1.5px solid rgba(52,211,153,0.7)"
                          : isMarked
                            ? "1.5px solid rgba(168,85,247,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                        transform: isJust ? "scale(1.14)" : "scale(1)",
                        boxShadow: isJust
                          ? `0 0 22px ${LETTER_COLORS[letterCol]}99`
                          : isWinLine
                            ? "0 0 10px rgba(52,211,153,0.4)"
                            : "none",
                        transition: "all 0.22s ease",
                        animation: isJust ? "markPop 0.35s ease both" : "none",
                      }}
                    >
                      <span style={{
                        ...s.cellNum,
                        color: isWinLine
                          ? "#34d399"
                          : isMarked
                            ? "#c084fc"
                            : "rgba(255,255,255,0.75)",
                        fontWeight: isMarked ? "800" : "500",
                        fontSize: isMarked ? "17px" : "16px",
                      }}>
                        {cell}
                      </span>
                      {isMarked && (
                        <div style={{
                          ...s.daub,
                          background: isWinLine ? "#34d399" : "#a855f7",
                        }} />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Progress */}
            <div style={s.progressBar}>
              <div style={s.progressText}>
                {totalLines} / 5 lines completed
              </div>
              <div style={s.progressTrack}>
                <div style={{
                  ...s.progressFill,
                  width: `${(totalLines / 5) * 100}%`,
                  background: totalLines >= 5
                    ? "linear-gradient(90deg,#34d399,#10b981)"
                    : "linear-gradient(90deg,#a855f7,#6366f1)",
                }} />
              </div>
            </div>

            {/* Claim button */}
            {hasBingo && !winner && (
              <button
                className="bingo-btn"
                style={{ ...s.bingoBtn, animation: "glow 0.6s ease-in-out infinite" }}
                onClick={claimBingo}
                disabled={claimingBingo}
              >
                {claimingBingo ? "Claiming…" : "🎉 BINGO!"}
              </button>
            )}
          </div>

          {/* ── RIGHT: Caller panel ── */}
          <div style={s.callerSection}>

            {/* Last called display */}
            <div style={s.callerBox}>
              <div style={s.callerLabel}>LAST CALLED</div>
              {lastNum ? (
                <div style={s.callerDisplay} key={lastNum}>
                  <span style={{
                    ...s.callerLetter,
                    color: callerLetter ? LETTER_COLORS[BINGO_LETTERS.indexOf(callerLetter)] : "#fff",
                  }}>
                    {callerLetter}
                  </span>
                  <span style={{
                    ...s.callerNumber,
                    color: callerLetter ? LETTER_COLORS[BINGO_LETTERS.indexOf(callerLetter)] : "#fff",
                    animation: "popIn 0.4s ease both",
                  }}>
                    {lastNum}
                  </span>
                </div>
              ) : (
                <div style={s.callerEmpty}>–</div>
              )}
              {lastCaller && (
                <div style={s.callerBy}>
                  called by <strong style={{ color: "#c084fc" }}>
                    {lastCaller.playerId === playerId ? "You" : lastCaller.nickname}
                  </strong>
                </div>
              )}
              <div style={s.calledCount}>{calledNumbers.length} / 25 called</div>
            </div>

            {/* Number input — any player can call */}
            {!winner && (
              <div style={s.inputBox}>
                <div style={s.inputLabel}>CALL A NUMBER</div>
                <div style={s.inputRow}>
                  <input
                    ref={inputRef}
                    className="num-input"
                    type="number"
                    min={1}
                    max={25}
                    value={inputNum}
                    onChange={(e) => {
                      setInputNum(e.target.value);
                      setInputError("");
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="1–25"
                    style={s.numInput}
                    disabled={callCooldown}
                  />
                  <button
                    className="call-btn"
                    style={s.callBtn}
                    onClick={callNumber}
                    disabled={callCooldown || !inputNum}
                  >
                    Call!
                  </button>
                </div>
                {inputError && (
                  <div style={s.errorMsg}>{inputError}</div>
                )}
                <div style={s.hintText}>
                  Any player can call any uncalled number (1–25)
                </div>
              </div>
            )}

            {/* Called numbers grid */}
            <div style={s.calledSection}>
              <div style={s.calledTitle}>CALLED NUMBERS</div>
              <div style={s.calledGrid}>
                {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
                  const isCalled = calledSet.has(n);
                  const li = Math.floor((n - 1) / 5);
                  return (
                    <div
                      key={n}
                      style={{
                        ...s.calledNum,
                        background: isCalled
                          ? `${LETTER_COLORS[li]}22`
                          : "rgba(255,255,255,0.03)",
                        border: isCalled
                          ? `1.5px solid ${LETTER_COLORS[li]}88`
                          : "1px solid rgba(255,255,255,0.06)",
                        color: isCalled ? LETTER_COLORS[li] : "rgba(255,255,255,0.2)",
                        fontWeight: isCalled ? "700" : "400",
                        animation: n === justCalled ? "popIn 0.35s ease both" : "none",
                      }}
                    >
                      {n}
                    </div>
                  );
                })}
              </div>

              {/* BINGO legend */}
              <div style={s.legend}>
                {BINGO_LETTERS.map((l, i) => (
                  <div key={l} style={s.legendItem}>
                    <span style={{ color: LETTER_COLORS[i], fontWeight: "800" }}>{l}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                      {i * 5 + 1}–{i * 5 + 5}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

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
    background: "linear-gradient(160deg, #0d0d1a 0%, #1a0f2e 50%, #0d1a2e 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "20px 16px 48px",
    color: "#fff",
  },
  inner: { maxWidth: "980px", margin: "0 auto" },

  loadingWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    minHeight: "100vh", gap: "16px",
  },
  spinner: {
    width: "36px", height: "36px",
    border: "3px solid rgba(168,85,247,0.2)",
    borderTop: "3px solid #a855f7",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "rgba(255,255,255,0.4)", fontSize: "14px" },

  topBar: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: "24px",
  },
  roomPill: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "999px", color: "rgba(255,255,255,0.6)",
    padding: "8px 18px", fontSize: "13px",
    fontWeight: "600", letterSpacing: "2px",
  },
  playerPills: { display: "flex", gap: "6px" },
  avatarPill: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "rgba(255,255,255,0.1)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "700",
  },

  winnerBanner: {
    background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))",
    border: "1px solid rgba(168,85,247,0.5)",
    borderRadius: "20px", padding: "22px 28px",
    marginBottom: "24px",
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: "20px", flexWrap: "wrap",
  },
  winnerTitle: {
    fontSize: "32px", fontWeight: "900",
    letterSpacing: "5px", color: "#fff",
  },
  winnerSub: {
    color: "rgba(255,255,255,0.65)", fontSize: "14px",
    textAlign: "center", marginTop: "2px",
  },
  restartBtn: {
    background: "linear-gradient(135deg,#a855f7,#6366f1)",
    border: "none", borderRadius: "999px",
    color: "#fff", padding: "10px 26px",
    fontSize: "13px", fontWeight: "700", cursor: "pointer",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "28px",
    alignItems: "start",
  },

  // ── Card ──
  cardSection: { display: "flex", flexDirection: "column", gap: "10px" },
  cardTopRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: "2px",
  },
  cardLabelText: {
    color: "rgba(255,255,255,0.4)", fontSize: "11px",
    fontWeight: "700", letterSpacing: "2px",
  },
  nickBadge: {
    background: "rgba(168,85,247,0.2)",
    border: "1px solid rgba(168,85,247,0.4)",
    color: "#c084fc", borderRadius: "999px",
    padding: "3px 12px", fontSize: "12px", fontWeight: "600",
  },
  bingoHeader: {
    display: "grid", gridTemplateColumns: "repeat(5, 62px)", gap: "4px",
  },
  headerCell: {
    height: "36px", borderRadius: "10px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", fontWeight: "900", letterSpacing: "1px",
    background: "rgba(255,255,255,0.06)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 62px)",
    gridTemplateRows: "repeat(5, 62px)",
    gap: "4px",
  },
  cell: {
    borderRadius: "12px",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden", cursor: "default",
  },
  cellNum: {
    fontSize: "16px", position: "relative", zIndex: 1,
    transition: "color 0.2s ease, font-weight 0.2s ease, font-size 0.2s ease",
  },
  daub: {
    position: "absolute", width: "6px", height: "6px",
    borderRadius: "50%", bottom: "5px", right: "5px", opacity: 0.8,
  },
  progressBar: { marginTop: "2px" },
  progressText: {
    color: "rgba(255,255,255,0.45)", fontSize: "12px",
    fontWeight: "600", marginBottom: "5px", textAlign: "center",
  },
  progressTrack: {
    height: "5px", borderRadius: "999px",
    background: "rgba(255,255,255,0.08)", overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: "999px",
    transition: "width 0.4s ease, background 0.4s ease",
  },
  bingoBtn: {
    background: "linear-gradient(135deg,#34d399,#10b981)",
    border: "none", borderRadius: "14px", color: "#fff",
    fontSize: "18px", fontWeight: "900", letterSpacing: "3px",
    padding: "14px", cursor: "pointer", width: "100%",
    transition: "transform 0.15s ease, filter 0.15s ease",
  },

  // ── Caller ──
  callerSection: {
    display: "flex", flexDirection: "column", gap: "16px",
  },
  callerBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px", padding: "20px 24px",
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "4px",
  },
  callerLabel: {
    color: "rgba(255,255,255,0.35)", fontSize: "11px",
    fontWeight: "700", letterSpacing: "2px",
  },
  callerDisplay: {
    display: "flex", alignItems: "baseline", gap: "6px", lineHeight: 1,
  },
  callerLetter: { fontSize: "44px", fontWeight: "900" },
  callerNumber: { fontSize: "76px", fontWeight: "900" },
  callerEmpty: {
    fontSize: "76px", fontWeight: "900",
    color: "rgba(255,255,255,0.1)",
  },
  callerBy: {
    color: "rgba(255,255,255,0.35)", fontSize: "12px", marginTop: "2px",
  },
  calledCount: {
    color: "rgba(255,255,255,0.3)", fontSize: "12px",
    fontWeight: "600", marginTop: "2px",
  },

  inputBox: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "18px", padding: "18px 20px",
    display: "flex", flexDirection: "column", gap: "10px",
  },
  inputLabel: {
    color: "rgba(255,255,255,0.35)", fontSize: "11px",
    fontWeight: "700", letterSpacing: "2px",
  },
  inputRow: { display: "flex", gap: "10px" },
  numInput: {
    flex: 1, background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", color: "#fff",
    fontSize: "20px", fontWeight: "700", textAlign: "center",
    padding: "10px", outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    MozAppearance: "textfield",
  },
  callBtn: {
    background: "linear-gradient(135deg,#a855f7,#6366f1)",
    border: "none", borderRadius: "12px", color: "#fff",
    fontSize: "15px", fontWeight: "700", padding: "10px 22px",
    cursor: "pointer",
    transition: "filter 0.15s ease, transform 0.15s ease",
  },
  errorMsg: {
    color: "#f87171", fontSize: "13px", fontWeight: "600",
    animation: "slideIn 0.2s ease both",
  },
  hintText: {
    color: "rgba(255,255,255,0.28)", fontSize: "11px", lineHeight: 1.4,
  },

  calledSection: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "18px", padding: "16px 18px",
  },
  calledTitle: {
    color: "rgba(255,255,255,0.3)", fontSize: "10px",
    fontWeight: "700", letterSpacing: "2px",
    textTransform: "uppercase", marginBottom: "12px",
  },
  calledGrid: {
    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "5px",
    marginBottom: "12px",
  },
  calledNum: {
    height: "34px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", transition: "all 0.25s ease",
  },
  legend: {
    display: "flex", justifyContent: "space-between", marginTop: "4px",
  },
  legendItem: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "1px",
    fontSize: "13px",
  },
};
