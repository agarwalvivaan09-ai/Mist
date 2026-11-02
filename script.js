const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Active nav link ---------- */
document.querySelectorAll("nav a").forEach((link) => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === window.location.pathname || (linkPath.endsWith("/index.html") && window.location.pathname.endsWith("/"))) {
        link.classList.add("active");
    }
});

/* ---------- Scroll reveal ---------- */
document.documentElement.classList.add("js");
const revealTargets = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => observer.observe(el));
} else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
}

/* ---------- 3D product viewer ---------- */
const productViewer = document.getElementById("productViewer");
if (productViewer) {
    initProductViewer(productViewer).catch((error) => {
        console.error(error);
        productViewer.classList.add("viewer-failed");
    });
}

async function initProductViewer(mount) {
    const THREE = await import("three");
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");

    const canvas = document.getElementById("productCanvas");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    camera.position.set(0, 0.9, 10.5);
    camera.lookAt(0, -0.25, 0);

    // Soft studio key light for a crisp specular streak
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-4, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2);
    rim.position.set(5, 2, -4);
    scene.add(rim);

    /* ----- Materials ----- */
    const finishes = {
        midnight: { color: 0x3b3f48, roughness: 0.3, metalness: 0.7 },
        silver: { color: 0xeeeff2, roughness: 0.22, metalness: 0.45 }
    };

    const aluminium = new THREE.MeshPhysicalMaterial({
        color: finishes.midnight.color,
        metalness: finishes.midnight.metalness,
        envMapIntensity: 1.25,
        roughness: finishes.midnight.roughness,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25
    });
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.08 });
    const satinBlack = new THREE.MeshPhysicalMaterial({ color: 0x15161a, metalness: 0.2, roughness: 0.45, clearcoat: 0.3 });
    const cavity = new THREE.MeshStandardMaterial({ color: 0x1a1a1d, roughness: 0.6, side: THREE.BackSide });
    const capLining = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9, side: THREE.DoubleSide });
    const liquid = new THREE.MeshPhysicalMaterial({
        color: 0xf0b98d,
        roughness: 0.15,
        metalness: 0,
        transparent: true,
        opacity: 0.92,
        emissive: 0x6b3415,
        emissiveIntensity: 0.25
    });
    const glass = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.18,
        clearcoat: 1,
        depthWrite: false
    });

    /* ----- Geometry helpers ----- */
    const SEG = 128;
    const R = 0.5;

    // Build a lathe profile from straight runs and rounded corners
    const arc = (pts, cx, cy, r, a0, a1, steps = 16) => {
        for (let i = 0; i <= steps; i += 1) {
            const a = a0 + (a1 - a0) * (i / steps);
            pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
        }
    };
    const lathe = (pts, material, phiStart = 0, phiLength = Math.PI * 2) =>
        new THREE.Mesh(new THREE.LatheGeometry(pts, SEG, phiStart, phiLength), material);

    const product = new THREE.Group();
    const spinner = new THREE.Group();
    spinner.add(product);
    scene.add(spinner);

    /* ----- Body ----- */
    const BOTTOM = -1.75;
    const WINDOW_LOW = -1.3;
    const WINDOW_HIGH = 0.15;
    const SHOULDER = 0.55;
    const fillet = 0.16;

    // Lower body: rounded base up to the window
    const lowerPts = [new THREE.Vector2(0.0001, BOTTOM)];
    arc(lowerPts, R - fillet, BOTTOM + fillet, fillet, -Math.PI / 2, 0);
    lowerPts.push(new THREE.Vector2(R, WINDOW_LOW));
    product.add(lathe(lowerPts, aluminium));

    // Window band: shell with a slot facing the camera (+Z)
    const slot = 0.62; // radians of arc that are open
    const band = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, WINDOW_HIGH - WINDOW_LOW, SEG, 1, true, slot / 2, Math.PI * 2 - slot),
        aluminium
    );
    band.position.y = (WINDOW_HIGH + WINDOW_LOW) / 2;
    product.add(band);

    // Slot edges (thin satin walls so the cut looks machined)
    const slotH = WINDOW_HIGH - WINDOW_LOW;
    [slot / 2, -slot / 2].forEach((theta) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(0.06, slotH), satinBlack);
        wall.position.set(Math.sin(theta) * (R - 0.03), band.position.y, Math.cos(theta) * (R - 0.03));
        wall.rotation.y = theta + Math.PI / 2;
        wall.material.side = THREE.DoubleSide;
        product.add(wall);
    });

    // Interior cavity + liquid visible through the window
    const innerR = R - 0.06;
    const fillLevel = WINDOW_LOW + slotH * 0.62;
    const cavityTube = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, slotH, 64, 1, true), cavity);
    cavityTube.position.y = band.position.y;
    product.add(cavityTube);
    const liquidH = fillLevel - WINDOW_LOW + 0.02;
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(innerR - 0.005, innerR - 0.005, liquidH, 64), liquid);
    liquidMesh.position.y = WINDOW_LOW - 0.01 + liquidH / 2;
    product.add(liquidMesh);

    // Curved glass over the slot, with a meniscus line
    const pane = new THREE.Mesh(
        new THREE.CylinderGeometry(R - 0.012, R - 0.012, slotH, 48, 1, true, -slot / 2, slot),
        glass
    );
    pane.position.y = band.position.y;
    product.add(pane);

    // Upper body + shoulder + neck
    const upperPts = [new THREE.Vector2(R, WINDOW_HIGH), new THREE.Vector2(R, SHOULDER - fillet)];
    arc(upperPts, R - fillet, SHOULDER - fillet, fillet, 0, Math.PI / 2);
    upperPts.push(new THREE.Vector2(0.34, SHOULDER));
    upperPts.push(new THREE.Vector2(0.0001, SHOULDER));
    product.add(lathe(upperPts, aluminium));

    // Chrome collar with a soft bevel
    const collarPts = [new THREE.Vector2(0.0001, SHOULDER), new THREE.Vector2(0.33, SHOULDER)];
    arc(collarPts, 0.31, SHOULDER + 0.02, 0.02, -Math.PI / 2, 0, 6);
    collarPts.push(new THREE.Vector2(0.33, SHOULDER + 0.14));
    arc(collarPts, 0.3, SHOULDER + 0.14, 0.03, 0, Math.PI / 2, 6);
    collarPts.push(new THREE.Vector2(0.0001, SHOULDER + 0.17));
    product.add(lathe(collarPts, chrome));

    // Actuator (pressable spray head)
    const actuator = new THREE.Group();
    actuator.position.y = SHOULDER + 0.17;
    product.add(actuator);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 32), chrome);
    stem.position.y = 0.04;
    actuator.add(stem);

    const headPts = [new THREE.Vector2(0.0001, 0.06), new THREE.Vector2(0.21, 0.06)];
    arc(headPts, 0.21, 0.08, 0.02, -Math.PI / 2, 0, 6);
    headPts.push(new THREE.Vector2(0.23, 0.3));
    arc(headPts, 0.17, 0.3, 0.06, 0, Math.PI / 2, 10);
    headPts.push(new THREE.Vector2(0.0001, 0.36));
    actuator.add(lathe(headPts, satinBlack));

    // Nozzle: chrome ring with a dark orifice, facing +Z
    const nozzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 16, 48), chrome);
    nozzleRing.position.set(0, 0.22, 0.228);
    actuator.add(nozzleRing);
    const orifice = new THREE.Mesh(new THREE.CircleGeometry(0.04, 32), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    orifice.position.set(0, 0.22, 0.226);
    actuator.add(orifice);

    // Bottom refill valve
    const valveRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 16, 64), chrome);
    valveRing.rotation.x = Math.PI / 2;
    valveRing.position.y = BOTTOM + 0.004;
    product.add(valveRing);
    const valveCore = new THREE.Mesh(new THREE.CircleGeometry(0.1, 48), satinBlack);
    valveCore.rotation.x = Math.PI / 2;
    valveCore.position.y = BOTTOM - 0.002;
    product.add(valveCore);

    /* ----- Cap ----- */
    const CAP_CLOSED_Y = SHOULDER - 0.12;
    const capR = R + 0.006;
    const capH = 1.05;
    const cap = new THREE.Group();
    const capPts = [new THREE.Vector2(capR - 0.012, 0), new THREE.Vector2(capR, 0.01)];
    capPts.push(new THREE.Vector2(capR, capH - 0.22));
    arc(capPts, capR - 0.22, capH - 0.22, 0.22, 0, Math.PI / 2, 24);
    capPts.push(new THREE.Vector2(0.0001, capH));
    cap.add(lathe(capPts, aluminium));
    const capInner = new THREE.Mesh(new THREE.CircleGeometry(capR - 0.012, 64), capLining);
    capInner.rotation.x = Math.PI / 2;
    capInner.position.y = 0.002;
    cap.add(capInner);
    cap.position.y = CAP_CLOSED_Y;
    product.add(cap);

    /* ----- Contact shadow ----- */
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d");
    const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(0.35, "rgba(0,0,0,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 1.9),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = BOTTOM - 0.02;
    product.add(shadow);
    const capShadow = shadow.clone();
    capShadow.material = shadow.material.clone();
    capShadow.material.opacity = 0;
    product.add(capShadow);

    /* ----- Mist particles ----- */
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 64;
    const dctx = dotCanvas.getContext("2d");
    const dgrad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    dgrad.addColorStop(0, "rgba(255,255,255,1)");
    dgrad.addColorStop(1, "rgba(255,255,255,0)");
    dctx.fillStyle = dgrad;
    dctx.fillRect(0, 0, 64, 64);

    const MAX_P = 260;
    const pPos = new Float32Array(MAX_P * 3);
    const pData = Array.from({ length: MAX_P }, () => ({ life: 0, v: new THREE.Vector3() }));
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        size: 0.22,
        map: new THREE.CanvasTexture(dotCanvas),
        color: 0x9aa6b8,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        sizeAttenuation: true
    });
    const particles = new THREE.Points(pGeo, pMat);
    particles.frustumCulled = false;
    scene.add(particles);
    let nextParticle = 0;

    /* ----- Interaction state ----- */
    const state = {
        dragging: false,
        lastX: 0,
        lastY: 0,
        rotY: -0.45,
        tilt: 0.06,
        targetTilt: 0.06,
        velocity: 0,
        idle: 0,
        capOpen: false,
        capT: 0,
        press: 0,
        sprayUntil: 0
    };

    const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        // Keep the bottle framed on narrow screens
        camera.position.z = width / height < 0.8 ? 11.5 : 9.2;
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(mount);
    resize();

    mount.addEventListener("pointerdown", (event) => {
        state.dragging = true;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.velocity = 0;
        mount.setPointerCapture(event.pointerId);
    });
    mount.addEventListener("pointermove", (event) => {
        if (!state.dragging) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.rotY += dx * 0.012;
        state.velocity = dx * 0.012;
        state.targetTilt = Math.max(-0.35, Math.min(0.45, state.targetTilt + dy * 0.004));
    });
    const endDrag = () => {
        state.dragging = false;
        state.idle = 0;
    };
    mount.addEventListener("pointerup", endDrag);
    mount.addEventListener("pointercancel", endDrag);

    /* ----- Controls ----- */
    const capButton = document.getElementById("capToggle");
    const sprayButton = document.getElementById("sprayButton");
    const swatches = document.querySelectorAll("[data-finish]");

    const setCap = (open) => {
        state.capOpen = open;
        if (capButton) {
            capButton.textContent = open ? "Replace cap" : "Remove cap";
            capButton.setAttribute("aria-pressed", String(open));
        }
        if (sprayButton) sprayButton.disabled = !open;
    };
    setCap(false);

    capButton?.addEventListener("click", () => setCap(!state.capOpen));
    sprayButton?.addEventListener("click", () => {
        if (!state.capOpen) return;
        state.press = 1;
        state.sprayUntil = performance.now() + 380;
    });
    swatches.forEach((swatch) => {
        swatch.addEventListener("click", () => {
            const finish = finishes[swatch.dataset.finish];
            if (!finish) return;
            aluminium.color.setHex(finish.color);
            aluminium.roughness = finish.roughness;
            aluminium.metalness = finish.metalness;
            swatches.forEach((s) => s.setAttribute("aria-checked", String(s === swatch)));
            const label = document.getElementById("finishName");
            if (label) label.textContent = swatch.dataset.label;
        });
    });

    /* ----- Render loop ----- */
    const nozzleWorld = new THREE.Vector3();
    const nozzleDir = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    let last = performance.now();

    const emit = (count) => {
        orifice.getWorldPosition(nozzleWorld);
        orifice.getWorldQuaternion(tmpQuat);
        for (let i = 0; i < count; i += 1) {
            const p = pData[nextParticle];
            nozzleDir.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.3 + 0.05, 1).normalize().applyQuaternion(tmpQuat);
            p.v.copy(nozzleDir).multiplyScalar(2.2 + Math.random() * 1.6);
            p.life = 1;
            pPos.set([nozzleWorld.x, nozzleWorld.y, nozzleWorld.z], nextParticle * 3);
            nextParticle = (nextParticle + 1) % MAX_P;
        }
    };

    const render = (now) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        if (!state.dragging) {
            state.rotY += state.velocity;
            state.velocity *= 0.92;
            state.idle += dt;
            if (!prefersReducedMotion && state.idle > 2.5 && Math.abs(state.velocity) < 0.001) {
                state.rotY += dt * 0.35;
            }
            state.targetTilt += (0.06 - state.targetTilt) * 0.02;
        }
        state.tilt += (state.targetTilt - state.tilt) * 0.12;
        spinner.rotation.y = state.rotY;
        spinner.rotation.x = state.tilt;

        // Cap animation: lift, then glide back and down beside the bottle
        state.capT += ((state.capOpen ? 1 : 0) - state.capT) * (prefersReducedMotion ? 1 : 1 - Math.exp(-dt * 4.5));
        const t = state.capT;
        const lift = Math.min(t / 0.5, 1);
        const slide = Math.max((t - 0.4) / 0.6, 0);
        const ease = (x) => x * x * (3 - 2 * x);
        const capRestDrop = CAP_CLOSED_Y + 1.4 - BOTTOM;
        cap.position.set(ease(slide) * 1.4, CAP_CLOSED_Y + ease(lift) * 1.4 - ease(slide) * capRestDrop, -ease(slide) * 0.35);
        capShadow.position.set(cap.position.x, BOTTOM - 0.019, cap.position.z);
        capShadow.material.opacity = ease(slide);

        // Spray press
        state.press *= Math.exp(-dt * 9);
        actuator.position.y = SHOULDER + 0.17 - state.press * 0.06;
        if (now < state.sprayUntil) emit(9);

        // Particles
        const drag = Math.pow(0.12, dt);
        for (let i = 0; i < MAX_P; i += 1) {
            const p = pData[i];
            if (p.life <= 0) {
                pPos[i * 3 + 1] = -999;
                continue;
            }
            p.life -= dt * 0.9;
            p.v.multiplyScalar(drag);
            p.v.y += dt * 0.12;
            pPos[i * 3] += p.v.x * dt;
            pPos[i * 3 + 1] += p.v.y * dt;
            pPos[i * 3 + 2] += p.v.z * dt;
        }
        pGeo.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
    mount.classList.add("viewer-ready");
}
