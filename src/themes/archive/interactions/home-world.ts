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
  scene.background = new THREE.Color(0xe9e5dc);
  scene.fog = new THREE.Fog(0xe9e5dc, 10, 24);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0.24, 3.12, 9.45);
  const baseCamera = camera.position.clone();
  const baseTarget = new THREE.Vector3(0, 1.36, -0.18);

  const renderer = new THREE.WebGLRenderer({
    canvas: worldCanvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const clock = new THREE.Clock();
  let elapsed = 0;
  let current: ModuleId = "logs";
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
  const warm = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd895, emissiveIntensity: 2.2, roughness: 0.7 });

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
    group.position.set(0.08, 0, -0.42);
    group.rotation.y = -0.025;
    const base = box(3.05, 0.18, 1.72, concreteDark);
    base.position.y = 0.09;
    const plinth = box(2.55, 0.24, 1.28, concrete);
    plinth.position.y = 0.29;
    group.add(base, plinth);

    const left = box(0.86, 2.28, 0.72, concreteLight);
    left.position.set(-0.5, 1.54, 0);
    left.rotation.z = -0.09;
    const right = left.clone();
    right.position.x = 0.5;
    right.rotation.z = 0.09;
    group.add(left, right);

    for (const y of [1.02, 1.48, 1.94]) {
      const bandLeft = box(0.32, 0.035, 0.025, metal);
      bandLeft.position.set(-0.5, y, 0.375);
      const bandRight = bandLeft.clone();
      bandRight.position.x = 0.5;
      group.add(bandLeft, bandRight);
    }

    const sideL = box(0.31, 1.72, 0.84, concreteDark);
    sideL.position.set(-0.99, 1.14, 0.02);
    sideL.rotation.z = -0.05;
    const sideR = sideL.clone();
    sideR.position.x = 0.99;
    sideR.rotation.z = 0.05;
    group.add(sideL, sideR);

    const seam = box(0.04, 2.08, 0.76, warm);
    seam.position.set(0, 1.54, 0.39);
    group.add(seam);
    const point = box(0.06, 0.06, 0.04, red);
    point.position.set(0, 2.59, 0.41);
    group.add(point);

    const innerRail = box(0.72, 0.08, 0.74, metalLight);
    innerRail.position.set(0, 0.56, 0.04);
    group.add(innerRail);

    const accessRack = new THREE.Group();
    accessRack.position.set(0, 1.46, 0.02);
    const accessSpine = box(0.16, 1.45, 0.28, metal);
    accessRack.add(accessSpine);
    for (const y of [-0.48, 0, 0.48]) {
      const recordTray = box(0.68, 0.06, 0.42, metalLight);
      recordTray.position.y = y;
      accessRack.add(recordTray);
    }
    group.add(accessRack);

    const pyramidRig = new THREE.Group();
    pyramidRig.position.set(0, 3.48, 0.02);
    const pyramidMaterial = new THREE.MeshStandardMaterial({
      color: 0x35322e,
      roughness: 0.48,
      metalness: 0.32,
    });
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.78, 4, 1, false, Math.PI / 4), pyramidMaterial);
    pyramid.rotation.z = Math.PI;
    pyramid.castShadow = true;
    const pyramidCap = box(0.94, 0.045, 0.94, red.clone());
    pyramidCap.position.y = 0.39;
    pyramidCap.rotation.y = Math.PI / 4;
    pyramidRig.add(pyramid, pyramidCap);
    group.add(pyramidRig);

    const suspension = box(0.025, 0.48, 0.025, red.clone());
    suspension.position.set(0, 2.87, 0.05);
    group.add(suspension);

    const light = new THREE.PointLight(0xffdca5, 0.65, 4, 2);
    light.position.set(0, 1.45, 0.55);
    group.add(light);

    const hit = hitbox("logs", 2.7, 4.1, 1.4);
    hit.position.set(0, 2.02, 0.04);
    group.add(hit);
    contactShadow(group, 3.5, 2.2, 0.22);

    let focus = 0;
    let focusResponse = 0;
    let open = 0;
    let targetOpen = 0;
    group.userData.anchor = new THREE.Vector3(0, 1.62, 0.46);
    group.userData.focus = (active: boolean) => { focus = active ? 1 : 0; };
    group.userData.activate = () => { targetOpen = 1; };
    group.userData.update = (dt: number, time: number) => {
      const t = 1 - Math.pow(0.00004, dt);
      focusResponse += (focus - focusResponse) * t;
      open += (targetOpen - open) * t;
      left.position.x = -0.5 - open * 0.34;
      right.position.x = 0.5 + open * 0.34;
      left.rotation.y = -open * 0.18;
      right.rotation.y = open * 0.18;
      innerRail.position.z = 0.04 + open * 0.4;
      accessRack.position.z = 0.02 + open * 0.3;
      pyramidRig.position.y = 3.48 - focusResponse * 0.11 - open * 0.2;
      pyramidRig.rotation.y = (reducedMotion ? 0 : time * 0.018) + focusResponse * 0.08;
      suspension.scale.y = 1 + focusResponse * 0.16 + open * 0.35;
      warm.emissiveIntensity = 1.85 + focusResponse * 1.15 + open * 0.8 + (reducedMotion ? 0 : Math.sin(time * 1.7) * 0.06);
      light.intensity = 0.5 + focusResponse * 0.62 + open;
    };
    return group;
  }

  function buildPersonnel() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-3.85, 0, 0.78);
    group.rotation.y = 0.16;

    const pedestal = box(1.68, 0.32, 1.08, concreteDark);
    pedestal.position.y = 0.16;
    group.add(pedestal);

    const back = box(1.16, 2.12, 0.18, concreteDark);
    back.position.set(0, 1.38, 0);
    group.add(back);

    const cradleLeft = box(0.08, 1.92, 0.34, metal);
    cradleLeft.position.set(-0.67, 1.27, 0.08);
    const cradleRight = cradleLeft.clone();
    cradleRight.position.x = 0.67;
    const cradleTop = box(1.42, 0.08, 0.34, metal);
    cradleTop.position.set(0, 2.25, 0.08);
    group.add(cradleLeft, cradleRight, cradleTop);

    const underSheet = box(0.91, 1.58, 0.025, concreteLight);
    underSheet.position.set(0.02, 1.48, 0.115);
    underSheet.rotation.z = 0.018;
    group.add(underSheet);

    const dossierHinge = new THREE.Group();
    dossierHinge.position.set(-0.52, 1.52, 0.16);
    dossierHinge.rotation.z = -0.025;
    group.add(dossierHinge);

    const dossier = box(0.86, 1.55, 0.055, concreteLight);
    dossier.position.x = 0.44;
    dossierHinge.add(dossier);

    const tab = box(0.22, 0.08, 0.065, metalLight);
    tab.position.set(0.7, 0.8, 0.02);
    dossierHinge.add(tab);

    const identityWindow = box(0.5, 0.32, 0.026, glass);
    identityWindow.position.set(0.44, -0.22, 0.045);
    dossierHinge.add(identityWindow);

    const hingeTop = box(0.1, 0.24, 0.12, metalLight);
    hingeTop.position.set(-0.52, 1.94, 0.18);
    const hingeBottom = hingeTop.clone();
    hingeBottom.position.y = 1.02;
    group.add(hingeTop, hingeBottom);

    for (let i = 0; i < 4; i++) {
      const rule = box(0.56 - i * 0.06, 0.012, 0.018, metal);
      rule.position.set(0.4, 0.4 - i * 0.18, 0.045);
      dossierHinge.add(rule);
    }
    const marker = box(0.055, 0.055, 0.035, red);
    marker.position.set(0.14, 0.54, 0.045);
    dossierHinge.add(marker);

    const hit = hitbox("personnel", 1.72, 2.5, 1.15);
    hit.position.set(0, 1.35, 0.05);
    group.add(hit);
    contactShadow(group, 2.0, 1.55, 0.17);

    let focus = 0;
    let active = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(-0.02, 1.65, 0.3);
    group.userData.focus = (state: boolean) => { focus = state ? 1 : 0; target = state ? 0.35 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number) => {
      active += (target - active) * (1 - Math.pow(0.00004, dt));
      dossierHinge.rotation.y = -active * 0.42;
      dossierHinge.position.z = 0.16 + active * 0.08;
      group.rotation.y += ((0.16 + focus * 0.035) - group.rotation.y) * (1 - Math.pow(0.00004, dt));
    };
    return group;
  }

  function buildCollections() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-2.12, 0, -1.82);
    group.rotation.y = -0.08;

    const shell = box(1.45, 1.25, 0.95, concrete);
    shell.position.y = 0.64;
    group.add(shell);
    const top = box(1.56, 0.09, 1.05, concreteDark);
    top.position.y = 1.31;
    group.add(top);

    const drawers: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const drawer = new THREE.Group();
      drawer.position.set(0, 0.98 - i * 0.33, 0.42);
      const tray = box(1.05, 0.25, 0.42, metalLight);
      tray.position.z = 0.08;
      const face = box(1.13, 0.29, 0.08, concreteLight);
      face.position.z = 0.3;
      const handle = box(0.24, 0.025, 0.025, metal);
      handle.position.set(0, 0, 0.36);
      const labelSlot = box(0.3, 0.08, 0.018, metal);
      labelSlot.position.set(-0.33, 0, 0.35);
      drawer.add(tray, face, handle, labelSlot);
      if (i === 1) {
        const storedFile = box(0.72, 0.035, 0.26, concreteLight);
        storedFile.position.set(0.08, 0.15, 0.04);
        storedFile.rotation.y = -0.05;
        const storedMarker = box(0.08, 0.04, 0.06, red.clone());
        storedMarker.position.set(-0.22, 0.19, 0.12);
        drawer.add(storedFile, storedMarker);
      }
      group.add(drawer);
      drawers.push(drawer);
    }

    for (const x of [-0.52, 0.52]) {
      const foot = box(0.18, 0.13, 0.62, concreteDark);
      foot.position.set(x, 0.065, 0);
      group.add(foot);
    }
    const point = box(0.05, 0.05, 0.035, red);
    point.position.set(0.5, 0.34, 0.55);
    group.add(point);

    const hit = hitbox("collections", 1.55, 1.5, 1.15);
    hit.position.set(0, 0.8, 0.08);
    group.add(hit);
    contactShadow(group, 1.9, 1.45, 0.16);

    let focus = 0;
    let open = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0, 0.82, 0.64);
    group.userData.focus = (state: boolean) => { focus = state ? 1 : 0; target = state ? 0.42 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number) => {
      open += (target - open) * (1 - Math.pow(0.00004, dt));
      drawers[1].position.z = 0.42 + open * 0.52;
      group.rotation.y += ((-0.08 + focus * 0.032) - group.rotation.y) * (1 - Math.pow(0.00004, dt));
    };
    return group;
  }

  function buildCreations() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(3.58, 0, 0.72);
    group.rotation.y = -0.14;

    const base = box(1.75, 0.43, 1.02, concrete);
    base.position.y = 0.215;
    group.add(base);
    const plinth = box(1.2, 0.52, 0.72, concreteLight);
    plinth.position.y = 0.68;
    group.add(plinth);

    const frameLeft = box(0.09, 1.62, 0.18, metalLight);
    frameLeft.position.set(-0.79, 1.45, 0);
    const frameRight = frameLeft.clone();
    frameRight.position.x = 0.79;
    const frameTop = box(1.67, 0.09, 0.18, metalLight);
    frameTop.position.set(0, 2.25, 0);
    group.add(frameLeft, frameRight, frameTop);

    const alignmentRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.026, 10, 64), metal);
    alignmentRing.position.set(0, 1.58, -0.03);
    group.add(alignmentRing);

    const artifactMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8c0b4,
      roughness: 0.68,
      metalness: 0.14,
      flatShading: true,
    });
    const artifact = new THREE.Group();
    artifact.position.copy(alignmentRing.position);
    const artifactBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 1), artifactMaterial);
    artifactBody.scale.set(0.82, 1.16, 0.82);
    artifactBody.castShadow = true;
    const datumHorizontal = box(0.72, 0.025, 0.07, metalLight);
    datumHorizontal.position.z = 0.12;
    const datumVertical = box(0.025, 0.82, 0.07, metalLight);
    datumVertical.position.z = 0.12;
    const artifactCore = box(0.12, 0.12, 0.12, red.clone());
    artifactCore.position.z = 0.34;
    artifact.add(artifactBody, datumHorizontal, datumVertical, artifactCore);
    group.add(artifact);

    const spindle = box(0.07, 0.7, 0.07, metal);
    spindle.position.set(0, 1.08, -0.02);
    group.add(spindle);

    const calipers: THREE.Mesh[] = [];
    for (const [x, y, horizontal] of [
      [-0.62, 1.58, true],
      [0.62, 1.58, true],
      [0, 0.96, false],
      [0, 2.2, false],
    ] as const) {
      const caliper = box(horizontal ? 0.31 : 0.08, horizontal ? 0.08 : 0.31, 0.12, red.clone());
      caliper.position.set(x, y, 0.08);
      group.add(caliper);
      calipers.push(caliper);
    }

    const gauge = box(0.62, 0.08, 0.16, glass);
    gauge.position.set(0, 0.55, 0.38);
    group.add(gauge);

    const designBed = box(1.02, 0.06, 0.48, concreteLight);
    designBed.position.set(0, 0.84, 0.18);
    designBed.rotation.x = -0.16;
    group.add(designBed);
    for (let i = -3; i <= 3; i++) {
      const measure = box(0.018, 0.08 + (i % 2 === 0 ? 0.05 : 0), 0.018, metal);
      measure.position.set(i * 0.18, 2.15, 0.11);
      group.add(measure);
    }

    const point = box(0.055, 0.055, 0.035, red);
    point.position.set(0.61, 0.44, 0.54);
    group.add(point);

    const hit = hitbox("creations", 1.85, 2.25, 1.2);
    hit.position.set(0, 1.35, 0.08);
    group.add(hit);
    contactShadow(group, 2.2, 1.55, 0.18);

    let focus = 0;
    let activation = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0.15, 1.64, 0.55);
    group.userData.focus = (state: boolean) => { focus = state ? 1 : 0; target = state ? 0.32 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number, time: number) => {
      activation += (target - activation) * (1 - Math.pow(0.00004, dt));
      const drift = reducedMotion ? 0 : Math.sin(time * 0.72) * 0.018;
      artifact.position.y = 1.58 + drift + activation * 0.08;
      artifact.rotation.x += reducedMotion ? 0 : dt * (0.035 + activation * 0.12);
      artifact.rotation.y += reducedMotion ? 0 : dt * (0.07 + activation * 0.2);
      alignmentRing.rotation.y = activation * 0.22;
      calipers[0].position.x = -0.62 + activation * 0.13;
      calipers[1].position.x = 0.62 - activation * 0.13;
      calipers[2].position.y = 0.96 + activation * 0.13;
      calipers[3].position.y = 2.2 - activation * 0.13;
      group.rotation.y += ((-0.14 - focus * 0.035) - group.rotation.y) * (1 - Math.pow(0.00004, dt));
    };
    return group;
  }

  function buildSites() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(4.82, 2.15, -2.62);
    group.rotation.y = -0.06;

    const backplate = box(1.34, 1.76, 0.1, concreteDark);
    backplate.position.set(0.42, 1.16, -0.12);
    const rail = box(0.08, 1.95, 0.13, metal);
    rail.position.set(-0.28, 1.16, -0.02);
    const crossRail = box(1.46, 0.07, 0.13, metal);
    crossRail.position.set(0.4, 1.16, -0.01);
    group.add(backplate, rail, crossRail);

    const node = box(0.9, 0.84, 0.28, concreteLight);
    node.position.set(0.48, 1.2, 0.06);
    group.add(node);
    const glassPanel = box(0.48, 0.16, 0.02, glass);
    glassPanel.position.set(0.48, 1.36, 0.215);
    group.add(glassPanel);
    const siteSignal = red.clone();
    const point = box(0.06, 0.06, 0.035, siteSignal);
    point.position.set(0.03, 1.56, 0.2);
    group.add(point);
    for (let i = 0; i < 3; i++) {
      const slot = box(0.46, 0.025, 0.018, metal);
      slot.position.set(0.47, 1.08 - i * 0.09, 0.2);
      group.add(slot);
    }

    for (const y of [0.55, 1.77]) {
      const junction = box(0.2, 0.2, 0.18, metalLight);
      junction.position.set(-0.28, y, 0.04);
      group.add(junction);
    }

    const outboundRail = box(1.35, 0.055, 0.08, metal);
    outboundRail.position.set(1.5, 1.78, -0.03);
    const outboundSignal = box(0.07, 0.12, 0.1, siteSignal);
    outboundSignal.position.set(2.17, 1.78, -0.01);
    group.add(outboundRail, outboundSignal);

    const hit = hitbox("sites", 1.2, 1.7, 0.65);
    hit.position.set(0.45, 1.2, 0.04);
    group.add(hit);

    let focus = 0;
    let pulse = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0.48, 1.25, 0.24);
    group.userData.focus = (state: boolean) => { focus = state ? 1 : 0; target = state ? 0.45 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt: number, time: number) => {
      pulse += (target - pulse) * (1 - Math.pow(0.00004, dt));
      siteSignal.emissiveIntensity = 0.4 + pulse * 1.1 + (reducedMotion ? 0 : Math.sin(time * 2.2) * 0.05);
      node.position.z = 0.06 + pulse * 0.08;
      crossRail.scale.x = 1 + pulse * 0.04;
      group.rotation.y += ((-0.06 - focus * 0.035) - group.rotation.y) * (1 - Math.pow(0.00004, dt));
    };
    return group;
  }

  function buildEnvironment() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f887d, 1.35));
    const key = new THREE.DirectionalLight(0xfff8e8, 3.1);
    key.position.set(-3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -2;
    key.shadow.bias = -0.00025;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd5dce0, 0.48);
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

    const centerPanel = box(4.8, 6.9, 0.14, concreteLight.clone());
    (centerPanel.material as THREE.MeshStandardMaterial).color.setHex(0xece8df);
    centerPanel.position.set(-0.34, 3.45, -2.91);
    centerPanel.castShadow = false;
    scene.add(centerPanel);
    for (let i = -16; i <= 16; i++) {
      const rib = box(0.012, 6.25, 0.018, concreteDark.clone());
      const mat = rib.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = 0.25;
      mat.color.setHex(0xcfc8bd);
      rib.position.set(-0.34 + i * 0.124, 3.45, -2.79);
      rib.castShadow = false;
      rib.receiveShadow = false;
      scene.add(rib);
    }

    const leftField = box(4.55, 0.035, 3.35, concreteLight.clone());
    leftField.position.set(-2.95, 0.02, -0.06);
    leftField.rotation.y = 0.055;
    leftField.castShadow = false;
    const rightField = box(3.85, 0.035, 3.05, concreteLight.clone());
    rightField.position.set(3.34, 0.021, 0.1);
    rightField.rotation.y = -0.075;
    rightField.castShadow = false;
    scene.add(leftField, rightField);

    const serviceLine = box(0.035, 0.018, 5.4, red.clone());
    serviceLine.position.set(0.82, 0.045, -0.35);
    serviceLine.rotation.y = -0.035;
    serviceLine.castShadow = false;
    const wallControlLine = box(0.055, 4.9, 0.04, red.clone());
    wallControlLine.position.set(-2.78, 3.05, -2.77);
    wallControlLine.castShadow = false;
    const lintel = box(4.9, 0.09, 0.1, metal);
    lintel.position.set(-0.32, 5.68, -2.76);
    lintel.castShadow = false;
    scene.add(serviceLine, wallControlLine, lintel);
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

  function descriptorFor(module: ModuleId) {
    return labels[module]?.querySelector("span")?.textContent?.trim() || "";
  }

  function setContext(module: ModuleId) {
    const title = context?.querySelector<HTMLElement>("strong");
    const description = context?.querySelector<HTMLElement>("em");
    if (!title || !description) return;
    title.dataset.ytCopy = module;
    title.textContent = copyFor(module);
    description.dataset.ytCopy = `${module}Object`;
    description.textContent = descriptorFor(module);
  }

  function setFocus(module: ModuleId) {
    current = module;
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
        THREE.MathUtils.clamp(p.x, 78, Math.max(78, width - 78)),
        THREE.MathUtils.clamp(p.y, 78, Math.max(78, height - 78)),
      );
      reticle.classList.add("is-visible");
    }

    const offsets: Record<ModuleId, [number, number]> = {
      personnel: [-135, -115],
      collections: [-112, 42],
      logs: [-150, -132],
      creations: [68, 72],
      sites: [-170, 5],
    };
    (Object.keys(labels) as ModuleId[]).forEach((module) => {
      const label = labels[module];
      if (!label) return;
      const p = project(module);
      const [x, y] = offsets[module];
      placeOverlay(
        label,
        THREE.MathUtils.clamp(p.x + x, 22, Math.max(22, width - 152)),
        THREE.MathUtils.clamp(p.y + y, 28, Math.max(28, height - 68)),
      );
    });
  }

  function resize() {
    const width = worldCanvas.clientWidth || window.innerWidth;
    const height = worldCanvas.clientHeight || window.innerHeight;
    camera.aspect = width / height;
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
        setFocus(module);
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
      setFocus(focusOrder[(index + 1) % focusOrder.length]);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = Math.max(0, focusOrder.indexOf(current));
      setFocus(focusOrder[(index - 1 + focusOrder.length) % focusOrder.length]);
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
