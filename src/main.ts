import { HandTracker, GestureState } from './core/HandTracker';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { SceneManager } from './core/SceneManager';
import { SwordSystem } from './core/SwordSystem';
import * as THREE from 'three';
import gsap from 'gsap';

class App {
  private handTracker: HandTracker;
  private sceneManager: SceneManager;
  private swordSystem: SwordSystem;
  private currentGesture: GestureState = 'NONE';
  private clock: THREE.Clock;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private latestHandResults: any = null; // 存储最新的手势识别结果
  
  constructor() {
    this.handTracker = new HandTracker();
    this.sceneManager = new SceneManager(document.getElementById('app')!);
    this.swordSystem = new SwordSystem(this.sceneManager.scene);
    this.clock = new THREE.Clock();

    const canvas2d = document.getElementById('output-canvas') as HTMLCanvasElement;
    if (canvas2d) {
      this.ctx2d = canvas2d.getContext('2d');
      // 设置 canvas 尺寸
      canvas2d.width = window.innerWidth;
      canvas2d.height = window.innerHeight;
      window.addEventListener('resize', () => {
        canvas2d.width = window.innerWidth;
        canvas2d.height = window.innerHeight;
      });
    }

    this.init();
  }

  async init() {
    try {
      const video = document.getElementById('input-video') as HTMLVideoElement;
      this.videoElement = video;
      
      // 先启动 MediaPipe Camera，这会请求摄像头权限并开始视频流
      this.updateStatus('正在请求摄像头权限...');
      await this.handTracker.start(video);
      
      // 等待视频开始播放（摄像头流开始）
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('摄像头启动超时'));
        }, 10000); // 10秒超时
        
        const checkReady = () => {
          if (video.readyState >= 2 && video.videoWidth > 0) {
            clearTimeout(timeout);
            resolve(undefined);
          } else {
            video.addEventListener('loadedmetadata', checkReady, { once: true });
            video.addEventListener('playing', checkReady, { once: true });
          }
        };
        checkReady();
      });
      
      // 视频流开始后，启动视频绘制循环
      this.startVideoDrawLoop();
      
      document.getElementById('loading-screen')?.remove();
      this.updateStatus('准备就绪 - 请展示你的手掌');

      this.handTracker.onResults((results) => {
        // 保存最新的手势识别结果，在视频绘制循环中一起绘制
        this.latestHandResults = results;
        this.handleHandResults(results);
      });

      this.animate();
    } catch (error) {
      console.error('初始化失败:', error);
      this.updateStatus('错误: 无法访问摄像头或加载模型');
      document.getElementById('loading-screen')?.remove();
    }
  }
  
  private startVideoDrawLoop() {
    const drawVideo = () => {
      if (this.ctx2d && this.videoElement && this.videoElement.readyState >= 2 && this.videoElement.videoWidth > 0) {
        // 清空画布
        this.ctx2d.clearRect(0, 0, this.ctx2d.canvas.width, this.ctx2d.canvas.height);
        
        // 先绘制视频
        this.ctx2d.save();
        // 应用镜像变换（水平翻转）
        this.ctx2d.scale(-1, 1);
        this.ctx2d.drawImage(
          this.videoElement!,
          -this.ctx2d.canvas.width,
          0,
          this.ctx2d.canvas.width,
          this.ctx2d.canvas.height
        );
        this.ctx2d.restore();
        
        // 然后绘制手势识别结果（如果有）
        if (this.latestHandResults) {
          this.drawHandLandmarks(this.ctx2d, this.latestHandResults);
        }
      }
      requestAnimationFrame(drawVideo);
    };
    drawVideo();
  }
  
  private drawHandLandmarks(ctx: CanvasRenderingContext2D, results: any) {
    // 只绘制手势识别结果，不重新绘制视频
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      ctx.save();
      // 应用镜像变换以匹配 video 的镜像
      ctx.scale(-1, 1);
      ctx.translate(-ctx.canvas.width, 0);
      
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 5
        });
        drawLandmarks(ctx, landmarks, {
          color: '#FF0000',
          lineWidth: 2,
          radius: 3
        });
      }
      ctx.restore();
    }
  }

  private handleHandResults(results: any) {
    const gesture = this.handTracker.detectGesture(results);
    if (gesture !== this.currentGesture) {
      this.currentGesture = gesture;
      this.onGestureChange(gesture);
    }

    // 输出详细的手势状态信息
    this.outputGestureStatus(results, gesture);

    // 更新剑系统
    const center = this.handTracker.getHandCenter(results);
    const rotation = this.handTracker.getHandRotation(results);

    if (center) {
      // 将 MediaPipe 坐标 (0-1) 转换为 Three.js 场景坐标
      // MediaPipe 0,0 在左上，X 向右，Y 向下
      const targetX = (center.x - 0.5) * 15;
      const targetY = -(center.y - 0.5) * 10;
      
      this.swordSystem.updateTarget(targetX, targetY, rotation);
    }

    // 更新轨迹跟随
    const trail = this.handTracker.getMiddleFingerTrail();
    this.swordSystem.updateTrail(trail);
  }

  private outputGestureStatus(results: any, gesture: GestureState) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    
    // 获取中指关键点
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];
    
    // 计算方向向量
    const dx = middleTip.x - middlePip.x;
    const dy = middleTip.y - middlePip.y;
    const dz = middleTip.z - middlePip.z;
    
    // 获取轨迹信息
    const trail = this.handTracker.getMiddleFingerTrail();
    const isMoving = this.handTracker.isMoving();
    
    // 输出状态到控制台
    console.log(`手势状态: ${this.getGestureName(gesture)}`);
    console.log(`手部运动: ${isMoving ? '运动中' : '静止'}`);
    console.log(`中指方向向量: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)}, dz=${dz.toFixed(3)}`);
    console.log(`轨迹点数: ${trail.length}`);
    
    // 更新UI显示
    const hintEl = document.getElementById('gesture-hint');
    if (hintEl) {
      if (gesture.startsWith('MIDDLE_')) {
        hintEl.innerHTML = `
          <div>检测到: ${this.getGestureName(gesture)}</div>
          <div style="font-size: 12px; opacity: 0.6;">
            方向向量: (${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)})
          </div>
          <div style="font-size: 12px; opacity: 0.8; color: ${isMoving ? '#ff6600' : '#00ffaa'};">
            手部状态: ${isMoving ? '运动中 🏃' : '静止 🛑'} | 轨迹跟随: ${trail.length > 3 ? '激活' : '待机'} (${trail.length}点)
          </div>
        `;
      } else {
        hintEl.innerHTML = `
          <div>${this.getGestureName(gesture)}</div>
          <div style="font-size: 12px; opacity: 0.6;">
            手部状态: ${isMoving ? '运动中 🏃 (无法切换姿态)' : '静止 🛑'}
          </div>
          <div style="font-size: 12px; opacity: 0.6;">
            轨迹点数: ${trail.length}
          </div>
        `;
      }
    }
  }

  private onGestureChange(gesture: GestureState) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = `状态: ${this.getGestureName(gesture)}`;
    
    // 更新剑系统状态
    if (gesture !== 'NONE') {
      this.swordSystem.setState(gesture as any);
    }
    
    // 如果不是中指方向手势，清空轨迹
    if (!gesture.startsWith('MIDDLE_')) {
      this.handTracker.clearTrail();
    }
  }

  private getGestureName(gesture: GestureState): string {
    switch (gesture) {
      case 'FOLD': return '收起 (拳头)';
      case 'RELEASE': return '释放 (五指撑开)';
      case 'MIDDLE_UP': return '中指向上';
      case 'MIDDLE_DOWN': return '中指向下';
      case 'MIDDLE_LEFT': return '中指向左';
      case 'MIDDLE_RIGHT': return '中指向右';
      case 'MIDDLE_FORWARD': return '中指向前';
      case 'MIDDLE_BACKWARD': return '中指向后';
      default: return '寻找手势...';
    }
  }

  private updateStatus(msg: string) {
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = msg;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    
    // WebGL 渲染
    const elapsed = this.clock.getElapsedTime();
    const delta = this.clock.getDelta(); // 获取两帧之间的时间间隔
    this.swordSystem.update(elapsed, delta);
    this.sceneManager.render();
  }
}

new App();
