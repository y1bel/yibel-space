declare module "three" {
  class ThreeAny {
    [key: string]: any;
    constructor(...args: any[]);
  }

  export class Object3D extends ThreeAny {}
  export class Group extends Object3D {}
  export class Scene extends Object3D {}
  export class Mesh extends Object3D {}
  export class PerspectiveCamera extends Object3D {}
  export class WebGLRenderer extends ThreeAny {}
  export class Raycaster extends ThreeAny {}
  export class Color extends ThreeAny {}
  export class Fog extends ThreeAny {}
  export class CanvasTexture extends ThreeAny {}
  export class BoxGeometry extends ThreeAny {}
  export class PlaneGeometry extends ThreeAny {}
  export class RingGeometry extends ThreeAny {}
  export class TorusGeometry extends ThreeAny {}
  export class IcosahedronGeometry extends ThreeAny {}
  export class HemisphereLight extends Object3D {}
  export class DirectionalLight extends Object3D {}
  export class PointLight extends Object3D {}
  export class MeshStandardMaterial extends ThreeAny {}
  export class MeshPhysicalMaterial extends ThreeAny {}
  export class MeshBasicMaterial extends ThreeAny {}

  export class Vector2 extends ThreeAny {
    x: number;
    y: number;
    set(x: number, y: number): this;
  }

  export class Vector3 extends ThreeAny {
    x: number;
    y: number;
    z: number;
    clone(): Vector3;
    add(value: Vector3): this;
    subVectors(a: Vector3, b: Vector3): this;
    normalize(): this;
    multiplyScalar(value: number): this;
    applyMatrix4(matrix: any): this;
    project(camera: any): this;
    lerp(value: Vector3, alpha: number): this;
  }

  export type Material = ThreeAny;

  export const RepeatWrapping: any;
  export const SRGBColorSpace: any;
  export const PCFSoftShadowMap: any;
  export const ACESFilmicToneMapping: any;
}
