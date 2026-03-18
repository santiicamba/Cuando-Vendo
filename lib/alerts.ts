/**
 * Alert system for Cuando Vendo?
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
  // When an alert is reconfigured, clear its triggered state so it can fire fresh
  clearTriggeredState(config.positionId)
}

export function removeAlert(positionId: string): void {
  const alerts = getAlerts()
  delete alerts[positionId]
  saveAlerts(alerts)
  clearTriggeredState(positionId)
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

function clearTriggeredState(positionId: string): void {
  const map = getTriggeredMap()
  delete map[positionId]
  saveTriggeredMap(map)
}

// ---------------------------------------------------------------------------
// Notification permission
// ---------------------------------------------------------------------------

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission as NotificationPermissionState
}

/**
 * Request browser notification permission.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result as NotificationPermissionState
}

function fireNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      // Use unique tag per title so each alert shows independently
      tag: title,
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
 *
 * Key fix: track `positionChanged` per-position so triggered state is
 * always persisted correctly even when only some positions change.
 */
export function checkAndFireAlerts(positions: PositionSnapshot[]): void {
  // Bail early if permission not granted
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const alerts = getAlerts()
  const triggered = getTriggeredMap()

  for (const pos of positions) {
    const alert = alerts[pos.id]
    if (!alert || !alert.enabled) continue

    // Clone current state (or start fresh)
    const prev: TriggeredState = triggered[pos.id]
      ? { ...triggered[pos.id] }
      : { targetFired: false, stopFired: false }

    let positionChanged = false

    // --- Target gain check ---
    if (alert.targetGainUSD !== null) {
      const threshold = alert.targetGainUSD
      if (pos.returnUSD >= threshold) {
        if (!prev.targetFired) {
          fireNotification(
            `Alerta de cartera - ${pos.ticker}`,
            `Alcanzaste el objetivo que definiste para tu posicion en ${pos.ticker}.`
          )
          prev.targetFired = true
          positionChanged = true
        }
      } else {
        // Price retreated below threshold — reset so it can fire again
        if (prev.targetFired) {
          prev.targetFired = false
          positionChanged = true
        }
      }
    }

    // --- Stop loss check ---
    if (alert.stopLossUSD !== null) {
      const threshold = -Math.abs(alert.stopLossUSD)
      if (pos.returnUSD <= threshold) {
        if (!prev.stopFired) {
          fireNotification(
            `Alerta de cartera - ${pos.ticker}`,
            `Tu posicion en ${pos.ticker} esta por debajo del limite que definiste.`
          )
          prev.stopFired = true
          positionChanged = true
        }
      } else {
        // Price recovered — reset
        if (prev.stopFired) {
          prev.stopFired = false
          positionChanged = true
        }
      }
    }

    // Persist updated state for this position immediately
    if (positionChanged) {
      triggered[pos.id] = prev
    }
  }

  // Save the full map once after all positions are checked
  saveTriggeredMap(triggered)
}
