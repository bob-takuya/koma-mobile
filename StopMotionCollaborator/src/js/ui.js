document.addEventListener('DOMContentLoaded', () => {
    const frameSlider = document.getElementById('frame-slider');
    const cameraPreview = document.getElementById('camera-preview');
    const downloadFrameButton = document.getElementById('download-frame-button');
    const overwriteButton = document.getElementById('overwrite-button');
    const infoOverlay = document.getElementById('info-overlay');
    
    let totalFrames = 0;
    let currentFrame = 0;

    function updateUI() {
        frameSlider.max = totalFrames - 1;
        frameSlider.value = currentFrame;

        if (frames[currentFrame].taken) {
            downloadFrameButton.style.display = 'block';
            overwriteButton.style.display = 'block';
            infoOverlay.textContent = frames[currentFrame].note || '';
        } else {
            downloadFrameButton.style.display = 'none';
            overwriteButton.style.display = 'none';
            infoOverlay.textContent = '';
        }
    }

    frameSlider.addEventListener('input', (event) => {
        currentFrame = parseInt(event.target.value, 10);
        updateUI();
    });

    downloadFrameButton.addEventListener('click', () => {
        if (frames[currentFrame].taken) {
            // Logic to download the frame image
        }
    });

    overwriteButton.addEventListener('click', () => {
        if (frames[currentFrame].taken) {
            // Logic to reactivate the camera for overwriting the frame
        }
    });

    // Initial setup
    fetchConfig().then(config => {
        totalFrames = config.totalFrames;
        frames = config.frames;
        updateUI();
    });
});