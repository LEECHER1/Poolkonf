import * as THREE from 'three';
import { GUI } from 'dat.gui';

interface Params {
  POOL_X: number;
  POOL_Z: number;
  POOL_Y: number;
  SHAFT_X: number;
  SHAFT_Z: number;
  SHAFT_Y: number;
  SHAFT_SIDE: 'left' | 'right';
}

const params: Params = {
  POOL_X: 800,
  POOL_Z: 400,
  POOL_Y: 150,
  SHAFT_X: 125,
  SHAFT_Z: 400,
  SHAFT_Y: 150,
  SHAFT_SIDE: 'right'
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(400, 300, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

let pool: THREE.Mesh;
let shaft: THREE.Mesh;

function createGeometry(): void {
  if (pool) scene.remove(pool);
  if (shaft) scene.remove(shaft);

  const poolGeom = new THREE.BoxGeometry(params.POOL_X, params.POOL_Y, params.POOL_Z);
  const poolMat = new THREE.MeshPhongMaterial({ color: 0x88aaff, wireframe: false, transparent: true, opacity: 0.7 });
  pool = new THREE.Mesh(poolGeom, poolMat);
  scene.add(pool);

  const shaftGeom = new THREE.BoxGeometry(params.SHAFT_X, params.SHAFT_Y, params.SHAFT_Z);
  const shaftMat = new THREE.MeshPhongMaterial({ color: 0xffaa88, wireframe: false, transparent: true, opacity: 0.7 });
  shaft = new THREE.Mesh(shaftGeom, shaftMat);

  const sign = params.SHAFT_SIDE === 'right' ? 1 : -1;
  shaft.position.x = sign * (params.POOL_X / 2 + params.SHAFT_X / 2 + 50);
  shaft.position.y = Math.min(0, params.POOL_Y - params.SHAFT_Y) / 2;
  scene.add(shaft);
}

const gui = new GUI();
const poolFolder = gui.addFolder('Pool');
poolFolder.add(params, 'POOL_X', 100, 1000).onChange(createGeometry);
poolFolder.add(params, 'POOL_Y', 50, 500).onChange(createGeometry);
poolFolder.add(params, 'POOL_Z', 100, 1000).onChange(createGeometry);
poolFolder.open();

const shaftFolder = gui.addFolder('Shaft');
shaftFolder.add(params, 'SHAFT_X', 50, 500).onChange(createGeometry);
shaftFolder.add(params, 'SHAFT_Y', 50, 500).onChange(createGeometry);
shaftFolder.add(params, 'SHAFT_Z', 50, 500).onChange(createGeometry);
shaftFolder.add(params, 'SHAFT_SIDE', ['left', 'right']).onChange(createGeometry);
shaftFolder.open();

createGeometry();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
