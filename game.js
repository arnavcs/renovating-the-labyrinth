console.log("loaded game")

const MOUSE_SPEED = 10;
const MOVE_SPEED = 10;

let changed = false;
const CARDINAL_NEIGHBOURS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

let map;
let camera = { fov: 90 };
let canvas;
let options = {
  viewDist: 10, // distance till stop of light
  wallColours: [[118, 131, 74], [156, 73, 65]],
  zeroColour: [30, 41, 39],
  dithering: true,
  pixels: 40000
};

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

function getTile (pos) {
  return safeMapAt(map, pos.map(Math.floor));
}

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

  for (let orbIdx = 0; orbIdx < 5; orbIdx++) {
    let proposed = [1, 1];
    while ((proposed[0] == 1 && proposed[1] == 1) ||
           safeMapAt(map, proposed) != 0) {
      proposed = [2 * Math.floor(Math.random() * side) + 1, 2 * Math.floor(Math.random() * side) + 1];
    }
    mapSet(map, proposed, -1);
  }
}

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

function gameloop () {
  let desiredMovement = [rightPressed - leftPressed, upPressed - downPressed];
  desiredMovement = vvplus(svtimes(desiredMovement[1], camera.dir), 
                           svtimes(desiredMovement[0], vrotate(camera.dir, 90)));
  desiredMovement = svtimes(Math.sqrt(1/2), desiredMovement);

  let testWallBlock = (wallDir) => ((getTile(vvplus(camera.pos, vrotate(wallDir, 30))) > 0 ||
                                     getTile(vvplus(camera.pos, vrotate(wallDir, -30))) > 0) &&
                                    vdot(desiredMovement, wallDir) > 0);

  if (testWallBlock([-0.3, 0]) || testWallBlock([0.3, 0]))
    desiredMovement = vvproj(desiredMovement, [0, 1]);
  if (testWallBlock([0, -0.3]) || testWallBlock([0, 0.3]))
    desiredMovement = vvproj(desiredMovement, [1, 0]);

  if (desiredMovement[0] != 0 || desiredMovement[1] != 0) {
    let moveTo = vvplus(camera.pos, svtimes(MOVE_SPEED / 100, desiredMovement));
    camera.pos = moveTo;
    changed = true;
  }

  if (changed) {
    render(map, camera, canvas, options);
    changed = false;
  }
}

window.onload = function () {
  document.body.style.backgroundColor = colourToString(options.zeroColour);

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

  generateMaze(10);
  setInterval(gameloop, 50);
  render(map, camera, canvas, options);
}


