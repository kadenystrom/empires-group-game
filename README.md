# 👑 Empires: The Secret Identity Game
👉 **[Play the Live Game Here via Github Pages](https://kadenystrom.github.io/empires-group-game/)** (No install or setup required!)

---

**Empires** is an open-source, web-based social deduction and memory game designed for groups. It transforms a classic parlor game into a synchronized digital experience with real-time state management, automated secret name reveals, and a visual "Empire Tree" to track conquests.

---

## 📖 The Origin Story (Why I Built This)
In the traditional pen-and-paper/in-person version of "Empires," one person always has to sit out of the game to collect the secret names, shuffle them, and act as a neutral moderator. I built this application to solve that exact problem. By integrating browser-native Text-to-Speech and real-time database syncing, the app acts as the automated moderator—allowing everyone in the room to actually play the game together.

---

## 🚀 Key Features
* **Real-Time Sync:** Powered by Firebase Realtime Database, ensuring all players and the host see instant updates when a capture happens or a turn changes.
* **Automated Reveal Engine:** Uses the Web Speech API to read out secret names in a randomized order, ensuring the host can play along without seeing the secrets.
* **Empire Tree Visualizer:** A dynamic, recursive UI that displays the hierarchy of "captured" players as empires grow and merge during the game.
* **Smart Room Management:** Generates dynamic QR codes for frictionless lobby entry. Features an "Undo Last Capture" safeguard for accidental misclicks.
* **No-Install Gameplay:** Fully web-hosted and mobile-responsive. Players just need a 5-letter room code to join the action from any smartphone.

---

## 🛠️ Tech Stack
This project was built without heavy frameworks to focus on core web technologies and raw state management.
* **Frontend:** HTML5, CSS3 (Custom Variables, CSS Grid/Flexbox), Vanilla JavaScript
* **Backend:** Firebase Realtime Database (Compat v9)
* **APIs & Libraries:** Web Speech API, `qrcode.js`
* **Deployment:** GitHub Pages

---

## 🎮 How to Play

1. **Join the Lobby:** The Host creates a room and shares the QR Code or 5-letter code. Every player joins on their own device, entering their **Real Name** and a **Secret Empire Name** (e.g., "The Flying Pickles").
2. **The Reveal:** Once everyone has joined, the Host starts the Reveal phase. The app uses Text-to-Speech to announce all secret names in a random order. Players now know which names are "in play," but not who owns them.
3. **The Guessing:** Players take turns (in person) guessing the secret identities of others.
   * **Correct Guess:** If you correctly guess someone's secret name, they (and anyone they have previously captured) join your team. You get to guess again.
   * **Incorrect Guess:** If you are wrong, the person you guessed becomes the next guesser.
4. **Victory:** The game ends when one player has captured everyone else, forming a single massive Empire.

---

## ⚙️ Local Installation & Setup

To run this project locally or deploy your own instance:

1. Clone the repository:
`git clone [https://github.com/KadeNystrom/empires-group-game.git](https://github.com/KadeNystrom/empires-group-game.git)`
2. Set up a new project at [Firebase Console](https://console.firebase.google.com/).
3. Create a **Realtime Database** and configure your read/write security rules.
4. Open `script.js` and replace the `firebaseConfig` object with your own project credentials.
5. Launch `index.html` via a local server (e.g., VS Code Live Server).

---

*Designed and developed by Kade Nystrom.*
