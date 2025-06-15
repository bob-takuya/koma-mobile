export class CameraService {
  private stream: MediaStream | null = null
  public isActive = false

  async startCamera(): Promise<MediaStream> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      this.isActive = true
      return this.stream
    } catch (error) {
      this.isActive = false
      throw error
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    this.isActive = false
  }

  async capturePhoto(videoElement: HTMLVideoElement): Promise<Blob> {
    if (!this.isActive || !this.stream) {
      throw new Error('Camera not active')
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Could not get canvas context')
    }

    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        'image/webp',
        0.8,
      )
    })
  }

  async checkPermissions(): Promise<boolean> {
    try {
      if (!navigator.permissions) return false

      const permission = await navigator.permissions.query({ name: 'camera' } as any)
      return permission.state === 'granted'
    } catch (error) {
      return false
    }
  }

  getStream(): MediaStream | null {
    return this.stream
  }
}
