import * as THREE from "three";
import { getMessages, type SystemCopy } from "@core/i18n";
import { buildOffice, moduleOrder, type ModuleId } from "./office-scene";
import { acceptsCard, clampProgress, gestureProgress } from "./office-actions";

declare global { interface Window { __ytHomeWorldCleanup?: () => void; __ytHomeWorldInit?: () => void; } }
type CopyKey = keyof SystemCopy;
type Stage = "idle" | "held" | "opened" | "committing";
interface Gesture {
  id: ModuleId; pointer: number; x: number; y: number; point: THREE.Vector3;
  dx: number; dy: number; dz: number; base: number; heldMs: number; moved: boolean;
  lastAngle: number; angle: number; useAngle: boolean; center: THREE.Vector2;
  cardOffset: THREE.Vector3;
}

function initHomeWorld() {
  const root = document.querySelector<HTMLElement>("[data-yt-world3d]");
  const canvas = root?.querySelector<HTMLCanvasElement>("[data-yt-world-canvas]");
  if (root?.dataset.ytWorldInitialized === "true") return;
  window.__ytHomeWorldCleanup?.();
  if (!root || !canvas) return;
  root.dataset.ytWorldInitialized = "true";
  const listeners = new AbortController();
  const { signal } = listeners;
  const shell = document.querySelector<HTMLElement>("[data-yt-shell]");
  const fallback = root.querySelector<HTMLElement>("[data-yt-world-fallback]");
  const title = root.querySelector<HTMLElement>("[data-office-title]");
  const hint = root.querySelector<HTMLElement>("[data-office-hint]");
  const action = root.querySelector<HTMLButtonElement>("[data-office-action]");
  const annotation = root.querySelector<HTMLElement>("[data-office-annotation]");
  const meter = root.querySelector<HTMLElement>("[data-office-progress]");
  const live = root.querySelector<HTMLElement>("[data-office-live]");
  const routeData = root.querySelector<HTMLElement>("[data-yt-world-routes]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motion.matches;
  let contextLost = false;
  let disposed = false;
  let frameId = 0;
  let navigationTimer = 0;
  let width = 1, height = 1;
  let compact = false;
  let focused: ModuleId | null = null;
  let directory: ModuleId | null = null;
  let committing: ModuleId | null = null;
  let gesture: Gesture | null = null;
  const stage = Object.fromEntries(moduleOrder.map((id) => [id, "idle"])) as Record<ModuleId, Stage>;
  const progress = Object.fromEntries(moduleOrder.map((id) => [id, 0])) as Record<ModuleId, number>;
  const target = { ...progress };
  let badgeHeld = false;
  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.4);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x989d90);
  const fog = new THREE.Fog(0x989d90, 25, 60);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  const cameraTarget = new THREE.Vector3(0, 1.15, 0.1);
  const cameraBase = new THREE.Vector3(3.4, 9.4, 10.6);
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "default" });
  } catch {
    root.dataset.ytWorldState = "unavailable";
    delete root.dataset.ytWorldInitialized;
    if (fallback) fallback.hidden = false;
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const office = buildOffice(scene);
  const hitMeshes = [...moduleOrder.map((id) => office.items[id].hit), office.readerHit];
  const readerDock = () => office.reader.position.clone().add(new THREE.Vector3(0, 0.16, 0));
  const paused = () => contextLost || document.hidden || shell?.classList.contains("is-menu-open") || shell?.classList.contains("is-settings-open");
  const copy = () => getMessages(document.documentElement.lang === "en-US" ? "en-US" : "zh-CN");
  function setCopy(element: HTMLElement | null, key: CopyKey) {
    if (!element) return;
    element.dataset.ytCopy = key;
    element.textContent = copy()[key];
  }
  const names: Record<ModuleId, CopyKey> = { personnel: "officeCard", logs: "officeBook", collections: "officeCatalogue", creations: "officeJig", sites: "officePhone" };
  const hints: Record<ModuleId, CopyKey> = { personnel: "officeCardHint", logs: "officeBookHint", collections: "officeCatalogueHint", creations: "officeJigHint", sites: "officePhoneHint" };
  const actions: Record<ModuleId, CopyKey> = { personnel: "officePickCard", logs: "officeOpenBook", collections: "officePullDrawer", creations: "officeTurnWheel", sites: "officeLiftPhone" };
  function updateContext(override?: CopyKey) {
    const id = focused;
    setCopy(title, id ? names[id] : "officeTitle");
    let hintKey: CopyKey = id ? hints[id] : "officeWelcome";
    let actionKey: CopyKey = id ? actions[id] : "officePickCard";
    if (id === "personnel" && badgeHeld) { hintKey = "officeCardHeld"; actionKey = "officeInsertCard"; }
    if ((id === "logs" || id === "collections") && stage[id] === "opened") { hintKey = "officeReadHint"; actionKey = "officeReadRecord"; }
    if (committing) hintKey = committing === "personnel" ? "officeAuthenticated" : "officeOpening";
    setCopy(hint, override || hintKey);
    setCopy(action, actionKey);
    if (action) action.disabled = !!committing;
    if (annotation) {
      setCopy(annotation, id ? names[id] : "officeTitle");
      annotation.hidden = !id;
    }
    root!.dataset.officeSelected = id || "none";
    root!.dataset.officeStage = id ? stage[id] : "idle";
  }
  function focus(id: ModuleId | null) {
    if (focused === id) return;
    focused = id;
    updateContext();
  }
  function pointOnDesk(event: PointerEvent) {
    const rect = canvas!.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    return ray.ray.intersectPlane(dragPlane, new THREE.Vector3()) || new THREE.Vector3();
  }
  function pick(event: PointerEvent): ModuleId | "reader" | null {
    pointOnDesk(event);
    scene.updateMatrixWorld(true);
    return (ray.intersectObjects(hitMeshes, false)[0]?.object.userData.officeTarget as ModuleId | "reader") || null;
  }
  function releaseCapture() {
    const captured = gesture;
    gesture = null;
    if (captured && canvas!.hasPointerCapture?.(captured.pointer)) canvas!.releasePointerCapture(captured.pointer);
    root!.classList.remove("is-manipulating");
  }
  function reset() {
    releaseCapture();
    window.clearTimeout(navigationTimer);
    committing = null;
    badgeHeld = false;
    for (const id of moduleOrder) { stage[id] = "idle"; target[id] = 0; }
    office.setAuthenticated(false);
    root!.classList.remove("is-activating");
    updateContext();
  }
  function commit(id: ModuleId) {
    if (committing) return;
    releaseCapture();
    committing = id;
    focused = id;
    stage[id] = "committing";
    target[id] = id === "logs" ? 1.36 : 1;
    if (id === "personnel") { badgeHeld = false; office.setAuthenticated(true); }
    root!.classList.add("is-activating");
    updateContext();
    setCopy(live, id === "personnel" ? "officeAuthenticated" : "officeOpening");
    navigationTimer = window.setTimeout(() => {
      if (paused()) { reset(); return; }
      try { localStorage.setItem("yibel-last-module", id); } catch { /* Reading remains available without storage. */ }
      const href = routeData?.dataset[id];
      if (href) window.location.assign(href);
    }, reducedMotion ? 160 : 780);
  }
  function operate() {
    if (paused() || committing) return;
    const id = focused || "personnel";
    focus(id);
    if (id === "personnel") {
      if (badgeHeld) commit(id);
      else { badgeHeld = true; stage[id] = "held"; updateContext(); }
    } else if (id === "logs" || id === "collections") {
      if (stage[id] === "opened") commit(id);
      else { stage[id] = "opened"; target[id] = 1; updateContext(); }
    } else if (id === "creations") {
      target[id] = clampProgress(target[id] + 0.5);
      if (target[id] >= 1) commit(id);
      else updateContext("officeHalfTurn");
    } else commit(id);
  }
  function project(object: THREE.Object3D) {
    const p = object.getWorldPosition(new THREE.Vector3()).project(camera);
    return new THREE.Vector2((p.x * 0.5 + 0.5) * width, (-p.y * 0.5 + 0.5) * height);
  }
  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || paused() || committing || gesture) return;
    const picked = pick(event);
    if (!picked) { if (!badgeHeld) focus(null); return; }
    event.preventDefault();
    canvas!.focus({ preventScroll: true });
    focus(picked === "reader" ? "personnel" : picked);
    if (picked === "reader") {
      if (badgeHeld) commit("personnel");
      else updateContext("officeNeedCard");
      return;
    }
    const point = pointOnDesk(event);
    const center = project(office.items[picked].anchor);
    const rect = canvas!.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    gesture = {
      id: picked, pointer: event.pointerId, x: event.clientX, y: event.clientY, point,
      dx: 0, dy: 0, dz: 0, base: target[picked], heldMs: 0, moved: false,
      center, lastAngle: Math.atan2(y - center.y, x - center.x), angle: 0,
      useAngle: Math.hypot(x - center.x, y - center.y) > 15,
      cardOffset: office.items.personnel.root.position.clone().sub(point),
    };
    if (picked === "personnel") { badgeHeld = true; stage.personnel = "held"; }
    canvas!.setPointerCapture?.(event.pointerId);
    root!.classList.add("is-manipulating");
    updateContext();
  }
  function onPointerMove(event: PointerEvent) {
    if (paused() || committing) return;
    if (!gesture) {
      const picked = pick(event);
      if (picked) focus(picked === "reader" ? "personnel" : picked);
      canvas!.style.cursor = picked ? (picked === "reader" ? "pointer" : "grab") : "default";
      if (event.pointerType === "mouse") parallax.copy(pointer);
      return;
    }
    if (event.pointerId !== gesture.pointer) return;
    const g = gesture;
    const point = pointOnDesk(event);
    g.dx = event.clientX - g.x; g.dy = event.clientY - g.y; g.dz = point.z - g.point.z;
    g.moved ||= Math.hypot(g.dx, g.dy) > 7;
    if (g.id === "personnel") {
      const desired = point.add(g.cardOffset);
      desired.x = THREE.MathUtils.clamp(desired.x, compact ? -2.15 : -4, compact ? 2.15 : 4);
      desired.z = THREE.MathUtils.clamp(desired.z, compact ? -3 : -2.2, compact ? 3 : 2.2);
      desired.y = 1.4;
      office.items.personnel.root.position.copy(desired);
      office.items.personnel.root.rotation.y *= 0.8;
    } else {
      if (g.id === "creations" && g.useAngle) {
        const rect = canvas!.getBoundingClientRect();
        const angle = Math.atan2(event.clientY - rect.top - g.center.y, event.clientX - rect.left - g.center.x);
        let delta = angle - g.lastAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        g.angle += delta; g.lastAngle = angle;
      }
      target[g.id] = gestureProgress(g.id, { ...g, angle: g.id === "creations" && g.useAngle ? g.angle : undefined });
    }
  }
  function onPointerUp(event: PointerEvent) {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    onPointerMove(event);
    const g = gesture;
    if (!g) return;
    releaseCapture();
    if (g.id === "personnel") {
      if (g.moved) {
        office.reader.updateWorldMatrix(true, false);
        const local = office.reader.worldToLocal(office.items.personnel.root.position.clone());
        if (acceptsCard(local.x, local.z)) commit("personnel");
        else { badgeHeld = false; stage.personnel = "idle"; updateContext("officeCardMiss"); }
      } else updateContext();
    } else if (g.id === "logs") {
      if (!g.moved) operate();
      else { stage.logs = target.logs > 0.65 ? "opened" : "idle"; target.logs = stage.logs === "opened" ? 1 : 0; updateContext(); }
    } else if (g.id === "collections") {
      if (!g.moved) operate();
      else if (target.collections > 0.8) commit("collections");
      else { target.collections = 0; stage.collections = "idle"; updateContext(); }
    } else if (g.id === "creations") {
      if (!g.moved) operate();
      else if (target.creations > 0.92) commit("creations");
    } else {
      if (target.sites > 0.74) commit("sites");
      else { target.sites = 0; updateContext(); }
    }
  }
  function cancelPointer() {
    if (!gesture) return;
    const id = gesture.id;
    releaseCapture();
    if (id === "personnel") { badgeHeld = false; stage[id] = "idle"; }
    else if (stage[id] !== "opened") target[id] = 0;
    updateContext();
  }
  function resize() {
    cancelPointer();
    width = canvas!.clientWidth || window.innerWidth;
    height = canvas!.clientHeight || window.innerHeight;
    compact = width <= 760;
    office.layout(compact);
    camera.aspect = width / height;
    camera.position.copy(compact ? new THREE.Vector3(0, 12.3, 8.3) : new THREE.Vector3(3.4, 9.4, 10.6));
    camera.lookAt(cameraTarget);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); scene.updateMatrixWorld(true);
    // Fit actual interactive bounds, not the empty room, with space for the instructions.
    const corners: THREE.Vector3[] = [];
    for (const id of moduleOrder) {
      const bounds = new THREE.Box3().setFromObject(office.items[id].hit);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
    for (let attempt = 0; attempt < 20; attempt++) {
      if (corners.every((p) => { const n = p.clone().project(camera); return Math.abs(n.x) < 0.88 && Math.abs(n.y) < (height < 550 ? 0.5 : 0.67); })) break;
      camera.position.sub(cameraTarget).multiplyScalar(1.07).add(cameraTarget);
      camera.lookAt(cameraTarget); camera.updateMatrixWorld();
    }
    cameraBase.copy(camera.position);
    const distance = cameraBase.distanceTo(cameraTarget);
    fog.near = distance + 5; fog.far = distance + 30;
    camera.far = distance + 40; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.35 : 1.65));
    renderer.setSize(width, height, false);
  }
  function onKey(event: KeyboardEvent) {
    if (paused()) return;
    if (event.key === "Escape") { reset(); return; }
    if (event.target instanceof Element && event.target.closest("button,a,input,textarea,select")) return;
    if (committing) return;
    const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
    if (delta) {
      event.preventDefault();
      const index = focused ? moduleOrder.indexOf(focused) : delta > 0 ? -1 : 0;
      focus(moduleOrder[(index + delta + moduleOrder.length) % moduleOrder.length]);
    } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); operate(); }
  }
  canvas.addEventListener("pointerdown", onPointerDown, { signal });
  canvas.addEventListener("pointermove", onPointerMove, { signal });
  canvas.addEventListener("pointerup", onPointerUp, { signal });
  canvas.addEventListener("pointercancel", cancelPointer, { signal });
  canvas.addEventListener("lostpointercapture", cancelPointer, { signal });
  canvas.addEventListener("pointerleave", () => { parallax.set(0, 0); }, { signal });
  action?.addEventListener("click", operate, { signal });
  document.addEventListener("keydown", onKey, { signal });
  window.addEventListener("resize", resize, { signal });
  window.addEventListener("blur", cancelPointer, { signal });
  document.addEventListener("visibilitychange", cancelPointer, { signal });
  motion.addEventListener("change", (event) => { reducedMotion = event.matches; }, { signal });
  document.addEventListener("yt:directory", ((event: CustomEvent<{ open: boolean; module: ModuleId }>) => {
    if (event.detail.open) { cancelPointer(); if (committing) reset(); }
    directory = event.detail.open && moduleOrder.includes(event.detail.module) ? event.detail.module : null;
  }) as EventListener, { signal });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault(); contextLost = true; reset(); root.dataset.ytWorldState = "unavailable";
    if (fallback) fallback.hidden = false;
  }, { signal });
  canvas.addEventListener("webglcontextrestored", () => { cleanup(); initHomeWorld(); }, { signal });
  const localeObserver = new MutationObserver(() => updateContext());
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  resize(); updateContext();
  if (shell?.classList.contains("is-menu-open")) directory = (shell.querySelector<HTMLElement>("[data-yt-menu-link].is-active")?.dataset.ytModule as ModuleId) || "personnel";
  let lastTime = performance.now();
  function frame(time: number) {
    if (disposed) return;
    if (!root!.isConnected) { cleanup(); return; }
    const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000)); lastTime = time;
    if (!paused()) {
      if (gesture?.id === "sites") {
        gesture.heldMs += dt * 1000;
        target.sites = gestureProgress("sites", gesture);
        if (target.sites >= 1) commit("sites");
      }
      const damping = reducedMotion ? 1 : 1 - Math.exp(-13 * dt);
      for (const id of moduleOrder) { progress[id] += (target[id] - progress[id]) * damping; office.items[id].pose(progress[id]); }
      if (gesture?.id !== "personnel") {
        const badgeTarget = committing === "personnel" ? readerDock() : office.badgeHome.clone().add(new THREE.Vector3(0, badgeHeld ? 0.3 : 0, 0));
        office.items.personnel.root.position.lerp(badgeTarget, damping);
        const angle = badgeHeld || committing === "personnel" ? 0 : compact ? 0.09 : -0.16;
        office.items.personnel.root.rotation.y += (angle - office.items.personnel.root.rotation.y) * damping;
      }
      const cameraGoal = cameraBase.clone();
      if (!reducedMotion && !gesture) cameraGoal.add(new THREE.Vector3(parallax.x * 0.08, parallax.y * 0.035, 0));
      camera.position.lerp(cameraGoal, damping); camera.lookAt(cameraTarget);
    }
    office.setOutline(directory ? null : focused, !directory && badgeHeld, directory);
    if (annotation && focused && !paused()) {
      const p = project(office.items[focused].anchor);
      annotation.style.left = `${THREE.MathUtils.clamp(p.x, 95, Math.max(95, width - 95)).toFixed(1)}px`;
      annotation.style.top = `${THREE.MathUtils.clamp(p.y - 45, 100, height - 160).toFixed(1)}px`;
    }
    if (meter) { const value = focused ? progress[focused] : 0; meter.style.setProperty("--office-progress", String(clampProgress(value))); meter.hidden = !focused || focused === "personnel"; }
    if (!contextLost) {
      renderer.render(scene, camera);
      root!.dataset.ytWorldState = "ready";
      if (fallback) fallback.hidden = true;
    }
    frameId = window.requestAnimationFrame(frame);
  }
  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(frameId); window.clearTimeout(navigationTimer);
    listeners.abort(); localeObserver.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>(office.resources);
    scene.traverse((node) => {
      if (node instanceof THREE.DirectionalLight) node.shadow.dispose();
      if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
        geometries.add(node.geometry);
        (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => materials.add(m));
      }
    });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
    renderer.renderLists.dispose(); renderer.dispose();
    delete root!.dataset.ytWorldInitialized;
    if (window.__ytHomeWorldCleanup === cleanup) delete window.__ytHomeWorldCleanup;
  }
  window.__ytHomeWorldCleanup = cleanup;
  document.addEventListener("astro:before-swap", cleanup, { once: true, signal });
  frame(lastTime);
}
if (window.__ytHomeWorldInit) document.removeEventListener("astro:page-load", window.__ytHomeWorldInit);
window.__ytHomeWorldInit = initHomeWorld;
document.addEventListener("astro:page-load", initHomeWorld);
initHomeWorld();
