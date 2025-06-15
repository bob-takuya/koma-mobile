const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const bucketName = 'your-bucket-name'; // Replace with your actual bucket name

function uploadImage(frameNumber, imageBlob) {
    const params = {
        Bucket: bucketName,
        Key: `projects/${frameNumber.toString().padStart(4, '0')}.webp`,
        Body: imageBlob,
        ContentType: 'image/webp',
        ACL: 'private'
    };

    return s3.upload(params).promise();
}

function fetchConfig() {
    return fetch('path/to/your/config.json') // Update with the actual path to your config file
        .then(response => response.json())
        .catch(error => console.error('Error fetching config:', error));
}

function updateFrameStatus(frameNumber, taken) {
    // Logic to update the frame status in your application state
}

function fetchImage(frameNumber) {
    const params = {
        Bucket: bucketName,
        Key: `projects/${frameNumber.toString().padStart(4, '0')}.webp`
    };

    return s3.getObject(params).promise()
        .then(data => {
            const url = URL.createObjectURL(new Blob([data.Body], { type: 'image/webp' }));
            return url;
        })
        .catch(error => console.error('Error fetching image:', error));
}

export { uploadImage, fetchConfig, updateFrameStatus, fetchImage };