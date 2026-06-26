// playerIdentity.js
// Same-browser multiple windows used to collide because everything lived in
// plain sessionStorage, which is shared by ALL windows of the same browser
// for the same origin (only true Incognito gets separate storage). This
// caused two players in the same browser to silently overwrite each other's
// nickname/host flag, breaking every game in different, confusing ways.
//
// Fix: each tab gets its own random playerId on first load, stored in
// sessionStorage under a CONSTANT key (which is fine — sessionStorage IS
// per-tab in modern Chrome/Firefox for storage purposes EXCEPT it's actually
// per-tab already... the real bug was the same physical browser *window*
// being duplicated via Ctrl+N, which in some setups still shares the
// underlying session). To make this bulletproof regardless of how the user
// opens a second window, we generate the id once and require every page
// that needs identity to read it through these helpers — never raw
// sessionStorage.getItem("playverse_nickname") elsewhere in the app.

function generatePlayerId() {
  return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Returns a stable per-tab id. Created once per tab lifetime.
export function getPlayerId() {
  let id = sessionStorage.getItem("playverse_playerId");
  if (!id) {
    id = generatePlayerId();
    sessionStorage.setItem("playverse_playerId", id);
  }
  return id;
}

export function setPlayerSession({ nickname, isHost, roomCode, roomId }) {
  sessionStorage.setItem("playverse_nickname", nickname);
  sessionStorage.setItem("playverse_isHost", String(isHost));
  sessionStorage.setItem("playverse_roomCode", roomCode);
  sessionStorage.setItem("playverse_roomId", roomId);
  getPlayerId(); // ensure it exists
}

export function getPlayerSession() {
  return {
    playerId: getPlayerId(),
    nickname: sessionStorage.getItem("playverse_nickname") || "Player",
    isHost: sessionStorage.getItem("playverse_isHost") === "true",
    roomCode: sessionStorage.getItem("playverse_roomCode") || "",
    roomId: sessionStorage.getItem("playverse_roomId") || "",
  };
}

export function clearPlayerSession() {
  sessionStorage.removeItem("playverse_nickname");
  sessionStorage.removeItem("playverse_isHost");
  sessionStorage.removeItem("playverse_roomCode");
  sessionStorage.removeItem("playverse_roomId");
  // Deliberately keep playverse_playerId — the tab keeps its identity
  // even after leaving a room, so rejoining doesn't create ambiguity.
}
