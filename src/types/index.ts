// StopMotionCollaborator types
export interface Frame {
  frame: number
  taken: boolean
  filename: string | null
  note: string | null
}

export interface ProjectConfig {
  totalFrames: number
  fps: number
  aspectRatio: number
  frames: Frame[]
}

export interface S3Config {
  bucketName: string
  region: string
  accessKeyId?: string
  secretAccessKey?: string
}

export interface CameraSettings {
  video: boolean
  audio: boolean
  facingMode?: 'user' | 'environment'
}

export interface OnionSkinSettings {
  enabled: boolean
  opacity: number
  previousFrames: number
  nextFrames: number
}
