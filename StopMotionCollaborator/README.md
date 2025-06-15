# StopMotionCollaborator

## Overview
StopMotionCollaborator is a web application designed to streamline and synchronize the creation of stop-motion videos by multiple users. The application allows users to capture frames, manage their projects, and collaborate effectively.

## Features
- **Camera Integration**: Access the user's camera to capture images for stop-motion animation.
- **Frame Management**: Users can select, capture, and manage frames with a user-friendly interface.
- **Cloud Storage**: Utilizes AWS S3 for storing captured images securely.
- **Responsive Design**: Optimized for both mobile and desktop devices.

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine.
- An AWS account for S3 storage.

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/StopMotionCollaborator.git
   ```
2. Navigate to the project directory:
   ```
   cd StopMotionCollaborator
   ```
3. Install the dependencies:
   ```
   npm install
   ```

### Configuration
- Update the `config/s3-config.js` file with your AWS S3 credentials and bucket information. Ensure this file is not included in the public repository for security reasons.

### Running the Application
- Start the application using:
  ```
  npm start
  ```
- Open your browser and navigate to `http://localhost:3000` to view the application.

## Usage
1. Enter your API key on the initial screen.
2. Fetch the project configuration from S3.
3. Use the frame slider to select frames and capture images.
4. Sync captured images to S3 for storage.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.