const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 10;
const DEFAULT_MIN_VALUE = -100;
const DEFAULT_MAX_VALUE = 100;

interface Colors {
  reset: string;
  bold: string;
  red: string;
  yellow: string;
}

const COLORS: Colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[43m",
};

const EMPTY_CELL = "—";
const ROW_MARKER = "*";

type Matrix = number[][];
type Row = number[];

interface Position {
  rowIndex: number;
  colIndex: number;
}

interface GlobalMinResult {
  value: number | null;
  positions: Position[];
  rowsWithMin: Set<number>;
}

interface PrettyPrintOptions {
  useColors?: boolean;
}

function randInt(min: number, max: number): number {
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMatrix(
  rows: number = DEFAULT_ROWS,
  cols: number = DEFAULT_COLS,
  min: number = DEFAULT_MIN_VALUE,
  max: number = DEFAULT_MAX_VALUE
): Matrix {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    rows <= 0 ||
    cols <= 0
  ) {
    throw new TypeError("строки и колонки должны быть целыми числами");
  }
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => randInt(min, max))
  );
}

function signOf(v: unknown): -1 | 0 | 1 {
  if (typeof v !== "number" || Number.isNaN(v)) return 0;
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

function minReplacementsToAvoidTriples(row: Row): number {
  if (!Array.isArray(row) || row.length === 0) return 0;

  let replacements = 0;
  let i = 0;
  const rowLength = row.length;

  while (i < rowLength) {
    const currentSign = signOf(row[i]);
    if (currentSign === 0) {
      i++;
      continue;
    }

    let chain = 0;
    while (i < rowLength && signOf(row[i]) === currentSign) {
      chain++;
      i++;
    }
    if (chain >= 3) replacements += Math.floor(chain / 3);
  }

  return replacements;
}

function findGlobalMin(matrix: Matrix): GlobalMinResult {
  let minValue = Infinity;
  const minPositions: Position[] = [];

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex] ?? [];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      if (typeof cellValue !== "number" || Number.isNaN(cellValue)) continue;

      if (cellValue < minValue) {
        minValue = cellValue;
        minPositions.length = 0;
        minPositions.push({ rowIndex, colIndex });
      } else if (cellValue === minValue) {
        minPositions.push({ rowIndex, colIndex });
      }
    }
  }

  return {
    value: minValue === Infinity ? null : minValue,
    positions: minPositions,
    rowsWithMin: new Set(minPositions.map((pos) => pos.rowIndex)),
  };
}

function computeColWidth(matrix: Matrix): number {
  let maxCellLength = 1;
  for (const row of matrix) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      const cellStr = String(cell);
      if (cellStr.length > maxCellLength) maxCellLength = cellStr.length;
    }
  }
  const minWidth = 4;
  const padding = 1;
  return Math.max(minWidth, maxCellLength) + padding;
}

function formatCell(
  value: number | string,
  width: number,
  highlight: boolean = false,
  useColors: boolean = false
): string {
  const s = String(value).padStart(width, " ");
  if (highlight && useColors) {
    return `${COLORS.yellow}${COLORS.bold}${s}${COLORS.reset}`;
  }
  return s;
}

function prettyPrintMatrix(
  matrix: Matrix,
  options: PrettyPrintOptions = {}
): void {
  const defaultUseColors =
    typeof process !== "undefined" && process.stdout && process.stdout.isTTY;
  const useColors = options.useColors ?? defaultUseColors;

  if (!Array.isArray(matrix) || matrix.length === 0) {
    console.log("Матрица пуста.");
    return;
  }

  const totalRows = matrix.length;
  const totalCols = Math.max(
    ...matrix.map((row) => (Array.isArray(row) ? row.length : 0))
  );

  const {
    value: globalMin,
    positions: minPositions,
    rowsWithMin,
  } = findGlobalMin(matrix);

  const colWidth = computeColWidth(matrix);

  const headerCells = Array.from({ length: totalCols }, (_, c) =>
    String("c" + c).padStart(colWidth, " ")
  );
  const header = "     |" + headerCells.join("") + "  | minPos | replace";
  const separator = "-".repeat(header.length);

  console.log("\n" + header);
  console.log(separator);

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
    const row = matrix[rowIndex] ?? [];
    const rowMarker = rowsWithMin.has(rowIndex) ? ROW_MARKER : " ";

    const formattedCells: string[] = [];
    for (let colIndex = 0; colIndex < totalCols; colIndex++) {
      const cellValue = colIndex < row.length ? row[colIndex] : EMPTY_CELL;
      const isGlobalMinCell = cellValue === globalMin;
      formattedCells.push(
        formatCell(cellValue, colWidth, isGlobalMinCell, useColors)
      );
    }

    const positiveNumbers = row.filter((v) => typeof v === "number" && v > 0);
    const minPositive = positiveNumbers.length
      ? Math.min(...positiveNumbers)
      : null;
    const minPositiveStr =
      minPositive === null ? EMPTY_CELL : String(minPositive);

    const replacementsCount = minReplacementsToAvoidTriples(row);

    console.log(
      `${rowMarker} r${String(rowIndex).padStart(2, " ")} |` +
        formattedCells.join("") +
        ` | ${String(minPositiveStr).padStart(6, " ")} | ${String(
          replacementsCount
        ).padStart(4, " ")}`
    );
  }

  console.log(separator);

  if (globalMin === null) {
    console.log("Глобальный минимум не найден (нет числовых значений).");
  } else {
    const positionsStr = minPositions
      .map((p) => `(r${p.rowIndex},c${p.colIndex})`)
      .join(", ");
    if (useColors) {
      console.log(
        `Глобальный минимум: ${COLORS.red}${globalMin}${COLORS.reset} найден в позициях: ${positionsStr}`
      );
    } else {
      console.log(
        `Глобальный минимум: ${globalMin} найден в позициях: ${positionsStr}`
      );
    }
  }

  console.log();
}

const matrix = generateMatrix(
  DEFAULT_ROWS,
  DEFAULT_COLS,
  DEFAULT_MIN_VALUE,
  DEFAULT_MAX_VALUE
);
prettyPrintMatrix(matrix, { useColors: true });
