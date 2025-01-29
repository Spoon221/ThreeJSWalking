import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import GUI from 'lil-gui';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import typefaceFont from 'three/examples/fonts/helvetiker_regular.typeface.json'

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
    { x: 6, y: 0, z: 20 },
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

// Загружаем модели и добавляем их в массив colliderModels
colliderPositions.forEach(position => {
    gltfLoader.load('/models/tend.glb', (gltf) => {
        const colliderModel = gltf.scene;
        colliderModel.position.set(position.x, position.y, position.z);
        colliderModel.rotation.y = -Math.PI / 2.9;
        scene.add(colliderModel);
        colliderModels.push(colliderModel); // Добавляем модель в массив

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
const createGradientTexture = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#008000');
    gradient.addColorStop(1, '#36454F');

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    return new THREE.CanvasTexture(canvas);
};

const gradientTexture = createGradientTexture(512, 512);

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

const fontLoader = new FontLoader();

// Загружаем шрифт
fontLoader.load(typefaceFont, (font) => {
    console.log('Font loaded successfully');

    // Создаем кнопку после загрузки шрифта
    createButton({ x: 5, y: 0.05, z: 5 }, 'O p e n', font);
}, undefined, (error) => {
    console.error('Error loading font:', error);
});

function createTextCanvas(text, font) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    context.font = 'bold 24px ' + font; // Устанавливаем шрифт
    const textWidth = context.measureText(text).width;
    canvas.width = textWidth; 
    canvas.height = 100; 

    context.fillStyle = 'white';
    context.textAlign = 'center'; 
    context.textBaseline = 'middle'; 
    context.fillText(text, textWidth / 2, canvas.height / 2);
    
    return canvas;
}

function createButton(position, text) {
    const buttonWidth = 2; 
    const buttonHeight = 2; 

    const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, buttonHeight); 
    const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.isButton = true; 
    buttonMesh.position.set(position.x, position.y, position.z);
    buttonMesh.rotation.x = 1.8; 

    const textCanvas = createTextCanvas(text);
    const textWidth = textCanvas.width;
    const textHeight = textCanvas.height;

    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textGeometry = new THREE.PlaneGeometry(textWidth / 50, textHeight / 50);
    const textMaterial = new THREE.MeshBasicMaterial({ 
        map: textTexture, 
        side: THREE.DoubleSide,
        transparent: true, 
        opacity: 1,
        
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, -0.25, -0.15); 
    textMesh.rotation.set(
        THREE.MathUtils.degToRad(0),  
        THREE.MathUtils.degToRad(180),  
        THREE.MathUtils.degToRad(180)  
    );

    buttonMesh.add(textMesh);
    scene.add(buttonMesh);

    return buttonMesh;
}

createButton({ x: 5, y: 0.05, z: 5 }, 'O p e n');

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