export const createOrderedIndices = (length: number): number[] =>
  Array.from({ length }, (_value, index) => index)

export const createShuffledIndices = (
  length: number,
  random: () => number = Math.random
): number[] => {
  const indices = createOrderedIndices(length)

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]]
  }

  return indices
}

export const createPlaybackOrder = (
  length: number,
  shuffle: boolean,
  random: () => number = Math.random
): number[] =>
  shuffle ? createShuffledIndices(length, random) : createOrderedIndices(length)

export const firstPlayablePointer = (
  order: number[],
  excluded: Set<number>
): number | null => {
  const pointer = order.findIndex((itemIndex) => !excluded.has(itemIndex))
  return pointer === -1 ? null : pointer
}

export const nextPlayablePointer = (
  order: number[],
  currentPointer: number,
  excluded: Set<number>
): number | null => {
  for (let pointer = currentPointer + 1; pointer < order.length; pointer += 1) {
    if (!excluded.has(order[pointer])) {
      return pointer
    }
  }

  return null
}
