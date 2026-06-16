/**
 * Randomized Conway's Game of Life animation for Futa-e backgrounds.
 */

import type { BackgroundAnimation } from "./types";
import {
  initializeCanvasAnimation,
  randomInteger,
  type CanvasViewport
} from "./shared";

const STEP_INTERVAL_SECONDS = 0.38;
const GRID_ALPHA = 0.18;
const MAJOR_GRID_INTERVAL = 5;
const HEAT_DECAY = 0.66;
const PREWARM_GENERATIONS = 14;
const CLUSTER_MIN_CELLS = 4;
const MAX_DECORATED_CLUSTERS = 12;
const MAX_CLUSTER_LINKS = 8;
const COLOR_BACKGROUND = "rgb(5, 17, 28)";
const COLOR_GRID_MINOR = "19, 36, 52";
const COLOR_GRID_MAJOR = "59, 84, 108";
const COLOR_CAD_LINE = "67, 92, 116";
const COLOR_CAD_ARC = "77, 106, 132";
const COLOR_CAD_CROSS = "93, 124, 154";
const COLOR_AFTERIMAGE_FILL = "18, 35, 52";
const COLOR_AFTERIMAGE_STROKE = "77, 106, 132";
const COLOR_ALIVE_FILL = "54, 82, 112";
const COLOR_ALIVE_STROKE = "84, 114, 140";
const COLOR_CLUSTER_LINK = "77, 106, 132";
const COLOR_CLUSTER_BOX = "93, 124, 154";
const COLOR_CLUSTER_CENTROID = "122, 155, 188";
const COLOR_CLUSTER_ARC = "84, 114, 140";

type CadLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dash: number;
  gap: number;
  alpha: number;
};

type CadArc = {
  x: number;
  y: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  alpha: number;
};

type CadCross = {
  x: number;
  y: number;
  size: number;
  alpha: number;
};

type CadGuides = {
  lines: CadLine[];
  arcs: CadArc[];
  crosses: CadCross[];
};

type LifeCluster = {
  minColumn: number;
  maxColumn: number;
  minRow: number;
  maxRow: number;
  centroidX: number;
  centroidY: number;
  aliveCount: number;
  activity: number;
};

type LifeGameScene = {
  columns: number;
  rows: number;
  cellSize: number;
  cells: Uint8Array;
  nextCells: Uint8Array;
  previousCells: Uint8Array;
  heatCells: Float32Array;
  clusterVisited: Uint8Array;
  clusterQueue: Int32Array;
  cadGuides: CadGuides;
  accumulatorSeconds: number;
  generation: number;
  stableGenerations: number;
  previousAliveCount: number;
};

/**
 * Creates a deterministic pseudo-random source for stable CAD guide placement.
 */
const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

/**
 * Returns a deterministic seed from the current viewport.
 */
const createViewportSeed = (viewport: CanvasViewport): number =>
  (Math.imul(Math.round(viewport.width), 73856093) ^
    Math.imul(Math.round(viewport.height), 19349663)) >>>
  0;

/**
 * Returns a random value inside the given range using a provided random source.
 */
const seededBetween = (
  random: () => number,
  min: number,
  max: number
): number => min + random() * (max - min);

/**
 * Creates static CAD construction guides for the current viewport.
 */
const createCadGuides = (
  viewport: CanvasViewport,
  cellSize: number
): CadGuides => {
  const random = createSeededRandom(createViewportSeed(viewport));
  const lineCount = Math.max(8, Math.round(viewport.width / 160));
  const arcCount = Math.max(4, Math.round(viewport.width / 420));
  const crossCount = Math.max(12, Math.round(viewport.width / 120));
  const lines: CadLine[] = [];
  const arcs: CadArc[] = [];
  const crosses: CadCross[] = [];

  for (let index = 0; index < lineCount; index += 1) {
    const vertical = random() > 0.45;
    const position =
      Math.round(
        seededBetween(random, 0, vertical ? viewport.width : viewport.height) /
          cellSize
      ) * cellSize;
    const offset = seededBetween(random, -cellSize * 2, cellSize * 2);

    lines.push({
      x1: vertical ? position + 0.5 : 0,
      y1: vertical ? 0 : position + 0.5,
      x2: vertical ? position + offset + 0.5 : viewport.width,
      y2: vertical ? viewport.height : position + offset + 0.5,
      dash: seededBetween(random, cellSize * 0.7, cellSize * 1.6),
      gap: seededBetween(random, cellSize * 0.35, cellSize * 0.9),
      alpha: seededBetween(random, 0.08, 0.16)
    });
  }

  for (let index = 0; index < arcCount; index += 1) {
    const radius = seededBetween(
      random,
      viewport.width * 0.12,
      viewport.width * 0.32
    );
    const startAngle = seededBetween(random, -Math.PI, Math.PI);

    arcs.push({
      x: seededBetween(random, viewport.width * 0.08, viewport.width * 0.92),
      y: seededBetween(random, viewport.height * 0.08, viewport.height * 0.92),
      radius,
      startAngle,
      endAngle:
        startAngle + seededBetween(random, Math.PI * 0.22, Math.PI * 0.58),
      alpha: seededBetween(random, 0.055, 0.115)
    });
  }

  for (let index = 0; index < crossCount; index += 1) {
    crosses.push({
      x:
        Math.round(seededBetween(random, 0, viewport.width) / cellSize) *
          cellSize +
        cellSize / 2,
      y:
        Math.round(seededBetween(random, 0, viewport.height) / cellSize) *
          cellSize +
        cellSize / 2,
      size: seededBetween(random, cellSize * 0.38, cellSize * 0.8),
      alpha: seededBetween(random, 0.075, 0.15)
    });
  }

  return { lines, arcs, crosses };
};

/**
 * Creates a random Life grid.
 */
const randomizeCells = (cells: Uint8Array): void => {
  for (let index = 0; index < cells.length; index += 1) {
    cells[index] = Math.random() > 0.75 ? 1 : 0;
  }
};

/**
 * Advances the newborn scene before first paint so clusters start with natural gaps.
 */
const prewarmScene = (scene: LifeGameScene): void => {
  for (let index = 0; index < PREWARM_GENERATIONS; index += 1) {
    stepLife(scene);
  }

  scene.accumulatorSeconds = 0;
  scene.stableGenerations = 0;
};

/**
 * Creates a Life scene sized to the viewport.
 */
const createScene = (viewport: CanvasViewport): LifeGameScene => {
  const cellSize = Math.max(14, Math.min(27, Math.round(viewport.width / 76)));
  const columns = Math.ceil(viewport.width / cellSize);
  const rows = Math.ceil(viewport.height / cellSize);
  const cells = new Uint8Array(columns * rows);
  const nextCells = new Uint8Array(columns * rows);
  const previousCells = new Uint8Array(columns * rows);
  const heatCells = new Float32Array(columns * rows);
  const clusterVisited = new Uint8Array(columns * rows);
  const clusterQueue = new Int32Array(columns * rows);

  randomizeCells(cells);
  previousCells.set(cells);
  cells.forEach((cell, index) => {
    heatCells[index] = cell === 1 ? 1 : 0;
  });

  const scene = {
    columns,
    rows,
    cellSize,
    cells,
    nextCells,
    previousCells,
    heatCells,
    clusterVisited,
    clusterQueue,
    cadGuides: createCadGuides(viewport, cellSize),
    accumulatorSeconds: 0,
    generation: 0,
    stableGenerations: 0,
    previousAliveCount: 0
  };

  prewarmScene(scene);

  return scene;
};

/**
 * Returns the one-dimensional index for wrapped grid coordinates.
 */
const getCellIndex = (
  scene: LifeGameScene,
  column: number,
  row: number
): number => {
  const wrappedColumn = (column + scene.columns) % scene.columns;
  const wrappedRow = (row + scene.rows) % scene.rows;
  return wrappedRow * scene.columns + wrappedColumn;
};

/**
 * Counts living neighbors for one Life cell.
 */
const countNeighbors = (
  scene: LifeGameScene,
  column: number,
  row: number
): number => {
  let count = 0;

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      count +=
        scene.cells[getCellIndex(scene, column + offsetX, row + offsetY)];
    }
  }

  return count;
};

/**
 * Adds a tiny random disturbance to avoid permanently frozen screens.
 */
const stirCells = (scene: LifeGameScene): void => {
  const stirCount = Math.max(2, Math.round((scene.columns * scene.rows) / 420));

  for (let index = 0; index < stirCount; index += 1) {
    const column = randomInteger(0, scene.columns - 1);
    const row = randomInteger(0, scene.rows - 1);
    scene.cells[getCellIndex(scene, column, row)] = 1;
  }
};

/**
 * Advances the Life simulation by one generation.
 */
const stepLife = (scene: LifeGameScene): void => {
  let aliveCount = 0;
  scene.previousCells.set(scene.cells);

  for (let row = 0; row < scene.rows; row += 1) {
    for (let column = 0; column < scene.columns; column += 1) {
      const index = getCellIndex(scene, column, row);
      const alive = scene.cells[index] === 1;
      const neighbors = countNeighbors(scene, column, row);
      const nextAlive = neighbors === 3 || (alive && neighbors === 2);
      scene.nextCells[index] = nextAlive ? 1 : 0;
      scene.heatCells[index] = nextAlive
        ? 1
        : scene.heatCells[index] * HEAT_DECAY;
      aliveCount += nextAlive ? 1 : 0;
    }
  }

  scene.cells.set(scene.nextCells);
  scene.generation += 1;
  scene.stableGenerations =
    Math.abs(aliveCount - scene.previousAliveCount) < 3
      ? scene.stableGenerations + 1
      : 0;
  scene.previousAliveCount = aliveCount;

  if (
    aliveCount === 0 ||
    scene.stableGenerations > 80 ||
    scene.generation % 240 === 0
  ) {
    stirCells(scene);
    scene.stableGenerations = 0;
  }
};

/**
 * Draws a barely visible grid so the cellular structure remains legible.
 */
const drawGrid = (
  scene: LifeGameScene,
  context: CanvasRenderingContext2D
): void => {
  context.save();
  context.lineWidth = 1;

  context.strokeStyle = `rgba(${COLOR_GRID_MINOR}, ${GRID_ALPHA})`;
  context.beginPath();
  for (let column = 0; column <= scene.columns; column += 1) {
    const x = column * scene.cellSize + 0.5;
    context.moveTo(x, 0);
    context.lineTo(x, scene.rows * scene.cellSize);
  }

  for (let row = 0; row <= scene.rows; row += 1) {
    const y = row * scene.cellSize + 0.5;
    context.moveTo(0, y);
    context.lineTo(scene.columns * scene.cellSize, y);
  }
  context.stroke();

  context.strokeStyle = `rgba(${COLOR_GRID_MAJOR}, 0.16)`;
  context.beginPath();
  for (let column = 0; column <= scene.columns; column += MAJOR_GRID_INTERVAL) {
    const x = column * scene.cellSize + 0.5;
    context.moveTo(x, 0);
    context.lineTo(x, scene.rows * scene.cellSize);
  }

  for (let row = 0; row <= scene.rows; row += MAJOR_GRID_INTERVAL) {
    const y = row * scene.cellSize + 0.5;
    context.moveTo(0, y);
    context.lineTo(scene.columns * scene.cellSize, y);
  }
  context.stroke();

  context.restore();
};

/**
 * Draws static CAD construction marks behind the cellular automaton.
 */
const drawCadGuides = (
  scene: LifeGameScene,
  context: CanvasRenderingContext2D
): void => {
  context.save();
  context.lineWidth = 1;

  for (const line of scene.cadGuides.lines) {
    context.strokeStyle = `rgba(${COLOR_CAD_LINE}, ${line.alpha})`;
    context.setLineDash([line.dash, line.gap]);
    context.beginPath();
    context.moveTo(line.x1, line.y1);
    context.lineTo(line.x2, line.y2);
    context.stroke();
  }

  context.setLineDash([scene.cellSize * 0.9, scene.cellSize * 0.55]);
  for (const arc of scene.cadGuides.arcs) {
    context.strokeStyle = `rgba(${COLOR_CAD_ARC}, ${arc.alpha})`;
    context.beginPath();
    context.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.endAngle);
    context.stroke();
  }

  context.setLineDash([]);
  for (const cross of scene.cadGuides.crosses) {
    context.strokeStyle = `rgba(${COLOR_CAD_CROSS}, ${cross.alpha})`;
    context.beginPath();
    context.moveTo(cross.x - cross.size, cross.y);
    context.lineTo(cross.x + cross.size, cross.y);
    context.moveTo(cross.x, cross.y - cross.size);
    context.lineTo(cross.x, cross.y + cross.size);
    context.stroke();
  }

  context.restore();
};

/**
 * Draws one dark afterimage cell from retained activity heat.
 */
const drawAfterimageCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  heat: number
): void => {
  const inset = Math.max(2, Math.floor(size * 0.12));
  const cellX = x + inset;
  const cellY = y + inset;
  const cellSize = size - inset * 2;

  if (heat > 0.36) {
    context.fillStyle = `rgba(${COLOR_AFTERIMAGE_FILL}, ${0.24 + heat * 0.28})`;
    context.fillRect(cellX, cellY, cellSize, cellSize);
  }

  context.strokeStyle = `rgba(${COLOR_AFTERIMAGE_STROKE}, ${0.18 + heat * 0.24})`;
  context.lineWidth = 1;
  context.strokeRect(cellX + 0.5, cellY + 0.5, cellSize - 1, cellSize - 1);
};

/**
 * Draws one active cell as a solid pale CAD-blue square.
 */
const drawAliveCell = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void => {
  const inset = Math.max(2, Math.floor(size * 0.12));
  const cellX = x + inset;
  const cellY = y + inset;
  const cellSize = size - inset * 2;

  context.fillStyle = `rgb(${COLOR_ALIVE_FILL})`;
  context.fillRect(cellX, cellY, cellSize, cellSize);

  context.strokeStyle = `rgba(${COLOR_ALIVE_STROKE}, 0.6)`;
  context.lineWidth = 1;
  context.strokeRect(cellX + 0.5, cellY + 0.5, cellSize - 1, cellSize - 1);
};

/**
 * Adds one neighboring cell to the cluster queue when it is a live unvisited cell.
 */
const enqueueClusterNeighbor = (
  scene: LifeGameScene,
  column: number,
  row: number,
  queueTail: number
): number => {
  if (column < 0 || column >= scene.columns || row < 0 || row >= scene.rows) {
    return queueTail;
  }

  const neighborIndex = row * scene.columns + column;

  if (
    scene.cells[neighborIndex] === 0 ||
    scene.clusterVisited[neighborIndex] === 1
  ) {
    return queueTail;
  }

  scene.clusterVisited[neighborIndex] = 1;
  scene.clusterQueue[queueTail] = neighborIndex;
  return queueTail + 1;
};

/**
 * Detects connected living-cell clusters for CAD analysis overlays.
 */
const detectLifeClusters = (scene: LifeGameScene): LifeCluster[] => {
  const clusters: LifeCluster[] = [];
  scene.clusterVisited.fill(0);

  for (let startIndex = 0; startIndex < scene.cells.length; startIndex += 1) {
    if (
      scene.cells[startIndex] === 0 ||
      scene.clusterVisited[startIndex] === 1
    ) {
      continue;
    }

    let queueHead = 0;
    let queueTail = 0;
    let aliveCount = 0;
    let heatTotal = 0;
    let columnTotal = 0;
    let rowTotal = 0;
    let minColumn = scene.columns;
    let maxColumn = 0;
    let minRow = scene.rows;
    let maxRow = 0;

    scene.clusterVisited[startIndex] = 1;
    scene.clusterQueue[queueTail] = startIndex;
    queueTail += 1;

    while (queueHead < queueTail) {
      const cellIndex = scene.clusterQueue[queueHead];
      queueHead += 1;

      const column = cellIndex % scene.columns;
      const row = Math.floor(cellIndex / scene.columns);
      aliveCount += 1;
      heatTotal += scene.heatCells[cellIndex];
      columnTotal += column;
      rowTotal += row;
      minColumn = Math.min(minColumn, column);
      maxColumn = Math.max(maxColumn, column);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);

      queueTail = enqueueClusterNeighbor(scene, column - 1, row, queueTail);
      queueTail = enqueueClusterNeighbor(scene, column + 1, row, queueTail);
      queueTail = enqueueClusterNeighbor(scene, column, row - 1, queueTail);
      queueTail = enqueueClusterNeighbor(scene, column, row + 1, queueTail);
    }

    if (aliveCount < CLUSTER_MIN_CELLS) {
      continue;
    }

    clusters.push({
      minColumn,
      maxColumn,
      minRow,
      maxRow,
      centroidX: (columnTotal / aliveCount + 0.5) * scene.cellSize,
      centroidY: (rowTotal / aliveCount + 0.5) * scene.cellSize,
      aliveCount,
      activity: heatTotal / aliveCount
    });
  }

  return clusters
    .sort((clusterA, clusterB) => clusterB.aliveCount - clusterA.aliveCount)
    .slice(0, MAX_DECORATED_CLUSTERS);
};

/**
 * Draws small CAD corner ticks around a cluster bounding box.
 */
const drawClusterCornerTicks = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  tickLength: number
): void => {
  context.beginPath();
  context.moveTo(x, y + tickLength);
  context.lineTo(x, y);
  context.lineTo(x + tickLength, y);
  context.moveTo(x + width - tickLength, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + tickLength);
  context.moveTo(x + width, y + height - tickLength);
  context.lineTo(x + width, y + height);
  context.lineTo(x + width - tickLength, y + height);
  context.moveTo(x + tickLength, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + height - tickLength);
  context.stroke();
};

/**
 * Draws a small CAD registration cross at a cluster centroid.
 */
const drawClusterCentroid = (
  context: CanvasRenderingContext2D,
  cluster: LifeCluster,
  size: number
): void => {
  context.beginPath();
  context.moveTo(cluster.centroidX - size, cluster.centroidY);
  context.lineTo(cluster.centroidX + size, cluster.centroidY);
  context.moveTo(cluster.centroidX, cluster.centroidY - size);
  context.lineTo(cluster.centroidX, cluster.centroidY + size);
  context.stroke();
};

/**
 * Draws nearest-neighbor construction links between active clusters.
 */
const drawClusterLinks = (
  scene: LifeGameScene,
  context: CanvasRenderingContext2D,
  clusters: LifeCluster[]
): void => {
  const linkedClusters = clusters.slice(0, MAX_CLUSTER_LINKS);
  context.save();
  context.strokeStyle = `rgba(${COLOR_CLUSTER_LINK}, 0.16)`;
  context.lineWidth = 1;
  context.setLineDash([scene.cellSize * 0.9, scene.cellSize * 0.55]);
  context.lineDashOffset = -(scene.generation % 24) * 0.35;

  for (let index = 0; index < linkedClusters.length - 1; index += 1) {
    let nearestIndex = index + 1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (
      let candidateIndex = index + 1;
      candidateIndex < linkedClusters.length;
      candidateIndex += 1
    ) {
      const dx =
        linkedClusters[index].centroidX -
        linkedClusters[candidateIndex].centroidX;
      const dy =
        linkedClusters[index].centroidY -
        linkedClusters[candidateIndex].centroidY;
      const distance = dx * dx + dy * dy;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = candidateIndex;
      }
    }

    context.beginPath();
    context.moveTo(
      linkedClusters[index].centroidX,
      linkedClusters[index].centroidY
    );
    context.lineTo(
      linkedClusters[nearestIndex].centroidX,
      linkedClusters[nearestIndex].centroidY
    );
    context.stroke();
  }

  context.restore();
};

/**
 * Draws CAD analysis overlays generated from current Life clusters.
 */
const drawClusterDecorations = (
  scene: LifeGameScene,
  context: CanvasRenderingContext2D
): void => {
  const clusters = detectLifeClusters(scene);

  if (clusters.length === 0) {
    return;
  }

  drawClusterLinks(scene, context, clusters);

  context.save();
  context.lineWidth = 1;

  for (const cluster of clusters) {
    const padding = scene.cellSize * 0.45;
    const x = cluster.minColumn * scene.cellSize - padding + 0.5;
    const y = cluster.minRow * scene.cellSize - padding + 0.5;
    const width =
      (cluster.maxColumn - cluster.minColumn + 1) * scene.cellSize +
      padding * 2;
    const height =
      (cluster.maxRow - cluster.minRow + 1) * scene.cellSize + padding * 2;
    const alpha = Math.min(
      0.22,
      0.07 + cluster.activity * 0.1 + cluster.aliveCount * 0.004
    );
    const tickLength = Math.min(scene.cellSize * 0.9, 15);

    context.strokeStyle = `rgba(${COLOR_CLUSTER_BOX}, ${alpha})`;
    context.setLineDash(
      cluster.aliveCount > 8
        ? [scene.cellSize * 0.6, scene.cellSize * 0.35]
        : []
    );
    context.strokeRect(x, y, width, height);
    context.setLineDash([]);
    drawClusterCornerTicks(context, x, y, width, height, tickLength);

    context.strokeStyle = `rgba(${COLOR_CLUSTER_CENTROID}, ${Math.min(0.24, alpha + 0.05)})`;
    drawClusterCentroid(context, cluster, Math.max(3, scene.cellSize * 0.22));

    context.strokeStyle = `rgba(${COLOR_CLUSTER_ARC}, ${alpha * 0.78})`;
    context.beginPath();
    context.arc(
      cluster.centroidX,
      cluster.centroidY,
      Math.max(width, height) * 0.62,
      (scene.generation % 32) * 0.035,
      (scene.generation % 32) * 0.035 + Math.PI * 0.42
    );
    context.stroke();
  }

  context.restore();
};

/**
 * Draws the current Life grid with CAD guides and low-contrast afterimages.
 */
const drawLife = (
  scene: LifeGameScene,
  context: CanvasRenderingContext2D
): void => {
  context.fillStyle = COLOR_BACKGROUND;
  context.fillRect(
    0,
    0,
    scene.columns * scene.cellSize,
    scene.rows * scene.cellSize
  );
  drawGrid(scene, context);
  drawCadGuides(scene, context);

  for (let row = 0; row < scene.rows; row += 1) {
    for (let column = 0; column < scene.columns; column += 1) {
      const index = getCellIndex(scene, column, row);
      const alive = scene.cells[index] === 1;
      const heat = scene.heatCells[index];
      const x = column * scene.cellSize;
      const y = row * scene.cellSize;

      if (!alive && heat > 0.1) {
        drawAfterimageCell(context, x, y, scene.cellSize, heat);
        continue;
      }

      if (!alive) {
        continue;
      }

      drawAliveCell(context, x, y, scene.cellSize);
    }
  }

  drawClusterDecorations(scene, context);
};

/**
 * Paints and advances the Life simulation.
 */
const renderScene = ({
  scene,
  context,
  deltaSeconds
}: {
  scene: LifeGameScene;
  context: CanvasRenderingContext2D;
  deltaSeconds: number;
}): void => {
  scene.accumulatorSeconds += deltaSeconds;
  let shouldDraw = deltaSeconds === 0;

  while (scene.accumulatorSeconds >= STEP_INTERVAL_SECONDS) {
    stepLife(scene);
    scene.accumulatorSeconds -= STEP_INTERVAL_SECONDS;
    shouldDraw = true;
  }

  if (shouldDraw) {
    drawLife(scene, context);
  }
};

export const animation: BackgroundAnimation = {
  id: "lifegame",
  weight: 1,
  background: COLOR_BACKGROUND,
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
};
