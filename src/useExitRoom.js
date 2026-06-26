// useExitRoom.js
// One shared implementation of "leave the room" used by every game page.
// NOTE: We intentionally do NOT hook into beforeunload or popstate.
// The browser's native back button should navigate normally (React Router
// handles it). Explicit room cleanup only happens when a user deliberately
// clicks a "Leave" or "Back to Lobby" button inside the app.

import { useNavigate } from "react-router-dom";
import { doc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";
import { getPlayerSession, clearPlayerSession } from "./playerIdentity";

export function useExitRoom(roomId, players) {
  const navigate = useNavigate();
  const { playerId } = getPlayerSession();

  async function exitRoom() {
    try {
      const list = players || [];
      const me = list.find((p) => p.playerId === playerId);

      if (me) {
        const remaining = list.filter((p) => p.playerId !== playerId);

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

  return exitRoom;
}
