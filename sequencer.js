// Simple state sequencer for managing UI and actions
class StateSequencer {
    constructor() {
        console.log('[sequencer.js] Initializing StateSequencer');
        
        // Store references to UI elements and state
        this.dryteeth = 0;
        this.paintteeth = 0;
        this.paintableComponent = null;
        const coverageLabel = document.getElementById('coverageLabel');
        const nextButtonContainer = document.querySelector('.nextButtonContainer');

        this.states = {
            start: {
                next: 'instructions',
                onEnter: () => {
                    console.log('[sequencer.js] Entering start state');
                    this.showState('start');
                }
            },
            instructions: {
                next: 'dryteeth',
                onEnter: () => {
                    console.log('[sequencer.js] Entering instructions state');
                    this.showState('instructions');
                }
            },
            dryteeth: {
                next: 'paintteeth',
                onEnter: () => {
                    console.log('[sequencer.js] Entering dryteeth state');
                    coverageLabel.textContent = 'Teeth/gums dried:';
                    nextButtonContainer.style.display = 'none';
                    this.resetPainting();
                    this.showState('dryteeth');
                }
            },
            paintteeth: {
                next: 'end',
                onEnter: () => {
                    console.log('[sequencer.js] Entering paintteeth state');
                    nextButtonContainer.style.display = 'none';
                    coverageLabel.textContent = 'Fluoride varnish applied:';
                    this.resetPainting();
                    this.showState('paintteeth');
                }
            },
            end: {
                next: 'start',
                onEnter: () => {
                    console.log('[sequencer.js] Entering end state');
                    this.showState('end');
                    document.getElementById('dryteethResult').textContent = this.dryteeth;
                    document.getElementById('paintteethResult').textContent = this.paintteeth;
                }
            }
        };
        
        this.currentState = 'start';
        console.log('[sequencer.js] Initial state set to:', this.currentState);
        
        // Debug: Check if onEnter functions are properly defined
        Object.keys(this.states).forEach(state => {
            console.log(`[sequencer.js] State ${state} onEnter is:`, typeof this.states[state].onEnter);
        });
    }

    // Get the current state
    getCurrentState() {
        return this.currentState;
    }

    // Show/hide UI elements based on state
    showState(state) {
        console.log('[sequencer.js] App state changed to:', state);
        if (typeof PlayAudioSFX === 'function') PlayAudioSFX('#SFX-state-transition');
        // Main screens
        document.getElementById('startScreen').style.display = (state === 'start') ? 'block' : 'none';
        document.getElementById('instructionsScreen').style.display = (state === 'instructions') ? 'block' : 'none';
        document.getElementById('endScreen').style.display = (state === 'end') ? 'block' : 'none';
        document.getElementById('dryteeth').style.display = (state === 'dryteeth') ? 'block' : 'none';
        document.getElementById('paintteeth').style.display = (state === 'paintteeth') ? 'block' : 'none';

        // A-Frame container and controls
        const aframeContainer = document.getElementById('aframeContainer');
        if (aframeContainer) {
            aframeContainer.style.display = (state === 'dryteeth' || state === 'paintteeth') ? 'block' : 'none';
        }
        
        // Next button
        const nextBtn = document.getElementById('nextStateBtn');
        if (nextBtn) {
            nextBtn.style.display = (state === 'dryteeth' || state === 'paintteeth') ? 'block' : 'none';
        }
        
        // Coverage display
        if (this.paintableComponent && this.paintableComponent.coverageDisplay) {
            this.paintableComponent.coverageDisplay.style.display = (state === 'dryteeth' || state === 'paintteeth') ? 'block' : 'none';
        }
        
        // Teeth model and camera
        const teethGroup = document.querySelector('#teethGroup');
        if (teethGroup) {
            teethGroup.setAttribute('visible', (state === 'dryteeth' || state === 'paintteeth'));
            
        }

    }

    // Reset painting state
    resetPainting() {
        if (this.paintableComponent) {
            // Clear paint layer
            this.paintableComponent.paintLayerCtx.clearRect(0, 0, this.paintableComponent.canvasResolution, this.paintableComponent.canvasResolution);
            this.paintableComponent.paintLayerCtx.fillStyle = 'rgba(0,0,0,0)';
            this.paintableComponent.paintLayerCtx.fillRect(0, 0, this.paintableComponent.canvasResolution, this.paintableComponent.canvasResolution);
            this.paintableComponent.applyTexture();
            this.paintableComponent.coverageNeedsUpdate = true;
            this.paintableComponent.paintedPixels = 0;
        }
    }

    // Clear painting
    clearPainting() {
        if (this.paintableComponent) {
            showNotification("Current step restarted, your progress has been cleared.","is-warning is-light");
            // Clear paint layer
            this.paintableComponent.paintLayerCtx.clearRect(0, 0, this.paintableComponent.canvasResolution, this.paintableComponent.canvasResolution);
            this.paintableComponent.paintLayerCtx.fillStyle = 'rgba(0,0,0,0)';
            this.paintableComponent.paintLayerCtx.fillRect(0, 0, this.paintableComponent.canvasResolution, this.paintableComponent.canvasResolution);
            this.paintableComponent.applyTexture();
            this.paintableComponent.coverageNeedsUpdate = true;
            this.paintableComponent.paintedPixels = 0;
            this.paintableComponent.paintablePixels = 0;
            // Recalculate coverage to update UI
            if (typeof this.paintableComponent.calculateCoverage === 'function') {
                this.paintableComponent.calculateCoverage();
            }
        }
    }

    // Move to the next state
    next() {
        console.log('[sequencer.js] Attempting to move to next state from:', this.currentState);
        const currentStateConfig = this.states[this.currentState];
        if (currentStateConfig && currentStateConfig.next) {
            const nextState = currentStateConfig.next;
            console.log('[sequencer.js] Moving to next state:', nextState);
            
            // Store coverage data if needed
            if (this.currentState === 'dryteeth' && this.paintableComponent) {
                this.dryteeth = this.paintableComponent.paintablePixels > 0 ? 
                    (this.paintableComponent.paintedPixels / this.paintableComponent.paintablePixels * 100).toFixed(1) : 0;
            } else if (this.currentState === 'paintteeth' && this.paintableComponent) {
                this.paintteeth = this.paintableComponent.paintablePixels > 0 ? 
                    (this.paintableComponent.paintedPixels / this.paintableComponent.paintablePixels * 100).toFixed(1) : 0;
            }
            
            this.currentState = nextState;
            if (this.states[this.currentState].onEnter) {
                console.log('[sequencer.js] Calling onEnter for state:', this.currentState);
                try {
                    this.states[this.currentState].onEnter();
                } catch (error) {
                    console.error('[sequencer.js] Error in onEnter:', error);
                }
            }
            return true;
        }
        console.log('[sequencer.js] No next state available');
        return false;
    }

    // Set a specific state
    setState(stateName) {
        console.log('[sequencer.js] Setting state to:', stateName);
        if (this.states[stateName]) {
            this.currentState = stateName;
            if (this.states[stateName].onEnter) {
                console.log('[sequencer.js] Calling onEnter for state:', stateName);
                try {
                    this.states[stateName].onEnter();
                } catch (error) {
                    console.error('[sequencer.js] Error in onEnter:', error);
                }
            }
            return true;
        }
        console.log('[sequencer.js] Invalid state name:', stateName);
        return false;
    }

    // Set the paintable component reference
    setPaintableComponent(component) {
        this.paintableComponent = component;
    }
}

// Export the sequencer
window.StateSequencer = StateSequencer; 