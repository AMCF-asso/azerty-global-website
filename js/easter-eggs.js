/**
 * AZERTY Global - Easter Eggs
 * 
 * 1. QWERTY Prohibition: Type 'qwerty'
 * 2. Konami Code (Matrix): ↑ ↑ ↓ ↓ ← → ← → b a
 * 3. Mechanical Mode: Click footer logo 3 times rapidly
 * 4. Barrel Roll: Type 'barrel'
 */

(function () {
    // State
    let keyBuffer = [];
    const maxBuffer = 20;
    let clickCount = 0;
    let clickTimer = null;
    let mechModeEnabled = false;

    // Sequences
    const codes = {
        // qwerty (note: we check key strings)
        qwerty: ['q', 'w', 'e', 'r', 't', 'y'],
        konami: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
    };

    // Audio Context (Lazy init) but mostly using HTML5 Audio for simplicity with samples
    // or Web Audio API for pitch shifting
    let audioCtx = null;
    let audioBuffer = null;

    async function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        // Load sample if not loaded
        if (!audioBuffer) {
            try {
                const response = await fetch('assets/keyboard-single-click.mp3');
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error("Failed to load click sound", e);
            }
        }
    }

    // Play Sample with defined pitch variation
    function playClickSound() {
        if (!audioCtx || !audioBuffer) {
            initAudio(); // Try to init if missing
            return;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // Randomize pitch slightly (0.95 to 1.05) to sound natural
        // Detune is in cents. 100 cents = 1 semitone.
        // Let's vary by +/- 50 cents
        const detuneArg = (Math.random() * 100) - 50;
        source.detune.value = detuneArg;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.5; // Adjust volume as needed

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start(0);
    }

    // Toast System
    function showToast(message, customClass = '') {
        let toast = document.getElementById('easter-egg-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'easter-egg-toast';
            toast.className = 'easter-egg-toast';
            document.body.appendChild(toast);
        }

        // Reset classes but keep base class
        toast.className = 'easter-egg-toast';
        if (customClass) {
            toast.classList.add(customClass);
        }

        toast.textContent = message;
        toast.classList.add('is-visible');

        // Reset timer
        if (toast.timeout) clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 3000);
    }

    // Feature: QWERTY Prohibition
    function triggerQwertyProhibition() {
        document.body.classList.add('shake-anim');
        showToast("😤 Hérétique ! Ici on tape en AZERTY Global.", "easter-egg-toast--center");

        setTimeout(() => {
            document.body.classList.remove('shake-anim');
        }, 500);
    }

    // Feature: Matrix Mode
    const MATRIX_STORAGE_KEY = 'azerty_egg_matrix';
    const MATRIX_DURATION = 5 * 60 * 1000; // 5 minutes

    function toggleMatrixMode() {
        document.body.classList.toggle('theme-matrix');
        const isMatrix = document.body.classList.contains('theme-matrix');

        if (isMatrix) {
            showToast("🕶️ Welcome to the Real World.");
            // Save state
            const state = {
                active: true,
                timestamp: Date.now()
            };
            sessionStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(state));
        } else {
            showToast("🐇 Follow the white rabbit.");
            sessionStorage.removeItem(MATRIX_STORAGE_KEY);
        }
    }

    // Check Matrix Persistence
    function checkMatrixPersistence() {
        // Check if page was reloaded (F5/Refresh) - if so, clear effect per user request
        if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
            sessionStorage.removeItem(MATRIX_STORAGE_KEY);
            return;
        }

        const saved = sessionStorage.getItem(MATRIX_STORAGE_KEY);
        if (saved) {
            try {
                const state = JSON.parse(saved);
                const now = Date.now();
                if (state.active && (now - state.timestamp < MATRIX_DURATION)) {
                    document.body.classList.add('theme-matrix');
                } else {
                    // Expired
                    sessionStorage.removeItem(MATRIX_STORAGE_KEY);
                }
            } catch (e) {
                console.error("Matrix storage error", e);
            }
        }
    }

    // Feature: Mechanical Mode
    function toggleMechMode() {
        mechModeEnabled = !mechModeEnabled;
        if (mechModeEnabled) {
            initAudio(); // Warm up
            showToast("🔊 Mechanical Mode : ON (Thocky Edition)");
            document.addEventListener('click', playClickSound);
            document.addEventListener('keydown', playClickSound);
        } else {
            showToast("🔇 Mechanical Mode : OFF");
            document.removeEventListener('click', playClickSound);
            document.removeEventListener('keydown', playClickSound);
        }
    }

    // Feature: Barrel Roll
    function triggerBarrelRoll() {
        document.body.classList.add('barrel-roll');
        showToast("🌀 DO A BARREL ROLL !");

        // Remove class after animation to allow re-triggering
        setTimeout(() => {
            document.body.classList.remove('barrel-roll');
        }, 1000);
    }

    // Init Logic
    checkMatrixPersistence();

    // Key Listener
    document.addEventListener('keydown', (e) => {
        // Record key
        keyBuffer.push(e.key.toLowerCase() === 'arrowup' ? 'ArrowUp' : // Normalize only arrows if needed, but keeping simple for now
            e.key.toLowerCase() === 'arrowdown' ? 'ArrowDown' :
                e.key.toLowerCase() === 'arrowleft' ? 'ArrowLeft' :
                    e.key.toLowerCase() === 'arrowright' ? 'ArrowRight' :
                        e.key.toLowerCase()); // Lowercase for letters

        if (keyBuffer.length > maxBuffer) {
            keyBuffer.shift();
        }

        const bufferStr = keyBuffer.join(',');

        // Check QWERTY
        if (keyBuffer.slice(-6).join('') === 'qwerty') {
            triggerQwertyProhibition();
            keyBuffer = []; // Reset
        }

        // Check Barrel Roll ("barrel" or "roll")
        const last6 = keyBuffer.slice(-6).join('');
        if (last6 === 'barrel') {
            triggerBarrelRoll();
            keyBuffer = [];
        }

        // Check Konami
        const konamiStr = codes.konami.map(k => k.toLowerCase()).join(',');
        const normBuffer = keyBuffer.map(k => {
            if (k === 'ArrowUp') return 'arrowup';
            if (k === 'ArrowDown') return 'arrowdown';
            if (k === 'ArrowLeft') return 'arrowleft';
            if (k === 'ArrowRight') return 'arrowright';
            return k;
        }).join(',');

        if (normBuffer.includes(konamiStr)) {
            toggleMatrixMode();
            keyBuffer = [];
        }
    });

    // Footer Logo Trigger
    // Wait for DOM to handle footer click
    document.addEventListener('DOMContentLoaded', () => {
        // Target all footer logos (we have img with class header__logo-img in footer now? or just footer__logo div)
        // In footer we have <div class="footer__logo"><img ...></div>
        const footerLogo = document.querySelector('.footer__logo');
        if (footerLogo) {
            footerLogo.addEventListener('click', (e) => {
                const now = Date.now();
                // Reset count if too slow (> 500ms between clicks)
                if (now - (clickTimer || 0) > 500) {
                    clickCount = 0;
                }

                clickCount++;
                clickTimer = now;

                if (clickCount === 3) {
                    toggleMechMode();
                    clickCount = 0;
                    // Prevent default navigation if it's a link (unlikely for div but safe to have)
                    e.preventDefault();
                }
            });
            // Allow clicking... wait footer logo wraps an img, usually it's inside footer__brand.
            // Make it look interactive after 3 clicks if we wanted, but hidden is fine.
        }
    });

})();
