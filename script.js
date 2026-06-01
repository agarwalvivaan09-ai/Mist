const productViewer = document.getElementById("productViewer");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (productViewer) {
    initProductViewer(productViewer);
}

async function initProductViewer(mount) {
    const THREE = await import(
  "https://unpkg.com/three@0.160.0/build/three.module.js"
);

const { RGBELoader } = await import(
  "https://unpkg.com/three@0.160.0/examples/jsm/loaders/RGBELoader.js?module"
);
    const canvas = document.getElementById("productCanvas");
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    const scene = new THREE.Scene();

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
.load(
    "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr",
    (hdr) => {

        const envMap =
            pmremGenerator.fromEquirectangular(hdr).texture;

        scene.environment = envMap;
scene.environmentIntensity = 0.3;
        hdr.dispose();
        pmremGenerator.dispose();
    }
);
    

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.physicallyCorrectLights = true;
    camera.position.set(0, 0.3, 11.6);

    const sceneRoot = new THREE.Group();
   sceneRoot.rotation.x = -0.28;
sceneRoot.rotation.y = 0.18;
    
    scene.add(sceneRoot);

    const graphite = new THREE.MeshPhysicalMaterial({
    color: 0x1f2430,
    metalness: 0.35,
    roughness: 0.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.5
});
    const deepBlack = new THREE.MeshPhysicalMaterial({
    color: 0x1d1f23,
    metalness: 0.15,
    roughness: 0.4,
    clearcoat: 0.6
});
    const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xd4d4d4,
    metalness: 1,
    roughness: 0.18,
    envMapIntensity: 0.8
});
    const glass = new THREE.MeshPhysicalMaterial({
    color: 0xdfe5ec,
    transparent: true,
    opacity: 0.65,
    roughness: 0.45,
    metalness: 0,
    transmission: 0,
    clearcoat: 0.4
});

    const radius = 0.48;
    const segments = 96;
    const atomizer = new THREE.Group();
    atomizer.position.x = -0.08;
    atomizer.position.y = -0.05;
    sceneRoot.add(atomizer);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1.95, segments), graphite);
    body.position.y = -0.58;
    atomizer.add(body);

    const bodyBottom = new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        graphite
    );
    bodyBottom.position.y = -1.55;
    atomizer.add(bodyBottom);

    const seam = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.006, 0.018, 14, 128), chrome);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.4;
    atomizer.add(seam);

    const neckChrome = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.82, 0.24, segments), chrome);
    neckChrome.position.y = 0.58;
    atomizer.add(neckChrome);

    const pumpStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.72, 64),
    deepBlack
);
    pumpStem.position.y = 1.00;
    atomizer.add(pumpStem);

   const sprayHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.10, 64),
    deepBlack
);

sprayHead.position.y = 1.16;

atomizer.add(sprayHead);

const nozzleHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.03, 32),
    new THREE.MeshBasicMaterial({
        color: 0xffffff
    })
);

// make nozzle point forward horizontally
nozzleHole.rotation.x = Math.PI / 2;
nozzleHole.rotation.y = 0.15; // small adjustment

nozzleHole.position.set(
    0.012,   // align with fill window
    1.16,   // height
    0.24    // slightly proud of spray head
);

atomizer.add(nozzleHole);



    const cap = new THREE.Group();
    cap.position.set(0, 2.15, 0);
    atomizer.add(cap);

    const capCylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.72, segments), graphite);
    cap.add(capCylinder);

    const capTop = new THREE.Mesh(
        new THREE.SphereGeometry(radius, segments, 32, 0, Math.PI * 2, 0, Math.PI / 2),
        graphite
    );
    capTop.position.y = 0.36;
    cap.add(capTop);

    

    const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.58, 0.012), deepBlack);
    centerLine.position.set(0, -0.63, radius + 0.018);
    atomizer.add(centerLine);

    const windowFrame = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.56, 16, 48), deepBlack);
    windowFrame.position.set(0, -0.88, radius + 0.044);
    windowFrame.scale.set(0.78, 1.05, 0.06);
    atomizer.add(windowFrame);

    const windowGlass = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.72, 16, 48), glass);
    windowGlass.position.set(0, -0.75, radius + 0.09);
    windowGlass.scale.set(0.75, 1.02, 0.045);
    atomizer.add(windowGlass);

    const valveRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.03, 24, 96),
    chrome
);

valveRing.rotation.x = Math.PI / 2;


atomizer.add(valveRing);

valveRing.position.set(0, -2.02, 0);

// black insert
const valveCenter = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 64),
    new THREE.MeshBasicMaterial({
        color: 0x050505
    })
);

valveCenter.rotation.x = -Math.PI / 2;
valveCenter.position.set(0, -2.015, 0);

atomizer.add(valveCenter);

// white refill hole in center
const valveHole = new THREE.Mesh(
    new THREE.CircleGeometry(0.03, 64),
    new THREE.MeshBasicMaterial({
        color: 0xffffff
    })
);

valveHole.rotation.x = -Math.PI / 2;
valveHole.position.set(0, -2.014, 0);

atomizer.add(valveHole);

    

    

    

    const mistGroup = new THREE.Group();
    scene.add(mistGroup);
    for (let i = 0; i < 24; i += 1) {
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false });
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.014 + Math.random() * 0.016, 10, 10), material);
        particle.position.set(0.08 + Math.random() * 1.0, 1.08 + Math.random() * 0.28, 0.42 + Math.random() * 0.16);
        particle.userData = {
            baseX: particle.position.x,
            baseY: particle.position.y,
            speed: 0.6 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2
        };
        mistGroup.add(particle);
    }

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({
        opacity: 0.12
    })
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.05;

floor.receiveShadow = true;

scene.add(floor);

   scene.add(new THREE.AmbientLight(0xffffff, 0.45));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
keyLight.position.set(-5, 6, 7);
keyLight.castShadow = true;

keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;

keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;

keyLight.shadow.bias = -0.0001;
const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
fillLight.position.set(5, 2, 4);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
rimLight.position.set(4, 3, -5);

scene.add(keyLight);
scene.add(fillLight);
scene.add(rimLight);

    const state = {
    dragging: false,
    lastX: 0,
    lastY: 0,
    targetX: -0.12,
    targetY: 0.22,
    velocity: 0
};

    const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    mount.addEventListener("pointerdown", (event) => {
        state.dragging = true;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        mount.setPointerCapture(event.pointerId);
    });
    mount.addEventListener("pointermove", (event) => {
        if (!state.dragging) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.targetY += dx * 0.01;
        state.targetX = Math.max(
    -1.2,
    Math.min(1.2, state.targetX + dy * 0.008)
);
        state.velocity = dx * 0.0007;
    });
    mount.addEventListener("pointerup", (event) => {
        state.dragging = false;
        mount.releasePointerCapture(event.pointerId);
    });
    mount.addEventListener("pointercancel", () => {
        state.dragging = false;
    });

    window.addEventListener("resize", resize);
    resize();

    const render = () => {
        if (!state.dragging && !prefersReducedMotion) {
    // Auto rotate
    state.targetY -= 0.005;

    // Keep inertia from previous drag
    state.targetY += state.velocity;
    state.velocity *= 0.94;
}

        sceneRoot.rotation.x +=
    (state.targetX - sceneRoot.rotation.x) * 0.12;
        sceneRoot.rotation.y += (state.targetY - sceneRoot.rotation.y) * 0.08;
        sceneRoot.position.y = prefersReducedMotion ? 0 : Math.sin(performance.now() * 0.0011) * 0.012;

        mistGroup.children.forEach((particle) => {
            const time = performance.now() * 0.001 * particle.userData.speed + particle.userData.phase;
            particle.position.x = particle.userData.baseX + (Math.sin(time) + 1) * 0.12;
            particle.position.y = particle.userData.baseY + Math.sin(time * 0.7) * 0.032;
            particle.material.opacity = 0.04 + (Math.sin(time) + 1) * 0.05;
        });

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };

    render();
}

document.querySelectorAll("nav a").forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === window.location.pathname) {
        link.classList.add("active");
    }
});
