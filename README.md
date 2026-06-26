# FRENZY

A multiplayer party game web app — create a room, invite friends, and play a bunch of fun mini-games together in real time.

**Live demo:** vercel link will soon be updated

## Games Included

- **Bingo** — classic bingo, multiplayer style
- **Quick Trivia** — fast-paced trivia rounds
- **Secret Imposter** — social deduction game
- **Sketch and Guess** — draw and guess with friends
- **Truth or Dare**
- **Would You Rather**
- **Play With Strangers** — jump into a room with random players

## Features

- Create or join a game room with a room code
- Real-time gameplay powered by Firebase
- Player identity / presence tracking (so you can see who's online)
- Clean, responsive UI built with React

## Tech Stack

- **Frontend:** React 18 + Vite — fast dev server and build tooling
- **Routing:** React Router — client-side navigation between game pages (Home, Lobby, Create/Join Room, individual games)
- **Backend / Database:** Firebase **Firestore** — real-time, document-based database used to sync room state, player lists, and live game data across clients
- **Realtime sync:** Firestore's `onSnapshot` listeners (typical pattern for this kind of setup) keep all players' UIs in sync as room/game state changes
- **Player presence:** Custom heartbeat system (`heartbeat.js`) — periodic writes to Firestore to track which players are currently online/active in a room, since Firestore doesn't have built-in presence like Realtime Database does
- **Player identity:** Custom lightweight identity system (`playerIdentity.js`) — generates/stores a player ID and name without requiring full Firebase Auth
- **Styling:** Mix of global CSS (`App.css`, `index.css`) and inline JS style objects (camelCase CSS-in-JS pattern, e.g. `button`, `backBtn` style objects)
- **Deployment:** Vercel — static hosting with CI/CD from GitHub

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Firebase project with **Firestore** enabled (see below)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/frenzy.git
cd frenzy

# Install dependencies
npm install

# Run the dev server
npm run dev
```

The app will be running at `http://localhost:5173`.

### Firebase Setup

This project uses **Firebase Firestore** to sync room and game state in real time.

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** (Build → Firestore Database → Create database)
3. Copy your Firebase config into a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Update `src/firebase.js` to read from these environment variables if it isn't already.

> Never commit your `.env` file — it's already excluded via `.gitignore`.


## Project Structure

```
frenzy/
├── public/              # Static assets, icons
├── src/
│   ├── assets/          # Images, media
│   ├── components/      # Reusable UI components
│   ├── pages/           # Game pages (Bingo, Trivia, etc.)
│   ├── firebase.js      # Firebase config & init
│   ├── heartbeat.js     # Player presence/online tracking
│   ├── imposterTopics.js
│   ├── playerIdentity.js
│   ├── App.jsx
│   └── main.jsx
├── .gitignore
└── README.md
```

## Contributing

This started as a fun personal project, but contributions, suggestions, and bug reports are welcome! Feel free to open an issue or submit a pull request.

## Acknowledgements

Built with React, Vite, and Firebase. Made for fun game time with friends.
