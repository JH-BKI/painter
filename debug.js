// Debug module for handling development tools
function initDebug() {
    // Get the scene element
    const scene = document.querySelector('a-scene');
    
    // Add keyboard listener for 'S' key
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === ';') {
            // Toggle stats
            const stats = scene.getAttribute('stats');
            scene.setAttribute('stats', !stats);
            console.log('Stats:', !stats ? 'enabled' : 'disabled');
        }
    });
} 