export class CameraService {
  private stream: MediaStream | null = null
  public isActive = false
  private _isInitializing = false

  async startCamera(): Promise<MediaStream> {
    // 既に初期化中の場合は待機
    if (this._isInitializing) {
      console.log('Camera initialization already in progress, waiting...')
      while (this._isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.stream && this.isActive) {
        return this.stream
      }
    }

    // 既にアクティブな場合はそのストリームを返す
    if (this.stream && this.isActive) {
      console.log('Camera already active, returning existing stream')
      return this.stream
    }

    this._isInitializing = true
    
    try {
      // 既存のストリームがあれば先に停止
      if (this.stream) {
        console.log('Stopping existing stream before starting new one')
        this.stream.getTracks().forEach((track) => track.stop())
        this.stream = null
      }

      console.log('Requesting camera access...')
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })

      this.isActive = true
      console.log('Camera started successfully')
      return this.stream
    } catch (error) {
      console.error('Failed to start camera:', error)
      this.isActive = false
      this.stream = null
      throw error
    } finally {
      this._isInitializing = false
    }
  }

  stopCamera(): void {
    console.log('Stopping camera...')
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.stop()
        console.log('Stopped track:', track.kind)
      })
      this.stream = null
    }
    this.isActive = false
    this._isInitializing = false
    console.log('Camera stopped')
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

      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return permission.state === 'granted'
    } catch {
      return false
    }
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  get isInitializing(): boolean {
    return this._isInitializing
  }
}
