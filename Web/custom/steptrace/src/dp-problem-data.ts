export const coinChangeProblem = {
  target: 30,
  coins: [50, 25, 10, 1],
  amounts: [0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30],
  bestCoins: [0, 1, 2, 3, 4, 5, 1, 6, 2, 1, 3],
} as const

export const gridPathProblem = {
  costs: [
    [0, 1, 1, 9],
    [2, 9, 1, 9],
    [2, 2, 9, 9],
    [9, 2, 2, 0],
  ],
  greedyPath: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
  optimalPath: [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [3, 2],
    [3, 3],
  ],
  bestRemaining: [
    [10, 14, 13, 27],
    [10, 15, 12, 18],
    [8, 6, 11, 9],
    [13, 4, 2, 0],
  ],
  greedyCost: 21,
  optimalCost: 10,
} as const

export type GridCell = [number, number]
