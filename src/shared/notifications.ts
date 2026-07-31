import { ElMessage } from 'element-plus'
import { h } from 'vue'

export type NotificationOptions = {
  title?: string
  duration?: number
}

type NotificationType = 'success' | 'info' | 'warning' | 'error'

const notificationContent = (
  message: string,
  title: string | undefined,
  onClose: () => void
) =>
  h('span', { class: 'app-notification-content' }, [
    h(
      'span',
      { class: 'app-notification-copy' },
      title ? [h('strong', title), h('span', message)] : message
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'app-notification-close',
        'aria-label': '通知を閉じる',
        onClick: onClose
      },
      [h('span', { 'aria-hidden': 'true' }, '×')]
    )
  ])

const showNotification = (
  type: NotificationType,
  message: string,
  options: NotificationOptions = {}
) => {
  const { duration = 3000, title } = options
  let close: () => void = () => undefined

  const handle = ElMessage({
    type,
    duration,
    placement: 'bottom',
    message: notificationContent(message, title, () => close())
  })

  close = () => handle.close()
}

/**
 * Application-owned notification boundary.
 *
 * Keeps views independent from the UI library's imperative message API.
 */
export const notifications = Object.freeze({
  success: (message: string, options?: NotificationOptions) =>
    showNotification('success', message, options),
  info: (message: string, options?: NotificationOptions) =>
    showNotification('info', message, options),
  warning: (message: string, options?: NotificationOptions) =>
    showNotification('warning', message, options),
  error: (message: string, options?: NotificationOptions) =>
    showNotification('error', message, options)
})
