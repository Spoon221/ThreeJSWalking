import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap'

const loadingBarElement = document.querySelector('.loading-bar');
const overlayElement = document.querySelector('.loading-overlay');

const loadingManager = new THREE.LoadingManager(
    () => {
        window.setTimeout(() => {
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })

            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)
    },

    (itemUrl, itemsLoaded, itemsTotal) => {
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)

const loader = new GLTFLoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);

/**
 * Base
 */
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();

const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(211.0 / 255.0, 211.0 / 255.0, 211.0 / 255.0, uAlpha);
        }
    `
});
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
scene.add(overlay);
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
const snowflakeCount = 500;
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
    snowflake.rotation.y = Math.random() * Math.PI * 2;

    snowflakes.push(snowflake);
    scene.add(snowflake);
}

function updateSnowflakes() {
    for (let i = 0; i < snowflakes.length; i++) {
        const snowflake = snowflakes[i];

        snowflake.position.y -= snowflake.speed;

        snowflake.speed = Math.random() * 0.005 + 0.005;
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
let isInSnow = false;
const snowSpeedFactor = 0.5;
let snowColliders = [];

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

    const cylinders = floor.children.filter(child => child.name.startsWith('Цилиндр') || child.name.startsWith('фонарь'));

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

        if (cylinder.name.startsWith('фонарь')) {
            const light = new THREE.PointLight(0xffffff, 10, 15, 1.6);
            light.position.copy(collider.getCenter(new THREE.Vector3()));
            light.position.y = 5.65;
            light.castShadow = true;
            scene.add(light);

            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 50;

            setInterval(() => {
                light.visible = !light.visible;
            }, Math.random() * 2500 + 500);
        }
    });

    const ambientLight = new THREE.AmbientLight(0x606060);
    scene.add(ambientLight);

    scene.add(floor);
}, undefined, (error) => {
    console.error('Ошибка загрузки модели:', error);
});

let mixer = null;
let model = null;
let animations = [];
let currentAction = null;

const colliderModels = [];
const colliderPositions = [
    { x: 10.5, y: 0, z: 23.5 },
    { x: 2.35, y: 0, z: 46 },
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
    model.scale.set(1.4, 1.4, 1.4);
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
    collider.scale.set(0.45, 1, 0.45);
    scene.add(collider);
});

/**
 * Floor
 */
colliderPositions.forEach((position, index) => {
    gltfLoader.load('/models/tend.glb', (gltf) => {
        const colliderModel = gltf.scene;
        colliderModel.position.set(position.x, position.y, position.z);

        colliderModel.rotation.y = index === 1 ? Math.PI / 2 : 90;

        scene.add(colliderModel);
        colliderModels.push(colliderModel);

        const shadowSizes = [
            { width: 1.5, height: 0.75 },
            { width: 1.2, height: 0.6 },
        ];
        const shadowOpacities = [0.15, 0.2];

        shadowSizes.forEach((size, shadowIndex) => {
            const shadowMesh = createShadowMesh(size, position, shadowOpacities[shadowIndex]);
            shadowMesh.position.y += 0.1;

            if (index === 1) {
                if (shadowIndex === 0) {
                    shadowMesh.rotation.z = 0;
                    shadowMesh.position.z -= 0.5;
                    shadowMesh.position.y -= 0.105;
                } else {
                    shadowMesh.rotation.z = 0;
                    shadowMesh.position.z -= 0.5;
                    shadowMesh.position.y -= 0.105;
                }
            } else {
                shadowMesh.rotation.z = Math.PI / 4;
            }

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
    {
        url: '/models/react.png',
        position: { x: -47.7, y: 3, z: -0.9 },
        rotation: { x: 0, y: 94 * (Math.PI / 180) - 0.1, z: 0 },
        scale: { x: 1.15, y: 1, z: 1 }
    },
    {
        url: '/models/iconReact.png',
        position: { x: -47.7, y: 6, z: -0.9 },
        rotation: { x: 0, y: 94 * (Math.PI / 180) - 0.1, z: 0 },
        scale: { x: 0.8, y: 1, z: 1 }
    },
    {
        url: '/models/python.png',
        position: { x: -1.52, y: 4.3, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.4, y: 0.5, z: 1 }
    },
    {
        url: '/models/threejs.png',
        position: { x: -1.52, y: 2.7, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.4, y: 0.5, z: 1 }
    },
    {
        url: '/models/js.png',
        position: { x: -0.25, y: 3.5, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.4, y: 0.5, z: 1 }
    },
    {
        url: '/models/c++.png',
        position: { x: 1, y: 2.7, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.4, y: 0.5, z: 1 }
    },
    {
        url: '/models/logounity.png',
        position: { x: 1.05, y: 4.3, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.35, y: 0.45, z: 1 }
    },
    {
        url: '/models/iconReact.png',
        position: { x: 2.2, y: 3.5, z: 45.7 },
        rotation: { x: 0, y: 3.2, z: 0 },
        scale: { x: 0.35, y: 0.45, z: 1 }
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(70, sizes.width / sizes.height, 0.1, 84);
const raycaster = new THREE.Raycaster();

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
const button4 = createButton({ x: -45.5, y: 0.05, z: -1.1 }, 'https://react4-mvstlldxk-spoon221s-projects.vercel.app');

button2.rotation.z = 29.8;
button3.rotation.z = 0;
button4.rotation.z = 20.4;
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

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1;
    mouse.y = -(event.clientY / sizes.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    const isHovering = intersects.some(intersect => intersect.object.isButton);

    document.body.style.cursor = isHovering ? 'pointer' : 'auto';
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
const speed = 0.075;

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
let bottleModels = [];

const trashPositions = [
    { x: 6, y: 0.2, z: 1.4 },
    { x: 5, y: 0.2, z: 23.0 },
    { x: -3, y: 0.2, z: -27.0 },
    { x: 4, y: 0.2, z: -27.0 },
    { x: -23, y: 0.2, z: -5.5 },
];

const bottlePositions = [
    { x: 4, y: 0.2, z: 3.0 },
    { x: 4, y: 0.2, z: 22.0 },
    { x: -24, y: 0.2, z: -5.0 },
    { x: 35, y: 0.2, z: -6.0 },
    { x: 4.5, y: 0.2, z: -25.0 },
];

const loaderTrash = new GLTFLoader();
const loaderBottle = new GLTFLoader();

trashPositions.forEach(position => {
    loaderTrash.load('/models/trash.glb', (gltf) => {
        const trash = gltf.scene;
        trash.position.set(position.x, position.y, position.z);
        trash.scale.set(0.4, 0.4, 0.4);
        scene.add(trash);
        trashModels.push(trash);
    }, undefined, (error) => {
        console.error('Ошибка загрузки модели trash:', error);
    });
});

bottlePositions.forEach(position => {
    loaderBottle.load('/models/paper.glb', (gltf) => {
        const bottle = gltf.scene;
        bottle.position.set(position.x, position.y, position.z);
        bottle.scale.set(1.27, 1.2, 1.27);
        scene.add(bottle);
        bottleModels.push(bottle);
    }, undefined, (error) => {
        console.error('Ошибка загрузки модели bottle:', error);
    });
});

let kickInProgress = false;
let kickStartPosition = new THREE.Vector3();
let kickEndPosition = new THREE.Vector3();
let kickDuration = 500;
let kickStartTime = 0;
const groundHeight = 0.66;

const maxRotationZ = Math.PI / 7;
const rotationSpeed = 0.04;
const minDistance = 1;
const kickStates = Array(trashModels.length).fill(false).concat(Array(bottleModels.length).fill(false));
const firstKick = {};

function animateKick(object, index) {
    if (!kickInProgress) return;

    const currentTime = performance.now();
    const elapsedTime = currentTime - kickStartTime;
    const t = Math.min(elapsedTime / kickDuration, 1);

    const newPosition = new THREE.Vector3().lerpVectors(kickStartPosition, kickEndPosition, t);
    newPosition.y = Math.max(newPosition.y, groundHeight);

    if (checkCollisionWithColliders(object, newPosition)) {
        kickInProgress = false;
        kickStates[index] = false;
        return;
    } else {
        object.position.copy(newPosition);
    }

    if (firstKick[index]) {
        const targetRotationX = Math.PI / 2;
        object.rotation.x += (targetRotationX - object.rotation.x) * 0.1;
        if (Math.abs(object.rotation.x - targetRotationX) < 0.01) {
            object.rotation.x = targetRotationX;
            firstKick[index] = false;
        }
    } else {
        object.rotation.y += rotationSpeed;
        object.rotation.z += (Math.random() - 0.5) * rotationSpeed;
        object.rotation.z = THREE.MathUtils.clamp(object.rotation.z, -maxRotationZ, maxRotationZ);
        if (bottleModels.includes(object)) {
            object.position.y = 0.2;
        }
    }

    if (t < 1) {
        requestAnimationFrame(() => animateKick(object, index));
    } else {
        finalizeKick(object);
    }
}

function finalizeKick(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    let targetRotation;
    let targetPosition = new THREE.Vector3(object.position.x, groundHeight, object.position.z);

    if (bottleModels.includes(object)) {
        targetPosition.y = 0.2;
    }

    if (size.x > size.z) {
        targetRotation = new THREE.Euler(0, 0, Math.PI / 2);
    } else {
        targetRotation = new THREE.Euler(Math.PI / 2, 0, 0);
    }

    smoothTransitionToEdge(object, targetPosition, targetRotation);
    kickInProgress = false;

    const index = trashModels.indexOf(object);
    if (index === -1) {
        const bottleIndex = bottleModels.indexOf(object);
        if (bottleIndex !== -1) {
            kickStates[trashModels.length + bottleIndex] = false;
        }
    } else {
        kickStates[index] = false;
    }
}

function checkCollisionWithColliders(object, newPosition) {
    const box = new THREE.Box3().setFromObject(object);
    box.setFromCenterAndSize(newPosition, new THREE.Vector3(0.4, 0.4, 0.4));

    return colliderModels.some(collider => {
        const colliderBox = new THREE.Box3().setFromObject(collider);
        return box.intersectsBox(colliderBox);
    });
}

function checkObjectCollision() {
    if (!model || (trashModels.length === 0 && bottleModels.length === 0)) return;

    const playerBox = new THREE.Box3().setFromObject(model);

    for (let i = 0; i < trashModels.length; i++) {
        const trash = trashModels[i];
        const trashBox = new THREE.Box3().setFromObject(trash);
        if (playerBox.intersectsBox(trashBox) && !kickStates[i]) {
            kickTrash(trash, i);
            break;
        }
    }

    for (let i = 0; i < bottleModels.length; i++) {
        const bottle = bottleModels[i];
        const bottleBox = new THREE.Box3().setFromObject(bottle);

        const scaleFactor = 1.5;
        const enlargedBox = new THREE.Box3(
            new THREE.Vector3(bottleBox.min.x - (bottleBox.getSize(new THREE.Vector3()).x * (scaleFactor - 1) / 2),
                bottleBox.min.y - (bottleBox.getSize(new THREE.Vector3()).y * (scaleFactor - 1) / 2),
                bottleBox.min.z - (bottleBox.getSize(new THREE.Vector3()).z * (scaleFactor - 1) / 2)),
            new THREE.Vector3(bottleBox.max.x + (bottleBox.getSize(new THREE.Vector3()).x * (scaleFactor - 1) / 2),
                bottleBox.max.y + (bottleBox.getSize(new THREE.Vector3()).y * (scaleFactor - 1) / 2),
                bottleBox.max.z + (bottleBox.getSize(new THREE.Vector3()).z * (scaleFactor - 1) / 2))
        );

        if (playerBox.intersectsBox(enlargedBox) && !kickStates[trashModels.length + i]) {
            kickBottle(bottle, trashModels.length + i);
            break;
        }
    }
}

function kickBottle(bottle, index) {
    if (kickInProgress || !bottle) return;
    kickStates[index] = true;
    firstKick[index] = true;

    bottle.updateMatrixWorld();

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const kickForce = 8.8;
    kickStartPosition.copy(bottle.position);
    kickEndPosition.copy(bottle.position).add(direction.clone().multiplyScalar(kickForce));
    kickStartTime = performance.now();
    kickInProgress = true;
    animateKick(bottle, index);
}


function smoothTransitionToEdge(trash, targetPosition, targetRotation) {
    const transitionDuration = 570;
    const startTime = performance.now();

    const randomRotationZ = (Math.random() * (Math.PI / 4)) - (Math.PI / 8);

    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation);
    const startQuaternion = new THREE.Quaternion().copy(trash.quaternion);

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateTransition() {
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        const t = Math.min(elapsedTime / transitionDuration, 1);
        const easedT = easeInOutCubic(t);

        trash.position.lerp(targetPosition, easedT);

        const interpolatedQuaternion = new THREE.Quaternion().slerpQuaternions(startQuaternion, targetQuaternion, easedT);
        trash.quaternion.copy(interpolatedQuaternion);

        trash.position.copy(targetPosition);
        trash.quaternion.copy(targetQuaternion);
        trash.rotation.z += randomRotationZ;
    }

    animateTransition();
}

function kickTrash(trash, index) {
    if (kickInProgress || !trash) return;
    kickStates[index] = true;
    firstKick[index] = true;

    trash.updateMatrixWorld();

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const kickForce = 7.8;
    kickStartPosition.copy(trash.position);
    kickEndPosition.copy(trash.position).add(direction.clone().multiplyScalar(kickForce));
    kickStartTime = performance.now();
    kickInProgress = true;

    animateKick(trash, index);
}

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

        checkObjectCollision();

        let rotationSpeed = 0.01;
        if (keys.a || keys.d) {
            rotationSpeed = 0.01;
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

        const cameraOffset = new THREE.Vector3(0, 3.6, -5.4);
        cameraOffset.applyQuaternion(model.quaternion);
        camera.position.copy(model.position).add(cameraOffset);

        camera.lookAt(model.position);
    }

    updateAnimation();
    updateSnowflakes();
    checkTrashOverlap();

    renderer.render(scene, camera);
    window.requestAnimationFrame(tick);
};

tick();