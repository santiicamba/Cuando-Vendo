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
      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAQAElEQVR4Aex9B4BkVbXtOjdV7jwZGJICPpWv8hRRDKCCPt8XyQaegaAiCiiSJCNZGAVJkjGQBMkgWcEHAl9UVETCEGaY2Lm68r33r3W7q2maGRime2a6um/N3XVy2mftc/bZ51aPhfgTc2AKcyAWgCk8+fHQgVgAYhRMaQ7EAjClpz8efCwAMQamNAemsABM6XmPBz/EgVgAhhgRO1OTA7EATM15j0c9xIFYAIYYETtTkwOxAEzNeY9HPcSBWACGGDGlnHiwwxyIBWCYFbFnKnIgFoCpOOvxmIc5EAvAMCtiz1TkQCwAU3HW4zEPcyAWgGFWxJ6pwIHRY4wFYDRH4vCU4kAsAFNquuPBjuZALACjORKHpxQHYgGYUtMdD3Y0B2IBGM2RODylODCFBGBKzWs82FXkQCwAq8ioONvk5EAsAJNzXuNRrSIHYgFYRUbF2SYnB2IBmJzzGo9qFTkQC8AqMqqhs8WdXykHYgFYKWvihKnAgVgApsIsx2NcKQdiAVgpa+KEqcCBWACmwizHY1wpB2IBWClr4oTJwIE3G0MsAG/GoTh9UnMgFoBJPb3x4N6MA7EAvBmH4vRJzYFYACb19MaDezMOxALwZhyK0yc1ByaxAEzqeYsHN04ciAVgnBgZV9OYHIgFoDHnLe71OHEgFoBxYmRcTWNyIBaAxpy3uNfjxIFYAMaJkROqmrgzq8yBWABWmVVxxsnIgVgAJuOsxmNaZQ7EArDKrIozTkYOxAIwGWc1HtMqcyAWgCFWPfPMM4mnnnqq/bnnntvglVde2YK01bJly0TvXbJkyZakd4u6urrkbtnd3V2n/9PT0/Pe3t7e/+zr69umv7//o/l8/hP5fH7HgYGBzxYKhc+TdiXtRtp9iORX3C4MjybFK11592D6nkP0BboK78E29hyiPdjOl9n2/4jY/le6u7tFX6X/q4pj3/bo7u7eqbOzcwf2/UMc02Yvv/zyHI6zOQzDSTf/Q9O5ys6UZ8Df/va31kWLFr1j5syZR26++ea/3njjje+YNWvWnaQbOjo6rhVNnz79ujq1trbKf01LS8swNTc3X9XU1PSrXC53RTabvSSTyVxIOjedTp+dSqXOIp1BOp102hDJr7gfM1ynM+mvUz1Obj2fXKWfxTbOJMmdxzbOYLuniRh3KvsiOpn+kxh3MsNnsa8/bWtrO599v7y9vf0ajvXqOXPmXE6B+llfX/77EgzyYNoqo2YSZZyyAvDoo4/O7O7u22mLLba4atq0afcSsMcEQfAp3/ffQdqA/vW5Qm7Eud6E9DbS20fQZvTXqR6vPJsyXvk3pitS+Q3pXxWay3yiDeiK1qe73hDNoVun2fSLZtEVzaQ7mhSvPHM4jtkkjWcjjmdTY8yWjuN82PO8nRKJxNcpdEdks7lLWlrarqQwnLJ8+fL/nD9/fpJ1TolnygnAPffc0/7ss89u+q53bcmVMfdLgmEH27ZnEhgQ0Q+R/I2AAPXzjciyLIiUZ+R4FOY4E45jtbuus1ky6e2YTif3p0Ccr11j8eLFW1NgzMgyk9E/ZQTguOOOsx555JGmd7zjHe/bZJNNLuFkfoGUqdVqEHHVZ/DVRwB5NdT4Po1HtKKRhCHAXUKC0kQBeF82m92LO+KZPDvszzNDbkVlJkvclBCAhx66Kbf99ts3z507d1vq9rcT7B/hiodisQjuABFpleSKB6ZFYJB/ZYBppMnXOEQr67PSwjBASCnQeEWu62Z5ttiGgvA9+g/nbjB9ZeUbPX4SCcCKp+L+++9PJpNzEjzc3siD7K3lctkWyJWbCXIi0sTXKYqYJF8C9psNRcJPdSjKpvzaDcQLgn9jCsE3KQwncieYFWWYZF+TWgAef/xxd/bs2RtuueW7ls2ePfMjQVBDIuHCdW1Uq9VI569UKpEKpInX',
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
