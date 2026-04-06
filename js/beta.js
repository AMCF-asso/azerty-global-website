/* ==============================================
   Beta Form Logic — beta.html
   ============================================== */
'use strict';

const STORAGE_KEY = 'azerty-beta-feedback';
const TOTAL_QUESTIONS = 17;

// Google Sheets endpoint (public by design — POST-only, no-cors, append-only Google Sheet).
// This URL is intentionally client-side; it cannot read or modify existing data.
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzJknW5u1Vj-lxI7qiSnr7QgKLis_f7QXi0m5-MLh7NulrGetRd4XQ3kQPoVDZmjmb7/exec';

// ===== AUTOSAVE =====
function saveFormData() {
    const form = document.getElementById('beta-feedback-form');
    const formData = new FormData(form);
    const data = {};

    // Handle checkboxes properly
    formData.forEach((value, key) => {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    });

    // Save text inputs that might be empty
    form.querySelectorAll('input[type="text"], textarea, input[type="email"]').forEach(input => {
        if (input.value) {
            data[input.name] = input.value;
        }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Show saved indicator
    const indicator = document.getElementById('autosave-indicator');
    indicator.classList.add('visible');
    setTimeout(() => indicator.classList.remove('visible'), 2000);
}

function loadFormData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
        const data = JSON.parse(saved);
        const form = document.getElementById('beta-feedback-form');

        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // Handle checkboxes
                value.forEach(v => {
                    const el = form.querySelector(`input[name="${key}"][value="${v}"]`);
                    if (el) el.checked = true;
                });
            } else {
                const el = form.querySelector(`[name="${key}"]`);
                if (el) {
                    if (el.type === 'checkbox' || el.type === 'radio') {
                        const target = form.querySelector(`input[name="${key}"][value="${value}"]`);
                        if (target) target.checked = true;
                    } else {
                        el.value = value;
                    }
                }
            }
        });

        // Trigger change events to show conditional fields
        document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(el => {
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Trigger change on select elements with saved values
        document.querySelectorAll('select').forEach(el => {
            if (el.value) el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        updateProgress();
    } catch (e) {
        console.error('Error loading saved form data:', e);
    }
}

// Debounced save
let debounceTimer = null;
function debouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        saveFormData();
    }, 1000);
}

// ===== PROGRESS BAR =====
function updateProgress() {
    const form = document.getElementById('beta-feedback-form');
    const questions = form.querySelectorAll('.question-section');
    let answered = 0;

    questions.forEach(section => {
        const inputs = section.querySelectorAll('input:required, select:required');
        const hasRequired = inputs.length > 0;

        if (hasRequired) {
            const isAnswered = Array.from(inputs).some(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    return form.querySelector(`input[name="${input.name}"]:checked`);
                }
                return input.value.trim() !== '';
            });
            if (isAnswered) answered++;
        } else {
            // For optional questions, check if anything is filled
            const anyInputs = section.querySelectorAll('input, select, textarea');
            const hasSomeValue = Array.from(anyInputs).some(input => {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    return input.checked;
                }
                return input.value.trim() !== '';
            });
            if (hasSomeValue) answered++;
        }
    });

    const percentage = Math.round((answered / TOTAL_QUESTIONS) * 100);
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-bar').setAttribute('aria-valuenow', percentage);
    document.getElementById('progress-count').textContent = `${answered} question${answered > 1 ? 's' : ''} sur ${TOTAL_QUESTIONS} complétée${answered > 1 ? 's' : ''}`;
}

function decorateQuestionFieldsets() {
    document.querySelectorAll('#beta-feedback-form .question-section').forEach(section => {
        if (section.querySelector(':scope > fieldset.form-section-fieldset')) return;

        const heading = section.querySelector(':scope > h3');
        if (!heading) return;

        const nodesToMove = [];
        let current = heading.nextSibling;

        while (current) {
            const next = current.nextSibling;
            nodesToMove.push(current);
            current = next;
        }

        const fieldset = document.createElement('fieldset');
        fieldset.className = 'form-section-fieldset';

        const legend = document.createElement('legend');
        legend.className = 'form-section-legend';
        legend.innerHTML = heading.innerHTML;
        fieldset.appendChild(legend);

        nodesToMove.forEach(node => {
            fieldset.appendChild(node);
        });

        heading.replaceWith(fieldset);
    });
}

// ===== CONDITIONAL FIELDS =====
// Show/hide Windows version field based on OS selection
document.getElementById('os')?.addEventListener('change', function () {
    const isWindows = this.value.startsWith('win');
    const isOldWindows = this.value === 'windows-autre';
    const installMethod = document.getElementById('install-method');

    if (isOldWindows) {
        // Windows (autre) = installeur classique uniquement (pas de Microsoft Store)
        document.getElementById('windows-version').style.display = 'none';
        installMethod.value = 'installeur';
        installMethod.required = false;
    } else if (isWindows) {
        document.getElementById('windows-version').style.display = 'block';
        installMethod.required = true;
    } else {
        document.getElementById('windows-version').style.display = 'none';
        installMethod.value = '';
        installMethod.required = false;
    }
});

document.getElementById('usage-other')?.addEventListener('change', function () {
    document.getElementById('usage-other-text').classList.toggle('visible', this.checked);
});

// Show/hide discovery "other" text
document.querySelectorAll('input[name="decouverte"]').forEach(radio => {
    radio.addEventListener('change', function () {
        document.getElementById('discover-other-text').classList.toggle('visible', this.value === 'autre');
    });
});

// Show/hide frequency conditional fields (alternance / abandon)
document.querySelectorAll('input[name="frequence"]').forEach(radio => {
    radio.addEventListener('change', function () {
        document.getElementById('alternance-details').classList.toggle('visible', this.value === 'alterne');
        document.getElementById('abandon-details').classList.toggle('visible', this.value === 'abandonne');
    });
});

// Show/hide learning "other" text
document.getElementById('learn-other')?.addEventListener('change', function () {
    document.getElementById('learn-other-text').classList.toggle('visible', this.checked);
});

document.getElementById('previous-layout')?.addEventListener('change', function () {
    document.getElementById('layout-other-text').classList.toggle('visible', this.value === 'autre');
});

document.getElementById('like-other')?.addEventListener('change', function () {
    document.getElementById('likes-other-text').classList.toggle('visible', this.checked);
});

document.getElementById('dislike-other')?.addEventListener('change', function () {
    document.getElementById('dislikes-other-text').classList.toggle('visible', this.checked);
});

// Toggle detail fields for specific dislikes (using classList for consistency)
document.getElementById('dislike-position')?.addEventListener('change', function () {
    document.getElementById('dislike-position-detail').classList.toggle('visible', this.checked);
});
document.getElementById('dislike-missing')?.addEventListener('change', function () {
    document.getElementById('dislike-missing-detail').classList.toggle('visible', this.checked);
});
document.getElementById('dislike-shortcuts')?.addEventListener('change', function () {
    document.getElementById('dislike-shortcuts-detail').classList.toggle('visible', this.checked);
});
document.getElementById('dislike-compat')?.addEventListener('change', function () {
    document.getElementById('dislike-compat-detail').classList.toggle('visible', this.checked);
});

// "Tout me convient" mutually exclusive with other Q8 options
document.getElementById('dislike-none')?.addEventListener('change', function () {
    if (this.checked) {
        document.querySelectorAll('input[name="points-negatifs"]').forEach(cb => {
            if (cb !== this) {
                cb.checked = false;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }
});
document.querySelectorAll('input[name="points-negatifs"]:not(#dislike-none)').forEach(cb => {
    cb.addEventListener('change', function () {
        if (this.checked) {
            const noneCheckbox = document.getElementById('dislike-none');
            if (noneCheckbox?.checked) {
                noneCheckbox.checked = false;
            }
        }
    });
});

// Toggle bug details section
document.querySelectorAll('input[name="bugs"]').forEach(radio => {
    radio.addEventListener('change', function () {
        document.getElementById('bug-details').classList.toggle('visible', this.value === 'oui');
    });
});

// Toggle pseudo input
document.querySelectorAll('input[name="temoignage-permission"]').forEach(radio => {
    radio.addEventListener('change', function () {
        document.getElementById('pseudo-input').classList.toggle('visible', this.value === 'oui-nomme');
    });
});

// Toggle contact input
document.querySelectorAll('input[name="notifications"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const wantsNotif = this.value === 'oui';
        document.getElementById('contact-input').classList.toggle('visible', wantsNotif);
        document.getElementById('email').required = wantsNotif;
    });
});

// ===== EVENT LISTENERS =====
document.getElementById('beta-feedback-form').addEventListener('input', () => {
    debouncedSave();
    updateProgress();
});

document.getElementById('beta-feedback-form').addEventListener('change', () => {
    saveFormData();
    updateProgress();
});

// ===== CHECKBOX GROUP VALIDATION =====
function validateCheckboxGroup(groupName) {
    const checked = document.querySelectorAll(`input[name="${groupName}"]:checked`);
    if (checked.length === 0) {
        const firstInput = document.querySelector(`input[name="${groupName}"]`);
        if (firstInput) {
            const section = firstInput.closest('.question-section');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                section.style.outline = '2px solid #ef4444';
                section.style.outlineOffset = '8px';
                setTimeout(() => {
                    section.style.outline = '';
                    section.style.outlineOffset = '';
                }, 3000);
            }
        }
        return false;
    }
    return true;
}

// ===== FORM SUBMISSION =====
document.getElementById('beta-feedback-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate checkbox groups
    if (!validateCheckboxGroup('utilisation')) {
        alert('Veuillez sélectionner au moins un usage principal (question 2).');
        return;
    }
    if (!validateCheckboxGroup('apprentissage')) {
        alert('Veuillez sélectionner au moins une méthode d\'apprentissage (question 9).');
        return;
    }
    if (!validateCheckboxGroup('points-positifs')) {
        alert('Veuillez sélectionner au moins un aspect que vous préférez (question 10).');
        return;
    }
    if (!validateCheckboxGroup('points-negatifs')) {
        alert('Veuillez sélectionner au moins un aspect à améliorer ou « Tout me convient » (question 11).');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);

    // Collect checkbox values as arrays
    const data = {};
    formData.forEach((value, key) => {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].push(value);
            } else {
                data[key] = [data[key], value];
            }
        } else {
            data[key] = value;
        }
    });

    // Add metadata
    data.timestamp = new Date().toISOString();
    data.userAgent = navigator.userAgent;
    data.formType = 'beta-tester';
    data.source = 'beta-page';

    // Envoi vers Google Sheets (parallèle, sans bloquer le formulaire)
    if (GOOGLE_SHEET_URL) {
        fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(data)
        }).catch(() => {});
    }

    // Update button UI
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Envoi en cours...';

    // Add required Web3Forms metadata
    data.access_key = window.AzertyWeb3Forms?.CONFIG.accessKey || '';
    data.subject = '🧪 Nouveau feedback Bêta-Testeur';
    data.from_name = 'AZERTY Global Beta';

    try {
        const response = await fetch(window.AzertyWeb3Forms?.CONFIG.submitUrl || 'https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok && result.success) {
            // Clear saved data on successful submit
            localStorage.removeItem(STORAGE_KEY);

            // Replace form with success message
            const formContainer = document.getElementById('beta-feedback-form');
            formContainer.innerHTML = `
                <div class="form-success" role="status" aria-live="polite" aria-atomic="true" tabindex="-1">
                    <div class="form-success__icon">✅</div>
                    <h2 class="form-success__title">Merci infiniment !</h2>
                    <p class="form-success__text">
                        Vos retours de bêta-testeur sont extrêmement précieux. Ils recevront toute mon attention pour perfectionner la version finale.
                    </p>
                    <a href="/" class="btn btn--primary form-success__action">Retour à l'accueil</a>
                </div>
            `;
            formContainer.querySelector('[role="status"]')?.focus();
            window.scrollTo({ top: formContainer.offsetTop - 100, behavior: 'smooth' });
        } else {
            console.error("Web3Forms error:", result);
            alert("Une erreur est survenue lors de l'envoi de votre feedback. Veuillez réessayer.");
            submitBtn.innerHTML = originalBtnHTML;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error("Network error:", error);
        alert("Erreur de connexion internet. Vérifiez votre connexion et essayez de nouveau.");
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.disabled = false;
    }
});

// ===== CLEAR FORM =====
document.getElementById('clear-form-btn')?.addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes vos réponses ? Cette action est irréversible.')) {
        localStorage.removeItem(STORAGE_KEY);
        const form = document.getElementById('beta-feedback-form');
        form.reset();
        // Hide all conditional fields
        document.querySelectorAll('.other-input.visible').forEach(el => el.classList.remove('visible'));
        document.getElementById('bug-details')?.classList.remove('visible');
        document.getElementById('windows-version').style.display = 'none';
        updateProgress();
    }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    decorateQuestionFieldsets();
    loadFormData();
    updateProgress();

    // Enforce maximum of 3 selections for Q7 (likes) and Q8 (dislikes)
    function enforceCheckboxLimit(groupName, maxAllowed, msgId, excludeId) {
        const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
        if (!checkboxes.length) return;

        const msgEl = document.getElementById(msgId);

        function updateState() {
            const checked = Array.from(document.querySelectorAll(`input[name="${groupName}"]:checked`));
            // Don't count the exclusive option (e.g. "Tout me convient") in the limit
            const countForLimit = excludeId
                ? checked.filter(cb => cb.id !== excludeId).length
                : checked.length;

            if (countForLimit >= maxAllowed) {
                checkboxes.forEach(cb => {
                    // Don't disable the exclusive option or already-checked items
                    if (!cb.checked && cb.id !== excludeId) {
                        cb.disabled = true;
                        const parentBtn = cb.closest('.big-button');
                        if (parentBtn) {
                            parentBtn.style.opacity = '0.5';
                            parentBtn.style.cursor = 'not-allowed';
                            parentBtn.style.pointerEvents = 'none';
                        }
                    }
                });
                if (msgEl) msgEl.classList.add('visible');
            } else {
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                    const parentBtn = cb.closest('.big-button');
                    if (parentBtn) {
                        parentBtn.style.opacity = '';
                        parentBtn.style.cursor = '';
                        parentBtn.style.pointerEvents = '';
                    }
                });
                if (msgEl) msgEl.classList.remove('visible');
            }
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', updateState);
        });

        // Run once on load to handle saved data or initial state
        updateState();
    }

    enforceCheckboxLimit('points-positifs', 3, 'likes-limit-msg', null);
    enforceCheckboxLimit('points-negatifs', 3, 'dislikes-limit-msg', 'dislike-none');
});
