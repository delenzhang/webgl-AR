import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as THREE from 'three';

export type GestureState = 'FOLD' | 'RELEASE' | 'TRACK' | 'NONE';

interface TrailPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export class HandTracker {
  private hands: Hands;
  private camera: Camera | null = null;
  private onResultsCallbacks: ((results: Results) => void)[] = [];
  
  // 中指轨迹追踪
  private middleFingerTrail: TrailPoint[] = [];
  private maxTrailLength: number = 30; // 保留最近30个点
  private trailUpdateThreshold: number = 0.02; // 移动距离阈值
  private lastMiddlePosition: THREE.Vector3 | null = null;
  
  // 手部运动检测
  private handCenterHistory: THREE.Vector3[] = [];
  private maxHistoryLength: number = 10; // 保留最近10帧的位置
  private motionThreshold: number = 0.5; // 运动阈值（场景坐标单位）
  private isHandMoving: boolean = false;
  
  constructor() {
    this.hands = new Hands({
      locateFile: (file) => {
        // 使用本地文件，避免网络延迟
        return `/mediapipe/hands/${file}`;
      }
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    this.hands.onResults((results) => {
      this.onResultsCallbacks.forEach(cb => cb(results));
    });
  }

  async start(videoElement: HTMLVideoElement) {
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });
    return this.camera.start();
  }

  onResults(callback: (results: Results) => void) {
    this.onResultsCallbacks.push(callback);
  }

  draw(ctx: CanvasRenderingContext2D, results: Results, videoElement?: HTMLVideoElement) {
    // 清空画布
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 先绘制 video 帧到 canvas（应用镜像）
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      ctx.save();
      // 应用镜像变换（水平翻转）
      ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -ctx.canvas.width, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    
    // 然后绘制 MediaPipe 手势识别结果（也需要镜像以匹配 video）
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

  // 手势识别逻辑：检查拳头、五指撑开、中指+食指并拢
  detectGesture(results: Results): GestureState {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return 'NONE';
    }

    const landmarks = results.multiHandLandmarks[0];
    
    // 更新手部运动状态
    this.updateHandMotion(landmarks);
    
    // FOLD 和 RELEASE 只在手静止时才能触发
    if (!this.isHandMoving) {
      // 判断握拳 (FOLD): 所有手指都收起
      const isFolded = this.checkFolded(landmarks);
      if (isFolded) return 'FOLD';

      // 判断五指撑开 (RELEASE): 所有手指都张开
      const isReleased = this.checkReleased(landmarks);
      if (isReleased) {
        // RELEASE 状态下也要更新中指轨迹，用于剑的跟随
        this.updateMiddleFingerTrail(landmarks);
        return 'RELEASE';
      }
    }

    // 检查是否只有中指和食指撑开并拢，其他手指握住 -> TRACK 状态
    const isIndexMiddleOpen = this.checkIndexMiddleOpen(landmarks);
    if (isIndexMiddleOpen) {
      // 更新中指轨迹
      this.updateMiddleFingerTrail(landmarks);
      return 'TRACK';
    }

    // 默认返回 NONE
    return 'NONE';
  }
  
  // 检查是否只有中指和食指撑开并拢，其他手指握住
  private checkIndexMiddleOpen(landmarks: any[]): boolean {
    // 检查拇指是否握住（拇指向内弯曲）
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    // 拇指握住：指尖相对于MCP关节向内弯曲
    const thumbFolded = thumbTip.x > thumbMcp.x;
    
    // 检查食指是否张开
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const indexMcp = landmarks[5];
    const indexOpen = indexTip.y < indexPip.y - 0.02; // 食指张开，增加阈值
    
    // 检查中指是否张开
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];
    const middleOpen = middleTip.y < middlePip.y - 0.02; // 中指张开，增加阈值
    
    // 检查中指和食指是否并拢（指尖距离较近）
    const indexMiddleDist = Math.sqrt(
      Math.pow(indexTip.x - middleTip.x, 2) + 
      Math.pow(indexTip.y - middleTip.y, 2) +
      Math.pow(indexTip.z - middleTip.z, 2)
    );
    const indexMiddleClose = indexMiddleDist < 0.12; // 调大阈值，原为 0.06，更容易识别并拢状态
    
    // 检查无名指是否握住
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const ringMcp = landmarks[13];
    const ringFolded = ringTip.y > ringPip.y; // 无名指握住，放宽阈值
    
    // 检查小指是否握住
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];
    const pinkyMcp = landmarks[17];
    const pinkyFolded = pinkyTip.y > pinkyPip.y; // 小指握住，放宽阈值
    
    // 额外检查：确保食指和中指的长度足够（避免误判弯曲的手指）
    const indexLength = Math.sqrt(
      Math.pow(indexTip.x - indexMcp.x, 2) + 
      Math.pow(indexTip.y - indexMcp.y, 2)
    );
    const middleLength = Math.sqrt(
      Math.pow(middleTip.x - middleMcp.x, 2) + 
      Math.pow(middleTip.y - middleMcp.y, 2)
    );
    const fingersExtended = indexLength > 0.05 && middleLength > 0.05; // 调小长度阈值，原为 0.08
    
    // 只有中指和食指张开并拢，其他手指都握住，且手指充分伸展
    return indexOpen && middleOpen && indexMiddleClose && 
           ringFolded && pinkyFolded && fingersExtended;
  }
  
  // 检查五指是否撑开
  private checkReleased(landmarks: any[]): boolean {
    // 检查所有手指是否都张开
    // 指尖应该在指根的上方（y 值更小，因为 MediaPipe 坐标系 y 向下）
    const fingerTips = [4, 8, 12, 16, 20];  // 拇指、食指、中指、无名指、小指
    const fingerBases = [2, 5, 9, 13, 17];   // 对应的指根
    
    let openCount = 0;
    for (let i = 0; i < fingerTips.length; i++) {
      // 对于拇指，需要特殊处理（拇指的关节结构不同）
      if (i === 0) {
        // 拇指：比较指尖和 IP 关节
        if (landmarks[fingerTips[i]].x < landmarks[fingerBases[i]].x) {
          openCount++;
        }
      } else {
        // 其他手指：指尖应该在指根上方（y 值更小）
        if (landmarks[fingerTips[i]].y < landmarks[fingerBases[i]].y) {
          openCount++;
        }
      }
    }
    
    // 至少 4 个手指张开才认为是五指撑开
    return openCount >= 4;
  }

  private checkFolded(landmarks: any[]): boolean {
    // 判断握拳：所有手指都收起
    // 指尖应该在指根的下方（y 值更大，因为 MediaPipe 坐标系 y 向下）
    const fingerTips = [4, 8, 12, 16, 20];  // 拇指、食指、中指、无名指、小指
    const fingerBases = [2, 5, 9, 13, 17];   // 对应的指根
    
    let foldedCount = 0;
    for (let i = 0; i < fingerTips.length; i++) {
      // 对于拇指，需要特殊处理
      if (i === 0) {
        // 拇指：比较指尖和 IP 关节
        if (landmarks[fingerTips[i]].x > landmarks[fingerBases[i]].x) {
          foldedCount++;
        }
      } else {
        // 其他手指：指尖应该在指根下方（y 值更大）
        if (landmarks[fingerTips[i]].y > landmarks[fingerBases[i]].y) {
          foldedCount++;
        }
      }
    }
    
    // 至少 4 个手指收起才认为是拳头
    return foldedCount >= 4;
  }

  private smoothedCenter = { x: 0.5, y: 0.5 };
  private smoothedRotation = 0;
  private lerpFactor = 0.15; // 平滑因子

  // 获取手掌中心位置 (带平滑)
  getHandCenter(results: Results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return null;
    const center = results.multiHandLandmarks[0][9];
    
    this.smoothedCenter.x += (center.x - this.smoothedCenter.x) * this.lerpFactor;
    this.smoothedCenter.y += (center.y - this.smoothedCenter.y) * this.lerpFactor;
    
    return this.smoothedCenter;
  }

  // 获取旋转角度 (带平滑)
  getHandRotation(results: Results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return this.smoothedRotation;
    const landmarks = results.multiHandLandmarks[0];
    const p1 = landmarks[2];
    const p2 = landmarks[17];
    const rawRotation = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    
    // 处理旋转跳变 (例如从 PI 到 -PI)
    let diff = rawRotation - this.smoothedRotation;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    this.smoothedRotation += diff * this.lerpFactor;
    return this.smoothedRotation;
  }

  // 更新中指轨迹
  private updateMiddleFingerTrail(landmarks: any[]) {
    const middleTip = landmarks[12]; // 中指指尖
    
    // 将MediaPipe坐标转换为Three.js坐标系
    const currentPosition = new THREE.Vector3(
      (middleTip.x - 0.5) * 15, // 转换为场景坐标
      -(middleTip.y - 0.5) * 10, // Y轴翻转
      middleTip.z * 5 // Z轴缩放
    );
    
    // 检查是否需要添加新的轨迹点
    if (this.lastMiddlePosition === null || 
        currentPosition.distanceTo(this.lastMiddlePosition) > this.trailUpdateThreshold) {
      
      const trailPoint: TrailPoint = {
        position: currentPosition.clone(),
        timestamp: Date.now()
      };
      
      this.middleFingerTrail.push(trailPoint);
      this.lastMiddlePosition = currentPosition.clone();
      
      // 限制轨迹长度
      if (this.middleFingerTrail.length > this.maxTrailLength) {
        this.middleFingerTrail.shift();
      }
      
      // 清理过期的轨迹点（超过3秒）
      const now = Date.now();
      this.middleFingerTrail = this.middleFingerTrail.filter(
        point => now - point.timestamp < 3000
      );
    }
  }
  
  // 获取中指轨迹
  getMiddleFingerTrail(): TrailPoint[] {
    return this.middleFingerTrail.slice(); // 返回副本
  }
  
  // 获取当前中指位置
  getCurrentMiddlePosition(results: Results): THREE.Vector3 | null {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      return null;
    }
    
    const landmarks = results.multiHandLandmarks[0];
    const middleTip = landmarks[12];
    
    return new THREE.Vector3(
      (middleTip.x - 0.5) * 15,
      -(middleTip.y - 0.5) * 10,
      middleTip.z * 5
    );
  }
  
  // 清空轨迹
  clearTrail() {
    this.middleFingerTrail = [];
    this.lastMiddlePosition = null;
  }
  
  // 更新手部运动状态
  private updateHandMotion(landmarks: any[]) {
    // 使用手掌中心点（landmark 9）来判断运动
    const palmCenter = landmarks[9];
    
    // 转换为场景坐标
    const currentCenter = new THREE.Vector3(
      (palmCenter.x - 0.5) * 15,
      -(palmCenter.y - 0.5) * 10,
      palmCenter.z * 5
    );
    
    // 添加到历史记录
    this.handCenterHistory.push(currentCenter);
    if (this.handCenterHistory.length > this.maxHistoryLength) {
      this.handCenterHistory.shift();
    }
    
    // 计算运动距离：最新位置和最老位置的距离
    if (this.handCenterHistory.length >= this.maxHistoryLength) {
      const oldestPosition = this.handCenterHistory[0];
      const newestPosition = this.handCenterHistory[this.handCenterHistory.length - 1];
      const movementDistance = newestPosition.distanceTo(oldestPosition);
      
      // 判断是否在运动
      this.isHandMoving = movementDistance > this.motionThreshold;
    }
  }
  
  // 获取手部运动状态
  isMoving(): boolean {
    return this.isHandMoving;
  }
}
