// ─── Add this import at the top of your router file ───────────────────────────
import BingoGame from "./pages/BingoGame";

// ─── Add this route inside your <Routes> (alongside your other game routes) ───
<Route path="/game/:roomId/bingo" element={<BingoGame />} />


// ─── Example of what your Routes block might look like after ──────────────────
// <Routes>
//   <Route path="/"                          element={<Home />} />
//   <Route path="/room/:roomId"              element={<GameSelect />} />
//   <Route path="/game/:roomId/bingo"        element={<BingoGame />} />
//   <Route path="/game/:roomId/quick-trivia" element={<QuickTrivia />} />
//   {/* ...other games */}
// </Routes>
