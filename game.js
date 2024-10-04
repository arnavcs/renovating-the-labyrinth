console.log("loaded game")

let map = [[ 1,  0,  1,  1,  1,  1,  1,  1],
           [ 1,  0,  1,  0,  0,  0,  0,  1],
           [ 1,  0,  0,  0,  0,  0,  0,  1],
           [ 1,  0,  1,  0,  0,  0,  0,  1],
           [ 1,  0,  1,  1,  0,  0,  0,  1],
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
  zeroColour: svtimes(0.5, [61, 83, 79]),
  dithering: true
};

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

function keyHandler (keySet) {
  return (event) => {
    if (event.code == "KeyW" || event.code == "ArrowUp") {
      upPressed = keySet;
    } else if (event.code == "KeyA" || event.code == "ArrowLeft") {
      leftPressed = keySet;
    } else if (event.code == "KeyS" || event.code == "ArrowDown") {
      downPressed = keySet;
    } else if (event.code == "KeyD" || event.code == "ArrowRight") {
      rightPressed = keySet;
    }
  };
}

function gameloop () {
  let changed = false;
  if (rightPressed) {
    camera.dir = vrotate(camera.dir, 2);
    changed = true;
  }
  if (leftPressed) {
    camera.dir = vrotate(camera.dir, -2);
    changed = true;
  }
  if (upPressed) {
    camera.pos = vvplus(camera.pos, svtimes(0.05, camera.dir));
    changed = true;
  }
  if (changed) {
    render(map, camera, canvas, options);
  }
}

window.onload = function () {
  canvas = document.getElementById("screen");
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;

  canvas.addEventListener("click", async () => {
    await canvas.requestPointerLock();
  });
  document.addEventListener("keydown", keyHandler(true), false);
  document.addEventListener("keyup", keyHandler(false), false);

  setInterval(gameloop, 100);
  render(map, camera, canvas, options);
}


