const timerElapsed = document.getElementById('timer-elapsed');
const timerContainer = document.getElementById('timer-container');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const alertSound = document.getElementById('alert-sound');
let alertPlayed = false;

const halfwaySound = document.getElementById('halfway-sound');
let halfwayPlayed = false;

const hoursElem = document.getElementById('hours');
const minutesElem = document.getElementById('minutes');
const secondsElem = document.getElementById('seconds');

const inputHours = document.getElementById('input-hours');
const inputMinutes = document.getElementById('input-minutes');
const inputSeconds = document.getElementById('input-seconds');
const setTimerBtn = document.getElementById('set-timer-btn');

let TOTAL_TIME_MS = 38 * 60 * 1000; // default 38 minutes
const ALERT_THRESHOLD_MS = 1 * 60 * 1000; // 1 minute alert

const CIRCUMFERENCE = 2 * Math.PI * 45;

timerElapsed.style.strokeDasharray = CIRCUMFERENCE;
timerElapsed.style.strokeDashoffset = CIRCUMFERENCE; // start fully hidden

let timerStartTimestamp = null;
let pausedDuration = 0;
let pauseStartTimestamp = null;
let animationFrameId = null;
let state = 'stopped';

function pad(num) {
    return num.toString().padStart(2, '0');
}

function updateTimer() {
    if (!timerStartTimestamp) return;

    const now = Date.now();
    let elapsed = now - timerStartTimestamp - pausedDuration;
    const remaining = TOTAL_TIME_MS - elapsed;

    const totalSeconds = Math.floor(remaining / 1000);
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;

    if (totalSeconds < 0) {
        hoursElem.textContent = '-' + pad(hours);
        minutesElem.textContent = pad(minutes);
        secondsElem.textContent = pad(seconds);
    } else {
        hoursElem.textContent = pad(hours);
        minutesElem.textContent = pad(minutes);
        secondsElem.textContent = pad(seconds);
    }

    let progress = remaining / TOTAL_TIME_MS;
    if (progress < 0) progress = 0;
    timerElapsed.style.strokeDashoffset = CIRCUMFERENCE * progress;

    // New threshold: 1/5 remaining time
    const oneFifth = TOTAL_TIME_MS / 5;

    // Show alert (red blinking) if remaining time <= 1/5 of total time
    if (remaining <= oneFifth) {
        timerContainer.classList.add('alert');
    } else {
        timerContainer.classList.remove('alert');
    }

    // Play timer.wav once when there is 1/5 time left
    if (remaining <= oneFifth && !halfwayPlayed && remaining > 0) {
        halfwaySound.play().catch(() => { });
        halfwayPlayed = true;
    }
    if (remaining > oneFifth) {
        halfwayPlayed = false;
    }

    // Play alert sound once when time runs out
    if (remaining <= 0) {
        if (!alertPlayed) {
            alertSound.play().catch(() => { });
            alertPlayed = true;
        }
    } else {
        alertPlayed = false;
    }

    animationFrameId = requestAnimationFrame(updateTimer);
}

function startTimer() {
    if (state === 'running') return;

    if (state === 'paused' && pauseStartTimestamp) {
        pausedDuration += Date.now() - pauseStartTimestamp;
        pauseStartTimestamp = null;
    } else if (state === 'stopped') {
        timerStartTimestamp = Date.now();
        pausedDuration = 0;
    }

    animationFrameId = requestAnimationFrame(updateTimer);
    state = 'running';
    updateButtons();
    saveState();
}

function pauseTimer() {
    if (state !== 'running') return;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    pauseStartTimestamp = Date.now();
    state = 'paused';
    updateButtons();
    saveState();
}

function resetTimer() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    timerStartTimestamp = null;
    pausedDuration = 0;
    pauseStartTimestamp = null;
    state = 'stopped';

    const totalSeconds = Math.floor(TOTAL_TIME_MS / 1000);
    const initHours = Math.floor(totalSeconds / 3600);
    const initMinutes = Math.floor((totalSeconds % 3600) / 60);
    const initSeconds = totalSeconds % 60;

    hoursElem.textContent = pad(initHours);
    minutesElem.textContent = pad(initMinutes);
    secondsElem.textContent = pad(initSeconds);

    timerElapsed.style.strokeDashoffset = CIRCUMFERENCE;
    timerContainer.classList.remove('alert');
    updateButtons();
    saveState();
}

function updateButtons() {
    if (state === 'stopped') {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
    } else if (state === 'running') {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        resetBtn.disabled = false;
    } else if (state === 'paused') {
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = false;
    }
}

function saveState() {
    const stateObj = {
        TOTAL_TIME_MS,
        timerStartTimestamp,
        pausedDuration,
        pauseStartTimestamp,
        state
    };
    localStorage.setItem('timerState', JSON.stringify(stateObj));
}

function loadState() {
    const stateStr = localStorage.getItem('timerState');
    if (!stateStr) return;

    try {
        const stateObj = JSON.parse(stateStr);
        TOTAL_TIME_MS = stateObj.TOTAL_TIME_MS || TOTAL_TIME_MS;
        timerStartTimestamp = stateObj.timerStartTimestamp || null;
        pausedDuration = stateObj.pausedDuration || 0;
        pauseStartTimestamp = stateObj.pauseStartTimestamp || null;
        state = stateObj.state || 'stopped';

        const totalSeconds = Math.floor(TOTAL_TIME_MS / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        inputHours.value = h > 0 ? h : '';
        inputMinutes.value = m > 0 ? m : '';
        inputSeconds.value = s > 0 ? s : '';

        if (state === 'running') {
            startTimer();
        } else if (state === 'paused') {
            updateTimer();
            updateButtons();
        } else {
            resetTimer();
        }
    } catch (e) {
        console.error('Failed to load timer state:', e);
    }
}

setTimerBtn.addEventListener('click', () => {
    const h = Math.max(0, Math.min(99, parseInt(inputHours.value) || 0));
    const m = Math.max(0, Math.min(59, parseInt(inputMinutes.value) || 0));
    const s = Math.max(0, Math.min(59, parseInt(inputSeconds.value) || 0));

    TOTAL_TIME_MS = (h * 3600 + m * 60 + s) * 1000;

    if (TOTAL_TIME_MS <= 0) {
        alert('Please enter a valid time greater than 0.');
        return;
    }

    resetTimer();
    saveState();
});

startBtn.addEventListener('click', () => {
    startTimer();
});

pauseBtn.addEventListener('click', () => {
    pauseTimer();
});

resetBtn.addEventListener('click', () => {
    resetTimer();
});

const presetButtons = document.querySelectorAll('.preset-btn');
presetButtons.forEach(button => {
    button.addEventListener('click', () => {
        const presetTime = parseInt(button.getAttribute('data-time'), 10);
        if (presetTime > 0) {
            TOTAL_TIME_MS = presetTime;
            resetTimer();

            const totalSeconds = presetTime / 1000;
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;

            inputHours.value = h > 0 ? h : '';
            inputMinutes.value = m > 0 ? m : '';
            inputSeconds.value = s > 0 ? s : '';

            saveState();
        }
    });
});

window.addEventListener('load', () => {
    loadState();
});

window.addEventListener('beforeunload', function (e) {
    if (state !== 'stopped') {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});
