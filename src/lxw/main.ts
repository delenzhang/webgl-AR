import { HandTracker } from '../core/HandTracker';
import { SceneManager } from '../core/SceneManager';
import { RasenganSystem } from './RasenganSystem';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class RasenganApp {
  private handTracker: HandTracker;
  private sceneManager: SceneManager | null = null;
  private rasenganSystem: RasenganSystem | null = null;
  private clock: THREE.Clock;
  private videoElement: HTMLVideoElement;
  private canvas2d: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private gestureEl: HTMLElement;
  private motionEl: HTMLElement;
  private controls: OrbitControls | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.handTracker = new HandTracker();
    this.videoElement = document.getElementById('input-video') as HTMLVideoElement;
    this.canvas2d = document.getElementById('output-canvas') as HTMLCanvasElement;
    this.ctx2d = this.canvas2d.getContext('2d')!;
    this.gestureEl = document.getElementById('gesture-state')!;
    this.motionEl = document.getElementById('hand-motion')!;
    this.clock = new THREE.Clock();

    this.setupFullscreenButton();
  }

  setupFullscreenButton() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', async () => {
        try {
          // 请求全屏
          await document.body.requestFullscreen();
          // 初始化应用
          await this.init();
        } catch (error) {
          console.error('全屏或初始化失败:', error);
          // 即使全屏失败也尝试初始化
          await this.init();
        }
      });
    }
  }

  async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 隐藏加载屏幕
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.style.display = 'none';

      // 初始化画布大小
      this.resize();
      window.addEventListener('resize', () => this.resize());

      // 创建3D场景
      const appContainer = document.createElement('div');
      appContainer.id = 'three-container';
      document.body.appendChild(appContainer);
      
      this.sceneManager = new SceneManager(appContainer);
      
      // 允许鼠标交互
      this.sceneManager.renderer.domElement.style.pointerEvents = 'auto';
      this.controls = new OrbitControls(this.sceneManager.camera, this.sceneManager.renderer.domElement);
      this.controls.enableDamping = true;

      // 创建螺旋丸系统
      this.rasenganSystem = new RasenganSystem(
        this.sceneManager.scene, 
        this.handTracker, 
        this.sceneManager.camera,
        2.0
      );

      // 启动手势跟踪器
      await this.handTracker.start(this.videoElement);

      // 监听结果
      this.handTracker.onResults((results) => {
        this.handleResults(results);
      });

      this.animate();
    } catch (error) {
      console.error('初始化失败:', error);
      alert('初始化失败: ' + error);
    }
  }

  resize() {
    this.canvas2d.width = window.innerWidth;
    this.canvas2d.height = window.innerHeight;
    // SceneManager 内部可能已经处理了 resize，或者我们需要手动触发
    if (this.sceneManager && this.sceneManager.renderer) {
      this.sceneManager.renderer.setSize(window.innerWidth, window.innerHeight);
      this.sceneManager.camera.aspect = window.innerWidth / window.innerHeight;
      this.sceneManager.camera.updateProjectionMatrix();
    }
  }

  handleResults(results: any) {
    if (!this.rasenganSystem) return;

    // 清空画布，不绘制骨架线
    this.ctx2d.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);

    // 更新螺旋丸系统
    const time = this.clock.getElapsedTime();
    this.rasenganSystem.update(results, time);

    // 更新 UI
    const gesture = this.handTracker.detectGesture(results);
    const isMoving = this.handTracker.isMoving();
    this.updateUI(gesture, isMoving);
  }

  updateUI(gesture: string, isMoving: boolean) {
    let stateText = '未知';
    let color = '#fff';

    switch(gesture) {
      case 'FOLD':
        stateText = '握拳 (FOLD)';
        color = '#ff4444';
        break;
      case 'RELEASE':
        stateText = '五指撑开 (RELEASE) - 螺旋丸生成中!';
        color = '#00ffaa';
        break;
      case 'TRACK':
        stateText = '手印/跟踪 (TRACK)';
        color = '#44aaff';
        break;
      case 'NONE':
        stateText = '寻找手掌...';
        color = '#aaa';
        break;
    }

    this.gestureEl.innerText = stateText;
    this.gestureEl.style.color = color;
    
    this.motionEl.innerText = isMoving ? '正在运动 🏃' : '静止中 🛑';
    this.motionEl.style.color = isMoving ? '#ffaa00' : '#00ffaa';
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.controls) this.controls.update();
    if (this.sceneManager) this.sceneManager.render();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RasenganApp();
});
