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

    // Audio Context (Lazy init)
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Synthesize Mechanical Click Sound (Cherry MX Blue-ish)
    function playClickSound() {
        initAudio();
        const t = audioCtx.currentTime;

        // 1. Changes: High frequency click (switch leaf)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + 0.05);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.05);

        // 2. Thock: Low frequency impact (bottom out)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(50, t + 0.1);

        gain2.gain.setValueAtTime(0.2, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.start(t);
        osc2.stop(t + 0.1);
    }

    // Feature: QWERTY Prohibition
    function triggerQwertyProhibition() {
        document.body.classList.add('shake-anim');
        showToast("😤 Hérétique ! Ici on tape en AZERTY Global.");

        setTimeout(() => {
            document.body.classList.remove('shake-anim');
        }, 500);
    }

    // Feature: Matrix Mode
    function toggleMatrixMode() {
        document.body.classList.toggle('theme-matrix');
        const isMatrix = document.body.classList.contains('theme-matrix');
        showToast(isMatrix ? "🕶️ Welcome to the Real World." : "🐇 Follow the white rabbit.");
    }

    // Feature: Mechanical Mode
    function toggleMechMode() {
        mechModeEnabled = !mechModeEnabled;
        if (mechModeEnabled) {
            initAudio(); // Warm up
            showToast("🔊 Mechanical Mode : ON (Cherry MX Blue)");
            document.addEventListener('click', playClickSound);
            document.addEventListener('keydown', playClickSound);
        } else {
            showToast("🔇 Mechanical Mode : OFF");
            document.removeEventListener('click', playClickSound);
            document.removeEventListener('keydown', playClickSound);
        }
    }

    // Toast System
    function showToast(message) {
        let toast = document.getElementById('easter-egg-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'easter-egg-toast';
            toast.className = 'easter-egg-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');

        // Reset timer
        if (toast.timeout) clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 3000);
    }

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

    // Feature: Barrel Roll
    function triggerBarrelRoll() {
        document.body.classList.add('barrel-roll');
        showToast("🌀 DO A BARREL ROLL !");

        // Remove class after animation to allow re-triggering
        setTimeout(() => {
            document.body.classList.remove('barrel-roll');
        }, 1000);
    }

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
