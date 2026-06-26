import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export function startHeartbeat(roomId) {

  return setInterval(async () => {

    try {

      await updateDoc(
        doc(db, "rooms", roomId),
        {
          lastActivity: Date.now(),
        }
      );

    } catch (err) {

      console.log(err);

    }

  }, 10000);

}