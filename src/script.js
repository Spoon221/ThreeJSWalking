import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon';

/**
 * Base
 */
const gui = new GUI();
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();

/**
 * Models
 */
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let mixer = null;
let model = null;
let animations = [];
let currentAction = null;

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Создаем физическое тело для игрока
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 1, 0)
});
playerBody.addShape(playerShape);
world.addBody(playerBody);

// Загрузка модели
gltfLoader.load('/models/chel.glb', (gltf) => {
    model = gltf.scene;
    model.position.y = 1;
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    animations = gltf.animations;
    if (animations && animations.length) {
        currentAction = mixer.clipAction(animations[0]);
        currentAction.play();
    }
});

// Создаем градиентную текстуру
const createGradientTexture = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#444444');
    gradient.addColorStop(1, '#888888');

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    return new THREE.CanvasTexture(canvas);
};

const gradientTexture = createGradientTexture(512, 512);

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({
        map: gradientTexture,
        metalness: 0,
        roughness: 0.5
    })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 2, 5);
scene.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Movement
 */
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const speed = 0.1;

const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyW') keys.s = true;
    if (event.code === 'KeyA') keys.d = true;
    if (event.code === 'KeyS') keys.w = true;
    if (event.code === 'KeyD') keys.a = true;
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyW') keys.s = false;
    if (event.code === 'KeyA') keys.d = false;
    if (event.code === 'KeyS') keys.w = false;
    if (event.code === 'KeyD') keys.a = false;
});

/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

const lerpAngle = (a, b, t) => {
    const diff = (b - a + Math.PI) % (2 * Math.PI) - Math.PI;
    return a + diff * t;
};

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    if (mixer) {
        mixer.update(deltaTime);
    }

    direction.set(0, 0, 0);
    if (keys.w) direction.z -= 1;
    if (keys.s) direction.z += 1;
    if (keys.a) direction.x += 1;
    if (keys.d) direction.x -= 1;

    direction.normalize();
    velocity.copy(direction).multiplyScalar(speed);

    if (model) {
        model.position.add(velocity);

        if (velocity.length() > 0) {
            const targetRotationY = Math.atan2(velocity.x, velocity.z);
            model.rotation.y = lerpAngle(model.rotation.y, targetRotationY, 0.057);

            if (currentAction !== mixer.clipAction(animations[2])) {
                currentAction.fadeOut(0.7);
                currentAction = mixer.clipAction(animations[2]);
                currentAction.reset().fadeIn(0.7).play();
            }
        } else {
            if (currentAction !== mixer.clipAction(animations[0])) {
                currentAction.fadeOut(0.7);
                currentAction = mixer.clipAction(animations[0]);
                currentAction.reset().fadeIn(0.7).play();
            }
        }

        camera.position.x = model.position.x + 3.7;
        camera.position.z = model.position.z + 10;
        camera.position.y = 5.4;
        camera.lookAt(model.position);
    }

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();