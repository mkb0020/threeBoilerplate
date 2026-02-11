import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PhysicsBall } from "./physics.js";

// SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

// CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

// RENDERER
const canvas = document.querySelector("#app");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// ORBIT
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// LIGHTING
const ambientLight = new THREE.AmbientLight(0xA55AFF, 0.5); // COOL-TONED PURPLE
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // WHITE
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// XYZ AXIS  (Red=X, Green=Y, Blue=Z)
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// GROUND (XZ PLANE - Y is up/down)
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x3d0264, // DARK PURPLE GROUND
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.4,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal (XZ plane)
scene.add(ground);

// GRID HELPER on XZ plane (horizontal)
const gridHelper = new THREE.GridHelper(10, 10, 0xc71585, 0x00FFFF);
scene.add(gridHelper);

// PHYSICS BALL (pass controls for camera locking!)
const physicsBall = new PhysicsBall(scene, camera, renderer, controls);

// Helper function to toggle button state
function toggleButton(buttonId, isActive) {
  const button = document.getElementById(buttonId);
  if (isActive) {
    button.classList.add('active');
  } else {
    button.classList.remove('active');
  }
}

document.getElementById('toggle-physics').addEventListener('click', () => {
  physicsBall.toggle();
  toggleButton('toggle-physics', physicsBall.mesh.visible);
});

document.getElementById('reset-physics').addEventListener('click', () => {
  physicsBall.reset();
});

document.getElementById('toggle-trail').addEventListener('click', () => {
  physicsBall.toggleTrail();
  toggleButton('toggle-trail', physicsBall.showTrail);
});

document.getElementById('toggle-velocity').addEventListener('click', () => {
  physicsBall.toggleVelocity();
  toggleButton('toggle-velocity', physicsBall.showVelocity);
});

document.getElementById('toggle-acceleration').addEventListener('click', () => {
  physicsBall.toggleAcceleration();
  toggleButton('toggle-acceleration', physicsBall.showAcceleration);
});

// SLIDER EVENT LISTENERS
const gravitySlider = document.getElementById('gravity-slider');
const gravityValue = document.getElementById('gravity-value');
gravitySlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  physicsBall.gravity = -value; 
  gravityValue.textContent = value.toFixed(1);
});

const frictionSlider = document.getElementById('friction-slider');
const frictionValue = document.getElementById('friction-value');
frictionSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  physicsBall.friction = value;
  frictionValue.textContent = value.toFixed(2);
});

const bounceSlider = document.getElementById('bounce-slider');
const bounceValue = document.getElementById('bounce-value');
bounceSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  physicsBall.bounciness = value;
  bounceValue.textContent = value.toFixed(2);
});

const airSlider = document.getElementById('air-slider');
const airValue = document.getElementById('air-value');
airSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  physicsBall.airResistance = value;
  airValue.textContent = value.toFixed(2);
});

const radiusSlider = document.getElementById('radius-slider');
const radiusValue = document.getElementById('radius-value');
radiusSlider.addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  physicsBall.setRadius(value);
  radiusValue.textContent = value.toFixed(2);
});

// WINDOW RESIZE
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

// ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);
  
  const deltaTime = clock.getDelta();
  
  controls.update();
  
  physicsBall.update(deltaTime);
  
  document.getElementById('cam-x').textContent = `X: ${camera.position.x.toFixed(2)}`;
  document.getElementById('cam-y').textContent = `Y: ${camera.position.y.toFixed(2)}`;
  document.getElementById('cam-z').textContent = `Z: ${camera.position.z.toFixed(2)}`;
  
  const pos = physicsBall.mesh.position;
  const vel = physicsBall.velocity;
  const acc = physicsBall.acceleration;
  const speed = vel.length();
  const accMag = acc.length();
  
  document.getElementById('pos-x').textContent = `x: ${pos.x.toFixed(2)} m`;
  document.getElementById('pos-y').textContent = `y: ${pos.y.toFixed(2)} m`;
  document.getElementById('pos-z').textContent = `z: ${pos.z.toFixed(2)} m`;
  
  document.getElementById('vel-speed').textContent = `Speed: ${speed.toFixed(2)} m/s`;
  document.getElementById('vel-x').textContent = `vₓ: ${vel.x.toFixed(2)} m/s`;
  document.getElementById('vel-y').textContent = `vᵧ: ${vel.y.toFixed(2)} m/s`;
  document.getElementById('vel-z').textContent = `vᵤ: ${vel.z.toFixed(2)} m/s`;
  
  document.getElementById('acc-mag').textContent = `Magnitude: ${accMag.toFixed(2)} m/s²`;
  document.getElementById('acc-y').textContent = `aᵧ: ${acc.y.toFixed(2)} m/s²`;
  
  renderer.render(scene, camera);
}

animate();