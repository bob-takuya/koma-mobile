/**
 * Tweeq Framework Integration for Stop Motion Collaborator
 * This is a simplified mock implementation of the Tweeq framework
 */

interface TweeqAction {
  id: string
  icon?: string
  bind?: string
  children?: TweeqAction[]
  perform?: () => void
}

interface TweeqConfig {
  colorMode: 'light' | 'dark'
  accentColor: string
  grayColor: string
  backgroundColor: string
}

interface TweeqActions {
  register: (actions: TweeqAction[]) => void
}

interface TweeqInterface {
  actions: TweeqActions
}

// Mock Tweeq instance
let tweeqInstance: TweeqInterface | null = null

export function initTweeq(appId: string, config: TweeqConfig): void {
  console.log('Initializing Tweeq with config:', { appId, config })

  // Apply CSS custom properties for theming
  const root = document.documentElement
  root.style.setProperty('--accent-color', config.accentColor)
  root.style.setProperty('--gray-color', config.grayColor)
  root.style.setProperty('--background-color', config.backgroundColor)
  root.classList.add(`theme-${config.colorMode}`)

  tweeqInstance = {
    actions: {
      register: (actions: TweeqAction[]) => {
        console.log('Registering Tweeq actions:', actions)
        // Register keyboard shortcuts
        actions.forEach(registerAction)
      },
    },
  }
}

function registerAction(action: TweeqAction): void {
  if (action.bind && action.perform) {
    document.addEventListener('keydown', (event) => {
      if (shouldTriggerAction(event, action.bind!)) {
        event.preventDefault()
        action.perform!()
      }
    })
  }

  if (action.children) {
    action.children.forEach(registerAction)
  }
}

function shouldTriggerAction(event: KeyboardEvent, bind: string): boolean {
  const key = event.key.toLowerCase()
  const bindKey = bind.toLowerCase()

  // Simple key matching - could be enhanced for modifier keys
  switch (bindKey) {
    case 'space':
      return key === ' '
    case 'left':
      return key === 'arrowleft'
    case 'right':
      return key === 'arrowright'
    case 'up':
      return key === 'arrowup'
    case 'down':
      return key === 'arrowdown'
    default:
      return key === bindKey
  }
}

export function useTweeq(): TweeqInterface {
  if (!tweeqInstance) {
    throw new Error('Tweeq not initialized. Call initTweeq() first.')
  }
  return tweeqInstance
}

// Export Tq as an alias for the main interface
export const Tq = {
  init: initTweeq,
  use: useTweeq,
}
