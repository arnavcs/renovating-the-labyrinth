console.log("loaded game")

/******************/
/* const settings */
/******************/
const MOUSE_SPEED = 10;
const MOVE_SPEED = 10;
const CHAR_RADIUS = 0.3;

/*******************/
/* inherent consts */
/*******************/
const CARDINAL_NEIGHBOURS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**************************/
/* global state variables */
/**************************/
let queuePlace;
let score;
let remainingTime;
let gameloopInterval;
let timerLoop;
let cmap;

/*******************/
/* raycasting args */
/*******************/
let map;
let camera = { fov: 120 };
let canvas;
let options = {
  viewDist: 10, // distance till stop of light
  wallColours: ["#ae5d40", "#c77b58"],
  zeroColour: "#4b3d44",
  dithering: true,
  pixels: 40000
};
let textColour = "#d2c9a5";
let pointColour = "#d1b187";

/**************/
/* user input */
/**************/
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;
let hPressed = false;

function keyHandler (keySet) {
  return (event) => {
    switch (event.code) {
      case "KeyW":
      case "ArrowUp":
        upPressed = keySet;
        break;
      case "KeyA":
      case "ArrowLeft":
        leftPressed = keySet;
        break;
      case "KeyS":
      case "ArrowDown":
        downPressed = keySet;
        break;
      case "KeyD":
      case "ArrowRight":
        rightPressed = keySet;
        break;
      case "Space":
        spacePressed = keySet;
        break;
      case "KeyR":
        if (keySet) startGame();
        break;
      case "KeyH":
        hPressed = keySet;
        break;
    }
  };
}

function lockChangeAlert () {
  if (document.pointerLockElement === canvas) {
    console.log("The pointer lock status is now locked");
    document.addEventListener("mousemove", updateDirection, false);
  } else {
    console.log("The pointer lock status is now unlocked");
    document.removeEventListener("mousemove", updateDirection, false);
  }
}

function updateDirection (event) {
  camera.dir = vrotate(camera.dir, MOUSE_SPEED * event.movementX / 100);
  changed = true;
}

/******************/
/* map generation */
/******************/
// uses the randomized Prim's Algorithm
function generateMaze (side) {
  map = [];
  let ds = 2 * side;
  for (let i = 0; i < ds + 1; i++) {
    map.push([]);
    for (let j = 0; j < ds + 1; j++) 
      map[i].push(i == 0 || j == 0 || i == ds || j == ds || (i % 2 == 0 && j % 2 == 0) ? 1 : NaN);
  }

  let center = svtimes(2 * Math.floor(side / 2) + 1, [1, 1]);
  mapSet(map, center, 0);
  wallQueue = CARDINAL_NEIGHBOURS.map(n => vvplus(center, n));

  while (wallQueue.length) {
    let wall = wallQueue.splice(Math.floor(Math.random() * wallQueue.length), 1)[0];
    if (!isNaN(mapAt(map, wall))) continue;

    let zeroDirs = [];
    for (let i = 0; i < CARDINAL_NEIGHBOURS.length; i++) {
      let consider = vvplus(wall, CARDINAL_NEIGHBOURS[i]);
      if (mapAt(map, consider) == 0) 
        zeroDirs.push(CARDINAL_NEIGHBOURS[i]);
    }

    if (zeroDirs.length > 1) {
      mapSet(map, wall, 1);
      continue;
    }

    let openedSquare = vvplus(wall, svtimes(-1, zeroDirs[0]));
    mapSet(map, wall, 0);
    mapSet(map, openedSquare, 0);
    wallQueue = wallQueue.concat(CARDINAL_NEIGHBOURS.map(n => vvplus(openedSquare, n)));
  }

  camera.pos = [1.5, 1.5];
  camera.dir = vnormalize([1, 1]);
}

/*********************/
/* score calculation */
/*********************/
function calculateScore () {
  cmap = map.map(a => a.map(b => b));
  score = 0;

  // find horizontals first then verticals
  for (dir = 0; dir < 2; dir++) {
  for (i = 1; i < cmap.length - 1; i++) {
    let currentLength = -Infinity;
    for (j = 0; j < cmap.length; j++) {
      if (mapAt(cmap, dir ? [i, j] : [j, i]) == 0) {
        if (mapAt(cmap, dir ? [i-1, j] : [j, i-1]) > 0 && 
            mapAt(cmap, dir ? [i+1, j] : [j, i+1]) > 0) {
          currentLength++;
        } else {
          currentLength = -Infinity;
        }
      } else {
        if (currentLength > 0) {
          for (let k = 1; k <= currentLength; k++) {
            mapSet(cmap, dir ? [i, j-k] : [j-k, i], -1);
          }
          score += currentLength * currentLength;
        }
        currentLength = 0;
      }
    }
  }
  }
}

/******************/
/* canvas overlay */
/******************/
function drawOverlay () {
  let ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = textColour;
  ctx.strokeStyle = options.zeroColour;
  ctx.lineWidth = 3;
  ctx.textBaseline = "top";

  let writeText = (text, x, y) => {
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };

  ctx.textAlign = "right";
  ctx.font = "40px monospace";

  writeText("✦", canvas.width - 25, 80);
  writeText("⏱", canvas.width - 13, 20);
  writeText(score, canvas.width - 80, 80);
  writeText(remainingTime, canvas.width - 80, 20);

  ctx.textAlign = "left";
  ctx.font = "20px monospace";

  writeText("H: Help", 15, 15);

  if (remainingTime == 0) drawMap(ctx);

  if (hPressed) {
    ctx.fillStyle = options.zeroColour;
    ctx.fillRect(40, canvas.height / 2 - 160, canvas.width - 80, 280);

    ctx.fillStyle = textColour;
    ctx.textBaseline = "middle";

    writeText("WASD + Mouse:", 60, canvas.height / 2 - 120);
    writeText("Move", canvas.width / 4, canvas.height / 2 - 120);
    writeText("Space:", 60, canvas.height / 2 - 80);
    writeText("Summon wall at current square", canvas.width / 4, canvas.height / 2 - 80);
    writeText("R:", 60, canvas.height / 2 - 40);
    writeText("Reset", canvas.width / 4, canvas.height / 2 - 40);

    writeText("Summon walls to split the labyrinth into rectangular chambers.", 60, canvas.height / 2 + 40);
    writeText("A chamber of area A contributes A² points.", 60, canvas.height / 2 + 80);
  }
}

function drawMap (ctx) {
  let mapSize = Math.min(canvas.height, canvas.width) / 1.5;
  let topleft = vvplus(svtimes(mapSize / 2, [-1, -1]), 
                       [canvas.width / 2, canvas.height / 2]);
  let squares = map.length + 2;
  let squareSize = mapSize / squares;

  ctx.fillStyle = options.zeroColour;
  ctx.fillRect(topleft[0], topleft[1], mapSize, mapSize);
  for (let row = 0; row < cmap.length; row++) {
    for (let col = 0; col < cmap.length; col++) {
      if (cmap[row][col] > 0) {
        ctx.fillStyle = options.wallColours[cmap[row][col] - 1];
        ctx.fillRect(topleft[0] + squareSize * (1 + col), topleft[1] + squareSize * (1 + row), squareSize, squareSize);
      }
      if (cmap[row][col] < 0) {
        ctx.fillStyle = pointColour;
        ctx.fillRect(topleft[0] + squareSize * (1 + col), topleft[1] + squareSize * (1 + row), squareSize, squareSize);
      }
    }
  }
}

/************/
/* gameloop */
/************/
function decreaseTimer () {
  remainingTime--;
  if (remainingTime < 0) {
    clearInterval(timerLoop);
    clearInterval(gameloopInterval);
  }
}

function gameloop () {
  // place blocks
  if (spacePressed) {
    queuePlace.push(camera.pos.map(Math.floor));
    spacePressed = false;
  }

  // movement
  let desiredMovement = [rightPressed - leftPressed, upPressed - downPressed];
  desiredMovement = vvplus(svtimes(desiredMovement[1], camera.dir), 
                           svtimes(desiredMovement[0], vrotate(camera.dir, 90)));
  desiredMovement = svtimes(Math.sqrt(1/2), desiredMovement);

  let testWallBlock = (wallDir) => ((getTile(vvplus(camera.pos, vrotate(wallDir, 30))) > 0 ||
                                     getTile(vvplus(camera.pos, vrotate(wallDir, -30))) > 0) &&
                                    vdot(desiredMovement, wallDir) > 0);

  if (testWallBlock([-CHAR_RADIUS, 0]) || testWallBlock([CHAR_RADIUS, 0]))
    desiredMovement = vvproj(desiredMovement, [0, 1]);
  if (testWallBlock([0, -CHAR_RADIUS]) || testWallBlock([0, CHAR_RADIUS]))
    desiredMovement = vvproj(desiredMovement, [1, 0]);

  if (desiredMovement[0] != 0 || desiredMovement[1] != 0) {
    let moveTo = vvplus(camera.pos, svtimes(MOVE_SPEED / 100, desiredMovement));
    camera.pos = moveTo;
  }

  // handling placing blocks
  for (let i = queuePlace.length - 1; i >= 0; i--) {
    let place = queuePlace[i];
    if (comfortablyOutside(place, camera.pos)) {
      queuePlace.splice(i, 1);
      mapSet(map, place, 2);
      calculateScore();
    }
  }

  render(map, camera, canvas, options);
  drawOverlay();
}

/*******************/
/* initial startup */
/*******************/
function startGame () {
  generateMaze(10);

  queuePlace = [];
  calculateScore();
  remainingTime = 120;

  clearInterval(timerLoop);
  clearInterval(gameloopInterval);
  timerLoop = setInterval(decreaseTimer, 1000);
  gameloopInterval = setInterval(gameloop, 50);

  render(map, camera, canvas, options);
  drawOverlay();
}

window.onload = function () {
  document.body.style.backgroundColor = options.zeroColour;

  canvas = document.getElementById("screen");
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;

  canvas.addEventListener("click", async () => {
    if (!document.pointerLockElement) 
      await canvas.requestPointerLock({unadjustedMovement: true});
  });
  document.addEventListener("keydown", keyHandler(true), false);
  document.addEventListener("keyup", keyHandler(false), false);
  document.addEventListener("pointerlockchange", lockChangeAlert, false);

  startGame();
}


