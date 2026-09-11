import * as THREE from "three";

export type ModuleId = "personnel" | "logs" | "collections" | "creations" | "sites";
export const moduleOrder: ModuleId[] = ["personnel", "logs", "collections", "creations", "sites"];
export interface OfficeItem {
  root: THREE.Group;
  hit: THREE.Mesh;
  anchor: THREE.Object3D;
  edges: THREE.LineSegments[];
  pose: (progress: number) => void;
}

/** All navigation objects live on one working desk, in human-scale proportions. */
export function buildOffice(scene: THREE.Scene) {
  const resources: THREE.Material[] = [];
  const material = (color: number, roughness = 0.8, metalness = 0) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    resources.push(result);
    return result;
  };
  const plaster = material(0xaaa99c);
  const deskMaterial = material(0x756958, 0.78);
  const deskEdge = material(0x453f35);
  const enamel = material(0x333e37, 0.55, 0.15);
  const leather = material(0x3e493e);
  const paper = material(0xeee7d2, 0.94);
  const paperEdge = material(0xc9bda4);
  const ink = material(0x616554);
  const steel = material(0x9b9b89, 0.37, 0.6);
  const dark = material(0x242a27, 0.48);
  const brass = material(0xa59365, 0.38, 0.6);
  const status = material(0x973d30);
  const lit = material(0xe4d6ab);
  lit.emissive.setHex(0xf8db9d);
  lit.emissiveIntensity = 0.4;

  function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => mesh(parent, new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const cylinder = (parent: THREE.Object3D, radius: number, height: number, mat: THREE.Material, x = 0, y = 0, z = 0) => mesh(parent, new THREE.CylinderGeometry(radius, radius, height, 28), mat, x, y, z);
  function group(parent: THREE.Object3D, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function cable(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, mat: THREE.Material) {
    return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, radius, 6, false), mat);
  }
  function roundedPlate(parent: THREE.Object3D, w: number, d: number, height: number, mat: THREE.Material) {
    const shape = new THREE.Shape();
    const r = 0.07;
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2); shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r); shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2); shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r); shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.012, bevelThickness: 0.006 });
    geo.rotateX(-Math.PI / 2);
    return mesh(parent, geo, mat);
  }
  function hit(parent: THREE.Object3D, target: ModuleId | "reader", w: number, h: number, d: number, y = 0.16) {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    resources.push(mat);
    const object = box(parent, w, h, d, mat, 0, y, 0);
    object.castShadow = false;
    object.userData.officeTarget = target;
    return object;
  }
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xf0d6a1, transparent: true, opacity: 0.82, depthWrite: false });
  resources.push(edgeMaterial);
  function outline(root: THREE.Object3D) {
    const objects: THREE.Mesh[] = [];
    root.traverse((node) => { if (node instanceof THREE.Mesh && !node.userData.officeTarget) objects.push(node); });
    return objects.map((node) => {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(node.geometry, 32), edgeMaterial);
      edges.visible = false;
      node.add(edges);
      return edges;
    });
  }

  // Room envelope, daylight opening and a single desk. Background architecture
  // contains no navigation: the props are the interface.
  const room = group(scene);
  const floor = box(room, 22, 0.1, 20, material(0x66695e), 0, -1.2, 0);
  floor.castShadow = false;
  box(room, 19, 8, 0.2, plaster, 0, 2.7, -4.5);
  box(room, 0.2, 8, 16, plaster, -6, 2.7, 0);
  box(room, 18, 0.12, 0.15, deskEdge, 0, -0.65, -4.3);
  // A broad clerestory opening, with thick vertical reveals.
  const windowLight = material(0xe8e7cf);
  windowLight.emissive.setHex(0xd0d9cc); windowLight.emissiveIntensity = 0.48;
  box(room, 5.2, 2.5, 0.08, windowLight, -2.5, 3.4, -4.34);
  for (const x of [-5.15, -2.5, 0.15]) box(room, 0.11, 2.68, 0.28, enamel, x, 3.4, -4.15);
  for (const y of [2.1, 4.7]) box(room, 5.4, 0.12, 0.3, enamel, -2.5, y, -4.15);
  for (let i = 0; i < 6; i++) box(room, 5.1, 0.035, 0.22, plaster, -2.5, 2.35 + i * 0.39, -4.03);
  const table = group(scene);
  box(table, 8.8, 0.23, 4.9, deskMaterial, 0, 0.94, 0);
  box(table, 8.88, 0.07, 4.97, deskEdge, 0, 0.8, 0);
  for (const x of [-3.6, 3.6]) box(table, 0.18, 1.9, 3.7, enamel, x, -0.2, 0);
  const pad = box(scene, 4.8, 0.025, 2.55, leather, 0.5, 1.075, 0.6);
  // Inlaid seams and restrained wear; no large texture downloads.
  for (let i = 0; i < 14; i++) {
    const grain = box(table, 8.6, 0.002, 0.009, i % 2 ? deskEdge : deskMaterial, 0, 1.058, -2.2 + i * 0.34);
    grain.castShadow = false;
  }
  const lamp = group(scene, -3.65, 1.08, -1.55);
  cylinder(lamp, 0.38, 0.08, dark);
  cylinder(lamp, 0.045, 1.65, brass, 0, 0.82, 0);
  const shade = mesh(lamp, new THREE.CylinderGeometry(0.24, 0.64, 0.44, 36, 1, true), enamel, 0, 1.67, 0);
  (shade.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  cylinder(lamp, 0.55, 0.022, lit, 0, 1.46, 0);
  const deskLight = new THREE.PointLight(0xffdda1, 6, 8, 2);
  deskLight.position.set(0, 1.36, 0); lamp.add(deskLight);
  const ambient = new THREE.HemisphereLight(0xdce5de, 0x4d473a, 2.0); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe4b8, 3.4);
  sun.position.set(-5, 9, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 25 });
  sun.shadow.normalBias = 0.035;
  sun.target.position.set(0, 1, 0); scene.add(sun, sun.target);

  // PERSONNEL: a loose access card and its separate reader on the same desk.
  const badge = group(scene);
  roundedPlate(badge, 1.0, 0.66, 0.028, paper);
  box(badge, 0.96, 0.007, 0.14, enamel, 0, 0.044, -0.21);
  box(badge, 0.2, 0.01, 0.23, paperEdge, -0.29, 0.045, 0.035);
  const head = mesh(badge, new THREE.SphereGeometry(0.055, 12, 8), ink, -0.29, 0.065, 0.005);
  head.scale.y = 0.16;
  box(badge, 0.115, 0.009, 0.055, ink, -0.29, 0.055, 0.09);
  for (let i = 0; i < 3; i++) box(badge, 0.34 - i * 0.05, 0.008, 0.018, ink, 0.1, 0.047, -0.02 + i * 0.065);
  box(badge, 0.12, 0.01, 0.09, brass, 0.35, 0.05, 0.18);
  const reader = group(scene);
  roundedPlate(reader, 1.4, 1.05, 0.12, enamel);
  box(reader, 1.07, 0.01, 0.74, dark, 0, 0.14, 0);
  for (const x of [-0.58, 0.58]) box(reader, 0.07, 0.11, 0.8, steel, x, 0.19, 0);
  const readerStatus = status.clone(); resources.push(readerStatus);
  box(reader, 0.075, 0.014, 0.05, readerStatus, 0.54, 0.2, -0.4);
  const readerHit = hit(reader, "reader", 1.5, 0.38, 1.15);
  const readerEdges = outline(reader);

  // LOGS: the working notebook is large, flat, and bound along a real hinge.
  const book = group(scene);
  book.rotation.y = -0.08;
  roundedPlate(book, 1.65, 2.05, 0.07, dark);
  const pages = roundedPlate(book, 1.54, 1.92, 0.10, paper);
  pages.position.y = 0.08;
  for (let i = 0; i < 6; i++) box(book, 1.55, 0.007, 1.92, paperEdge, 0, 0.09 + i * 0.015, 0);
  const leaf = group(book, 0, 0.19, 0);
  box(leaf, 1.5, 0.009, 1.87, paper);
  for (let i = 0; i < 12; i++) box(leaf, i % 4 === 0 ? 0.96 : 1.2, 0.005, 0.008, paperEdge, 0, 0.01, -0.66 + i * 0.11);
  const cover = group(book, -0.81, 0.2, 0);
  const coverBody = roundedPlate(cover, 1.65, 2.05, 0.055, enamel); coverBody.position.x = 0.81;
  box(cover, 0.88, 0.008, 0.44, paperEdge, 0.81, 0.07, -0.34);
  for (let i = 0; i < 3; i++) box(cover, 0.59 - i * 0.12, 0.009, 0.018, ink, 0.79, 0.077, -0.45 + i * 0.1);
  box(book, 0.065, 0.01, 0.44, status, 0.5, 0.08, 1.08);
  for (const z of [-0.62, 0.62]) {
    const ring = mesh(book, new THREE.TorusGeometry(0.065, 0.013, 6, 16), steel, -0.78, 0.16, z); ring.rotation.x = Math.PI / 2;
  }

  // COLLECTIONS: a shallow desktop card catalogue with a pull-out tray.
  const catalogue = group(scene);
  box(catalogue, 1.55, 0.42, 1.17, enamel, 0, 0.23, 0);
  box(catalogue, 1.59, 0.06, 1.2, steel, 0, 0.47, 0);
  const drawer = group(catalogue, 0, 0.1, 0.15);
  box(drawer, 1.4, 0.055, 1.1, steel);
  for (const x of [-0.68, 0.68]) box(drawer, 0.045, 0.23, 1.1, steel, x, 0.1, 0);
  box(drawer, 1.44, 0.29, 0.055, paperEdge, 0, 0.08, 0.56);
  box(drawer, 0.35, 0.05, 0.14, dark, 0, 0.09, 0.65);
  for (let i = 0; i < 8; i++) {
    const card = box(drawer, 1.18, 0.016, 0.64, i % 3 ? paper : paperEdge, 0, 0.052 + i * 0.018, -0.12 + i * 0.058);
    card.rotation.y = (i % 3 - 1) * 0.013;
    box(drawer, 0.2, 0.02, 0.1, paper, -0.4 + (i % 3) * 0.36, 0.065 + i * 0.018, 0.24 + i * 0.058);
  }

  // CREATIONS: a half-assembled sample held by a screw-driven inspection jig.
  const jig = group(scene);
  roundedPlate(jig, 1.55, 1.2, 0.10, steel);
  for (const x of [-0.52, 0.52]) box(jig, 0.11, 0.08, 0.92, dark, x, 0.14, 0);
  const artifact = group(jig, 0, 0.22, 0);
  box(artifact, 0.6, 0.19, 0.58, paperEdge);
  for (const x of [-0.21, 0.21]) box(artifact, 0.045, 0.38, 0.55, enamel, x, 0.09, 0);
  const cap = box(artifact, 0.5, 0.04, 0.48, brass, 0, 0.45, 0);
  const jaw = box(jig, 0.12, 0.24, 0.75, enamel, 0.6, 0.26, 0);
  const spindle = cylinder(jig, 0.045, 0.66, steel, 0.9, 0.25, 0); spindle.rotation.z = Math.PI / 2;
  box(jig, 0.23, 0.22, 0.25, enamel, 1.12, 0.25, 0);
  cylinder(jig, 0.055, 0.22, steel, 1.18, 0.38, 0);
  const wheel = group(jig, 1.18, 0.48, 0);
  const wheelRing = mesh(wheel, new THREE.TorusGeometry(0.26, 0.036, 8, 28), dark);
  wheelRing.rotation.x = Math.PI / 2;
  for (const angle of [0, Math.PI / 2]) { const spoke = box(wheel, 0.48, 0.04, 0.045, dark); spoke.rotation.y = angle; }
  cylinder(wheel, 0.045, 0.08, brass);

  // SITES: a wired telephone. Lifting the receiver opens an outside connection.
  const phone = group(scene);
  roundedPlate(phone, 1.4, 1.25, 0.17, enamel);
  cylinder(phone, 0.36, 0.025, steel, 0, 0.19, 0.18);
  cylinder(phone, 0.2, 0.031, paperEdge, 0, 0.2, 0.18);
  for (let i = 0; i < 9; i++) { const a = i / 10 * Math.PI * 2; cylinder(phone, 0.042, 0.008, dark, Math.sin(a) * 0.27, 0.213, 0.18 + Math.cos(a) * 0.27); }
  const handset = group(phone, 0, 0.35, -0.34);
  const grip = box(handset, 0.86, 0.13, 0.18, dark, 0, 0.1, 0);
  grip.rotation.z = 0.04;
  for (const x of [-0.52, 0.52]) cylinder(handset, 0.2, 0.2, dark, x, 0, 0);
  const cordPoints = Array.from({ length: 75 }, (_, i) => {
    const t = i / 74;
    return new THREE.Vector3(0.65 - t * 0.13 + Math.sin(t * Math.PI) * 0.4 + Math.sin(i * 1.8) * 0.035, 0.15 + t * 0.2, 0.05 - t * 0.39 + Math.cos(i * 1.8) * 0.035);
  });
  const cord = cable(phone, cordPoints, 0.018, dark);
  const cordVertices = cord.geometry.getAttribute("position");
  const restingCord = Float32Array.from(cordVertices.array);
  let previousLift = -1;
  function liftReceiver(p: number) {
    handset.position.y = 0.35 + p * 0.85;
    handset.rotation.z = -p * 0.21;
    handset.position.z = -0.34 + p * 0.28;
    if (Math.abs(p - previousLift) < 0.0001) return;
    previousLift = p;
    for (let i = 0; i < cordVertices.count; i++) {
      const weight = Math.floor(i / 7) / 64;
      cordVertices.setXYZ(i, restingCord[i * 3] + (Math.cos(p * 0.21) - 1) * 0.52 * weight, restingCord[i * 3 + 1] + (p * 0.85 - Math.sin(p * 0.21) * 0.52) * weight, restingCord[i * 3 + 2] + p * 0.28 * weight);
    }
    cordVertices.needsUpdate = true;
    cord.geometry.computeBoundingSphere();
  }

  // Ordinary work residue gives the room a personal, occupied scale.
  const stationery = group(scene, 0.4, 1.09, -1.55);
  for (let i = 0; i < 3; i++) { const sheet = box(stationery, 1.4, 0.009, 0.84, paperEdge, i * 0.07, i * 0.018, i * -0.04); sheet.rotation.y = -0.17 + i * 0.05; }
  const pencil = cylinder(stationery, 0.025, 1.24, brass, 0.36, 0.08, 0.2); pencil.rotation.z = Math.PI / 2; pencil.rotation.y = -0.18;
  const mug = group(scene, 3.7, 1.09, 1.5);
  mesh(mug, new THREE.CylinderGeometry(0.19, 0.16, 0.38, 24, 1, true), paper, 0, 0.19, 0);
  cylinder(mug, 0.15, 0.009, deskEdge, 0, 0.29, 0);
  mesh(mug, new THREE.TorusGeometry(0.13, 0.035, 8, 20), paper, 0.21, 0.2, 0);

  const items: Record<ModuleId, OfficeItem> = {
    personnel: { root: badge, hit: hit(badge, "personnel", 1.12, 0.19, 0.79, 0.06), anchor: badge, edges: outline(badge), pose: () => {} },
    logs: { root: book, hit: hit(book, "logs", 1.85, 0.4, 2.2, 0.2), anchor: book, edges: outline(book), pose: (p) => { cover.rotation.z = Math.min(1, p) * 2.35; leaf.position.y = 0.19 + Math.max(0, p - 1) * 0.6; } },
    collections: { root: catalogue, hit: hit(catalogue, "collections", 1.75, 0.58, 1.5, 0.3), anchor: catalogue, edges: outline(catalogue), pose: (p) => { drawer.position.z = 0.15 + p * 0.86; } },
    creations: { root: jig, hit: hit(jig, "creations", 2.5, 0.66, 1.4, 0.3), anchor: wheel, edges: outline(jig), pose: (p) => { wheel.rotation.y = -p * Math.PI * 2; jaw.position.x = 0.6 - p * 0.23; cap.position.y = 0.45 - p * 0.24; } },
    sites: { root: phone, hit: hit(phone, "sites", 1.65, 0.6, 1.5, 0.3), anchor: handset, edges: outline(phone), pose: liftReceiver },
  };
  const badgeHome = new THREE.Vector3();
  function layout(compact: boolean) {
    table.scale.set(compact ? 0.59 : 1, 1, compact ? 1.36 : 1);
    pad.scale.set(compact ? 0.65 : 1, 1, compact ? 1.45 : 1);
    pad.position.set(compact ? 0.45 : 0.5, 1.075, compact ? 0.2 : 0.6);
    badgeHome.set(compact ? -1.38 : -2.65, 1.12, compact ? 2.25 : 1.3);
    badge.position.copy(badgeHome); badge.rotation.y = compact ? 0.09 : -0.16;
    reader.position.set(compact ? -1.37 : -2.85, 1.09, compact ? 0.75 : -0.02);
    book.position.set(compact ? 0.72 : -0.12, 1.11, compact ? 1.75 : 0.48);
    catalogue.position.set(compact ? -1.36 : -2.55, 1.09, compact ? -1.12 : -1.7);
    jig.position.set(compact ? 0.74 : 2.08, 1.1, compact ? -0.67 : 0.8);
    jig.scale.setScalar(compact ? 0.87 : 1);
    phone.position.set(compact ? 0.8 : 2.55, 1.1, compact ? -2.38 : -1.25);
    lamp.position.set(compact ? -1.77 : -3.65, 1.08, compact ? -2.75 : -1.55);
    stationery.visible = !compact; mug.visible = !compact;
  }
  layout(false);
  function setOutline(id: ModuleId | null, destination: boolean, directory: ModuleId | null) {
    edgeMaterial.opacity = directory ? 0.24 : 0.82;
    for (const module of moduleOrder) items[module].edges.forEach((edge) => { edge.visible = module === id || module === directory; });
    readerEdges.forEach((edge) => { edge.visible = destination || directory === "personnel"; });
  }
  function setAuthenticated(value: boolean) {
    readerStatus.color.setHex(value ? 0x879467 : 0x973d30);
    readerStatus.emissive.setHex(value ? 0x384625 : 0x000000);
    readerStatus.emissiveIntensity = value ? 0.25 : 0;
  }
  return { items, reader, readerHit, badgeHome, table, layout, setOutline, setAuthenticated, resources };
}
