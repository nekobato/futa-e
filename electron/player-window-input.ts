type PlayerWindowInput = {
  code?: string
  key?: string
  type?: string
}

export const shouldExitPlayerWindows = (input: PlayerWindowInput): boolean =>
  input.type === 'keyDown' &&
  (input.key === 'Escape' || input.code === 'Escape')
