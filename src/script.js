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
 * Fog
 */
const fogColor = new THREE.Color(0xaaaaaa);
const nearFog = 1;
const farFog = 50;
scene.fog = new THREE.Fog(fogColor, nearFog, farFog);

const snowflakeGeometry = new THREE.CircleGeometry(0.05, 8);
const snowflakeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
});

const snowflakes = [];
const snowflakeCount = 700;
const minX = -40;
const maxX = 40;
const minZ = -40;
const maxZ = 40;

for (let i = 0; i < snowflakeCount; i++) {
    const snowflake = new THREE.Mesh(snowflakeGeometry, snowflakeMaterial);

    snowflake.position.x = Math.random() * (maxX - minX) + minX;
    snowflake.position.y = Math.random() * 10;
    snowflake.position.z = Math.random() * (maxZ - minZ) + minZ;
    const scale = Math.random() * 0.5 + 0.5;
    snowflake.scale.set(scale, scale, scale);
    snowflake.speed = Math.random() * 0.005 + 0.005;
    snowflake.material.opacity = Math.random() * 0.5 + 0.3;

    snowflakes.push(snowflake);
    scene.add(snowflake);
}

function updateSnowflakes() {
    for (let i = 0; i < snowflakes.length; i++) {
        const snowflake = snowflakes[i];

        snowflake.position.y -= snowflake.speed;

        snowflake.speed = Math.random() * 0.005 + 0.005;
        snowflake.rotation.z += 0.01;
        if (snowflake.position.y < 0) {
            snowflake.position.y = Math.random() * 10;
            snowflake.position.x = Math.random() * (maxX - minX) + minX;
            snowflake.position.z = Math.random() * (maxZ - minZ) + minZ;
        }
    }
}

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
    { x: 10.5, y: 0, z: 23.5 },
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
    shadowMesh.position.set(position.x - 2, 0.01, position.z + 0.5);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.rotation.z = -Math.PI / 1.2;
    return shadowMesh;
}

gltfLoader.load('/models/pet.glb', (gltf) => {
    model = gltf.scene;
    model.position.y = 1.6;
    model.scale.set(1.55, 1.55, 1.55);
    colliderModels.push(model);
    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    animations = gltf.animations;

    if (animations.length > 0) {
        currentAction = mixer.clipAction(animations[0]);
    }

    const colliderGeometry = new THREE.BoxGeometry(1, 1, 1);
    const colliderMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
    collider.position.copy(model.position);
    collider.scale.set(0.2, 1, 0.2);
    scene.add(collider);
});

/**
 * Floor
 */
let isInSnow = false;
const snowSpeedFactor = 0.5;
let snowColliders = [];

const loader = new GLTFLoader();
loader.load('/models/pol.glb', (gltf) => {
    const floor = gltf.scene;
    floor.scale.set(1, 1, 1);
    floor.position.set(0, 0, 0);

    const snowPiles = floor.children.filter(child =>
        child.name === 'сугроб3' ||
        child.name === 'сугроб4' ||
        child.name === 'сугроб5' ||
        child.name === 'сугроб6'
    );

    snowPiles.forEach(snowPile => {
        const collider = new THREE.Box3().setFromObject(snowPile);
        snowColliders.push(collider);
    });

    const cylinders = floor.children.filter(child => child.name === 'Цилиндр' ||
        child.name === 'Цилиндр1' ||
        child.name === 'Цилиндр2' ||
        child.name === 'Цилиндр3' ||
        child.name === 'Цилиндр4' ||
        child.name === 'Цилиндр5' ||
        child.name === 'Цилиндр6' ||
        child.name === 'Цилиндр7' ||
        child.name === 'Цилиндр8');

    cylinders.forEach(cylinder => {
        const collider = new THREE.Box3().setFromObject(cylinder);

        const size = collider.getSize(new THREE.Vector3());
        const scaleFactor = 0.6;

        const colliderBox = new THREE.Mesh(
            new THREE.BoxGeometry(size.x * scaleFactor, size.y, size.z * scaleFactor),
            new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false
            })
        );

        colliderBox.position.set(collider.getCenter(new THREE.Vector3()).x,
            collider.getCenter(new THREE.Vector3()).y,
            collider.getCenter(new THREE.Vector3()).z);

        scene.add(colliderBox);
        colliderModels.push(cylinder);
    });

    scene.add(floor);
}, undefined, (error) => {
    console.error('Ошибка загрузки модели:', error);
});

colliderPositions.forEach(position => {
    gltfLoader.load('/models/tend.glb', (gltf) => {
        const colliderModel = gltf.scene;
        colliderModel.position.set(position.x, position.y, position.z);
        colliderModel.rotation.y = 90;
        scene.add(colliderModel);
        colliderModels.push(colliderModel);

        const shadowSizes = [
            { width: 1.5, height: 0.75 },
            { width: 1.2, height: 0.6 },
        ];
        const shadowOpacities = [0.15, 0.2];

        shadowSizes.forEach((size, index) => {
            const shadowMesh = createShadowMesh(size, position, shadowOpacities[index]);
            shadowMesh.position.y += 0.099
            scene.add(shadowMesh);
        });
    });
});

const wallLoader = new GLTFLoader();
const wallCount = 4;
const wallThickness = 1.95;

const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

for (let i = 0; i < wallCount; i++) {
    wallLoader.load('/models/wall.glb', (gltf) => {
        const wall = gltf.scene;

        wall.scale.set(1, 1, wallThickness);

        wall.rotation.y = rotations[i];

        if (i === 0) {
            wall.position.set(0, 0, 2);
        } else if (i === 1) {
            wall.position.set(2, 0, 0);
        } else if (i === 2) {
            wall.position.set(0, 0, -2);
        } else if (i === 3) {
            wall.position.set(-2, 0, 0);
        }

        colliderModels.push(wall);
        scene.add(wall);
    }, undefined, (error) => {
        console.error('Ошибка загрузки модели:', error);
    });
}

const imageLoader = new THREE.TextureLoader();

const imagesData = [
    {
        url: '/models/git.png',
        position: { x: 8.5, y: 3.5, z: 24 },
        rotation: { x: 0, y: 204.7 * (Math.PI / 180), z: 0 },
        scale: { x: 1.85, y: 1.5, z: 1 }
    },
    {
        url: '/models/ifDead.png',
        position: { x: 47.8, y: 5, z: -1.1 },
        rotation: { x: 0, y: -90 * (Math.PI / 180), z: 0 },
        scale: { x: 1.5, y: 1.3, z: 1 }
    },
    {
        url: '/models/unity.png',
        position: { x: 47, y: 7.6, z: -1.1 },
        rotation: { x: 0, y: -90 * (Math.PI / 180), z: 0 },
        scale: { x: 1.85, y: 1, z: 1 }
    },
    {
        url: '/models/modelsIf.png',
        position: { x: 47.7, y: 2.6, z: -2.8 },
        rotation: { x: 0, y: -90 * (Math.PI / 180), z: 0 },
        scale: { x: 1, y: 1, z: 1 }
    },
    {
        url: '/models/mapIf.png',
        position: { x: 47.955, y: 2.6, z: 0.8 },
        rotation: { x: 0, y: -94 * (Math.PI / 180), z: 0 },
        scale: { x: 1, y: 1, z: 1 }
    },
    {
        url: '/models/LinkedIn.png',
        position: { x: 0.9, y: 4, z: -47.87 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 0.75, y: 1, z: 1 }
    },
];

function loadImages() {
    imagesData.forEach(imageData => {
        imageLoader.load(imageData.url, (texture) => {
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
            });
            const planeGeometry = new THREE.PlaneGeometry(3, 2);
            const imageMesh = new THREE.Mesh(planeGeometry, material);
            imageMesh.position.set(imageData.position.x, imageData.position.y, imageData.position.z);
            imageMesh.rotation.set(imageData.rotation.x, imageData.rotation.y, imageData.rotation.z);
            imageMesh.scale.set(imageData.scale.x, imageData.scale.y, imageData.scale.z);
            scene.add(imageMesh);

        }, undefined, (error) => {
            console.error('Ошибка загрузки текстуры:', error);
        });
    });
}

loadImages();

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
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
const camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 2, 5);
scene.add(camera);
const raycaster = new THREE.Raycaster();
const cameraDirection = new THREE.Vector3();

function updateCameraPosition() {
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();
}

function createButton(position, url) {
    const buttonWidth = 3;
    const buttonHeight = 2;

    const buttonGeometry = new THREE.PlaneGeometry(buttonWidth, buttonHeight);
    const buttonMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
    });
    const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonMesh.isButton = true;
    buttonMesh.url = url;
    buttonMesh.position.set(position.x, position.y, position.z);
    buttonMesh.rotation.x = 1.5707;
    buttonMesh.rotation.y = 3.1164;
    buttonMesh.rotation.z = 0.49;
    scene.add(buttonMesh);

    return buttonMesh;
}

const button1 = createButton({ x: 6, y: 0.05, z: 19 }, 'https://github.com/Spoon221');
const button2 = createButton({ x: 46, y: 0.05, z: -1.4 }, 'https://github.com/Spoon221/IFdead');
const button3 = createButton({ x: 0.3, y: 0.05, z: -46.0 }, 'https://www.linkedin.com/in/евгений-симаков-7680b0345/');

button2.rotation.z = 29.8;
button3.rotation.z = 0;
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
            window.open(intersect.object.url, '_blank');
        }
    });
});

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Movement
 */
const velocity = new THREE.Vector3();
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

let trashModels = []; 
let trashLoadedCount = 0; 

const trashPositions = [
    { x: 6, y: 0.2, z: 1.4 },
    { x: 5, y: 0.2, z: 23.0 },
    { x: -3, y: 0.2, z: -27.0 },
    { x: 4.3, y: 0.2, z: -27.0 },
    { x: -23, y: 0.2, z: -5.5 },
];

const loadertrash = new GLTFLoader();

trashPositions.forEach(position => {
    loadertrash.load('/models/trash.glb', (gltf) => {
        const trash = gltf.scene;
        trash.position.set(position.x, position.y, position.z);
        trash.scale.set(0.4, 0.4, 0.4);
        scene.add(trash);
        trashModels.push(trash); 
        trashLoadedCount++;

        if (trashLoadedCount === trashPositions.length) {
            console.log('Все мусорки успешно загружены:', trashModels);
        }
    }, undefined, (error) => {
        console.error('Ошибка загрузки модели trash:', error);
    });
});

let kickInProgress = false;
let kickStartPosition = new THREE.Vector3();
let kickEndPosition = new THREE.Vector3();
let kickDuration = 500;
let kickStartTime = 0;
const groundHeight = 0.01; 

function kickTrash(trash) { 
    if (kickInProgress || !trash) return;
    trash.updateMatrixWorld();

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const kickForce = 2;
    kickStartPosition.copy(trash.position);
    kickEndPosition.copy(trash.position).add(direction.clone().multiplyScalar(kickForce));
    kickStartTime = performance.now();
    kickInProgress = true;

    animateKick(trash); 
}

function animateKick(trash) { 
    if (!kickInProgress) return;

    const currentTime = performance.now();
    const elapsedTime = currentTime - kickStartTime;
    const t = Math.min(elapsedTime / kickDuration, 1);

    trash.position.lerpVectors(kickStartPosition, kickEndPosition, t);
    if (trash.position.y < groundHeight) {
        trash.position.y = groundHeight; 
    }
    const randomRotationSpeedY = Math.random() * 0.1;
    trash.rotation.y += randomRotationSpeedY;

    if (t < 1) {
        requestAnimationFrame(() => animateKick(trash));
    } else {
        kickInProgress = false;
    }
}

function checkTrashCollision() {
    if (!model || trashModels.length === 0) return; 

    const playerBox = new THREE.Box3().setFromObject(model); 

    for (const trash of trashModels) {
        const trashBox = new THREE.Box3().setFromObject(trash); 
        if (playerBox.intersectsBox(trashBox)) {
            kickTrash(trash); 
            break; 
        }
    }
}

const minDistance = 1;

function checkTrashOverlap() {
    for (let i = 0; i < trashModels.length; i++) {
        for (let j = i + 1; j < trashModels.length; j++) {
            const trashA = trashModels[i];
            const trashB = trashModels[j];

            const boxA = new THREE.Box3().setFromObject(trashA);
            const boxB = new THREE.Box3().setFromObject(trashB);

            if (boxA.intersectsBox(boxB)) {
                const centerA = boxA.getCenter(new THREE.Vector3());
                const centerB = boxB.getCenter(new THREE.Vector3());
                const direction = new THREE.Vector3().subVectors(centerB, centerA).normalize();

                const offset = direction.multiplyScalar(minDistance);
                trashB.position.add(offset);
            }
        }
    }
}
/**
 * Animate
 */
const clock = new THREE.Clock();
let previousTime = 0;

function updateAnimation() {
    const animationSpeed = 2.455;

    if (keys.w || keys.a || keys.s || keys.d) {
        if (currentAction && !currentAction.isRunning()) {
            currentAction.setEffectiveTimeScale(animationSpeed);
            currentAction.play();
        }
    } else {
        if (currentAction && currentAction.isRunning()) {
            currentAction.stop();
        }
    }
}

function checkCollisions(newPosition) {
    const playerBox = new THREE.Box3().setFromObject(model);
    playerBox.translate(newPosition.clone().sub(model.position));

    for (const collider of colliderModels) {
        if (collider === model) continue;

        const colliderBox = new THREE.Box3().setFromObject(collider);
        if (playerBox.intersectsBox(colliderBox)) {
            return true;
        }
    }

    return false;
}

function checkSnowCollision() {
    if (snowColliders.length > 0) {
        const playerBox = new THREE.Box3().setFromObject(model);
        isInSnow = snowColliders.some(collider => playerBox.intersectsBox(collider));
    }
}

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    if (mixer) {
        mixer.update(deltaTime);
    }

    checkSnowCollision();

    const globalDirection = new THREE.Vector3(0, 0, 0);
    if (keys.w) globalDirection.z += 1;
    if (keys.a) globalDirection.x += 1;
    if (keys.d) globalDirection.x -= 1;

    globalDirection.normalize();

    if (model) {
        const localDirection = globalDirection.clone().applyQuaternion(model.quaternion);
        localDirection.y = 0;
        localDirection.normalize();

        const currentSpeed = isInSnow ? speed * snowSpeedFactor : speed;
        velocity.copy(localDirection).multiplyScalar(currentSpeed);

        const newPosition = model.position.clone().add(velocity);

        if (!checkCollisions(newPosition)) {
            model.position.copy(newPosition);
        }

        checkTrashCollision();

        let rotationSpeed = 0.02;
        if (keys.a || keys.d) {
            rotationSpeed = 0.02;
        }

        if (localDirection.length() > 0) {
            const targetRotationY = Math.atan2(localDirection.x, localDirection.z);
            const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetRotationY, 0));
            const currentQuaternion = model.quaternion.clone();

            currentQuaternion.slerp(targetQuaternion, rotationSpeed);
            model.quaternion.copy(currentQuaternion);
        }

        if (keys.s) {
            const backwardDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(model.quaternion);
            backwardDirection.y = 0;
            backwardDirection.normalize();

            const backwardVelocity = backwardDirection.clone().multiplyScalar(currentSpeed);
            const backwardPosition = model.position.clone().add(backwardVelocity);

            if (!checkCollisions(backwardPosition)) {
                model.position.copy(backwardPosition);
            }
        }

        const cameraOffset = new THREE.Vector3(0, 2.8, -5);
        cameraOffset.applyQuaternion(model.quaternion);
        camera.position.copy(model.position).add(cameraOffset);

        camera.lookAt(model.position);
    }

    updateAnimation();
    updateSnowflakes();
    updateCameraPosition();
    checkTrashOverlap();
    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};


tick();