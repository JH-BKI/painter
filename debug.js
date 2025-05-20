// Debug module for handling development tools
function initDebug() {
    console.log('initDebug - debugging enabled');
    // Get the scene element
    const scene = document.querySelector('a-scene');
    let paintPreview = null;
    let pollInterval = null;

    function showPaintPreview() {
        if (!paintPreview) {
            paintPreview = document.createElement('canvas');
            paintPreview.id = 'paintPreview';
            paintPreview.width = 256;
            paintPreview.height = 256;
            paintPreview.style.position = 'fixed';
            paintPreview.style.top = '60px';
            paintPreview.style.right = '40px';
            paintPreview.style.border = '1px solid #888';
            paintPreview.style.background = '#222';
            paintPreview.style.zIndex = 1001;
            document.body.appendChild(paintPreview);
        }
        paintPreview.style.display = 'block';
        // Start polling
        if (!pollInterval) {
            pollInterval = setInterval(() => {
                // Try to find the paint layer and mask from the A-Frame component
                const comp = document.querySelector('[paintable-texture]')?.components['paintable-texture'];
                if (comp && comp.paintLayerCanvas && comp.maskImage) {
                    const ctx = paintPreview.getContext('2d');
                    ctx.clearRect(0, 0, 256, 256);
                    // Draw mask first
                    ctx.drawImage(comp.maskImage, 0, 0, 256, 256);
                    // Draw paint (scaled down)
                    ctx.globalAlpha = 1.0;
                    ctx.drawImage(comp.paintLayerCanvas, 0, 0, 256, 256);
                }
            }, 200);
        }
    }
    function hidePaintPreview() {
        if (paintPreview) {
            paintPreview.style.display = 'none';
        }
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }
    // Add keyboard listener for ';' key
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === ';') {
            // Toggle stats
            const stats = scene.getAttribute('stats');
            scene.setAttribute('stats', !stats);
            console.log('Stats:', !stats ? 'enabled' : 'disabled');
            // Toggle paint preview canvas
            if (!paintPreview || paintPreview.style.display === 'none') {
                showPaintPreview();
                console.log('Paint preview: shown');
            } else {
                hidePaintPreview();
                console.log('Paint preview: hidden');
            }
        }
    });

    // Create brush preview canvas
    const brushPreviewOverlay = document.createElement('canvas');
    brushPreviewOverlay.id = 'brushPreviewOverlay';
    brushPreviewOverlay.width = 64;
    brushPreviewOverlay.height = 64;
    brushPreviewOverlay.style.position = 'absolute';
    brushPreviewOverlay.style.pointerEvents = 'none';
    brushPreviewOverlay.style.zIndex = '10';
    brushPreviewOverlay.style.left = '0';
    brushPreviewOverlay.style.top = '0';
    brushPreviewOverlay.style.display = 'none';
    document.body.appendChild(brushPreviewOverlay);

    // Get the paintable-texture component
    const paintableComponent = document.querySelector('[paintable-texture]').components['paintable-texture'];
    
    // Add brush preview functionality
    const brushPreviewCtx = brushPreviewOverlay.getContext('2d');
    
    function drawBrushPreview() {
        brushPreviewCtx.clearRect(0, 0, 64, 64);
        brushPreviewCtx.beginPath();
        brushPreviewCtx.arc(
            32, 32,
            (paintableComponent.brushSize + paintableComponent.brushPreviewFudge) / 2,
            0, 2 * Math.PI
        );
        brushPreviewCtx.strokeStyle = paintableComponent.brushColor;
        brushPreviewCtx.lineWidth = 2;
        brushPreviewCtx.stroke();
    }

    function updateBrushPreview(e) {
        if (!paintableComponent.paintMode) {
            brushPreviewOverlay.style.display = 'none';
            return;
        }
        brushPreviewOverlay.style.display = 'block';
        brushPreviewOverlay.style.left = (e.clientX - brushPreviewOverlay.width / 2) + 'px';
        brushPreviewOverlay.style.top = (e.clientY - brushPreviewOverlay.height / 2) + 'px';
        drawBrushPreview();
    }

    // Add event listeners
    window.addEventListener('mousemove', updateBrushPreview);
    window.addEventListener('mouseout', () => {
        brushPreviewOverlay.style.display = 'none';
    });

    // Add to debug UI
    const debugUI = document.getElementById('debugUI');
    if (debugUI) {
        const brushPreviewSection = document.createElement('div');
        brushPreviewSection.innerHTML = `
            <h3>Brush Preview</h3>
            <p>Shows brush size and position while painting</p>
        `;
        debugUI.appendChild(brushPreviewSection);
    }
}

// Modular debug initialization
// Only run if debug.js is loaded by url params in main code
initDebug();