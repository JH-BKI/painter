/**
 * Onboarding Guide Component
 * Provides an interactive guide with camera movement and visual cues
 */

// Utility to strip leading/trailing single or double quotes
function stripQuotes(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/^['"]+|['"]+$/g, '');
}

// Place this helper outside the component definition
function waitForClassAndFocus(btn, className, maxTries = 10, delay = 10) {
    let tries = 0;
    function tryFocus() {
        if (btn.classList.contains(className)) {
            // console.log('[OnboardingGuide] Class added, focusing button');
            btn.focus();
            btn.dispatchEvent(new Event('mouseover'));
            
        } else if (tries < maxTries) {
            tries++;
            setTimeout(tryFocus, delay);
        }
    }
    tryFocus();
}

AFRAME.registerComponent('onboarding-guide', {
    schema: {
        // Camera movement settings
        amplitude: { type: 'number', default: 5 },    // degrees
        speed: { type: 'number', default: 0.5 },      // cycles per second
        loops: { type: 'number', default: 1 },        // number of cycles
        
        // UI settings
        message: { type: 'string', default: '' },
        imageUrl: { type: 'string', default: '' },
        
        // Idle orbit settings
        idleOrbit: { type: 'boolean', default: false }, // Enable idle orbit
        idleOrbitSpeed: { type: 'number', default: 5 }, // deg/sec
        
        // Timing settings
        initialDelay: { type: 'number', default: 0 },  // ms before first show
        cooldown: { type: 'number', default: 10000 },  // ms of inactivity before showing again
        maxDisplayTime: { type: 'number', default: 5000 }  // maximum time to show UI (ms)
    },

    init: function() {
        // console.log('[OnboardingGuide] Component initialized');
        
        // State management
        this.isActive = false;
        this.isAnimating = false;
        this.lastInteraction = Date.now();
        this.cooldownEnd = 0;
        this.cooldownTimer = null;
        this.displayTimer = null;
        this.isIdleOrbiting = false;
        this.idleOrbitTimeout = null;
        this.lastIdleOrbitTime = Date.now();
        this.idleOrbitBaseRotation = null;
        this.idleOrbitAngle = 0;
        this.swayOriginalAzimuthal = null;
        this.swayAnimationFrame = null;
        this.swayStartTime = null;
        
        // Create UI elements
        this.createUI();
        
        // Bind methods
        this.startGuide = this.startGuide.bind(this);
        this.stopGuide = this.stopGuide.bind(this);
        this.handleInteraction = this.handleInteraction.bind(this);
        this.startCooldown = this.startCooldown.bind(this);
        this.clearCooldown = this.clearCooldown.bind(this);
        this.startSway = this.startSway.bind(this);
        this.stopSway = this.stopSway.bind(this);
        
        // Add event listeners
        this.el.sceneEl.addEventListener('model-loaded', () => {
            // console.log('[OnboardingGuide] Model loaded event received');
            // Reset state for new model
            this.isActive = false;
            this.isAnimating = false;
            this.cooldownEnd = 0;
            this.clearCooldown();
            this.lastInteraction = Date.now();
            // Start initial guide after delay
            setTimeout(() => {
                // console.log('[OnboardingGuide] Starting guide after initial delay');
                this.startGuide();
            }, this.data.initialDelay);
        });
        
        // Track user interaction - Mouse
        this.el.sceneEl.addEventListener('mousedown', (e) => {
            this.handleInteraction(e);
        });
        this.el.sceneEl.addEventListener('wheel', (e) => {
            this.handleInteraction(e);
        });
        
        // Track user interaction - Touch
        this.el.sceneEl.addEventListener('touchstart', (e) => {
            this.handleInteraction(e);
        });
        this.el.sceneEl.addEventListener('gesturestart', (e) => {
            this.handleInteraction(e);
        });
        
        // Track user interaction - VR Controllers
        this.el.sceneEl.addEventListener('triggerdown', (e) => {
            this.handleInteraction(e);
        });
        this.el.sceneEl.addEventListener('gripdown', (e) => {
            this.handleInteraction(e);
        });
        
        // Track orbit-controls specific events
        this.el.sceneEl.addEventListener('orbit-controls-start', (e) => {
            this.handleInteraction(e);
        });
    },

    createUI: function() {
        // Create container
        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'onboarding-guide';
              
        // Create message
        this.messageEl = document.createElement('p');
        
        // Create image container
        this.imageContainer = document.createElement('div');
        
        // Add elements to container
        this.uiContainer.appendChild(this.imageContainer);
        this.uiContainer.appendChild(this.messageEl);
        
        // Add to document
        document.body.appendChild(this.uiContainer);
    },

    startSway: function() {
        if (!this.imageContainer.querySelector('img')) return;
        this.swayStartTime = performance.now();
        const amplitude = 16; // px, adjust for more/less sway
        const speed = 0.35; // cycles per second

        const animate = (now) => {
            if (!this.isActive || !this.imageContainer.querySelector('img')) {
                this.stopSway();
                return;
            }
            const elapsed = (now - this.swayStartTime) / 1000; // seconds
            const offset = Math.sin(elapsed * speed * 2 * Math.PI) * amplitude;
            this.imageContainer.querySelector('img').style.transform = `translateX(${offset}px)`;
            this.swayAnimationFrame = requestAnimationFrame(animate);
        };
        this.swayAnimationFrame = requestAnimationFrame(animate);
    },

    stopSway: function() {
        if (this.swayAnimationFrame) {
            cancelAnimationFrame(this.swayAnimationFrame);
            this.swayAnimationFrame = null;
        }
        if (this.imageContainer.querySelector('img')) {
            this.imageContainer.querySelector('img').style.transform = '';
        }
    },

    clearCooldown: function() {
        if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer);
            this.cooldownTimer = null;
        }
        if (this.displayTimer) {
            clearTimeout(this.displayTimer);
            this.displayTimer = null;
        }
    },

    startGuide: function() {
        this.clearCooldown();
        this.stopIdleOrbit();
        this.resetIdleOrbitTimer();
        if (this.isActive) {
            // console.log('[OnboardingGuide] Guide already active, skipping start');
            return;
        }
        
        // console.log('[OnboardingGuide] Starting guide');
        this.isActive = true;
        this.isAnimating = true;
        
        // Update UI
        let msg = stripQuotes(this.data.message);
        msg = msg.replace(/\\n/g, '<br>'); // Replace literal \n
        msg = msg.replace(/\n/g, '<br>');  // Replace actual newlines
        this.messageEl.innerHTML = msg;
        
        // Update image if provided
        const cleanImageUrl = stripQuotes(this.data.imageUrl);
        if (cleanImageUrl) {
            // console.log('[OnboardingGuide] Loading image:', cleanImageUrl);
            this.imageContainer.innerHTML = `<img src="${cleanImageUrl}" style="max-width: 48px; height: auto;">`;
        }
        
        // Show UI with fade-in
        this.showUI();
        
        // Set maximum display time
        this.displayTimer = setTimeout(() => {
            // console.log('[OnboardingGuide] Maximum display time reached, hiding UI');
            this.hideUI();
            this.isAnimating = false;
            this.isActive = false;
            this.startCooldown();
        }, this.data.maxDisplayTime);
    },

    startCooldown: function() {
        this.clearCooldown();
        this.cooldownTimer = setTimeout(() => {
            if (!this.isActive && Date.now() - this.lastInteraction >= this.data.cooldown) {
                this.startGuide();
            }
        }, this.data.cooldown);
    },

    showButtonTooltips: function() {
        document.querySelectorAll('.overlay-buttons').forEach(btn => {
            btn.setAttribute('data-balloon-visible', '');
        });
    },
    hideButtonTooltips: function() {
        document.querySelectorAll('.overlay-buttons').forEach(btn => {
            btn.removeAttribute('data-balloon-visible');
        });
    },

    showUI: function() {
        if (!this.uiContainer) return;
        this.uiContainer.classList.remove('fade-out');
        this.uiContainer.style.display = 'block';
        void this.uiContainer.offsetWidth;
        this.uiContainer.classList.add('fade-in');
        this.startSway();
        this.showButtonTooltips();
    },

    hideUI: function() {
        if (!this.uiContainer) return;
        this.uiContainer.classList.remove('fade-in');
        this.uiContainer.classList.add('fade-out');
        setTimeout(() => {
            if (this.uiContainer.classList.contains('fade-out')) {
                this.uiContainer.style.display = 'none';
                this.uiContainer.classList.remove('fade-in');
                this.uiContainer.classList.remove('fade-out');
            }
            this.stopSway();
            this.resetIdleOrbitTimer();
            this.hideButtonTooltips();
        }, 400);
    },

    stopGuide: function() {
        if (!this.isActive) {
            return;
        }
        this.isActive = false;
        this.isAnimating = false;
        this.hideUI();
        this.startCooldown();
    },

    handleInteraction: function(event) {
        this.lastInteraction = Date.now();
        if (this.isActive || this.cooldownTimer) {
            this.stopGuide();
        }
        this.stopIdleOrbit();
        this.resetIdleOrbitTimer();
    },

    remove: function() {
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.clearCooldown();
        this.stopGuide();
        this.stopSway();
    },

    // Idle Orbit Methods (disabled)
    startIdleOrbit: function() {},
    stopIdleOrbit: function() {},
    resetIdleOrbitTimer: function() {},
    tick: function() {}
}); 