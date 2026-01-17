import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  
  constructor(canvasParent: HTMLElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0); 
    canvasParent.appendChild(this.renderer.domElement);
    
    // 显式强制 CSS 透明
    this.renderer.domElement.style.background = 'transparent';
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '5';
    this.renderer.domElement.style.pointerEvents = 'none';

    // 灯光：针对青光剑优化
    const ambientLight = new THREE.AmbientLight(0x00ffff, 0.4); 
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffcc, 5, 50);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    // 暂时移除或重构后期处理，因为 UnrealBloomPass 经常会覆盖 Alpha 通道
    // 为了实现 AR 效果，我们将直接使用渲染器进行基础渲染
    // 稍后如果需要发光，我们会使用其他方案
    this.composer = new EffectComposer(this.renderer);
    // ... 后续代码保持不变，但我会在 render() 中切换 ...
  }

  // ... (中间代码省略) ...

  render() {
    // 核心修复：直接使用 renderer 渲染以确保 Alpha 通道不被后期处理破坏
    // 如果想要 Bloom 效果且支持透明，需要更复杂的着色器，
    // 这里先优先保证 AR 透明效果
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    // this.composer.render(); // 暂时注释掉可能导致黑色背景的 composer
  }
}
