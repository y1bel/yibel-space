import * as THREE from "three";

type ModuleId = "personnel" | "logs" | "creations" | "collections" | "sites";
type WorldUpdate = (dt: number, elapsed: number) => void;

type WorldObject = THREE.Group & {
  userData: {
    module?: ModuleId;
    hit?: THREE.Object3D;
    update?: WorldUpdate;
    focus?: (active: boolean) => void;
    activate?: () => void;
    anchor?: THREE.Vector3;
  };
};

declare global {
  interface Window {
    __ytHomeWorldCleanup?: () => void;
    __ytHomeWorldInit?: () => void;
  }
}

function initHomeWorld() {
  const root = document.querySelector<HTMLElement>("[data-yt-world3d]");
  const canvas = document.querySelector<HTMLCanvasElement>("[data-yt-world-canvas]");
  if (root?.dataset.ytWorldInitialized === "true") return;
  window.__ytHomeWorldCleanup?.();

  if (root && canvas) {
  root.dataset.ytWorldInitialized = "true";
  const worldRoot = root;
  const worldCanvas = canvas;
  const listeners = new AbortController();
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionQuery.matches;
  let frameId = 0;
  let navigationTimer = 0;
  let disposed = false;
  const routes = document.querySelector<HTMLElement>("[data-yt-world-routes]");
  const context = document.querySelector<HTMLElement>("[data-yt-world-context]");
  const reticle = document.querySelector<HTMLElement>("[data-yt-world-reticle]");
  const shell = document.querySelector<HTMLElement>("[data-yt-shell]");

  const routeMap: Record<ModuleId, string> = {
    personnel: routes?.dataset.personnel || "/personnel",
    logs: routes?.dataset.logs || "/archive",
    creations: routes?.dataset.creations || "/creations",
    collections: routes?.dataset.collections || "/collections",
    sites: routes?.dataset.sites || "/sites",
  };

  const labels: Record<ModuleId, HTMLElement | null> = {
    personnel: document.querySelector('[data-yt-world-label="personnel"]'),
    logs: document.querySelector('[data-yt-world-label="logs"]'),
    creations: document.querySelector('[data-yt-world-label="creations"]'),
    collections: document.querySelector('[data-yt-world-label="collections"]'),
    sites: document.querySelector('[data-yt-world-label="sites"]'),
  };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe6e1d8);
  scene.fog = new THREE.Fog(0xe6e1d8, 11, 25);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0.05, 2.96, 10.8);
  const baseCamera = camera.position.clone();
  const baseTarget = new THREE.Vector3(0, 1.3, -0.38);

  const renderer = new THREE.WebGLRenderer({
    canvas: worldCanvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const clock = new THREE.Clock();
  let elapsed = 0;
  let current: ModuleId = "logs";
  let focusSource: "pointer" | "keyboard" = "keyboard";
  let hovered: THREE.Object3D | null = null;
  let activating = false;
  let cameraGoal: THREE.Vector3 | null = null;
  let lookGoal: THREE.Vector3 | null = null;
  const pointer = new THREE.Vector2();
  const pointerEase = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  const interactive: THREE.Object3D[] = [];
  const objects = {} as Record<ModuleId, WorldObject>;

  function noiseTexture(size = 192) {
    const surface = document.createElement("canvas");
    surface.width = surface.height = size;
    const ctx = surface.getContext("2d")!;
    const image = ctx.createImageData(size, size);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = 207 + Math.floor((Math.random() - 0.5) * 24);
      image.data[i] = value;
      image.data[i + 1] = value - 3;
      image.data[i + 2] = value - 8;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? "#77736c" : "#f3efe7";
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 1.2 + 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(surface);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.4, 3.4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const noise = noiseTexture();
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xd8d2c7,
    roughness: 0.84,
    metalness: 0.02,
    map: noise,
    bumpMap: noise,
    bumpScale: 0.017,
  });
  const concreteLight = concrete.clone();
  concreteLight.color.setHex(0xe9e5dc);
  concreteLight.roughness = 0.78;
  const concreteDark = concrete.clone();
  concreteDark.color.setHex(0xb7b0a4);
  concreteDark.roughness = 0.88;
  const metal = new THREE.MeshStandardMaterial({ color: 0x777167, roughness: 0.34, metalness: 0.72 });
  const metalLight = new THREE.MeshStandardMaterial({ color: 0xb7afa3, roughness: 0.4, metalness: 0.56 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x4b4b47, roughness: 0.18, transmission: 0.08, transparent: true, opacity: 0.74 });
  const red = new THREE.MeshStandardMaterial({ color: 0x9f2027, emissive: 0x4e090f, emissiveIntensity: 0.45, roughness: 0.45 });

  function box(w: number, h: number, d: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function hitbox(module: ModuleId, w: number, h: number, d: number) {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.userData.module = module;
    interactive.push(mesh);
    return mesh;
  }

  function contactShadow(group: THREE.Group, width: number, depth: number, opacity = 0.18) {
    const surface = document.createElement("canvas");
    surface.width = surface.height = 192;
    const ctx = surface.getContext("2d")!;
    const gradient = ctx.createRadialGradient(96, 96, 7, 96, 96, 90);
    gradient.addColorStop(0, `rgba(28,26,23,${opacity})`);
    gradient.addColorStop(0.48, `rgba(28,26,23,${opacity * 0.42})`);
    gradient.addColorStop(1, "rgba(28,26,23,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 192, 192);
    const material = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(surface), transparent: true, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.014;
    group.add(plane);
  }

  function buildLogs() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(0, 0, -0.52);
    const base = box(3.2, 0.18, 1.78, concreteDark);
    base.position.y = 0.09;
    const plinth = box(2.72, 0.24, 1.32, concrete);
    plinth.position.y = 0.29;
    group.add(base, plinth);

    const spine = box(0.42, 2.66, 0.78, concreteDark);
    spine.position.set(0, 1.68, -0.04);
    group.add(spine);
    const spineFace = box(0.22, 2.32, 0.12, metal);
    spineFace.position.set(0, 1.68, 0.39);
    group.add(spineFace);

    const bankLeft = new THREE.Group();
    bankLeft.position.x = -0.86;
    const bankRight = new THREE.Group();
    bankRight.position.x = 0.86;
    const ledgerTrays: THREE.Group[] = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.65 + i * 0.31;
      for (const [bank, side] of [[bankLeft, -1], [bankRight, 1]] as const) {
        const tray = new THREE.Group();
        tray.position.y = y;
        const slab = box(1.02, 0.18, 0.68, i === 3 ? concreteLight : concrete);
        const edge = box(0.74, 0.035, 0.035, metal);
        edge.position.set(side * 0.05, 0, 0.365);
        const index = box(0.1, 0.075, 0.04, i === 3 ? red : metalLight);
        index.position.set(side * 0.37, 0.02, 0.39);
        tray.add(slab, edge, index);
        bank.add(tray);
        if (i === 3) ledgerTrays.push(tray);
      }
    }
    const bankCapLeft = box(1.16, 0.13, 0.82, concreteDark);
    bankCapLeft.position.set(0, 2.87, 0);
    const bankCapRight = bankCapLeft.clone();
    bankLeft.add(bankCapLeft);
    bankRight.add(bankCapRight);
    group.add(bankLeft, bankRight);

    const extractionRail = box(1.72, 0.08, 0.14, metalLight);
    extractionRail.position.set(0, 1.58, 0.48);
    group.add(extractionRail);
    const status = box(0.065, 0.12, 0.045, red);
    status.position.set(0, 2.89, 0.42);
    group.add(status);

    const light = new THREE.PointLight(0xffdca5, 0.65, 4, 2);
    light.position.set(0, 1.6, 0.72);
    group.add(light);

    const hit = hitbox("logs", 3.0, 3.1, 1.5);
    hit.position.set(0, 1.58, 0.04);
    group.add(hit);
    contactShadow(group, 3.5, 2.2, 0.22);

    let focus = 0;
    let focusResponse = 0;
    let open = 0;
    let targetOpen = 0;
    group.userData.anchor = new THREE.Vector3(0, 1.58, 0.7);
    group.userData.focus = (active: boolean) => { focus = active ? 1 : 0; };
    group.userData.activate = () => { targetOpen = 1; };
    group.userData.update = (dt: number, time: number) => {
      const t = 1 - Math.pow(0.00004, dt);
      focusResponse += (focus - focusResponse) * t;
      open += (targetOpen - open) * t;
      const extraction = focusResponse * 0.2 + open * 0.72;
      ledgerTrays[0].position.z = extraction;
      ledgerTrays[1].position.z = extraction;
      ledgerTrays[0].rotation.x = open * -0.055;
      ledgerTrays[1].rotation.x = open * -0.055;
      extractionRail.position.z = 0.48 + extraction * 0.62;
      light.intensity = 0.24 + focusResponse * 0.28 + open * 0.56 + (reducedMotion ? 0 : Math.sin(time * 1.7) * 0.018);
    };
    return group;
  }

  function buildPersonnel() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-3.55, 0.85, -2.62);
    group.rotation.y = 0.1;

    const wallPlate = box(1.72, 2.15, 0.12, concreteDark);
    wallPlate.position.set(0, 1.1, -0.18);
    group.add(wallPlate);
    const railTop = box(1.9, 0.09, 0.26, metal);
    railTop.position.set(0, 2.14, -0.06);
    const railBottom = railTop.clone();
    railBottom.position.y = 0.07;
    group.add(railTop, railBottom);

    const cradleLeft = box(0.07, 1.86, 0.24, metal);
    cradleLeft.position.set(-0.75, 1.1, -0.04);
    const cradleRight = cradleLeft.clone();
    cradleRight.position.x = 0.75;
    group.add(cradleLeft, cradleRight);

    for (let i = 0; i < 4; i++) {
      const archivedSheet = box(1.16 - i * 0.035, 1.56, 0.025, i % 2 ? concrete : concreteLight);
      archivedSheet.position.set((i - 1.5) * 0.025, 1.12 + i * 0.015, 0.02 + i * 0.045);
      archivedSheet.rotation.z = (i - 1.5) * 0.009;
      group.add(archivedSheet);
    }

    const fileCarrier = new THREE.Group();
    fileCarrier.position.set(-0.58, 1.13, 0.2);
    group.add(fileCarrier);
    const dossier = box(1.14, 1.62, 0.055, concreteLight);
    dossier.position.x = 0.58;
    fileCarrier.add(dossier);
    const tab = box(0.25, 0.09, 0.07, metalLight);
    tab.position.set(0.94, 0.84, 0.025);
    fileCarrier.add(tab);
    const identityWindow = box(0.64, 0.32, 0.026, glass);
    identityWindow.position.set(0.58, 0.18, 0.045);
    fileCarrier.add(identityWindow);
    for (let i = 0; i < 5; i++) {
      const rule = box(0.72 - i * 0.055, 0.012, 0.018, metal);
      rule.position.set(0.55, -0.15 - i * 0.16, 0.046);
      fileCarrier.add(rule);
    }
    const marker = box(0.055, 0.055, 0.035, red);
    marker.position.set(0.17, 0.58, 0.05);
    fileCarrier.add(marker);

    const coverHinge = new THREE.Group();
    coverHinge.position.set(0, -0.01, 0.065);
    fileCarrier.add(coverHinge);
    const cover = box(1.08, 1.54, 0.035, concrete);
    cover.position.x = 0.54;
    coverHinge.add(cover);
    const portraitWindow = box(0.5, 0.54, 0.022, glass);
    portraitWindow.position.set(0.54, 0.18, 0.035);
    coverHinge.add(portraitWindow);
    const portraitHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), metalLight);
    portraitHead.scale.z = 0.28;
    portraitHead.position.set(0.54, 0.28, 0.065);
    portraitHead.castShadow = true;
    const portraitBody = box(0.28, 0.16, 0.035, metalLight);
    portraitBody.position.set(0.54, 0.04, 0.06);
    coverHinge.add(portraitHead, portraitBody);
    for (let i = 0; i < 3; i++) {
      const coverRule = box(0.48 - i * 0.07, 0.012, 0.018, metal);
      coverRule.position.set(0.53, -0.3 - i * 0.15, 0.045);
      coverHinge.add(coverRule);
    }

    const hingeTop = box(0.1, 0.24, 0.12, metalLight);
    hingeTop.position.set(-0.63, 1.72, 0.18);
    const hingeBottom = hingeTop.clone();
    hingeBottom.position.y = 0.5;
    group.add(hingeTop, hingeBottom);

    const hit = hitbox("personnel", 1.95, 2.35, 0.9);
    hit.position.set(0, 1.1, 0.08);
    group.add(hit);

    let active = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0, 1.2, 0.48);
    group.userData.focus = (state: boolean) => { target = state ? 0.38 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number) => {
      active += (target - active) * (1 - Math.pow(0.00004, dt));
      fileCarrier.position.z = 0.2 + active * 0.35;
      fileCarrier.rotation.y = -active * 0.16;
      coverHinge.rotation.y = active > 0.48 ? -(active - 0.48) * 1.25 : 0;
    };
    return group;
  }

  function buildCollections() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-2.45, 0.12, -2.9);
    group.scale.setScalar(0.72);
    group.rotation.y = -0.035;

    const shell = box(1.68, 1.3, 0.42, concreteDark);
    shell.position.set(0, 0.68, -0.12);
    group.add(shell);
    const top = box(1.82, 0.09, 0.53, metal);
    top.position.set(0, 1.36, -0.06);
    group.add(top);

    const drawers: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const drawer = new THREE.Group();
      drawer.position.set(0, 1.12 - i * 0.29, 0.1);
      const tray = box(1.35, 0.21, 0.5, metalLight);
      tray.position.z = 0.02;
      const face = box(1.45, 0.24, 0.065, concreteLight);
      face.position.z = 0.3;
      const handle = box(0.28, 0.025, 0.028, metal);
      handle.position.set(0.38, 0, 0.35);
      const labelSlot = box(0.38, 0.09, 0.02, metal);
      labelSlot.position.set(-0.38, 0, 0.35);
      drawer.add(tray, face, handle, labelSlot);
      if (i === 2) {
        const storedFile = box(0.86, 0.035, 0.31, concreteLight);
        storedFile.position.set(0.03, 0.14, 0.04);
        storedFile.rotation.y = -0.05;
        const storedMarker = box(0.08, 0.04, 0.06, red.clone());
        storedMarker.position.set(-0.3, 0.18, 0.13);
        drawer.add(storedFile, storedMarker);
      }
      group.add(drawer);
      drawers.push(drawer);
    }

    const point = box(0.05, 0.05, 0.035, red);
    point.position.set(0.63, 0.16, 0.24);
    group.add(point);

    const hit = hitbox("collections", 1.85, 1.55, 0.9);
    hit.position.set(0, 0.75, 0.08);
    group.add(hit);

    let open = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0, 0.56, 0.58);
    group.userData.focus = (state: boolean) => { target = state ? 0.42 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number) => {
      open += (target - open) * (1 - Math.pow(0.00004, dt));
      drawers[2].position.z = 0.1 + open * 0.68;
    };
    return group;
  }

  function buildCreations() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(3.35, 0.92, -2.48);
    group.rotation.y = -0.09;

    const wallBracket = box(1.85, 1.98, 0.12, concreteDark);
    wallBracket.position.set(0, 1.04, -0.24);
    group.add(wallBracket);
    const frameLeft = box(0.09, 1.72, 0.22, metalLight);
    frameLeft.position.set(-0.82, 1.03, -0.08);
    const frameRight = frameLeft.clone();
    frameRight.position.x = 0.82;
    const frameTop = box(1.72, 0.09, 0.22, metalLight);
    frameTop.position.set(0, 1.88, -0.08);
    group.add(frameLeft, frameRight, frameTop);

    const artifactMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8c0b4,
      roughness: 0.68,
      metalness: 0.14,
      flatShading: true,
    });
    const cradle = new THREE.Group();
    cradle.position.set(0, 0.88, 0.04);
    group.add(cradle);
    const tray = box(1.18, 0.09, 0.62, metalLight);
    tray.position.y = -0.42;
    cradle.add(tray);
    const artifact = new THREE.Group();
    artifact.position.set(0, -0.02, 0);
    const artifactBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 1), artifactMaterial);
    artifactBody.scale.set(0.82, 1.16, 0.82);
    artifactBody.castShadow = true;
    artifact.add(artifactBody);
    cradle.add(artifact);

    const leftArm = new THREE.Group();
    leftArm.position.set(-0.58, 0, 0.04);
    const leftBeam = box(0.52, 0.08, 0.14, metal);
    leftBeam.position.x = 0.25;
    const leftClamp = box(0.08, 0.5, 0.18, concreteLight);
    leftClamp.position.set(0.52, 0, 0);
    leftArm.add(leftBeam, leftClamp);
    const rightArm = new THREE.Group();
    rightArm.position.set(0.58, 0, 0.04);
    const rightBeam = box(0.52, 0.08, 0.14, metal);
    rightBeam.position.x = -0.25;
    const rightClamp = box(0.08, 0.5, 0.18, concreteLight);
    rightClamp.position.set(-0.52, 0, 0);
    rightArm.add(rightBeam, rightClamp);
    cradle.add(leftArm, rightArm);

    const gaugeCarriage = new THREE.Group();
    gaugeCarriage.position.set(0, 1.8, 0.03);
    const gaugeStem = box(0.055, 0.78, 0.08, metal);
    gaugeStem.position.y = -0.38;
    const gaugeHead = box(0.34, 0.12, 0.17, glass);
    gaugeHead.position.y = -0.78;
    gaugeCarriage.add(gaugeStem, gaugeHead);
    group.add(gaugeCarriage);

    for (const x of [-0.52, 0.52]) {
      const suspension = box(0.045, 0.72, 0.045, metal);
      suspension.position.set(x, 1.5, -0.02);
      group.add(suspension);
    }

    const point = box(0.055, 0.055, 0.035, red);
    point.position.set(0.68, 1.72, 0.04);
    group.add(point);

    const hit = hitbox("creations", 1.95, 2.1, 1.05);
    hit.position.set(0, 1.02, 0.06);
    group.add(hit);

    let activation = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0.12, 0.96, 0.48);
    group.userData.focus = (state: boolean) => { target = state ? 0.38 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number) => {
      activation += (target - activation) * (1 - Math.pow(0.00004, dt));
      const calibration = Math.min(activation / 0.38, 1);
      leftArm.position.x = -0.58 + calibration * 0.13;
      rightArm.position.x = 0.58 - calibration * 0.13;
      gaugeCarriage.position.y = 1.8 - calibration * 0.22;
      cradle.position.z = 0.04 + Math.max(0, activation - 0.38) * 0.82;
      cradle.rotation.x = Math.max(0, activation - 0.38) * -0.09;
    };
    return group;
  }

  function buildSites() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(4.35, 2.45, -2.96);
    group.scale.setScalar(0.6);
    group.rotation.y = -0.025;

    const backplate = box(1.7, 1.58, 0.09, concreteDark);
    backplate.position.set(0, 0.78, -0.12);
    const inset = box(1.46, 1.34, 0.08, concrete);
    inset.position.set(0, 0.78, -0.04);
    group.add(backplate, inset);

    const siteSignal = red.clone();
    const point = box(0.055, 0.055, 0.035, siteSignal);
    point.position.set(0.62, 1.28, 0.075);
    group.add(point);

    const socketGeometry = new THREE.CylinderGeometry(0.105, 0.105, 0.1, 16);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const socket = new THREE.Mesh(socketGeometry, metal);
        socket.rotation.x = Math.PI / 2;
        socket.position.set(-0.48 + col * 0.48, 0.98 - row * 0.48, 0.08);
        socket.castShadow = true;
        group.add(socket);
        const socketCore = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.115, 12), glass);
        socketCore.rotation.x = Math.PI / 2;
        socketCore.position.copy(socket.position);
        socketCore.position.z += 0.015;
        group.add(socketCore);
      }
    }

    const shutter = box(0.28, 0.3, 0.055, concreteLight);
    shutter.position.set(0, 0.5, 0.15);
    group.add(shutter);
    const connector = new THREE.Group();
    connector.position.set(0, 0.5, 0.18);
    const connectorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.28, 12), metalLight);
    connectorBody.rotation.x = Math.PI / 2;
    const connectorPin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), red);
    connectorPin.rotation.x = Math.PI / 2;
    connectorPin.position.z = 0.19;
    connector.add(connectorBody, connectorPin);
    group.add(connector);

    const signalArm = box(0.06, 0.06, 0.52, metal);
    signalArm.position.set(0.62, 0.25, 0.18);
    signalArm.scale.z = 0.08;
    group.add(signalArm);

    const hit = hitbox("sites", 1.85, 1.72, 0.65);
    hit.position.set(0, 0.78, 0.04);
    group.add(hit);

    let pulse = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0, 0.68, 0.28);
    group.userData.focus = (state: boolean) => { target = state ? 0.44 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number, time: number) => {
      pulse += (target - pulse) * (1 - Math.pow(0.00004, dt));
      siteSignal.emissiveIntensity = 0.35 + pulse * 0.82 + (reducedMotion ? 0 : Math.sin(time * 2.2) * 0.035);
      shutter.position.x = pulse * 0.3;
      connector.position.z = 0.18 + pulse * 0.38;
      signalArm.scale.z = 0.08 + Math.max(0, pulse - 0.44) * 1.35;
      signalArm.position.z = 0.18 + Math.max(0, pulse - 0.44) * 0.28;
    };
    return group;
  }

  function buildEnvironment() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f887d, 1.05));
    const key = new THREE.DirectionalLight(0xfff8e8, 2.55);
    key.position.set(-3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -2;
    key.shadow.bias = -0.00025;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd5dce0, 0.32);
    rim.position.set(5, 4, -3);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), concrete.clone());
    (floor.material as THREE.MeshStandardMaterial).color.setHex(0xd9d3c8);
    (floor.material as THREE.MeshStandardMaterial).map!.repeat.set(7, 5);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), concreteLight.clone());
    (wall.material as THREE.MeshStandardMaterial).color.setHex(0xe7e2d9);
    wall.position.set(0, 4.5, -3.08);
    wall.receiveShadow = true;
    scene.add(wall);

    const wallBay = box(3.7, 5.55, 0.08, concreteLight.clone());
    (wallBay.material as THREE.MeshStandardMaterial).color.setHex(0xece8df);
    wallBay.position.set(0, 2.78, -2.97);
    wallBay.castShadow = false;
    scene.add(wallBay);
  }

  buildEnvironment();
  objects.logs = buildLogs();
  objects.personnel = buildPersonnel();
  objects.collections = buildCollections();
  objects.creations = buildCreations();
  objects.sites = buildSites();
  Object.values(objects).forEach((object) => scene.add(object));

  function copyFor(module: ModuleId) {
    return labels[module]?.querySelector("strong")?.textContent?.trim() || module.toUpperCase();
  }

  function setContext(module: ModuleId) {
    const title = context?.querySelector<HTMLElement>("strong");
    if (!title) return;
    title.dataset.ytCopy = module;
    title.textContent = copyFor(module);
  }

  function setFocus(module: ModuleId, source = focusSource) {
    current = module;
    focusSource = source;
    Object.entries(objects).forEach(([key, object]) => object.userData.focus?.(key === module));
    setContext(module);
    labels[module]?.classList.add("is-active");
    Object.entries(labels).forEach(([key, label]) => label?.classList.toggle("is-active", key === module));
  }

  function worldAnchor(module: ModuleId) {
    const object = objects[module];
    object.updateWorldMatrix(true, false);
    const local = object.userData.anchor || new THREE.Vector3();
    return local.clone().applyMatrix4(object.matrixWorld);
  }

  function project(module: ModuleId) {
    const point = worldAnchor(module).project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * worldCanvas.clientWidth,
      y: (-point.y * 0.5 + 0.5) * worldCanvas.clientHeight,
    };
  }

  const overlayPositions = new Map<HTMLElement, { x: number; y: number }>();
  function placeOverlay(element: HTMLElement, x: number, y: number) {
    const previous = overlayPositions.get(element);
    if (previous && Math.abs(previous.x - x) < 0.35 && Math.abs(previous.y - y) < 0.35) return;
    element.style.left = `${x.toFixed(1)}px`;
    element.style.top = `${y.toFixed(1)}px`;
    overlayPositions.set(element, { x, y });
  }

  function updateOverlay() {
    const width = worldCanvas.clientWidth;
    const height = worldCanvas.clientHeight;
    if (reticle) {
      const p = project(current);
      placeOverlay(
        reticle,
        THREE.MathUtils.clamp(p.x, 54, Math.max(54, width - 54)),
        THREE.MathUtils.clamp(p.y, 54, Math.max(54, height - 54)),
      );
      reticle.classList.toggle("is-visible", focusSource === "keyboard");
    }

    const offsets: Record<ModuleId, [number, number]> = {
      personnel: [-116, -86],
      collections: [-104, 34],
      logs: [-76, -116],
      creations: [58, 52],
      sites: [-134, -8],
    };
    (Object.keys(labels) as ModuleId[]).forEach((module) => {
      const label = labels[module];
      if (!label) return;
      const p = project(module);
      const [x, y] = offsets[module];
      placeOverlay(
        label,
        THREE.MathUtils.clamp(p.x + x, 22, Math.max(22, width - 136)),
        THREE.MathUtils.clamp(p.y + y, 28, Math.max(28, height - 68)),
      );
    });
  }

  function resize() {
    const width = worldCanvas.clientWidth || window.innerWidth;
    const height = worldCanvas.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    const narrowFraming = Math.max(0, 1.5 - camera.aspect);
    baseCamera.set(0.05, 2.96 + narrowFraming * 0.25, 10.8 + narrowFraming * 9.5);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
    renderer.setSize(width, height, false);
    overlayPositions.clear();
  }

  function pointerToNdc(event: PointerEvent) {
    const rect = worldCanvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function navigate(module: ModuleId) {
    if (activating) return;
    activating = true;
    setFocus(module);
    objects[module].userData.activate?.();
    localStorage.setItem("yibel-last-module", module);

    const anchor = worldAnchor(module);
    const direction = new THREE.Vector3().subVectors(camera.position, anchor).normalize();
    cameraGoal = anchor.clone().add(direction.multiplyScalar(5.45));
    lookGoal = anchor;
    worldRoot.classList.add("is-activating");

    navigationTimer = window.setTimeout(() => window.location.assign(routeMap[module]), reducedMotion ? 140 : 620);
  }

  const onPointerMove = (event: PointerEvent) => {
    if (activating || shell?.classList.contains("is-menu-open")) return;
    pointerToNdc(event);
    pointerEase.set(pointer.x, pointer.y);
    raycaster.setFromCamera(pointer, camera);
    const next = raycaster.intersectObjects(interactive, false)[0]?.object || null;
    if (next !== hovered) {
      hovered = next;
      const module = next?.userData.module as ModuleId | undefined;
      if (module) {
        setFocus(module, "pointer");
        worldCanvas.style.cursor = "pointer";
      } else {
        worldCanvas.style.cursor = "default";
      }
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (activating || shell?.classList.contains("is-menu-open")) return;
    pointerToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    const target = raycaster.intersectObjects(interactive, false)[0]?.object;
    const module = target?.userData.module as ModuleId | undefined;
    if (module) navigate(module);
  };

  const onPointerLeave = () => {
    hovered = null;
    pointerEase.set(0, 0);
    worldCanvas.style.cursor = "default";
  };

  const focusOrder: ModuleId[] = ["personnel", "collections", "logs", "creations", "sites"];
  const onKeyDown = (event: KeyboardEvent) => {
    if (!worldRoot.isConnected || shell?.classList.contains("is-menu-open")) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const index = Math.max(0, focusOrder.indexOf(current));
      setFocus(focusOrder[(index + 1) % focusOrder.length], "keyboard");
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = Math.max(0, focusOrder.indexOf(current));
      setFocus(focusOrder[(index - 1 + focusOrder.length) % focusOrder.length], "keyboard");
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigate(current);
    }
  };

  worldCanvas.addEventListener("pointermove", onPointerMove, { signal: listeners.signal });
  worldCanvas.addEventListener("pointerdown", onPointerDown, { signal: listeners.signal });
  worldCanvas.addEventListener("pointerleave", onPointerLeave, { signal: listeners.signal });
  document.addEventListener("keydown", onKeyDown, { signal: listeners.signal });
  window.addEventListener("resize", resize, { signal: listeners.signal });
  motionQuery.addEventListener("change", (event) => { reducedMotion = event.matches; }, { signal: listeners.signal });

  resize();
  setFocus("logs");

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(navigationTimer);
    listeners.abort();
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) textures.add(value);
        });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    renderer.renderLists.dispose();
    renderer.dispose();
    delete worldRoot.dataset.ytWorldInitialized;
    if (window.__ytHomeWorldCleanup === cleanup) delete window.__ytHomeWorldCleanup;
  }

  window.__ytHomeWorldCleanup = cleanup;
  document.addEventListener("astro:before-swap", cleanup, { once: true, signal: listeners.signal });

  function frame() {
    if (disposed) return;
    if (!worldRoot.isConnected) {
      cleanup();
      return;
    }
    const dt = Math.min(clock.getDelta(), 0.04);
    const paused = shell?.classList.contains("is-menu-open") || shell?.classList.contains("is-settings-open");
    if (!paused) elapsed += dt;

    if (!paused) {
      Object.values(objects).forEach((object) => object.userData.update?.(dt, elapsed));
    }

    const focusAnchor = worldAnchor(current);
    const parallax = reducedMotion ? 0 : 1;
    const focusCamera = baseCamera.clone().add(new THREE.Vector3(focusAnchor.x * 0.025, (focusAnchor.y - 1.2) * 0.018, 0));
    const desired = cameraGoal || focusCamera.add(new THREE.Vector3(pointerEase.x * 0.16 * parallax, pointerEase.y * 0.07 * parallax, 0));
    camera.position.lerp(desired, 1 - Math.pow(0.00003, dt));
    const focusTarget = baseTarget.clone().lerp(focusAnchor, 0.055);
    const target = lookGoal || focusTarget.add(new THREE.Vector3(pointerEase.x * 0.08 * parallax, pointerEase.y * 0.035 * parallax, 0));
    camera.lookAt(target);

    updateOverlay();
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(frame);
  }
  frame();
  }
}

if (window.__ytHomeWorldInit) document.removeEventListener("astro:page-load", window.__ytHomeWorldInit);
window.__ytHomeWorldInit = initHomeWorld;
document.addEventListener("astro:page-load", initHomeWorld);
initHomeWorld();
