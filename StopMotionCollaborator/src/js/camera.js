const camera = {
    stream: null,
    videoElement: null,

    init: function(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        this.startCamera();
    },

    startCamera: async function() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.videoElement.srcObject = this.stream;
            this.videoElement.play();
        } catch (error) {
            console.error("Error accessing the camera: ", error);
        }
    },

    captureImage: function(canvasElementId) {
        const canvas = document.getElementById(canvasElementId);
        const context = canvas.getContext('2d');
        context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
        return canvas.toBlob(blob => {
            return blob;
        }, 'image/webp');
    },

    stopCamera: function() {
        if (this.stream) {
            const tracks = this.stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
    }
};

export default camera;