const socket = io();

// UI Elements
const setupScreen = document.getElementById('setup-screen');
const waitingRoom = document.getElementById('waiting-room');
const typingScreen = document.getElementById('typing-screen');
const joinForm = document.getElementById('join-form');
const regInput = document.getElementById('reg-input');
const usernameInput = document.getElementById('username-input');

const textDisplay = document.getElementById('text-display');
const liveWpm = document.getElementById('live-wpm');
const liveAccuracy = document.getElementById('live-accuracy');
const liveTime = document.getElementById('live-time');

const resultsModal = document.getElementById('results-modal');
const finalWpm = document.getElementById('final-wpm');
const finalAccuracy = document.getElementById('final-accuracy');
const finalErrors = document.getElementById('final-errors');
const finalTime = document.getElementById('final-time');

// State
let userName = "";
let regNumber = "";
let passageText = "";
let currentIndex = 0;
let errors = 0;
let startTime = null;
let timerInterval = null;
let isActive = false;

// Socket Events
joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userName = usernameInput.value.trim();
    regNumber = regInput.value.trim();
    if (userName && regNumber) {
        socket.emit('user:join', { name: userName, regNumber: regNumber });
        setupScreen.style.display = 'none';
        waitingRoom.style.display = 'flex';
    }
});

socket.on('test:start', (data) => {
    passageText = data.text;
    
    // Render text
    textDisplay.innerHTML = '';
    for (let char of passageText) {
        const span = document.createElement('span');
        span.innerText = char;
        textDisplay.appendChild(span);
    }
    
    // Reset state
    currentIndex = 0;
    errors = 0;
    startTime = null;
    isActive = true;
    
    if(timerInterval) clearInterval(timerInterval);
    liveWpm.innerText = '0';
    liveAccuracy.innerText = '100%';
    liveTime.innerText = '0s';

    // Show typing screen
    waitingRoom.style.display = 'none';
    typingScreen.style.display = 'block';

    // Mark first character
    updateCurrentIndicator();
});

socket.on('test:stop', () => {
    if (isActive) {
        finishTest();
    }
});

socket.on('test:reset', () => {
    location.reload();
});

// Typing logic
document.addEventListener('keydown', (e) => {
    if (!isActive) return;

    // Block forbidden keys
    const forbiddenKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (forbiddenKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        return;
    }

    // Only accept single character keys
    if (e.key.length === 1) {
        e.preventDefault(); // Prevent scrolling on Space
        
        if (!startTime) {
            startTime = Date.now();
            startTimer();
        }

        const expectedChar = passageText[currentIndex];
        const spans = textDisplay.children;

        if (e.key === expectedChar) {
            spans[currentIndex].classList.add('correct');
        } else {
            spans[currentIndex].classList.add('incorrect');
            errors++;
        }

        spans[currentIndex].classList.remove('current');
        currentIndex++;
        
        updateStats();

        if (currentIndex < passageText.length) {
            updateCurrentIndicator();
        } else {
            finishTest();
        }
    }
});

function updateCurrentIndicator() {
    const spans = textDisplay.children;
    if (currentIndex < spans.length) {
        spans[currentIndex].classList.add('current');
    }
}

function updateStats() {
    if (!startTime) return;
    
    const timeElapsedSec = (Date.now() - startTime) / 1000;
    // Standard WPM: (characters / 5) / minutes
    const charsTyped = currentIndex;
    const minutes = timeElapsedSec / 60;
    
    let wpm = 0;
    if (minutes > 0) {
        wpm = Math.max(0, Math.round((charsTyped / 5) / minutes));
    }
    
    let accuracy = 100;
    if (charsTyped > 0) {
        accuracy = Math.round(((charsTyped - errors) / charsTyped) * 100);
    }
    
    const progress = Math.round((charsTyped / passageText.length) * 100);

    liveWpm.innerText = wpm;
    liveAccuracy.innerText = accuracy + '%';
    
    // Throttle socket emissions (send every keystroke here but can be throttled)
    socket.emit('user:progress', {
        wpm,
        accuracy,
        progress
    });
}

function startTimer() {
    timerInterval = setInterval(() => {
        const timeElapsedSec = Math.floor((Date.now() - startTime) / 1000);
        liveTime.innerText = timeElapsedSec + 's';
        updateStats(); // Keep WPM decaying if they stop typing
    }, 1000);
}

function finishTest() {
    isActive = false;
    clearInterval(timerInterval);
    
    const textDisplayChildren = textDisplay.children;
    if (currentIndex < textDisplayChildren.length) {
        textDisplayChildren[currentIndex].className = ''; // Remove blink cursor
    }
    
    const timeElapsedSec = startTime ? ((Date.now() - startTime) / 1000) : 0;
    const minutes = timeElapsedSec / 60;
    const charsTyped = currentIndex;
    
    let wpm = 0;
    if (minutes > 0) {
        wpm = Math.max(0, Math.round((charsTyped / 5) / minutes));
    }
    
    let accuracy = 100;
    if (charsTyped > 0) {
     accuracy = Math.round(((charsTyped - errors) / charsTyped) * 100);
    }

    const finalResult = {
        wpm,
        accuracy,
        errors,
        timeTaken: Math.floor(timeElapsedSec)
    };

    socket.emit('user:submit', finalResult);

    // Show modal
    finalWpm.innerText = wpm;
    finalAccuracy.innerText = accuracy + '%';
    finalErrors.innerText = errors;
    finalTime.innerText = Math.floor(timeElapsedSec) + 's';
    
    resultsModal.style.display = 'block';
}

// Prevent pasting via context menu
document.addEventListener('contextmenu', e => e.preventDefault());
