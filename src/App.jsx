
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import BingoGame from "./pages/BingoGame";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import PlayWithStrangers from "./pages/PlayWithStrangers";
import Lobby from "./pages/Lobby";
import GameSelect from "./pages/GameSelect";
import SketchAndGuess from "./pages/SketchAndGuess";
import QuickTrivia from "./pages/QuickTrivia";
import WouldYouRather from "./pages/WouldYouRather";
import TruthOrDare from "./pages/TruthOrDare";
import SecretImposter from "./pages/SecretImposter";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/join-room" element={<JoinRoom />} />
        <Route path="/play-with-strangers" element={<PlayWithStrangers />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game-select/:roomId" element={<GameSelect />} />

        {/* Games */}
        <Route path="/game/:roomId/sketch-guess" element={<SketchAndGuess />} />
        <Route path="/game/:roomId/quick-trivia" element={<QuickTrivia />} />
        <Route path="/game/:roomId/would-you-rather" element={<WouldYouRather />} />
        <Route path="/game/:roomId/truth-or-dare" element={<TruthOrDare />} />
        <Route path="/game/:roomId/secret-imposter" element={<SecretImposter />} />
        <Route path="/game/:roomId/bingo" element={<BingoGame />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
