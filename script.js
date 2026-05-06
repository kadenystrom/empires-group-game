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
const isHost = new URLSearchParams(window.location.search).get('host') === 'true';

let players = {};
let lastAction = null;
let isRevealing = false;
let activeGuesserId = null;

function generateJoinQR() {
    const qrContainer = document.getElementById("qrcode");
    const urlText = document.getElementById("current-url-text");
    if (!qrContainer) return;
    const currentUrl = window.location.href.split('?')[0];
    urlText.innerText = currentUrl;
    if (typeof QRCode !== "undefined") {
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, { text: currentUrl, width: 140, height: 140, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.M });
    }
}

        // FLICKER FIX LOGIC
if (isHost) {
    document.getElementById('host-screen').classList.remove('hidden');
    document.getElementById('host-header').classList.remove('hidden');
    database.ref('players').on('value', (snap) => {
        players = snap.val() || {};
        updateHostUI();
        checkVictory();
    });
    window.addEventListener('load', generateJoinQR);
} else {
    document.getElementById('join-screen').classList.remove('hidden');
}

function hostManualAdd() {
    const real = document.getElementById('hostAddReal').value.trim();
    const secret = document.getElementById('hostAddSecret').value.trim();
    if (real && secret) {
        const ref = database.ref('players').push();
        ref.set({ id: ref.key, realName: real, secretName: secret, leaderId: ref.key, isCaptured: false });
        document.getElementById('hostAddReal').value = "";
        document.getElementById('hostAddSecret').value = "";
    }
}

function submitName() {
    const real = document.getElementById('realNameInput').value.trim();
    const secret = document.getElementById('identityInput').value.trim();
    if (real && secret) {
        const ref = database.ref('players').push();
        ref.set({ id: ref.key, realName: real, secretName: secret, leaderId: ref.key, isCaptured: false });
        document.getElementById('realNameInput').value = "";
        document.getElementById('identityInput').value = "";
        document.getElementById('join-screen').classList.add('hidden');
        document.getElementById('waiting-screen').classList.remove('hidden');
    }
}

function updateHostUI() {
    const realPrune = document.getElementById('realNamePrune');
    const secretList = document.getElementById('secretNamePrune');
    const empireDisplay = document.getElementById('empire-display');
    if(!realPrune || !secretList || !empireDisplay) return;

    realPrune.innerHTML = "";
    secretList.innerHTML = "";
    empireDisplay.innerHTML = "";

    const playerArray = Object.values(players).sort((a,b) => a.realName.localeCompare(b.realName));
    const secretArray = Object.values(players).sort((a,b) => a.secretName.localeCompare(b.secretName));

    playerArray.forEach(p => {
        realPrune.innerHTML += `<div class="player-item"><span>${p.realName}</span> <button class="delete-btn" onclick="handleConfirmAction(this, 'delete', '${p.id}')">X</button></div>`;
    });

    secretArray.forEach(s => {
        secretList.innerHTML += `<div class="player-item"><span>${s.secretName}</span> <button class="delete-btn" onclick="handleConfirmAction(this, 'delete', '${s.id}')">X</button></div>`;
    });

    const leaders = Object.values(players).filter(p => !p.isCaptured).sort((a,b) => a.realName.localeCompare(b.realName));

    leaders.forEach(leader => {
        const empireMembers = Object.values(players).filter(p => p.leaderId === leader.id);
        const isSelfActive = activeGuesserId === leader.id;
        let html = `
                    <div class="leader-row ${isSelfActive ? 'active' : ''}">
                        <button class="leader-btn" onclick="toggleDropdown('${leader.id}')">
                            <span>👑 ${leader.realName}</span>
                            <span class="capture-pill">${isSelfActive ? 'CLOSE' : 'CAPTURE'}</span>
                        </button>
                        <div class="target-dropdown">
            ${leaders.filter(l => l.id !== leader.id).map(l => `
                            <div class="target-option" onclick="performCapture('${leader.id}', '${l.id}')">${l.realName}</div>
                `).join('')}
                        </div>
            ${empireMembers.length > 1 ? `
                        <div class="nested-empire">
                ${empireMembers.filter(m => m.id !== leader.id).map(m => `
                                <div class="captured-player">↳ ${m.realName} <span class="id-tag">(${m.secretName})</span></div>
                    `).join('')}
                </div>` : ''}
            </div>`;
            empireDisplay.innerHTML += html;
        });
}

function toggleDropdown(id) {
    activeGuesserId = (activeGuesserId === id) ? null : id;
    updateHostUI();
}

function handleConfirmAction(btn, type, data) {
    if (!btn.classList.contains('confirm')) {
        const originalText = btn.innerText;
        btn.innerText = "Are you sure?";
        btn.classList.add("confirm");
        setTimeout(() => { btn.innerText = originalText; btn.classList.remove("confirm"); }, 3000);
    } else {
        if (type === 'delete') database.ref(`players/${data}`).remove();
        if (type === 'reset' || type === 'restart') { database.ref('players').remove(); location.reload(); }
        if (type === 'undo') undoLastCapture();
    }
}

function performCapture(guesserId, targetId) {
    lastAction = JSON.parse(JSON.stringify(players));
    document.querySelectorAll('.undo-btn').forEach(b => b.classList.remove('hidden'));
    activeGuesserId = null;
    const updates = {};
    Object.values(players).forEach(p => {
        if (p.leaderId === targetId) {
            updates[`players/${p.id}/leaderId`] = guesserId;
            if (p.id === targetId) updates[`players/${p.id}/isCaptured`] = true;
        }
    });
    database.ref().update(updates);
}

function revealAndShuffle() {
    isRevealing = true;
    window.speechSynthesis.cancel();
    document.getElementById('nameList').innerHTML = "";
    document.getElementById('stopBtn').classList.remove('hidden');
    let names = Object.values(players).map(p => p.secretName).sort(() => Math.random() - 0.5);
    let index = 0;
    function speakNext() {
        if (!isRevealing || index >= names.length) return;
        let utterance = new SpeechSynthesisUtterance(names[index]);
        utterance.onstart = () => {
            const li = document.createElement('li');
            li.textContent = names[index];
            document.getElementById('nameList').appendChild(li);
            li.scrollIntoView({ behavior: 'smooth', block: 'end' });
        };
        utterance.onend = () => { index++; if(isRevealing) setTimeout(speakNext, 800); };
        window.speechSynthesis.speak(utterance);
    }
    speakNext();
}

function stopReveal() {
    isRevealing = false;
    window.speechSynthesis.cancel();
    document.getElementById('nameList').innerHTML = "";
    document.getElementById('stopBtn').classList.add('hidden');
}

function checkVictory() {
    const leaders = Object.values(players).filter(p => !p.isCaptured);
    const victoryScreen = document.getElementById('victory-screen');
    const gamePhase = document.getElementById('game-phase');
    if (Object.keys(players).length > 1 && leaders.length === 1) {
        gamePhase.classList.add('hidden');
        victoryScreen.classList.remove('hidden');
        document.getElementById('winner-name').innerText = `${leaders[0].realName}'s Empire Wins!`;
    } else {
        victoryScreen.classList.add('hidden');
        if (isHost && !document.getElementById('reveal-phase').classList.contains('hidden')) {
        } else if (isHost) {
            gamePhase.classList.remove('hidden');
        }
    }
}

function undoLastCapture() {
    if (lastAction) {
        database.ref('players').set(lastAction);
        lastAction = null;
        document.querySelectorAll('.undo-btn').forEach(b => b.classList.add('hidden'));
    }
}

function toggleDisplayMode() {
    const isDisplay = document.getElementById('displayToggle').checked;
    document.getElementById('host-sidebar').classList.toggle('hidden', isDisplay);
    document.getElementById('dashboard-layout').classList.toggle('with-sidebar', !isDisplay);
}

function goBackToReveal() {
    document.getElementById('game-phase').classList.add('hidden');
    document.getElementById('reveal-phase').classList.remove('hidden');
}

function goToGameboard() { 
    stopReveal();
    document.getElementById('reveal-phase').classList.add('hidden'); 
    document.getElementById('game-phase').classList.remove('hidden'); 
}

function toggleSecretPrune() { document.getElementById('secretPruneBox').classList.toggle('hidden'); }
function showJoinScreen() { document.getElementById('waiting-screen').classList.add('hidden'); document.getElementById('join-screen').classList.remove('hidden'); }