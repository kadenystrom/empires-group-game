/**
 * =============================================================================
 * EMPIRES: GROUP GAME - CORE LOGIC (V1.1 - Secure & Validated)
 * =============================================================================
 */

// [1] FIREBASE CONFIG
// PRO-TIP: Before pushing to GitHub, consider moving this to a separate config.js 
// and adding that file to your .gitignore if you want to keep your project clean.
const firebaseConfig = {
    apiKey: "AIzaSyAjNvk5FRx1t0-CNWINp9DrTU5AA7Bau_U",
    authDomain: "empires-group-game.firebaseapp.com",
    projectId: "empires-group-game",
    storageBucket: "empires-group-game.firebasestorage.app",
    messagingSenderId: "327538654623",
    appId: "1:327538654623:web:fa6f964973c6a252c191aa",
    databaseURL: "https://empires-group-game-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const EmpireDB = {
    roomRef: (code) => database.ref(`rooms/${code}`),
    playersRef: (code) => database.ref(`rooms/${code}/players`),

    async createRoom(code) {
        return this.roomRef(code).set({
            metadata: { active: true, lastActivity: firebase.database.ServerValue.TIMESTAMP }
        });
    },

    updateActivity(code) {
        if (code) this.roomRef(code).child('metadata/lastActivity').set(firebase.database.ServerValue.TIMESTAMP);
    },

    addPlayer(code, real, secret) {
        this.updateActivity(code);
        const ref = this.playersRef(code).push();
        return ref.set({ id: ref.key, realName: real, secretName: secret, leaderId: ref.key, isCaptured: false }).then(() => ref.key);
    },

    capturePlayer(code, guesserId, targetId) {
        this.updateActivity(code);
        const updates = {};
        updates[`rooms/${code}/players/${targetId}/leaderId`] = guesserId;
        updates[`rooms/${code}/players/${targetId}/isCaptured`] = true;
        return database.ref().update(updates);
    },

    deletePlayer(code, id) { return this.playersRef(code).child(id).remove(); },
    resetPlayers(code) { return this.playersRef(code).remove(); },
    deleteRoom(code) { return this.roomRef(code).remove(); },
    restorePlayers(code, state) { return this.playersRef(code).set(state); }
};

// [2] GLOBAL STATE
const UI = {
    app: document.getElementById('app'),
    homeScreen: document.getElementById('home-screen'),
    joinScreen: document.getElementById('join-screen'),
    waitingScreen: document.getElementById('waiting-screen'),
    hostScreen: document.getElementById('host-screen'),
    hostHeader: document.getElementById('host-header'),
    dashboardLayout: document.getElementById('dashboard-layout'),
    sidebar: document.getElementById('host-sidebar'),
    displayToggle: document.getElementById('displayToggle'),
    roomCodeDisplay: document.getElementById('display-room-code'),
    headerRoomLabel: document.getElementById('header-room-display'),
    joinStep1: document.getElementById('join-step-1'),
    joinStep2: document.getElementById('join-step-2'),
    roomCodeInput: document.getElementById('roomCodeInput'),
    verifiedLabel: document.getElementById('verified-room-label'),
    waitingLabel: document.getElementById('waiting-room-display'),
    realNameInput: document.getElementById('realNameInput'),
    identityInput: document.getElementById('identityInput'),
    hostAddReal: document.getElementById('hostAddReal'),
    hostAddSecret: document.getElementById('hostAddSecret'),
    qrCodeBox: document.getElementById('qrcode'),
    revealPhase: document.getElementById('reveal-phase'),
    gamePhase: document.getElementById('game-phase'),
    victoryScreen: document.getElementById('victory-screen'),
    finalTreeDisplay: document.getElementById('final-tree-display'),
    sharedControls: document.getElementById('shared-game-controls'),
    nameList: document.getElementById('nameList'),
    empireDisplay: document.getElementById('empire-display'),
    winnerName: document.getElementById('winner-name'),
    realNameList: document.getElementById('realNamePrune'),
    secretNameList: document.getElementById('secretNamePrune'),
    secretPruneBox: document.getElementById('secretPruneBox'),
    stopRevealBtn: document.getElementById('stopBtn'),
    undoBtn: document.getElementById('undoBtn'),
    toastContainer: document.getElementById('toast-container'),
    rejoinContainer: document.getElementById('rejoin-container'),
    rejoinCodeLabel: document.getElementById('rejoin-code')
};

const urlParams = new URLSearchParams(window.location.search);
let currentRoomCode = urlParams.get('room')?.toUpperCase() || null;
const isHost = urlParams.get('host') === 'true';

let players = {};
let lastAction = null;
let isRevealing = false;
let activeGuesserId = null;
let myPlayerId = null;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const SPEECH_CONFIG = { rate: 0.85, pitch: 1.0, volume: 1.0, pauseDuration: 1000 };
let preferredVoice = null;
let revealTimeout = null; 
let revealGeneration = 0;

// [3] INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', (e) => { if(e.key === 'Enter') handleEnterKey(e); });
    UI.displayToggle.addEventListener('change', toggleDisplayMode);
    initGameSession();
    loadVoices();
});

function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        preferredVoice = enVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || enVoices[0] || voices[0];
    }
}
window.speechSynthesis.onvoiceschanged = loadVoices;

let lastClickTime = 0;
function handleGlobalClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const now = Date.now();
    if (now - lastClickTime < 200) return;
    lastClickTime = now;
    e.preventDefault();
    const { action, id, target } = btn.dataset;

    if (['delete', 'reset', 'restart', 'close-room', 'undo'].includes(action) && !btn.classList.contains('confirm')) {
        const originalText = btn.innerHTML;
        btn.innerHTML = "Are you sure?";
        btn.classList.add('confirm');
        btn.dataset.originalText = originalText; 
        setTimeout(() => { if (btn.classList.contains('confirm')) { btn.innerHTML = originalText; btn.classList.remove('confirm'); } }, 3000);
        return;
    }
    if (btn.classList.contains('confirm')) { btn.innerHTML = btn.dataset.originalText; btn.classList.remove('confirm'); }
    executeAction(action, id, target);
}

function handleEnterKey(e) {
    if (e.target === UI.roomCodeInput) executeAction('verify-room');
    if (e.target === UI.realNameInput || e.target === UI.identityInput) executeAction('submit-join');
}

function executeAction(action, id, target) {
    switch (action) {
        case 'rejoin': rejoinSession(); break;
        case 'show-host-init': createRoom(); break;
        case 'show-join': showJoinInput(); break;
        case 'verify-room': verifyRoom(); break;
        case 'submit-join': submitPlayerDetails(); break;
        case 'copy-link': copyJoinLink(); break;
        case 'host-add': hostManualAdd(); break;
        case 'toggle-secrets-ui': UI.secretPruneBox.classList.toggle('hidden'); break;
        case 'start-reveal': revealAndShuffle(); break;
        case 'stop-reveal': stopReveal(); break;
        case 'go-gameboard': goToGameboard(); break;
        case 'toggle-dropdown': toggleDropdown(id); break;
        case 'capture': performCapture(id, target); break;
        case 'delete': EmpireDB.deletePlayer(currentRoomCode, id); break;
        case 'undo': undoLastCapture(); break;
        case 'reset': EmpireDB.resetPlayers(currentRoomCode).then(() => location.reload()); break;
        case 'restart': restartGame(); break;
        case 'close-room': EmpireDB.deleteRoom(currentRoomCode).then(() => { localStorage.removeItem('empires_host_room'); location.href = location.pathname; }); break;
        case 'reload': location.reload(); break;
    }
}

// [4] NAME VALIDATION (NEW)
function validateNewPlayer(real, secret) {
    if (!real || !secret) { showToast("Both names required."); return false; }
    const playerList = Object.values(players);
    const realTaken = playerList.some(p => p.realName.toLowerCase() === real.toLowerCase());
    const secretTaken = playerList.some(p => p.secretName.toLowerCase() === secret.toLowerCase());
    
    if (realTaken) { showToast("That Real Name is already in the lobby."); return false; }
    if (secretTaken) { showToast("That Empire Name is already taken."); return false; }
    return true;
}

// [5] UI RENDERING
function updateHostUI() {
    if (!UI.realNameList) return;
    const playerArray = Object.values(players);
    const leaders = playerArray.filter(p => !p.isCaptured).sort((a,b) => a.realName.localeCompare(b.realName));

    UI.realNameList.innerHTML = playerArray.sort((a,b) => a.realName.localeCompare(b.realName))
        .map(p => `<div class="player-item"><span>${p.realName}</span> <button class="delete-btn" data-action="delete" data-id="${p.id}">X</button></div>`).join('');

    UI.secretNameList.innerHTML = playerArray.sort((a,b) => a.secretName.localeCompare(b.secretName))
        .map(p => `<div class="player-item"><span>${p.secretName}</span> <button class="delete-btn" data-action="delete" data-id="${p.id}">X</button></div>`).join('');

    UI.empireDisplay.innerHTML = leaders.map(l => {
        const isSelfActive = activeGuesserId === l.id;
        return `
        <div class="leader-row ${isSelfActive ? 'active' : ''}">
            <button class="leader-btn" data-action="toggle-dropdown" data-id="${l.id}">
                <span>👑 ${l.realName}</span>
                <span class="capture-pill">${isSelfActive ? 'CLOSE' : 'CAPTURE'}</span>
            </button>
            <div class="target-dropdown">
            ${leaders.filter(target => target.id !== l.id).map(target => `
                    <div class="target-option" data-action="capture" data-id="${l.id}" data-target="${target.id}">${target.realName}</div>
                `).join('')}
            </div>
            <div class="nested-empire">${renderEmpireTree(l.id)}</div>
        </div>`;
    }).join('');
    checkVictory(leaders);
}

function renderEmpireTree(parentId) {
    const children = Object.values(players).filter(p => p.leaderId === parentId && p.id !== parentId);
    return children.map(child => `
    <div class="captured-branch">
        <div class="captured-player">↳ ${child.realName} <span class="id-tag">(${child.secretName})</span></div>
        <div class="sub-empire" style="margin-left: 20px; border-left: 1px solid var(--border);">
            ${renderEmpireTree(child.id)}
        </div>
    </div>`).join('');
}

// [6] CORE LOGIC
async function initGameSession() {
    const savedRoom = localStorage.getItem('empires_host_room');
    if (!currentRoomCode && savedRoom) { UI.rejoinContainer.classList.remove('hidden'); UI.rejoinCodeLabel.innerText = savedRoom; }

    if (!currentRoomCode) { showScreen('home-screen'); } 
    else {
        const isExpired = await checkRoomExpiry(currentRoomCode);
        if (isExpired) { 
            showToast("Session expired or not found."); 
            localStorage.removeItem('empires_host_room'); 
            setTimeout(() => location.href = location.pathname, 2000);
            return; 
        }
        isHost ? setupHostSession() : setupPlayerSession();
    }
    UI.app.classList.add('ready');
}

function setupHostSession() {
    localStorage.setItem('empires_host_room', currentRoomCode);
    EmpireDB.updateActivity(currentRoomCode);
    showScreen('host-screen');
    UI.roomCodeDisplay.innerText = currentRoomCode;
    UI.headerRoomLabel.innerText = currentRoomCode;
    EmpireDB.playersRef(currentRoomCode).on('value', snap => { players = snap.val() || {}; updateHostUI(); });
    generateJoinQR();
}

function setupPlayerSession() {
    showJoinInput();
    EmpireDB.playersRef(currentRoomCode).on('value', snap => {
        const cur = snap.val() || {};
        if (myPlayerId && !cur[myPlayerId] && !UI.waitingScreen.classList.contains('hidden')) {
            myPlayerId = null; showToast("Lobby reset. Please re-join!", "success"); goToPlayerDetails(currentRoomCode);
        }
    });
}

function submitPlayerDetails() {
    const r = UI.realNameInput.value.trim(), s = UI.identityInput.value.trim();
    if (validateNewPlayer(r, s)) {
        EmpireDB.addPlayer(currentRoomCode, r, s).then(key => {
            myPlayerId = key; UI.realNameInput.value = ""; UI.identityInput.value = "";
            showScreen('waiting-screen'); UI.waitingLabel.innerText = currentRoomCode;
        });
    }
}

function hostManualAdd() {
    const r = UI.hostAddReal.value.trim(), s = UI.hostAddSecret.value.trim();
    if (validateNewPlayer(r, s)) {
        EmpireDB.addPlayer(currentRoomCode, r, s);
        UI.hostAddReal.value = ""; UI.hostAddSecret.value = "";
    }
}

function performCapture(guesserId, targetId) {
    const guesser = players[guesserId];
    const target = players[targetId];
    if (guesser && target) showToast(`${guesser.realName} captured ${target.realName}!`, "success");
    activeGuesserId = null;
    lastAction = JSON.parse(JSON.stringify(players));
    EmpireDB.capturePlayer(currentRoomCode, guesserId, targetId);
}

// [7] REVEAL ENGINE (MOBILE OPTIMIZED)
function revealAndShuffle() {
    window.speechSynthesis.cancel();
    if (revealTimeout) clearTimeout(revealTimeout); 

    revealGeneration++;
    const currentGen = revealGeneration; 
    isRevealing = true; 
    UI.nameList.innerHTML = ""; 
    UI.stopRevealBtn.classList.remove('hidden');

    let names = Object.values(players).map(p => p.secretName).sort(() => Math.random() - 0.5);
    let index = 0;

    // Direct Speech Trigger: iPhones require speech start in a click handler.
    // We trigger a silent/tiny utterance to "unlock" the audio context.
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));

    const speakNext = () => {
        if (!isRevealing || index >= names.length || currentGen !== revealGeneration) return;

        const fullName = names[index];
        const spokenName = fullName.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
        const textToSpeak = /[a-zA-Z0-9]/.test(spokenName) ? spokenName : "Emoji name";

        let utt = new SpeechSynthesisUtterance(textToSpeak);
        utt.lang = 'en-US'; 
        if (preferredVoice) utt.voice = preferredVoice;
        utt.rate = SPEECH_CONFIG.rate;
        utt.pitch = SPEECH_CONFIG.pitch;
        utt.volume = SPEECH_CONFIG.volume;

        utt.onstart = () => {
            if (currentGen === revealGeneration) {
                const li = document.createElement('li');
                li.textContent = fullName; 
                UI.nameList.appendChild(li);
                li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        };

        utt.onend = () => {
            if (currentGen === revealGeneration && isRevealing) {
                index++;
                revealTimeout = setTimeout(speakNext, SPEECH_CONFIG.pauseDuration);
            }
        };

        window.speechSynthesis.speak(utt);
    };

    speakNext();
}

function stopReveal() { 
    isRevealing = false; 
    revealGeneration++;
    window.speechSynthesis.cancel(); 
    if (revealTimeout) clearTimeout(revealTimeout); 
    UI.nameList.innerHTML = ""; 
    UI.stopRevealBtn.classList.add('hidden'); 
}

// [8] UTILITIES
async function checkRoomExpiry(code) {
    const snap = await EmpireDB.roomRef(code).child('metadata').once('value');
    if (!snap.exists()) return true;
    
    // SAFE EXPIRY: We check the time, but we DON'T let the client delete the room.
    // This prevents a user with a wrong system clock from deleting an active game.
    const lastActive = snap.val().lastActivity || 0;
    return (Date.now() - lastActive > TWO_HOURS_MS);
}

function checkVictory(leaders) {
    const isGameOver = Object.keys(players).length > 1 && leaders.length === 1;
    const hasStartedGame = UI.revealPhase.classList.contains('hidden');
    
    // Target the specific reset button in the shared controls
    const sharedResetBtn = UI.sharedControls.querySelector('[data-action="reset"]');

    UI.victoryScreen.classList.toggle('hidden', !isGameOver);

    if (isGameOver) {
        UI.gamePhase.classList.add('hidden');
        UI.winnerName.innerText = `${leaders[0].realName}'s Empire Wins!`;
        UI.finalTreeDisplay.innerHTML = `
            <div class="leader-row" style="border-color: var(--success);">
                <div class="leader-btn" style="cursor: default;">
                    <span>👑 ${leaders[0].realName}</span>
                </div>
                <div class="nested-empire" style="display:block">
                    ${renderEmpireTree(leaders[0].id)}
                </div>
            </div>`;
        
        // HIDE the reset button when someone wins
        if (sharedResetBtn) sharedResetBtn.classList.add('hidden');
    } else {
        if (hasStartedGame) UI.gamePhase.classList.remove('hidden');
        
        // SHOW the reset button if we are playing (or if we just Undid a victory)
        if (sharedResetBtn) sharedResetBtn.classList.remove('hidden');
    }

    // Container visibility logic
    UI.sharedControls.classList.toggle('hidden', !hasStartedGame);
    UI.undoBtn.classList.toggle('hidden', !lastAction);
}

async function createRoom() {
    let newCode, isUnique = false;
    while (!isUnique) {
        newCode = Array.from({length: 5}, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]).join('');
        const snapshot = await EmpireDB.roomRef(newCode).once('value');
        if (!snapshot.exists()) isUnique = true;
    }
    await EmpireDB.createRoom(newCode);
    localStorage.setItem('empires_host_room', newCode);
    location.search = `?room=${newCode}&host=true`;
}

function verifyRoom() {
    const code = UI.roomCodeInput.value.trim().toUpperCase();
    if (code.length === 5) checkRoomExpiry(code).then(exp => !exp ? goToPlayerDetails(code) : showToast("Room expired or not found."));
}

function undoLastCapture() { if (lastAction) { EmpireDB.restorePlayers(currentRoomCode, lastAction); lastAction = null; updateHostUI(); showToast("Capture undone", "success"); } }
async function restartGame() { lastAction = null; await EmpireDB.resetPlayers(currentRoomCode); activeGuesserId = null; UI.victoryScreen.classList.add('hidden'); UI.gamePhase.classList.add('hidden'); UI.sharedControls.classList.add('hidden'); UI.revealPhase.classList.remove('hidden'); UI.nameList.innerHTML = ""; showToast("Lobby cleared!", "success"); }
function showScreen(screenId) { [UI.homeScreen, UI.joinScreen, UI.waitingScreen, UI.hostScreen].forEach(el => el && el.classList.toggle('hidden', el.id !== screenId)); UI.hostHeader.classList.toggle('hidden', screenId !== 'host-screen'); }
function rejoinSession() { const r = localStorage.getItem('empires_host_room'); if(r) location.search = `?room=${r}&host=true`; }
function showJoinInput() { showScreen('join-screen'); if(currentRoomCode) goToPlayerDetails(currentRoomCode); else { UI.joinStep1.classList.remove('hidden'); UI.joinStep2.classList.add('hidden'); UI.roomCodeInput.focus(); } }
function goToPlayerDetails(code) { currentRoomCode = code; UI.joinStep1.classList.add('hidden'); UI.joinStep2.classList.remove('hidden'); UI.verifiedLabel.innerText = code; UI.realNameInput.focus(); }
function copyJoinLink() { navigator.clipboard.writeText(`${location.origin}${location.pathname}?room=${currentRoomCode}`).then(() => showToast("Link copied!", "success")); }
function toggleDropdown(id) { activeGuesserId = (activeGuesserId === id) ? null : id; updateHostUI(); }
function toggleDisplayMode() { UI.sidebar.classList.toggle('hidden', UI.displayToggle.checked); UI.dashboardLayout.classList.toggle('with-sidebar', !UI.displayToggle.checked); }
function showToast(m, t="error") { const tr = document.createElement('div'); tr.className = 'toast'; if(t === "success") tr.style.background = "var(--success)"; tr.innerText = m; UI.toastContainer.appendChild(tr); setTimeout(() => tr.remove(), 3000); }
function generateJoinQR() { UI.qrCodeBox.innerHTML = ""; new QRCode(UI.qrCodeBox, { text: `${location.origin}${location.pathname}?room=${currentRoomCode}`, width: 180, height: 180 }); }
function goToGameboard() { stopReveal(); UI.revealPhase.classList.add('hidden'); UI.gamePhase.classList.remove('hidden'); updateHostUI(); }
