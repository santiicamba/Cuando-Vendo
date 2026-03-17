/**
 * Alert system for ¿Cuándo Vendo?
 *
 * Alerts are stored separately from positions so they survive position migrations.
 * Each alert is keyed by position ID.
 *
 * Triggered state tracks whether a threshold has already fired so we don't repeat
 * until the price moves back across the boundary.
 */

export interface AlertConfig {
  positionId: string
  ticker: string
  enabled: boolean
  targetGainUSD: number | null   // fire when returnUSD >= this value
  stopLossUSD: number | null     // fire when returnUSD <= -abs(this value)
}

interface TriggeredState {
  targetFired: boolean   // true while returnUSD >= threshold
  stopFired: boolean     // true while returnUSD <= -threshold
}

const ALERTS_KEY = 'cedear-alerts'
const TRIGGERED_KEY = 'cedear-alerts-triggered'

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export function getAlerts(): Record<string, AlertConfig> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveAlerts(alerts: Record<string, AlertConfig>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function setAlert(config: AlertConfig): void {
  const alerts = getAlerts()
  alerts[config.positionId] = config
  saveAlerts(alerts)
}

export function removeAlert(positionId: string): void {
  const alerts = getAlerts()
  delete alerts[positionId]
  saveAlerts(alerts)
}

function getTriggeredMap(): Record<string, TriggeredState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(TRIGGERED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveTriggeredMap(map: Record<string, TriggeredState>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRIGGERED_KEY, JSON.stringify(map))
}

// ---------------------------------------------------------------------------
// Notification permission
// ---------------------------------------------------------------------------

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission as NotificationPermission
}

/**
 * Request browser notification permission.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result as NotificationPermission
}

function fireNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: title, // deduplicates same-tag notifications on most browsers
    })
  } catch {
    // Notification constructor can throw in some sandboxed environments
  }
}

// ---------------------------------------------------------------------------
// Core check: call after every price refresh
// ---------------------------------------------------------------------------

interface PositionSnapshot {
  id: string
  ticker: string
  returnUSD: number
}

/**
 * Compare each position's current returnUSD against its alert thresholds.
 * Fires at most once per crossing event and resets when price moves back.
 */
export function checkAndFireAlerts(positions: PositionSnapshot[]): void {
  if (getNotificationPermission() !== 'granted') return

  const alerts = getAlerts()
  const triggered = getTriggeredMap()
  let changed = false

  for (const pos of positions) {
    const alert = alerts[pos.id]
    if (!alert || !alert.enabled) continue

    const state: TriggeredState = triggered[pos.id] ?? { targetFired: false, stopFired: false }

    // --- Target gain check ---
    if (alert.targetGainUSD !== null) {
      const threshold = alert.targetGainUSD
      if (pos.returnUSD >= threshold && !state.targetFired) {
        fireNotification(
          `Alerta de cartera - ${pos.ticker}`,
          `Alcanzaste el objetivo que definiste para tu posicion en ${pos.ticker}.`
        )
        state.targetFired = true
        changed = true
      } else if (pos.returnUSD < threshold && state.targetFired) {
        // Price retreated — reset so it can fire again if it crosses up again
        state.targetFired = false
        changed = true
      }
    }

    // --- Stop loss check ---
    if (alert.stopLossUSD !== null) {
      const threshold = -Math.abs(alert.stopLossUSD)
      if (pos.returnUSD <= threshold && !state.stopFired) {
        fireNotification(
          `Alerta de cartera - ${pos.ticker}`,
          `Tu posicion en ${pos.ticker} esta por debajo del limite que definiste.`
        )
        state.stopFired = true
        changed = true
      } else if (pos.returnUSD > threshold && state.stopFired) {
        state.stopFired = false
        changed = true
      }
    }

    if (changed) {
      triggered[pos.id] = state
    }
  }

  if (changed) saveTriggeredMap(triggered)
}
