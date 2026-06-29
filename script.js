import * as THREE from "https://unpkg.com/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#world");
const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const scoreLabel = document.querySelector("#score");
const stateLabel = document.querySelector("#state");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c9ed);
scene.fog = new THREE.Fog(0x91c9ed, 34, 92);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 180);
const clock = new THREE.Clock();
const keys = new Set();
const herbs = [];
const totalHerbs = 8;

let gameStarted = false;
let cameraAngle = Math.PI * 0.22;
let collected = 0;

const player = new THREE.Group();
player.position.set(0, 0, 8);
scene.add(player);

function makeMaterial(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
}

const materials = {
  grass: makeMaterial(0x5fa85e),
  deepGrass: makeMaterial(0x3f7f49),
  path: makeMaterial(0xc49a63),
  stone: makeMaterial(0xaab1ad),
  wood: makeMaterial(0x7a4b2d),
  roof: makeMaterial(0x8b5439),
  door: makeMaterial(0x5c3825),
  leaf: makeMaterial(0x3f8d4b),
  leafDark: makeMaterial(0x2f6f3f),
  cloth: makeMaterial(0x946f3d),
  skin: makeMaterial(0xd8a574),
  hair: makeMaterial(0x2c1b13),
  herb: makeMaterial(0x8df6b2, 0.45),
};

function addLight() {
  const sun = new THREE.DirectionalLight(0xfff1be, 3.1);
  sun.position.set(-14, 24, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  scene.add(sun);

  const ambient = new THREE.HemisphereLight(0xe8f5ff, 0x405c38, 1.7);
  scene.add(ambient);
}

function addGround() {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(48, 96),
    materials.grass
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 5.6, 96),
    materials.path
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.02;
  path.scale.set(2.2, 1.2, 1);
  path.receiveShadow = true;
  scene.add(path);

  for (let i = 0; i < 18; i++) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(5 + Math.random() * 5, 24, 12),
      materials.deepGrass
    );
    const angle = (i / 18) * Math.PI * 2;
    hill.position.set(Math.cos(angle) * 37, -3.8, Math.sin(angle) * 31);
    hill.scale.y = 0.28;
    hill.receiveShadow = true;
    scene.add(hill);
  }
}

function addCottage(x, z, rotation = 0) {
  const cottage = new THREE.Group();
  cottage.position.set(x, 0, z);
  cottage.rotation.y = rotation;

  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 4), makeMaterial(0xd1b27c));
  body.position.y = 1.4;
  body.castShadow = true;
  body.receiveShadow = true;
  cottage.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 2.4, 4), materials.roof);
  roof.position.y = 3.3;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  cottage.add(roof);

  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 28), materials.door);
  door.scale.y = 1.45;
  door.position.set(0, 0.95, 2.04);
  door.rotation.x = Math.PI / 2;
  cottage.add(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), makeMaterial(0xffd166));
  knob.position.set(0.34, 0.95, 2.14);
  cottage.add(knob);

  scene.add(cottage);
}

function addTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.2, 10), materials.wood);
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  tree.add(trunk);

  const top = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 14), materials.leaf);
  top.position.y = 2.75;
  top.castShadow = true;
  tree.add(top);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 12), materials.leafDark);
  cap.position.set(-0.45, 3.35, 0.2);
  cap.castShadow = true;
  tree.add(cap);

  scene.add(tree);
}

function addPlayer() {
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.7, 8, 16), materials.cloth);
  body.position.y = 1.05;
  body.castShadow = true;
  player.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 20), materials.skin);
  head.position.y = 1.76;
  head.castShadow = true;
  player.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.hair);
  hair.position.y = 1.91;
  hair.rotation.x = -0.1;
  hair.castShadow = true;
  player.add(hair);

  const footGeometry = new THREE.BoxGeometry(0.34, 0.16, 0.58);
  const leftFoot = new THREE.Mesh(footGeometry, materials.wood);
  leftFoot.position.set(-0.22, 0.12, 0.08);
  leftFoot.castShadow = true;
  player.add(leftFoot);

  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.22;
  player.add(rightFoot);
}

function addHerb(x, z) {
  const herb = new THREE.Group();
  herb.position.set(x, 0, z);
  herb.userData.collected = false;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), materials.herb);
  stem.position.y = 0.28;
  herb.add(stem);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0x8df6b2,
      emissive: 0x54f29d,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    })
  );
  glow.position.y = 0.7;
  herb.add(glow);

  const light = new THREE.PointLight(0x8df6b2, 0.45, 5);
  light.position.y = 0.8;
  herb.add(light);

  herbs.push(herb);
  scene.add(herb);
}

function populateWorld() {
  addCottage(-12, -8, Math.PI * 0.18);
  addCottage(11, -10, -Math.PI * 0.18);
  addCottage(-16, 9, Math.PI * 0.42);
  addCottage(16, 8, -Math.PI * 0.38);

  for (let i = 0; i < 34; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 27;
    addTree(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.75 + Math.random() * 0.85);
  }

  const herbPositions = [
    [-6, 5],
    [7, 7],
    [-10, -2],
    [12, -2],
    [0, -10],
    [18, 2],
    [-18, 1],
    [2, 14],
  ];

  herbPositions.forEach(([x, z]) => addHerb(x, z));
}

function updatePlayer(delta) {
  const forward = Number(keys.has("KeyW") || keys.has("ArrowUp")) - Number(keys.has("KeyS") || keys.has("ArrowDown"));
  const side = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const cameraSpin = Number(keys.has("KeyE")) - Number(keys.has("KeyQ"));
  cameraAngle += cameraSpin * delta * 1.8;

  const movement = new THREE.Vector3(side, 0, -forward);
  if (movement.lengthSq() > 0) {
    movement.normalize();
    movement.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
    player.position.addScaledVector(movement, delta * 8.5);
    player.position.x = THREE.MathUtils.clamp(player.position.x, -31, 31);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -31, 31);
    player.rotation.y = Math.atan2(movement.x, movement.z);
  }
}

function updateHerbs(elapsed) {
  herbs.forEach((herb) => {
    if (herb.userData.collected) return;

    herb.rotation.y += 0.02;
    herb.position.y = Math.sin(elapsed * 3 + herb.position.x) * 0.08;

    const distance = herb.position.distanceTo(player.position);
    if (distance < 1.35) {
      herb.userData.collected = true;
      herb.visible = false;
      collected += 1;
      scoreLabel.textContent = `${collected} / ${totalHerbs} herbs`;
      stateLabel.textContent = collected === totalHerbs ? "Village restored" : "Keep exploring";
    }
  });
}

function updateCamera() {
  const offset = new THREE.Vector3(
    Math.sin(cameraAngle) * 10,
    7,
    Math.cos(cameraAngle) * 10
  );
  const target = player.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  camera.position.lerp(target.clone().add(offset), 0.08);
  camera.lookAt(target);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  if (gameStarted) {
    updatePlayer(delta);
    updateHerbs(elapsed);
  }

  updateCamera();
  renderer.render(scene, camera);
}

window.addEventListener("keydown", (event) => keys.add(event.code));
window.addEventListener("keyup", (event) => keys.delete(event.code));

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startButton.addEventListener("click", () => {
  gameStarted = true;
  startScreen.classList.add("is-hidden");
});

addLight();
addGround();
addPlayer();
populateWorld();
scoreLabel.textContent = `${collected} / ${totalHerbs} herbs`;
updateCamera();
animate();
