console.log("loaded game")

const MOUSE_SPEED = 5;
const MOVE_SPEED = 10;

let changed = false;

let map = [[ 1,  0,  1,  2,  2,  1,  1,  1],
           [ 1,  0,  1,  0,  0,  0,  0,  1],
           [ 1,  0,  0,  0,  0,  0,  0,  1],
           [ 1,  0,  2,  0,  0,  0,  0,  1],
           [ 1,  0,  2,  1,  0,  0,  0,  1],
           [ 1,  0,  0,  1,  0,  0,  0,  1],
           [ 1,  0,  0,  0,  0,  0,  0,  1],
           [ 1,  1,  1,  1,  1,  1,  1,  1]];
let camera = { 
  pos: [1.1, 1.5], 
  dir: vnormalize([2, 3]), 
  fov: 90 
};
let canvas;
let options = {
  viewDist: 10, // distance till stop of light
  wallColours: [[118, 131, 74], [156, 73, 65]],
  zeroColour: [30, 41, 39],
  dithering: true
};

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

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
    document.addEventListener("mousemove", updatePosition, false);
  } else {
    console.log("The pointer lock status is now unlocked");
    document.removeEventListener("mousemove", updatePosition, false);
  }
}

function updatePosition (event) {
  camera.dir = vrotate(camera.dir, MOUSE_SPEED * event.movementX / 100);
  changed = true;
}

function gameloop () {
  let desiredMovement = [rightPressed - leftPressed, upPressed - downPressed];
  if (desiredMovement[0] != 0 && desiredMovement[1] != 0) 
    desiredMovement = svtimes(Math.sqrt(1/2), desiredMovement);
  if (desiredMovement[0] != 0 || desiredMovement[1] != 0) {
    camera.pos = vvplus(camera.pos, svtimes(MOVE_SPEED * desiredMovement[1] / 100, camera.dir));
    camera.pos = vvplus(camera.pos, svtimes(MOVE_SPEED * desiredMovement[0] / 100, vrotate(camera.dir, 90)));
    changed = true;
  }

  if (changed) {
    render(map, camera, canvas, options);
    changed = false;
  }
}

window.onload = function () {
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

  setInterval(gameloop, 50);
  render(map, camera, canvas, options);
}


