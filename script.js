/* ==========================================================================
   Store settings — edit these
   whatsapp: your WhatsApp number with country code, digits only
             (e.g. "919876543210"). Leave empty to hide WhatsApp ordering.
   ========================================================================== */
const MIST_CONFIG = {
    whatsapp: "",
    email: "mist2k26@gmail.com",
    price: 99,
    bulkMin: 40
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.documentElement.classList.add("js");

const formatINR = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

/* ---------- Order & bulk forms ---------- */
if (!MIST_CONFIG.whatsapp) {
    document.querySelectorAll("[data-needs-whatsapp]").forEach((el) => el.remove());
}

const normalisePhone = (value) => {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return digits;
};

const validators = {
    phone: (v) => /^[6-9]\d{9}$/.test(normalisePhone(v)),
    "future-date": (v) => {
        if (!v) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(v + "T00:00:00") >= today;
    }
};

document.querySelectorAll("[data-order-form]").forEach((form) => {
    const isBulk = form.dataset.orderForm === "bulk";
    const min = isBulk ? MIST_CONFIG.bulkMin : 1;
    const qty = form.elements.qty;
    const totals = document.querySelectorAll("[data-order-total]");
    const descs = document.querySelectorAll("[data-order-desc]");
    const bulkHint = form.querySelector("[data-bulk-hint]");
    const stage = document.getElementById("buyStage");
    const sent = form.querySelector(".order-sent");
    let lastMessage = "";

    const dateInput = form.elements.date;
    if (dateInput) {
        const d = new Date();
        dateInput.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const quantity = () => Math.max(min, Math.min(Number(qty.max) || 999, parseInt(qty.value, 10) || min));
    const finish = () => form.elements.finish.value;

    const update = () => {
        const q = quantity();
        totals.forEach((el) => { el.textContent = formatINR(q * MIST_CONFIG.price); });
        descs.forEach((el) => { el.textContent = `${q} × ${finish()}`; });
        if (bulkHint) bulkHint.hidden = q < MIST_CONFIG.bulkMin;
        if (stage) stage.dataset.finish = finish().toLowerCase().includes("silver") ? "silver" : "black";
    };

    form.querySelectorAll("[data-qty]").forEach((button) => {
        button.addEventListener("click", () => {
            qty.value = Math.max(min, (parseInt(qty.value, 10) || min) + Number(button.dataset.qty));
            update();
        });
    });
    qty.addEventListener("input", update);
    qty.addEventListener("change", () => { qty.value = quantity(); update(); });
    form.querySelectorAll("input[name=finish]").forEach((radio) => radio.addEventListener("change", update));
    update();

    // Validation: show errors after the first blur or submit, clear as soon as fixed
    const checkField = (input) => {
        const field = input.closest(".field");
        if (!field) return true;
        const value = input.value.trim();
        let ok = !input.required || value.length > 0;
        if (ok && value && input.dataset.validate) ok = validators[input.dataset.validate](value);
        field.classList.toggle("invalid", !ok);
        input.setAttribute("aria-invalid", String(!ok));
        const error = field.querySelector(".field-error");
        if (error) {
            if (!error.id) error.id = `${input.id}-err`;
            input.setAttribute("aria-describedby", error.id);
        }
        return ok;
    };
    form.querySelectorAll(".field input, .field textarea").forEach((input) => {
        input.addEventListener("blur", () => { if (input.value || input.dataset.touched) checkField(input); input.dataset.touched = "1"; });
        input.addEventListener("input", () => { if (input.closest(".field").classList.contains("invalid")) checkField(input); });
    });

    const buildMessage = () => {
        const f = form.elements;
        const q = quantity();
        const lines = isBulk
            ? [
                "Hi MIST team, I'd like a bulk quote.",
                "",
                `Quantity: ${q}`,
                `Finish: ${finish()}`,
                `Estimate at retail: ${formatINR(q * MIST_CONFIG.price)}`,
                `Needed by: ${new Date(f.date.value + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
                "",
                `Name: ${f.name.value.trim()}`,
                f.org.value.trim() ? `Organisation: ${f.org.value.trim()}` : null,
                `Phone: +91 ${normalisePhone(f.phone.value)}`,
                `City: ${f.city.value.trim()}`
            ]
            : [
                "Hi MIST team, I'd like to order:",
                "",
                `${q} × MIST atomizer (${finish()})`,
                `Total: ${formatINR(q * MIST_CONFIG.price)}`,
                "",
                `Name: ${f.name.value.trim()}`,
                `Phone: +91 ${normalisePhone(f.phone.value)}`,
                `City: ${f.city.value.trim()}`
            ];
        if (f.notes.value.trim()) lines.push(`Notes: ${f.notes.value.trim()}`);
        return lines.filter((line) => line !== null).join("\n");
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        qty.value = quantity();
        update();
        const inputs = [...form.querySelectorAll(".field input, .field textarea")];
        const results = inputs.map(checkField);
        const firstBad = inputs[results.indexOf(false)];
        if (firstBad) {
            firstBad.focus();
            firstBad.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
            return;
        }

        const channel = event.submitter?.dataset.channel || (MIST_CONFIG.whatsapp ? "whatsapp" : "email");
        lastMessage = buildMessage();
        const subject = isBulk ? `MIST bulk quote: ${quantity()} units` : `MIST order: ${quantity()} × ${finish()}`;
        const url = channel === "whatsapp"
            ? `https://wa.me/${MIST_CONFIG.whatsapp}?text=${encodeURIComponent(lastMessage)}`
            : `mailto:${MIST_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lastMessage)}`;

        if (sent) {
            sent.hidden = false;
            sent.querySelector("[data-sent-channel]").textContent = channel === "whatsapp" ? "WhatsApp" : "your email app";
        }
        if (channel === "whatsapp") window.open(url, "_blank", "noopener");
        else window.location.href = url;
    });

    form.querySelector("[data-copy-message]")?.addEventListener("click", async () => {
        const status = form.querySelector("[data-copy-status]");
        try {
            await navigator.clipboard.writeText(lastMessage);
            status.textContent = "Copied. Paste it into a message to us.";
        } catch {
            status.textContent = `Email us at ${MIST_CONFIG.email}.`;
        }
    });
});

/* ---------- Phone purchase bar ---------- */
const buybar = document.querySelector(".buybar");
if (buybar) {
    const isShop = buybar.dataset.buybar === "shop";
    let pastTop = false;
    let targetVisible = false;
    const refresh = () => {
        const show = pastTop && !targetVisible;
        buybar.classList.toggle("is-visible", show);
        buybar.setAttribute("aria-hidden", String(!show));
        buybar.querySelectorAll("a").forEach((a) => (a.tabIndex = show ? 0 : -1));
        document.body.classList.toggle("buybar-on", show);
    };
    window.addEventListener("scroll", () => {
        const next = window.scrollY > (isShop ? 380 : 520);
        if (next !== pastTop) { pastTop = next; refresh(); }
    }, { passive: true });
    if ("IntersectionObserver" in window) {
        const seen = new Set();
        const targets = document.querySelectorAll(isShop ? "#orderActions, .footer" : ".hero-buttons, .cta-section, .footer");
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
            targetVisible = seen.size > 0;
            refresh();
        });
        targets.forEach((t) => io.observe(t));
    }
}

/* ---------- Active nav link ---------- */
const currentPage = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".globalnav-links a, .localnav-links a").forEach((link) => {
    const linkPage = new URL(link.href).pathname.split("/").pop() || "index.html";
    if (linkPage === currentPage && !link.hash) link.classList.add("active");
});

/* ---------- Mobile menu ---------- */
const menuToggle = document.querySelector(".globalnav-menu");
menuToggle?.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    menuToggle.setAttribute("aria-expanded", String(open));
});

/* ---------- Scroll reveal ---------- */
const revealTargets = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealTargets.forEach((el) => observer.observe(el));
} else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
}

/* ---------- Highlights gallery ---------- */
document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const track = gallery.querySelector(".gallery-track");
    const dots = gallery.querySelectorAll(".gallery-dots button");
    const prev = gallery.querySelector("[data-gallery-prev]");
    const next = gallery.querySelector("[data-gallery-next]");
    if (!track) return;
    const items = [...track.children];
    const step = () => items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);

    const update = () => {
        const index = Math.round(track.scrollLeft / step());
        dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === index)));
        if (prev) prev.disabled = track.scrollLeft < 4;
        if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    dots.forEach((dot, i) => dot.addEventListener("click", () => track.scrollTo({ left: i * step(), behavior: "smooth" })));
    prev?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    update();
});

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
    const lookTarget = new THREE.Vector3(0, -0.2, 0);

    // Studio lights for long specular streaks down the glossy shell
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-4, 4, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.6);
    rim.position.set(5, 2, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(4, -1, 5);
    scene.add(fill);

    /* ----- Textures ----- */
    const makeCanvas = (size, draw) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        draw(c.getContext("2d"), size);
        return c;
    };

    // Diamond knurl pattern of the inner bottle, seen through the side window
    const knurl = new THREE.CanvasTexture(makeCanvas(128, (ctx, s) => {
        ctx.fillStyle = "#808080";
        ctx.fillRect(0, 0, s, s);
        const n = 8;
        const cell = s / n;
        for (let y = 0; y < n; y += 1) {
            for (let x = 0; x < n; x += 1) {
                const cx = x * cell + cell / 2;
                const cy = y * cell + cell / 2;
                const g = ctx.createLinearGradient(cx - cell / 2, cy - cell / 2, cx + cell / 2, cy + cell / 2);
                g.addColorStop(0, "#ffffff");
                g.addColorStop(1, "#202020");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.moveTo(cx, cy - cell / 2 + 1);
                ctx.lineTo(cx + cell / 2 - 1, cy);
                ctx.lineTo(cx, cy + cell / 2 - 1);
                ctx.lineTo(cx - cell / 2 + 1, cy);
                ctx.closePath();
                ctx.fill();
            }
        }
    }));
    knurl.wrapS = knurl.wrapT = THREE.RepeatWrapping;
    knurl.repeat.set(2.2, 9);

    /* ----- Materials ----- */
    const finishes = {
        black: { color: 0x0c0c0e, roughness: 0.14, metalness: 0.55 },
        silver: { color: 0xf0f1f3, roughness: 0.2, metalness: 0.7 }
    };

    const shell = new THREE.MeshPhysicalMaterial({
        color: finishes.black.color,
        metalness: finishes.black.metalness,
        roughness: finishes.black.roughness,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.3
    });
    const chrome = new THREE.MeshPhysicalMaterial({ color: 0xf4f4f4, metalness: 0.75, roughness: 0.22, emissive: 0x555555, emissiveIntensity: 0.35 });
    const blackPlastic = new THREE.MeshPhysicalMaterial({ color: 0x111113, roughness: 0.35, clearcoat: 0.5 });
    const whitePlastic = new THREE.MeshPhysicalMaterial({ color: 0xe9eef3, roughness: 0.45 });
    const darkHole = new THREE.MeshBasicMaterial({ color: 0x080808 });
    const cavity = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.7, side: THREE.BackSide });
    const lining = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9, side: THREE.DoubleSide });
    const innerBottle = new THREE.MeshPhysicalMaterial({
        color: 0xb8bec6,
        roughness: 0.3,
        metalness: 0.1,
        bumpMap: knurl,
        bumpScale: 2.5,
        transparent: true,
        opacity: 0.55,
        clearcoat: 0.6
    });
    const liquid = new THREE.MeshPhysicalMaterial({
        color: 0xe8b27f,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
        emissive: 0x5a2c10,
        emissiveIntensity: 0.3
    });

    /* ----- Geometry helpers ----- */
    const SEG = 128;
    const arc = (pts, cx, cy, r, a0, a1, steps = 16) => {
        for (let i = 0; i <= steps; i += 1) {
            const a = a0 + (a1 - a0) * (i / steps);
            pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
        }
    };
    const lathe = (pts, material) => new THREE.Mesh(new THREE.LatheGeometry(pts, SEG), material);

    const product = new THREE.Group();
    const spinner = new THREE.Group();
    spinner.add(product);
    scene.add(spinner);

    /* ----- Proportions: ~16 mm wide x 82 mm tall capsule ----- */
    const R = 0.36;
    const BOTTOM = -1.95;
    const JOINT = 0.75; // cap meets body; silver ring sits here
    const TOP = 1.95;
    const baseFillet = 0.2;
    const WIN_LOW = -1.5;
    const WIN_HIGH = 0.42;
    const winH = WIN_HIGH - WIN_LOW;
    const slot = 0.78; // radians of the open side window

    // Lower shell: rounded base up to the window
    const lowerPts = [new THREE.Vector2(R * 0.62, BOTTOM)];
    arc(lowerPts, R - baseFillet, BOTTOM + baseFillet, baseFillet, -Math.PI / 2, 0);
    lowerPts.push(new THREE.Vector2(R, WIN_LOW));
    product.add(lathe(lowerPts, shell));

    // Window band: shell with a vertical slot facing the camera (+Z)
    const band = new THREE.Mesh(
        new THREE.CylinderGeometry(R, R, winH, SEG, 1, true, slot / 2, Math.PI * 2 - slot),
        shell
    );
    band.position.y = (WIN_HIGH + WIN_LOW) / 2;
    product.add(band);

    // Slot side walls
    [slot / 2, -slot / 2].forEach((theta) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(0.04, winH), lining);
        wall.position.set(Math.sin(theta) * (R - 0.02), band.position.y, Math.cos(theta) * (R - 0.02));
        wall.rotation.y = theta + Math.PI / 2;
        product.add(wall);
    });
    // Rounded window ends
    [WIN_LOW, WIN_HIGH].forEach((y) => {
        const lip = new THREE.Mesh(
            new THREE.CylinderGeometry(R, R - 0.04, 0.012, 32, 1, true, -slot / 2, slot),
            lining
        );
        lip.position.y = y;
        product.add(lip);
    });

    // Interior seen through the window: dark cavity, knurled inner bottle, perfume
    const cav = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, winH, 64, 1, true), cavity);
    cav.position.y = band.position.y;
    product.add(cav);

    const fillLevel = WIN_LOW + winH * 0.58;
    const liquidH = fillLevel - WIN_LOW + 0.05;
    const liquidMesh = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.07, R - 0.07, liquidH, 64), liquid);
    liquidMesh.position.y = WIN_LOW - 0.05 + liquidH / 2;
    product.add(liquidMesh);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.045, R - 0.045, winH + 0.04, 64, 1, true), innerBottle);
    inner.position.y = band.position.y;
    product.add(inner);

    // Upper shell to the joint, then the neck that the cap slides over
    const upperPts = [new THREE.Vector2(R, WIN_HIGH), new THREE.Vector2(R, JOINT)];
    upperPts.push(new THREE.Vector2(R - 0.035, JOINT));
    upperPts.push(new THREE.Vector2(R - 0.035, JOINT + 0.02));
    upperPts.push(new THREE.Vector2(0.0001, JOINT + 0.02));
    product.add(lathe(upperPts, shell));

    // Silver trim ring at the joint
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.005, R + 0.005, 0.045, SEG, 1, true), chrome);
    ring.position.y = JOINT - 0.02;
    product.add(ring);

    // Black neck + spray actuator (hidden under the cap until it is removed)
    const neckPts = [new THREE.Vector2(0.0001, JOINT + 0.02), new THREE.Vector2(0.27, JOINT + 0.02)];
    neckPts.push(new THREE.Vector2(0.27, JOINT + 0.22));
    arc(neckPts, 0.25, JOINT + 0.22, 0.02, 0, Math.PI / 2, 4);
    neckPts.push(new THREE.Vector2(0.0001, JOINT + 0.24));
    product.add(lathe(neckPts, blackPlastic));

    const actuator = new THREE.Group();
    actuator.position.y = JOINT + 0.24;
    product.add(actuator);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 24), whitePlastic);
    stem.position.y = 0.03;
    actuator.add(stem);
    const headPts = [new THREE.Vector2(0.0001, 0.05), new THREE.Vector2(0.2, 0.05)];
    headPts.push(new THREE.Vector2(0.2, 0.3));
    arc(headPts, 0.15, 0.3, 0.05, 0, Math.PI / 2, 8);
    headPts.push(new THREE.Vector2(0.0001, 0.35));
    actuator.add(lathe(headPts, blackPlastic));
    const nozzle = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), whitePlastic);
    nozzle.position.set(0, 0.2, 0.2015);
    actuator.add(nozzle);
    const orifice = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), darkHole);
    orifice.position.set(0, 0.2, 0.203);
    actuator.add(orifice);

    // Bottom refill valve: black rim, white valve, pin-hole (as in the product photo)
    const valve = new THREE.Mesh(new THREE.CircleGeometry(R * 0.62, 64), blackPlastic);
    valve.rotation.x = Math.PI / 2;
    valve.position.y = BOTTOM;
    product.add(valve);
    const valveWhite = new THREE.Mesh(new THREE.CircleGeometry(R * 0.42, 64), whitePlastic);
    valveWhite.rotation.x = Math.PI / 2;
    valveWhite.position.y = BOTTOM - 0.001;
    product.add(valveWhite);
    const valveHole = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), darkHole);
    valveHole.rotation.x = Math.PI / 2;
    valveHole.position.y = BOTTOM - 0.002;
    product.add(valveHole);

    /* ----- Cap: same shell, rounded top ----- */
    const capH = TOP - JOINT;
    const capFillet = 0.26;
    const cap = new THREE.Group();
    const capPts = [new THREE.Vector2(R - 0.02, 0), new THREE.Vector2(R, 0.005)];
    capPts.push(new THREE.Vector2(R, capH - capFillet));
    arc(capPts, R - capFillet, capH - capFillet, capFillet, 0, Math.PI / 2, 24);
    capPts.push(new THREE.Vector2(0.0001, capH));
    cap.add(lathe(capPts, shell));
    const capInner = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 64), lining);
    capInner.rotation.x = Math.PI / 2;
    capInner.position.y = 0.003;
    cap.add(capInner);
    cap.position.y = JOINT;
    product.add(cap);

    /* ----- Contact shadows ----- */
    const shadowTex = new THREE.CanvasTexture(makeCanvas(256, (ctx) => {
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, "rgba(0,0,0,0.6)");
        g.addColorStop(0.3, "rgba(0,0,0,0.25)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
    }));
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = BOTTOM - 0.02;
    product.add(shadow);
    const capShadow = shadow.clone();
    capShadow.material = shadow.material.clone();
    capShadow.material.opacity = 0;
    product.add(capShadow);

    /* ----- Mist particles ----- */
    const dotTex = new THREE.CanvasTexture(makeCanvas(64, (ctx) => {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
    }));
    const MAX_P = 260;
    const pPos = new Float32Array(MAX_P * 3).fill(-999);
    const pData = Array.from({ length: MAX_P }, () => ({ life: 0, v: new THREE.Vector3() }));
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.2,
        map: dotTex,
        color: 0x9aa6b8,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
    }));
    particles.frustumCulled = false;
    scene.add(particles);
    let nextParticle = 0;

    /* ----- Interaction ----- */
    const state = {
        dragging: false,
        lastX: 0,
        lastY: 0,
        rotY: -0.5,
        tilt: 0.05,
        targetTilt: 0.05,
        velocity: 0,
        idle: 0,
        capOpen: false,
        capT: 0,
        press: 0,
        sprayUntil: 0,
        visible: true
    };

    const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.set(0, 0.8, width / height < 0.8 ? 12 : 9.6);
        camera.lookAt(lookTarget);
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(mount);
    resize();

    // Pause rendering when the viewer is off-screen
    new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; }).observe(mount);

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
        state.targetTilt = Math.max(-0.35, Math.min(0.5, state.targetTilt + dy * 0.004));
    });
    const endDrag = () => {
        state.dragging = false;
        state.idle = 0;
    };
    mount.addEventListener("pointerup", endDrag);
    mount.addEventListener("pointercancel", endDrag);

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
            shell.color.setHex(finish.color);
            shell.roughness = finish.roughness;
            shell.metalness = finish.metalness;
            swatches.forEach((s) => s.setAttribute("aria-checked", String(s === swatch)));
            const label = document.getElementById("finishName");
            if (label) label.textContent = swatch.dataset.label;
        });
    });

    /* ----- Render loop ----- */
    const nozzleWorld = new THREE.Vector3();
    const nozzleDir = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const ease = (x) => x * x * (3 - 2 * x);
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
        requestAnimationFrame(render);
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        if (!state.visible) return;

        if (!state.dragging) {
            state.rotY += state.velocity;
            state.velocity *= 0.92;
            state.idle += dt;
            if (!prefersReducedMotion && state.idle > 2.5 && Math.abs(state.velocity) < 0.001) {
                state.rotY += dt * 0.35;
            }
            state.targetTilt += (0.05 - state.targetTilt) * 0.02;
        }
        state.tilt += (state.targetTilt - state.tilt) * 0.12;
        spinner.rotation.y = state.rotY;
        spinner.rotation.x = state.tilt;

        // Cap: lift straight up, then set it down upright beside the bottle
        state.capT += ((state.capOpen ? 1 : 0) - state.capT) * (prefersReducedMotion ? 1 : 1 - Math.exp(-dt * 4.5));
        const lift = ease(Math.min(state.capT / 0.5, 1));
        const slide = ease(Math.max((state.capT - 0.4) / 0.6, 0));
        const liftHeight = 1.0;
        cap.position.set(slide * 1.05, JOINT + lift * liftHeight - slide * (JOINT + liftHeight - BOTTOM), -slide * 0.3);
        capShadow.position.set(cap.position.x, BOTTOM - 0.019, cap.position.z);
        capShadow.material.opacity = slide;

        state.press *= Math.exp(-dt * 9);
        actuator.position.y = JOINT + 0.24 - state.press * 0.05;
        if (now < state.sprayUntil) emit(9);

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
    };
    requestAnimationFrame(render);
    mount.classList.add("viewer-ready");
}
