// DrawingCanvas.jsx
// Drawer: captures strokes → writes to Firestore
// Guessers: reads strokes from Firestore → replays on canvas

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const COLORS = [
  "#ffffff","#f87171","#fb923c","#facc15","#4ade80",
  "#34d399","#60a5fa","#a78bfa","#f472b6","#000000",
];
const SIZES = [3, 6, 12, 20];

export default function DrawingCanvas({ roomId, isDrawer, currentWord }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const strokeBuffer = useRef([]);
  const flushTimer = useRef(null);
  const lastStrokeCount = useRef(0);

  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState("pen"); // pen | eraser

  // ── Flush stroke buffer to Firestore every 80ms ──────────────────────────
  const flushStrokes = useCallback(async () => {
    if (!strokeBuffer.current.length || !isDrawer) return;
    const newStrokes = strokeBuffer.current.splice(0);
    try {
      const roomRef = doc(db, "rooms", roomId);
      // We append to existing strokes array
      const snap = await import("firebase/firestore").then(({ getDoc }) => getDoc(roomRef));
      const existing = snap.data()?.canvasStrokes || [];
      await updateDoc(roomRef, {
        canvasStrokes: [...existing, ...newStrokes],
      });
    } catch (e) {
      console.error("Stroke flush error", e);
    }
  }, [roomId, isDrawer]);

  // ── Draw a segment on the canvas ─────────────────────────────────────────
  const drawSegment = useCallback((ctx, seg) => {
    ctx.globalCompositeOperation =
      seg.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = seg.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
  }, []);

  // ── Replay all strokes (for guessers) ────────────────────────────────────
  const replayStrokes = useCallback((strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((seg) => drawSegment(ctx, seg));
    lastStrokeCount.current = strokes.length;
  }, [drawSegment]);

  // ── Listen to Firestore strokes (guessers only) ───────────────────────────
  useEffect(() => {
    if (isDrawer) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      const strokes = snap.data()?.canvasStrokes || [];
      if (strokes.length !== lastStrokeCount.current) {
        replayStrokes(strokes);
      }
    });
    return () => unsub();
  }, [roomId, isDrawer, replayStrokes]);

  // ── Clear canvas when word changes ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lastStrokeCount.current = 0;
  }, [currentWord]);

  // ── Mouse / touch helpers ─────────────────────────────────────────────────
  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    if (!isDrawer) return;
    drawing.current = true;
    lastPos.current = getPos(e);
  }

  function draw(e) {
    if (!isDrawer || !drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    const seg = {
      x0: lastPos.current.x, y0: lastPos.current.y,
      x1: pos.x, y1: pos.y,
      color: tool === "eraser" ? "#000000" : color,
      size: tool === "eraser" ? size * 3 : size,
      tool,
    };
    drawSegment(ctx, seg);
    strokeBuffer.current.push(seg);
    lastPos.current = pos;

    // Debounce flush
    clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushStrokes, 80);
  }

  function stopDraw() {
    drawing.current = false;
    lastPos.current = null;
    clearTimeout(flushTimer.current);
    flushStrokes();
  }

  async function clearCanvas() {
    if (!isDrawer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeBuffer.current = [];
    await updateDoc(doc(db, "rooms", roomId), { canvasStrokes: [] });
  }

  return (
    <div style={s.wrap}>
      {/* Toolbar — only for drawer */}
      {isDrawer && (
        <div style={s.toolbar}>
          {/* Colors */}
          <div style={s.toolGroup}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                style={{
                  ...s.colorBtn,
                  background: c,
                  outline: color === c && tool === "pen" ? "2px solid #fff" : "2px solid transparent",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>

          {/* Sizes */}
          <div style={s.toolGroup}>
            {SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => setSize(sz)}
                style={{
                  ...s.sizeBtn,
                  outline: size === sz ? "2px solid #a855f7" : "2px solid transparent",
                }}
              >
                <div style={{
                  width: sz + 4, height: sz + 4,
                  borderRadius: "50%", background: "#fff",
                  maxWidth: "20px", maxHeight: "20px",
                }} />
              </button>
            ))}
          </div>

          {/* Tools */}
          <div style={s.toolGroup}>
            <button
              style={{ ...s.toolBtn, background: tool === "eraser" ? "#a855f7" : "rgba(255,255,255,0.1)" }}
              onClick={() => setTool(tool === "eraser" ? "pen" : "eraser")}
            >
              🧹 Eraser
            </button>
            <button style={{ ...s.toolBtn, background: "rgba(239,68,68,0.3)", color: "#f87171" }}
              onClick={clearCanvas}>
              🗑️ Clear
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{
          ...s.canvas,
          cursor: isDrawer
            ? (tool === "eraser" ? "cell" : "crosshair")
            : "default",
          background: "#1a1a2e",
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* Word hint for drawer */}
      {isDrawer && currentWord && (
        <div style={s.wordHint}>
          Draw: <strong style={{ color: "#a855f7" }}>{currentWord}</strong>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: "10px", width: "100%" },
  toolbar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "14px",
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  toolGroup: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  colorBtn: {
    width: "22px", height: "22px", borderRadius: "50%",
    border: "none", cursor: "pointer", flexShrink: 0,
    transition: "outline 0.1s",
  },
  sizeBtn: {
    width: "32px", height: "32px", borderRadius: "8px",
    border: "none", background: "rgba(255,255,255,0.08)",
    cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center",
  },
  toolBtn: {
    padding: "6px 12px", borderRadius: "8px", border: "none",
    color: "#fff", fontSize: "12px", cursor: "pointer",
    fontWeight: "600",
  },
  canvas: {
    width: "100%",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.1)",
    touchAction: "none",
    display: "block",
  },
  wordHint: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: "15px",
    padding: "8px",
  },
};
