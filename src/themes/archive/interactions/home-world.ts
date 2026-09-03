import * as THREE from "three";

type ModuleId = "personnel" | "logs" | "creations" | "collections" | "sites";

type WorldObject = THREE.Group & {
  userData: {
    module?: ModuleId;
    hit?: THREE.Object3D;
    update?: (dt: number, elapsed: number) => void;
    focus?: (active: boolean) => void;
    activate?: () => void;
    anchor?: THREE.Vector3;
  };
};

const root = document.querySelector<HTMLElement>("[data-yt-world3d]");
const canvas = document.querySelector<HTMLCanvasElement>("[data-yt-world-canvas]");

if (root && canvas) {
  const routes = document.querySelector<HTMLElement>("[data-yt-world-routes]");
  const context = document.querySelector<HTMLElement>("[data-yt-world-context]");
  const reticle = document.querySelector<HTMLElement>("[data-yt-world-reticle]");
  const shell = document.querySelector<HTMLElement>("[data-yt-shell]");
  const menuTrigger = document.querySelector<HTMLElement>("[data-yt-menu]");

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

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 50);
  camera.position.set(0, 3.15, 9.15);
  const baseCamera = camera.position.clone();
  const baseTarget = new THREE.Vector3(0, 1.18, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
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
    group.position.set(0, 0, -0.15);
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

    const light = new THREE.PointLight(0xffdca5, 0.65, 4, 2);
    light.position.set(0, 1.45, 0.55);
    group.add(light);

    const hit = hitbox("logs", 2.55, 2.75, 1.35);
    hit.position.set(0, 1.4, 0.04);
    group.add(hit);
    contactShadow(group, 3.5, 2.2, 0.22);

    let focus = 0;
    let open = 0;
    let targetOpen = 0;
    group.userData.anchor = new THREE.Vector3(0, 1.62, 0.46);
    group.userData.focus = (active) => { focus = active ? 1 : 0; };
    group.userData.activate = () => { targetOpen = 1; };
    group.userData.update = (dt, time) => {
      const t = 1 - Math.pow(0.002, dt);
      open += (targetOpen - open) * t;
      left.position.x = -0.5 - open * 0.34;
      right.position.x = 0.5 + open * 0.34;
      left.rotation.y = -open * 0.18;
      right.rotation.y = open * 0.18;
      innerRail.position.z = 0.04 + open * 0.4;
      warm.emissiveIntensity = 2 + focus * 1.1 + open * 0.8 + Math.sin(time * 1.7) * 0.08;
      light.intensity = 0.55 + focus * 0.65 + open;
    };
    return group;
  }

  function buildPersonnel() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-3.75, 0, 0.15);
    group.rotation.y = 0.08;

    const pedestal = box(1.55, 0.32, 1.0, concreteDark);
    pedestal.position.y = 0.16;
    group.add(pedestal);

    const back = box(1.1, 2.12, 0.18, concreteDark);
    back.position.set(0, 1.38, 0);
    group.add(back);

    const dossier = box(0.86, 1.55, 0.055, concreteLight);
    dossier.position.set(-0.08, 1.52, 0.16);
    dossier.rotation.z = -0.025;
    dossier.rotation.y = 0.03;
    group.add(dossier);

    const tab = box(0.22, 0.08, 0.065, metalLight);
    tab.position.set(0.18, 2.32, 0.18);
    group.add(tab);

    for (let i = 0; i < 4; i++) {
      const rule = box(0.56 - i * 0.06, 0.012, 0.018, metal);
      rule.position.set(-0.12, 1.92 - i * 0.18, 0.205);
      group.add(rule);
    }
    const marker = box(0.055, 0.055, 0.035, red);
    marker.position.set(-0.38, 2.06, 0.205);
    group.add(marker);

    const hit = hitbox("personnel", 1.55, 2.45, 1.1);
    hit.position.set(0, 1.35, 0.05);
    group.add(hit);
    contactShadow(group, 2.0, 1.55, 0.17);

    let focus = 0;
    let active = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(-0.02, 1.65, 0.3);
    group.userData.focus = (state) => { focus = state ? 1 : 0; target = state ? 0.35 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt) => {
      active += (target - active) * (1 - Math.pow(0.002, dt));
      dossier.rotation.y = 0.03 - active * 0.34;
      dossier.position.z = 0.16 + active * 0.1;
      group.rotation.y += ((0.08 + focus * 0.025) - group.rotation.y) * 0.06;
    };
    return group;
  }

  function buildCollections() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(-2.4, 0, -1.25);
    group.rotation.y = 0.04;

    const shell = box(1.45, 1.25, 0.95, concrete);
    shell.position.y = 0.64;
    group.add(shell);
    const top = box(1.56, 0.09, 1.05, concreteDark);
    top.position.y = 1.31;
    group.add(top);

    const drawers: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const drawer = box(1.05, 0.25, 0.16, metalLight);
      drawer.position.set(0, 0.98 - i * 0.33, 0.53);
      group.add(drawer);
      drawers.push(drawer);
      const handle = box(0.24, 0.025, 0.025, metal);
      handle.position.set(0, drawer.position.y, 0.63);
      group.add(handle);
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
    group.userData.focus = (state) => { focus = state ? 1 : 0; target = state ? 0.42 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt) => {
      open += (target - open) * (1 - Math.pow(0.002, dt));
      drawers[1].position.z = 0.53 + open * 0.48;
      group.rotation.y += ((0.04 + focus * 0.018) - group.rotation.y) * 0.06;
    };
    return group;
  }

  function buildCreations() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(3.75, 0, 0.1);
    group.rotation.y = -0.07;

    const base = box(1.75, 0.43, 1.02, concrete);
    base.position.y = 0.215;
    group.add(base);
    const plinth = box(1.2, 0.52, 0.72, concreteLight);
    plinth.position.y = 0.68;
    group.add(plinth);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.045, 12, 80), metalLight);
    ring.castShadow = true;
    ring.position.set(0, 1.59, 0.02);
    group.add(ring);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.018, 10, 64), metal);
    inner.position.copy(ring.position);
    group.add(inner);

    const rockGeo = new THREE.IcosahedronGeometry(0.37, 2);
    const positions = rockGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const n = 1 + Math.sin(i * 1.7) * 0.08 + Math.cos(i * 0.91) * 0.045;
      positions.setXYZ(i, x * n, y * n, z * n);
    }
    rockGeo.computeVertexNormals();
    const rockMat = concrete.clone();
    rockMat.color.setHex(0xc8c0b4);
    rockMat.roughness = 0.96;
    rockMat.bumpScale = 0.04;
    const artifact = new THREE.Mesh(rockGeo, rockMat);
    artifact.castShadow = true;
    artifact.position.copy(ring.position);
    group.add(artifact);

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
    group.userData.focus = (state) => { focus = state ? 1 : 0; target = state ? 0.32 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt, time) => {
      activation += (target - activation) * (1 - Math.pow(0.002, dt));
      artifact.position.y = 1.59 + Math.sin(time * 0.9) * 0.035 + activation * 0.09;
      artifact.rotation.x += dt * (0.07 + activation * 0.22);
      artifact.rotation.y += dt * (0.11 + activation * 0.34);
      ring.rotation.y = activation * 0.34;
      ring.rotation.z = activation * 0.12;
      inner.rotation.y = -activation * 0.24;
      group.rotation.y += ((-0.07 - focus * 0.02) - group.rotation.y) * 0.06;
    };
    return group;
  }

  function buildSites() {
    const group = new THREE.Group() as WorldObject;
    group.position.set(5.5, 1.25, -1.95);
    group.rotation.y = -0.1;

    const rail = box(0.06, 1.95, 0.08, metal);
    rail.position.y = 0.97;
    group.add(rail);
    const node = box(0.88, 0.82, 0.26, concreteLight);
    node.position.set(0.47, 1.2, 0.05);
    group.add(node);
    const glassPanel = box(0.48, 0.16, 0.02, glass);
    glassPanel.position.set(0.47, 1.36, 0.19);
    group.add(glassPanel);
    const point = box(0.06, 0.06, 0.035, red);
    point.position.set(0.03, 1.56, 0.14);
    group.add(point);
    for (let i = 0; i < 3; i++) {
      const slot = box(0.46, 0.025, 0.018, metal);
      slot.position.set(0.47, 1.08 - i * 0.09, 0.2);
      group.add(slot);
    }

    const hit = hitbox("sites", 1.2, 1.7, 0.65);
    hit.position.set(0.45, 1.2, 0.04);
    group.add(hit);

    let focus = 0;
    let pulse = 0;
    let target = 0;
    group.userData.anchor = new THREE.Vector3(0.48, 1.25, 0.24);
    group.userData.focus = (state) => { focus = state ? 1 : 0; target = state ? 0.45 : 0; };
    group.userData.activate = () => { target = 1; };
    group.userData.update = (dt, time) => {
      pulse += (target - pulse) * (1 - Math.pow(0.003, dt));
      red.emissiveIntensity = 0.4 + pulse * 1.1 + Math.sin(time * 2.2) * 0.05;
      node.position.z = 0.05 + pulse * 0.06;
      group.rotation.y += ((-0.1 - focus * 0.02) - group.rotation.y) * 0.06;
    };
    return group;
  }

  function buildEnvironment() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8f887d, 1.35));
    const key = new THREE.DirectionalLight(0xfff8e8, 3.1);
    key.position.set(-3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
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

    const centerPanel = box(5.2, 6.9, 0.14, concreteLight.clone());
    (centerPanel.material as THREE.MeshStandardMaterial).color.setHex(0xece8df);
    centerPanel.position.set(0, 3.45, -2.91);
    scene.add(centerPanel);
    for (let i = -20; i <= 20; i++) {
      const rib = box(0.012, 6.25, 0.018, concreteDark.clone());
      const mat = rib.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = 0.25;
      mat.color.setHex(0xcfc8bd);
      rib.position.set(i * 0.104, 3.45, -2.79);
      scene.add(rib);
    }

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x979187, transparent: true, opacity: 0.16, depthWrite: false });
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(5.9, 5.92, 128), ringMaterial);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.012;
    scene.add(floorRing);
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
    if (!context) return;
    context.innerHTML = `<small>ARCHIVE WORLD</small><strong>${copyFor(module)}</strong><span>ENTER / OPEN · TAB / MENU</span>`;
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
    const local = object.userData.anchor || new THREE.Vector3();
    return local.clone().applyMatrix4(object.matrixWorld);
  }

  function project(module: ModuleId) {
    const point = worldAnchor(module).project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-point.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  }

  function updateOverlay() {
    if (reticle) {
      const p = project(current);
      reticle.style.left = `${p.x}px`;
      reticle.style.top = `${p.y}px`;
      reticle.classList.add("is-visible");
    }

    const offsets: Record<ModuleId, [number, number]> = {
      personnel: [-135, -115],
      collections: [-120, 75],
      logs: [-18, -150],
      creations: [90, -110],
      sites: [68, -70],
    };
    (Object.keys(labels) as ModuleId[]).forEach((module) => {
      const label = labels[module];
      if (!label) return;
      const p = project(module);
      const [x, y] = offsets[module];
      label.style.left = `${p.x + x}px`;
      label.style.top = `${p.y + y}px`;
    });
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function pointerToNdc(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
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
    root.classList.add("is-activating");

    window.setTimeout(() => window.location.assign(routeMap[module]), 560);
  }

  canvas.addEventListener("pointermove", (event) => {
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
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "default";
      }
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (activating || shell?.classList.contains("is-menu-open")) return;
    pointerToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    const target = raycaster.intersectObjects(interactive, false)[0]?.object;
    const module = target?.userData.module as ModuleId | undefined;
    if (module) navigate(module);
  });

  const focusOrder: ModuleId[] = ["personnel", "collections", "logs", "creations", "sites"];
  document.addEventListener("keydown", (event) => {
    if (!root.isConnected || shell?.classList.contains("is-menu-open")) return;
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
    } else if (event.key === "Tab") {
      event.preventDefault();
      menuTrigger?.click();
    }
  });

  window.addEventListener("resize", resize);
  resize();
  setFocus("logs");

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.04);
    const paused = shell?.classList.contains("is-menu-open") || shell?.classList.contains("is-settings-open");
    if (!paused) elapsed += dt;

    if (!paused) {
      Object.values(objects).forEach((object) => object.userData.update?.(dt, elapsed));
    }

    const desired = cameraGoal || baseCamera.clone().add(new THREE.Vector3(pointerEase.x * 0.18, pointerEase.y * 0.08, 0));
    camera.position.lerp(desired, 1 - Math.pow(0.002, dt));
    const target = lookGoal || baseTarget.clone().add(new THREE.Vector3(pointerEase.x * 0.1, pointerEase.y * 0.05, 0));
    camera.lookAt(target);

    updateOverlay();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}
