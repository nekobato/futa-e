import { ElMessage } from 'element-plus'
import { render, type VNode } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifications } from '../../src/shared/notifications'

vi.mock('element-plus', () => ({
  ElMessage: vi.fn()
}))

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps application warnings to a bottom Element Plus message', () => {
    notifications.warning('少なくとも一つのDisplayを有効にしてください', {
      title: '開始できません'
    })

    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        duration: 3000,
        placement: 'bottom'
      })
    )
  })

  it('renders a labelled button that closes the message', () => {
    const close = vi.fn()
    vi.mocked(ElMessage).mockReturnValue({ close })

    notifications.warning('確認してください')

    const options = vi.mocked(ElMessage).mock.calls[0]?.[0] as {
      message: VNode
    }
    const host = document.createElement('div')

    render(options.message, host)

    const closeButton = host.querySelector<HTMLButtonElement>(
      'button[aria-label="通知を閉じる"]'
    )
    expect(closeButton).not.toBeNull()

    closeButton?.click()

    expect(close).toHaveBeenCalledOnce()
    render(null, host)
  })
})
