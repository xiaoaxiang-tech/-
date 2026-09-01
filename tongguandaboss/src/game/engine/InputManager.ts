// ============ 输入管理器 ============
import type { KeyState } from '../types'

export class InputManager {
  keys: KeyState
  private justPressedKeys: Set<string>
  private keyMap: Record<string, keyof KeyState>

  constructor() {
    this.keys = {
      left: false, right: false, jump: false, attack: false,
      skill1: false, skill2: false, ultimate: false,
      switchWeapon: false, pause: false, directWeapon: -1,
    }
    this.justPressedKeys = new Set()
    this.keyMap = {
      'ArrowLeft': 'left', 'KeyA': 'left',
      'ArrowRight': 'right', 'KeyD': 'right',
      'ArrowUp': 'jump', 'KeyW': 'jump',
      'KeyJ': 'attack',
      'Space': 'jump',
      'KeyK': 'skill1',
      'KeyU': 'skill2',
      'KeyI': 'ultimate',
      'Tab': 'switchWeapon',
      'Digit1': 'directWeapon',
      'Digit2': 'directWeapon',
      'Digit3': 'directWeapon',
      'Digit4': 'directWeapon',
      'Escape': 'pause', 'KeyP': 'pause',
    }
    this.setupListeners()
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      const action = this.keyMap[e.code]
      if (action) {
        e.preventDefault()
        if (action === 'directWeapon') {
          // directWeapon is a number, not a boolean; handle separately in key handler
        } else if (!this.keys[action]) {
          this.justPressedKeys.add(action)
        }
        if (action !== 'directWeapon') {
          this.keys[action] = true
        }
      }
    })

    window.addEventListener('keyup', (e) => {
      const action = this.keyMap[e.code]
      if (action) {
        e.preventDefault()
        if (action !== 'directWeapon') {
          this.keys[action] = false
        }
      }
    })

    window.addEventListener('blur', () => {
      const k = this.keys
      k.left = false; k.right = false; k.jump = false; k.attack = false
      k.skill1 = false; k.skill2 = false; k.ultimate = false
      k.switchWeapon = false; k.pause = false; k.directWeapon = -1
      this.justPressedKeys.clear()
    })
  }

  isDown(key: keyof KeyState): boolean {
    const val = this.keys[key]
    if (typeof val === 'number') return val !== -1
    return !!val
  }

  justPressed(key: keyof KeyState): boolean {
    return this.justPressedKeys.has(key)
  }

  clearFrame() {
    this.justPressedKeys.clear()
  }

  reset() {
    const k = this.keys
    k.left = false; k.right = false; k.jump = false; k.attack = false
    k.skill1 = false; k.skill2 = false; k.ultimate = false
    k.switchWeapon = false; k.pause = false; k.directWeapon = -1
    this.justPressedKeys.clear()
  }
}
