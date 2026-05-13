# 👑 Empires: The Secret Identity Game

**Empires** is a web-based social deduction and memory game designed for groups. It transforms the classic "parlor game" into a high-tech experience with real-time synchronization, automated secret name reveals, and a visual "Empire Tree" to track conquests.

---

## 🎮 How to Play

1. **Join the Lobby** The Host creates a room and shares the **QR Code** or link. Every player joins on their own device, entering their **Real Name** and a **Secret Empire Name** (e.g., "The Flying Pickles").

2. **The Reveal** Once everyone has joined, the Host starts the Reveal phase. The app uses **Text-to-Speech** to announce all secret names in a random order so everyone knows which names are "in play," but not who owns them.

3. **The Guessing** Players take turns (in person) guessing the secret identities of others.
   * **Correct Guess**: If you correctly guess someone's secret name, they (and their entire empire) join your team. You get to guess again.
   * **Incorrect Guess**: If you are wrong, the person you guessed becomes the next guesser.

4. **Victory** The game ends when one player has captured everyone else, forming a single massive Empire.

---

## 🚀 Key Features

* **Real-Time Sync**: Powered by **Firebase Realtime Database**, ensuring all players and the host see updates instantly.
* **Automated Reveal Engine**: Uses the browser's **Speech Synthesis API** to read out secret names, ensuring the host can play along without seeing the secrets.
* **Smart QR Integration**: Generates dynamic QR codes for easy room entry.
* **Empire Tree Visualizer**: A dynamic UI that displays the hierarchy of "captured" players during the game.
* **Mobile Optimized**: A fully responsive design with a **Display Mode** for tablets or TVs and a **Touch Friendly** interface for phones.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3 (Custom Variables), and Vanilla JavaScript.
* **Backend**: Firebase Realtime Database (Compat v9) for data storage/updates, and hosted on Github Pages.
* **Libraries**: `qrcode.js` for easy sharing.
* **Audio**: Web Speech API for the Reveal phase.
