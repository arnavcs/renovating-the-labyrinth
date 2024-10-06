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
let changed = false;
let queuePlace = [];

/*******************/
/* raycasting args */
/*******************/
let map;
let camera = { fov: 120 };
let canvas;
let options = {
  viewDist: 10, // distance till stop of light
  wallColours: ["#de4c63", "#ff9f74"],
  zeroColour: "#31112d",
  dithering: true,
  pixels: 40000
};

/**************/
/* user input */
/**************/
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;

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

/************/
/* gameloop */
/************/
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
    changed = true;
  }

  // re-rendering
  if (changed) {
    console.log(queuePlace);
    for (let i = queuePlace.length - 1; i >= 0; i--) {
      let place = queuePlace[i];
      if (comfortablyOutside(place, camera.pos)) {
        queuePlace.splice[i, 1];
        mapSet(map, place, 2);
      }
    }

    render(map, camera, canvas, options);
    changed = false;
  }
}

/*******************/
/* initial startup */
/*******************/
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

  generateMaze(10);
  setInterval(gameloop, 50);
  render(map, camera, canvas, options);
}


