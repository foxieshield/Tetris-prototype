const WIDTH = 10;
const HEIGHT = 20;

const boardEl = document.getElementById("board");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const messageEl = document.getElementById("message");
const restartButton = document.getElementById("restart");

const pieces = [
  [[1, 1, 1, 1]],                         // I
  [[1, 1], [1, 1]],                       // O
  [[0, 1, 0], [1, 1, 1]],                 // T
  [[1, 0, 0], [1, 1, 1]],                 // J
  [[0, 0, 1], [1, 1, 1]],                 // L
  [[0, 1, 1], [1, 1, 0]],                 // S
  [[1, 1, 0], [0, 1, 1]]                  // Z
];

let grid;
let current;
let score = 0;
let lines = 0;
let level = 1;
let dropTimer = null;
let softDropping = false;
let gameOver = false;
let holdTimer = null;

function makeGrid() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
}

function createBoardCells() {
  boardEl.innerHTML = "";
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = "[ ]";
    boardEl.appendChild(cell);
  }
}

function randomPiece() {
  const shape = pieces[Math.floor(Math.random() * pieces.length)]
    .map(row => [...row]);

  return {
    shape,
    x: Math.floor((WIDTH - shape[0].length) / 2),
    y: 0
  };
}

function collides(piece, x = piece.x, y = piece.y, shape = piece.shape) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const nx = x + col;
      const ny = y + row;

      if (nx < 0 || nx >= WIDTH || ny >= HEIGHT) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
  }
  return false;
}

function draw() {
  const cells = boardEl.children;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const cell = cells[y * WIDTH + x];
      cell.classList.toggle("filled", !!grid[y][x]);
    }
  }

  if (!gameOver && current) {
    for (let row = 0; row < current.shape.length; row++) {
      for (let col = 0; col < current.shape[row].length; col++) {
        if (!current.shape[row][col]) continue;

        const x = current.x + col;
        const y = current.y + row;

        if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) {
          cells[y * WIDTH + x].classList.add("filled");
        }
      }
    }
  }

  linesEl.textContent = lines;
  levelEl.textContent = level;
  scoreEl.textContent = score;
}

function move(dx) {
  if (gameOver || !current) return;

  if (!collides(current, current.x + dx, current.y)) {
    current.x += dx;
    draw();
  }
}

function rotate() {
  if (gameOver || !current) return;

  const oldShape = current.shape;
  const height = oldShape.length;
  const width = oldShape[0].length;

  const rotated = Array.from({ length: width }, () => Array(height).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rotated[x][height - 1 - y] = oldShape[y][x];
    }
  }

  // Tiny wall-kick: try the center, then one cell left/right.
  const kicks = [0, -1, 1, -2, 2];

  for (const kick of kicks) {
    if (!collides(current, current.x + kick, current.y, rotated)) {
      current.shape = rotated;
      current.x += kick;
      draw();
      return;
    }
  }
}

function lockPiece() {
  for (let row = 0; row < current.shape.length; row++) {
    for (let col = 0; col < current.shape[row].length; col++) {
      if (!current.shape[row][col]) continue;

      const x = current.x + col;
      const y = current.y + row;

      if (y < 0) {
        endGame();
        return;
      }

      grid[y][x] = 1;
    }
  }

  clearFullRows();

  current = randomPiece();

  if (collides(current)) {
    endGame();
    return;
  }

  draw();
}

function clearFullRows() {
  let cleared = 0;

  // Check every horizontal section after a piece lands.
  for (let y = HEIGHT - 1; y >= 0; y--) {
    if (grid[y].every(cell => cell === 1)) {
      grid.splice(y, 1);
      grid.unshift(Array(WIDTH).fill(0));
      cleared++;
      y++;
    }
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    restartDropTimer();
  }
}

function drop() {
  if (gameOver || !current) return;

  if (!collides(current, current.x, current.y + 1)) {
    current.y++;
    if (softDropping) score++;
    draw();
  } else {
    lockPiece();
  }
}

function endGame() {
  gameOver = true;
  stopDropTimer();
  messageEl.textContent = "GAME OVER — PRESS RESTART";
  draw();
}

function stopDropTimer() {
  if (dropTimer) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

function restartDropTimer() {
  stopDropTimer();

  const speed = Math.max(70, 700 - (level - 1) * 55);

  dropTimer = setInterval(() => {
    drop();
  }, softDropping ? 45 : speed);
}

function setSoftDrop(enabled) {
  if (gameOver) return;

  softDropping = enabled;
  restartDropTimer();

  if (enabled) {
    messageEl.textContent = "FAST DROP";
  } else {
    messageEl.textContent = "PRESS A / D TO MOVE";
  }
}

function startGame() {
  grid = makeGrid();
  current = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  gameOver = false;
  softDropping = false;
  messageEl.textContent = "PRESS A / D TO MOVE";
  restartDropTimer();
  draw();
}

// Keyboard controls:
// W = clockwise rotation, A = left, D = right, S = faster drop.
document.addEventListener("keydown", (event) => {
  if (gameOver) return;

  const key = event.key.toLowerCase();

  if (key === "w") {
    event.preventDefault();
    rotate();
  } else if (key === "a") {
    event.preventDefault();
    move(-1);
  } else if (key === "d") {
    event.preventDefault();
    move(1);
  } else if (key === "s") {
    event.preventDefault();
    if (!event.repeat) setSoftDrop(true);
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "s") {
    setSoftDrop(false);
  }
});

// Mobile controls:
// 2x2 layout: RIGHT / LEFT / DOWN / ROTATE.
// Rotation is always clockwise.
const mobileButtons = document.querySelectorAll(".mobile-controls button");

mobileButtons.forEach((button) => {
  const control = button.dataset.control;

  const press = (event) => {
    event.preventDefault();

    if (gameOver) return;

    if (control === "right") {
      move(1);
    } else if (control === "left") {
      move(-1);
    } else if (control === "rotate") {
      rotate();
    } else if (control === "down") {
      setSoftDrop(true);
    }
  };

  const release = (event) => {
    event.preventDefault();

    if (control === "down") {
      setSoftDrop(false);
    }
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

restartButton.addEventListener("click", startGame);

createBoardCells();
startGame();

