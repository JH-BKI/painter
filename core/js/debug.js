// Debug module for handling development tools
function initDebug() {
    // Inject CSS to move stats panel to bottom right
    const style = document.createElement('style');
    style.textContent = `
    .rs-base {
    left: 16px !important;
    top: auto !important;
    bottom: 16px !important;
    z-index: 2000 !important;
    }
    `;
    document.head.appendChild(style);

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
            paintPreview.style.top = '350px';
            paintPreview.style.left = '16px';
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
        // Debug: skip to next sequence with ']' key
        if (event.key === '/') {
            const comp = document.querySelector('[paintable-texture]')?.components['paintable-texture'];
            if (comp && typeof comp.calculateCoverage === 'function') {
                // Fill the paint layer with opaque pixels in the mask area
                if (comp.maskData && comp.paintLayerCtx) {
                    const imgData = comp.paintLayerCtx.getImageData(0, 0, comp.canvasResolution, comp.canvasResolution);
                    for (let i = 0; i < comp.maskData.data.length; i += 4) {
                        if (
                            comp.maskData.data[i] > 200 &&
                            comp.maskData.data[i + 1] > 200 &&
                            comp.maskData.data[i + 2] > 200
                        ) {
                            imgData.data[i + 3] = 255; // Set alpha to fully opaque
                        }
                    }
                    comp.paintLayerCtx.putImageData(imgData, 0, 0);
                }
                comp.calculateCoverage();
                console.log('Debug: Forced coverage to 100% and triggered calculation.');
            }
        }
        // Debug: toggle downstroke requirement with 'o' key
        if (event.key.toLowerCase() === 'o') {
            // Always get the latest paintableComponent
            const comp = document.querySelector('[paintable-texture]')?.components['paintable-texture'];
            if (comp) {
                comp.forceDownstrokes = !comp.forceDownstrokes;
                console.log('Debug: forceDownstrokes is now', comp.forceDownstrokes);
            } else {
                console.log('Debug: paintableComponent not found');
            }
        }
        // Debug: apply stroke map mask to teeth with 't' key
        if (event.key.toLowerCase() === 't') {
            const comp = document.querySelector('[paintable-texture]')?.components['paintable-texture'];
            if (comp) {
                const maskImg = document.getElementById('paintStrokeMap');
                if (maskImg) {
                    comp.paintCtx.clearRect(0, 0, comp.canvasResolution, comp.canvasResolution);
                    comp.paintCtx.drawImage(maskImg, 0, 0, comp.canvasResolution, comp.canvasResolution);
                    comp.texture.needsUpdate = true;
                    // Set on all mesh materials
                    if (comp.mesh) {
                        comp.mesh.traverse(obj => {
                            if (obj.isMesh && obj.material) {
                                if (Array.isArray(obj.material)) {
                                    obj.material.forEach(mat => {
                                        mat.map = comp.texture;
                                        mat.needsUpdate = true;
                                    });
                                } else {
                                    obj.material.map = comp.texture;
                                    obj.material.needsUpdate = true;
                                }
                            }
                        });
                    }
                    console.log('Debug: Applied stroke map mask to teeth.');
                } else {
                    console.warn('Debug: paintStrokeMap image not found.');
                }
            } else {
                console.warn('Debug: paintable-texture component not found.');
            }
        }
    });

    // Create brush preview canvas
    const brushPreviewOverlay = document.createElement('canvas');
    brushPreviewOverlay.id = 'brushPreviewOverlay';
    brushPreviewOverlay.width = 2048;
    brushPreviewOverlay.height = 2048;
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
        brushPreviewCtx.clearRect(0, 0, 2048, 2048);
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