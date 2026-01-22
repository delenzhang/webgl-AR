import * as THREE from 'three';
import { Rasengan } from './Rasengan';
import { Results } from '@mediapipe/hands';
import { HandTracker } from '../core/HandTracker';

export class RasenganSystem {
  private rasengan: Rasengan;
  private scene: THREE.Scene;
  private handTracker: HandTracker;
  private targetScreenSize: number; // 目标屏幕尺寸
  private lastPalmCenter: { x: number; y: number } | null = null; // 最后检测到的手掌中心
  private camera: THREE.PerspectiveCamera;
  private planeZ: number = -10; // 螺旋丸所在的平面Z坐标（往后移）
  private planeWidth: number = 0;
  private planeHeight: number = 0;
  private hasHand: boolean = false; // 是否检测到手
  private currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0, -2); // 当前位置
  private positionLerpSpeed: number = 0.2; // 位置插值速度（0-1，越大越灵敏）

  constructor(scene: THREE.Scene, handTracker: HandTracker, camera: THREE.PerspectiveCamera, coreRotationSpeed: number = 1.0) {
    this.scene = scene;
    this.handTracker = handTracker;
    this.camera = camera;
    this.rasengan = new Rasengan(coreRotationSpeed);
    this.scene.add(this.rasengan.group);
    
    // 计算屏幕一半的大小（Three.js 场景单位）
    this.targetScreenSize = 18.0; // 增加2倍，从3.0变为6.0
    
    // 计算在Z=0平面上，摄像机能看到的区域大小
    this.calculatePlaneSize();
    
    // 初始显示螺旋丸以便调试
    this.rasengan.setVisible(true);
    this.rasengan.setTargetScale(0.1); // 先设为很小
  }

  /**
   * 计算在固定Z平面上，摄像机视锥体覆盖的宽度和高度
   */
  private calculatePlaneSize() {
    const distance = this.camera.position.z - this.planeZ; // 摄像机到平面的距离
    const vFOV = this.camera.fov * Math.PI / 180; // 垂直视野角（弧度）
    const planeHeightAtDistance = 2 * Math.tan(vFOV / 2) * distance;
    const planeWidthAtDistance = planeHeightAtDistance * this.camera.aspect;
    
    this.planeHeight = planeHeightAtDistance;
    this.planeWidth = planeWidthAtDistance;
    
    console.log(`Plane size at Z=${this.planeZ}: width=${this.planeWidth.toFixed(2)}, height=${this.planeHeight.toFixed(2)}`);
  }

  /**
   * 将屏幕归一化坐标（0-1）转换为平面上的世界坐标
   * @param screenX 归一化的屏幕X坐标 (0-1, 0=左，1=右)
   * @param screenY 归一化的屏幕Y坐标 (0-1, 0=上，1=下)
   */
  private screenToPlanePosition(screenX: number, screenY: number): THREE.Vector3 {
    // 将归一化坐标(0-1)转换为中心坐标(-0.5 到 0.5)
    const centerX = screenX - 0.5;
    const centerY = screenY - 0.5;
    
    // 映射到平面坐标
    const worldX = -centerX * this.planeWidth; // X轴也需要反转（摄像机看向-Z方向，镜像效果）
    const worldY = -centerY * this.planeHeight; // Y轴反转（屏幕Y向下，世界Y向上）
    
    return new THREE.Vector3(worldX, worldY, this.planeZ);
  }

  public update(results: Results | null, time: number) {
    // 检查是否有手
    const hasHandDetected = results && results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    const isPalmOpen = hasHandDetected ? (this.handTracker.detectGesture(results) === 'RELEASE') : false;

    // 如果检测不到手，立即消失
    if (!hasHandDetected) {
      if (this.hasHand) {
        // 从有手变为无手，立即设置为0
        this.rasengan.setTargetScale(0);
        this.rasengan.setScaleSpeed(0.5); // 立即消失，使用快速缩放
        this.hasHand = false;
      }
      this.rasengan.update(time);
      return;
    }

    // 有手的情况
    this.hasHand = true;

    if (isPalmOpen) {
      // 手掌张开：螺旋丸从当前大小增长到目标大小
      this.rasengan.setVisible(true);
      this.rasengan.setTargetScale(this.targetScreenSize);
      this.rasengan.setScaleSpeed(0.05); // 变大速度较快
      
      // 计算手掌中心位置（归一化坐标 0-1）
      const center = this.handTracker.getHandCenter(results);
      if (center) {
        this.lastPalmCenter = center;
        
        // 将屏幕坐标转换为平面上的世界坐标
        const targetWorldPos = this.screenToPlanePosition(center.x, center.y);
        
        // 使用插值平滑移动到目标位置
        this.currentPosition.lerp(targetWorldPos, this.positionLerpSpeed);
        this.rasengan.setPosition(this.currentPosition.x, this.currentPosition.y, this.currentPosition.z);
      }
    } else {
      // 手掌未张开但检测到手（握拳）：螺旋丸立即消失
      this.rasengan.setTargetScale(0);
      this.rasengan.setScaleSpeed(0.5); // 立即消失，使用快速缩放
      
      // 保持在最后检测到的手掌位置（也使用平滑移动）
      if (this.lastPalmCenter) {
        const targetWorldPos = this.screenToPlanePosition(this.lastPalmCenter.x, this.lastPalmCenter.y);
        this.currentPosition.lerp(targetWorldPos, this.positionLerpSpeed);
        this.rasengan.setPosition(this.currentPosition.x, this.currentPosition.y, this.currentPosition.z);
      }
    }

    this.rasengan.update(time);
  }

  public setCoreRotationSpeed(speed: number) {
    this.rasengan.setCoreRotationSpeed(speed);
  }
}
