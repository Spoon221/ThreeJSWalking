import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import GUI from 'lil-gui';

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

const colliderModels = []; 
const colliderPositions = [
    { x: 5, y: 0, z: 20 },
    { x: 17, y: 0, z: 20 },
];

function createShadowMesh(size, position, opacity) {
    const shadowGeometry = new THREE.CircleGeometry(size.width, 32);
    const shadowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: opacity,
        depthWrite: false
    });

    const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowMesh.scale.set(2.45, size.height / size.width + 1, 2.45);
    shadowMesh.position.set(position.x + 2, 0.01, position.z - 1); 
    shadowMesh.rotation.x = -Math.PI / 2; 
    shadowMesh.rotation.z = -Math.PI / 1.2; 
    return shadowMesh;
}

gltfLoader.load('/models/chel.glb', (gltf) => {
    model = gltf.scene;
    model.position.y = 0.3; 
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    animations = gltf.animations;
    if (animations && animations.length) {
        currentAction = mixer.clipAction(animations[1]);
        currentAction.play();
    }
});

colliderPositions.forEach(position => {
    gltfLoader.load('/models/tend.glb', (gltf) => {
        const colliderModel = gltf.scene;
        colliderModel.position.set(position.x, position.y, position.z);
        colliderModel.rotation.y = -Math.PI / 2.9;
        scene.add(colliderModel);
        colliderModels.push(colliderModel); 

        const shadowSizes = [
            { width: 1.5, height: 0.75 },
            { width: 1.2, height: 0.6 },
        ];
        const shadowOpacities = [0.15, 0.2];

        shadowSizes.forEach((size, index) => {
            const shadowMesh = createShadowMesh(size, position, shadowOpacities[index]);
            scene.add(shadowMesh);
        });
    });
});

/**
 * Floor
 */

const loader = new GLTFLoader();
loader.load('/models/pol.glb', (gltf) => {
    const floor = gltf.scene;
    floor.scale.set(1, 1, 1); 
    floor.position.set(0, 0, 0); 

    scene.add(floor);
}, undefined, (error) => {
    console.error('Ошибка загрузки модели:', error);
});

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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

function createButton(position) {
    const buttonWidth = 3; 
    const buttonHeight = 2; 

    const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, buttonHeight); 
    const buttonMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        side: THREE.DoubleSide, 
        transparent: true, // Включаем прозрачность
        opacity: 0 // Устанавливаем полную прозрачность
    });
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.isButton = true; 
    buttonMesh.position.set(position.x, position.y, position.z);
    buttonMesh.rotation.x = 1.5707; 
    buttonMesh.rotation.y = 3.1164; 
    buttonMesh.rotation.z = 0.49; 
    scene.add(buttonMesh);

    return buttonMesh;
}

createButton({ x: 8.5, y: 0.05, z: 22 });

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    let buttonClicked = false; 

    intersects.forEach(intersect => {
        if (intersect.object.isButton) { 
            buttonClicked = true; 
        }
    });

    if (buttonClicked) {
        window.location.href = 'https://github.com/Spoon221';
    }
});

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
    if (event.code === 'KeyW') keys.w = true;
    if (event.code === 'KeyA') keys.a = true;
    if (event.code === 'KeyS') keys.s = true;
    if (event.code === 'KeyD') keys.d = true;
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'KeyW') keys.w = false;
    if (event.code === 'KeyA') keys.a = false;
    if (event.code === 'KeyS') keys.s = false;
    if (event.code === 'KeyD') keys.d = false;
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
    if (keys.a) direction.x -= 1;
    if (keys.d) direction.x += 1;

    direction.normalize();
    velocity.copy(direction).multiplyScalar(speed);

    if (model) {
        model.position.add(velocity);

        const modelBox = new THREE.Box3().setFromObject(model);
        let collisionDetected = false;

        colliderModels.forEach(colliderModel => {
            const colliderBox = new THREE.Box3().setFromObject(colliderModel);
            if (modelBox.intersectsBox(colliderBox)) {
                collisionDetected = true;
                console.log("Collision detected!");

                const newAction = mixer.clipAction(animations[0]);

                if (currentAction !== newAction) {
                    if (currentAction) {
                        currentAction.fadeOut(0.07);
                    }

                    currentAction = newAction;
                    currentAction.reset().fadeIn(0.01).play();
                    console.log("Playing animation:", animations[0].name);
                }

                if (currentAction.time < currentAction.getClip().duration / 2) {
                    currentAction.time = currentAction.getClip().duration / 2;
                    currentAction.paused = true;
                }

                model.position.add(velocity.clone().multiplyScalar(-1));
            }
        });

        if (!collisionDetected) {
            if (velocity.length() > 0) {
                const targetRotationY = Math.atan2(velocity.x, velocity.z);
                model.rotation.y = lerpAngle(model.rotation.y, targetRotationY, 0.057);

                if (currentAction !== mixer.clipAction(animations[3])) {
                    currentAction.fadeOut(0.7);
                    currentAction = mixer.clipAction(animations[3]);
                    currentAction.timeScale = 1.3;
                    currentAction.reset().fadeIn(0.7).play();
                }
            } else {
                if (currentAction !== mixer.clipAction(animations[1])) {
                    currentAction.fadeOut(0.7);
                    currentAction = mixer.clipAction(animations[1]);
                    currentAction.reset().fadeIn(0.7).play();
                }
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