# 🎮 WebGL 手势特效项目集

基于 Three.js 和 MediaPipe 的交互式 3D 特效项目，通过手势识别实时控制各种酷炫的视觉效果。

---

## ⚔️ 御剑术 - Flying Sword Control

一个基于手势识别的御剑术特效系统，通过手部动作召唤、控制和发射飞剑。

### ✨ 特性

- 🎮 **实时手势识别**：使用 MediaPipe Hands 进行高精度手势检测
- ⚔️ **动态飞剑特效**：基于 Three.js 的 3D 飞剑渲染
- 👋 **交互控制**：
  - 手掌移动：飞剑跟随手部位置
  - 手势变化：触发不同的剑术效果
- 🎨 **视觉效果**：
  - 3D 飞剑模型
  - 剑气轨迹特效
  - 流光粒子系统
- 📱 **全屏体验**：点击"现在开始"按钮进入全屏模式

### 🚀 快速开始

访问 `http://localhost:5173/` 或 `http://localhost:5173/index.html` 查看御剑术效果

### 🎮 使用说明

1. **启动应用**
   - 打开页面后，点击"现在开始"按钮
   - 允许浏览器访问摄像头

2. **手势控制**
   - **手掌移动**：飞剑跟随手部位置
   - **特定手势**：触发剑术特效

3. **状态显示**
   - 左下角显示当前系统状态
   - 显示手势识别提示

---

## 🌀 螺旋丸手势识别 - Rasengan Gesture Control

一个基于 Three.js 和 MediaPipe 的 3D 螺旋丸特效项目，通过手势识别实时控制螺旋丸的生成、大小和位置。

## ✨ 特性

- 🎮 **实时手势识别**：使用 MediaPipe Hands 进行高精度手势检测
- 🌪️ **动态 3D 特效**：基于 Three.js 和 GLSL 着色器的螺旋丸效果
- 👋 **交互控制**：
  - 五指张开：生成并放大螺旋丸
  - 握拳：螺旋丸立即消失
  - 手部移动：螺旋丸实时跟随手掌位置
- 🎨 **视觉效果**：
  - 旋转核心球体（发光效果）
  - 多层风力旋涡
  - 动态丝带层
  - 外层保护壳
  - 6 个旋转风带（从中心扩散到外围）
- 📱 **全屏体验**：点击按钮进入全屏模式启动

## 🛠️ 技术栈

- **Three.js** - 3D 渲染引擎
- **MediaPipe Hands** - 手势识别
- **TypeScript** - 类型安全的开发
- **Vite** - 快速的构建工具
- **GLSL** - 自定义着色器编程

## 📦 项目结构

```
gl/
├── src/
│   ├── lxw/                    # 螺旋丸模块
│   │   ├── main.ts            # 应用入口
│   │   ├── Rasengan.ts        # 螺旋丸 3D 对象
│   │   ├── RasenganSystem.ts  # 螺旋丸控制系统
│   │   └── rasenganShaders.ts # GLSL 着色器
│   ├── core/                   # 核心功能
│   │   ├── HandTracker.ts     # 手势追踪器
│   │   ├── SceneManager.ts    # 场景管理器
│   │   └── SwordSystem.ts     # 其他特效系统
│   ├── lxw.html               # 螺旋丸页面
│   └── main.ts                # 其他入口
├── public/
│   └── mediapipe/             # MediaPipe 模型文件
├── package.json
├── tsconfig.json
├── vite.config.ts
└── readme.md
```

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

访问 `http://localhost:5173/src/lxw.html` 查看螺旋丸效果

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 🎮 使用说明

1. **启动应用**
   - 打开页面后，点击"进入全屏并启动"按钮
   - 允许浏览器访问摄像头

2. **手势控制**
   - **五指张开 (RELEASE)**：螺旋丸从小变大，跟随手掌位置
   - **握拳 (FOLD)**：螺旋丸立即消失
   - **移动手掌**：螺旋丸实时跟随（有平滑插值）
   - **手离开画面**：螺旋丸立即消失

3. **状态显示**
   - 右上角显示当前手势状态
   - 显示手部运动状态

## 🎨 核心功能说明

### Rasengan 类
螺旋丸 3D 对象，包含多层特效：
- **核心球体**：旋转发光，支持外部传入速度
- **风力层**：3 层不同速度的旋转风力效果
- **丝带层**：2 层静态丝带装饰
- **外层保护壳**：半透明青蓝色发光壳
- **风带**：6 个从中心向外扩散的动态风带

### RasenganSystem 类
螺旋丸控制系统，负责：
- 手势检测和状态管理
- 屏幕坐标到 3D 世界坐标的转换
- 动态缩放速度控制：
  - 手掌张开：快速增长 (`scaleSpeed = 0.05`)
  - 握拳/手消失：立即消失 (`scaleSpeed = 0.5`)
- 位置平滑跟随（插值速度 `0.2`）

### HandTracker 类
手势追踪器，提供：
- 实时手势识别（FOLD、RELEASE、TRACK、NONE）
- 手掌中心位置计算
- 手部运动检测
- 中指轨迹追踪

## ⚙️ 配置参数

### 螺旋丸参数

```typescript
// RasenganSystem.ts
targetScreenSize: 18.0       // 螺旋丸目标大小
planeZ: -10                  // 螺旋丸 Z 轴位置
positionLerpSpeed: 0.2       // 位置跟随灵敏度 (0-1)
coreRotationSpeed: 2.0       // 核心旋转速度
```

### 手势识别参数

```typescript
// HandTracker.ts
maxNumHands: 1               // 最多追踪手数
modelComplexity: 1           // 模型复杂度
minDetectionConfidence: 0.7  // 检测置信度
minTrackingConfidence: 0.7   // 追踪置信度
```

## 📝 着色器说明

项目使用自定义 GLSL 着色器实现特效：

- **rasenganCoreVert/Frag**：核心球体发光效果
- **rasenganSwirlVert/Frag**：风力旋涡层
- **rasenganRibbonVert/Frag**：静态丝带层
- **rasenganOuterShellVert/Frag**：外层保护壳
- **airBeltVert/Frag**：动态风带（从中心扩散）

## 🔧 依赖版本

```json
{
  "dependencies": {
    "@mediapipe/camera_utils": "0.3.1675466862",
    "@mediapipe/drawing_utils": "0.3.1675466124",
    "@mediapipe/hands": "0.4.1675469240",
    "gsap": "^3.12.5",
    "three": "^0.160.0"
  },
  "devDependencies": {
    "@types/three": "^0.160.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

## 🌐 浏览器要求

- 支持 WebGL 2.0
- 支持 MediaPipe（现代浏览器）
- 支持摄像头访问
- 推荐使用 Chrome/Edge 浏览器

## 🐛 常见问题

### 螺旋丸不显示
- 检查摄像头权限是否允许
- 确保手掌完全在画面内
- 尝试五指完全张开

### 位置不准确
- 调整 `positionLerpSpeed` 参数
- 检查光线条件
- 确保手掌清晰可见

### 性能问题
- 降低 `modelComplexity` 参数
- 减少风带数量（`beltCount`）
- 简化着色器计算

## 📄 许可证

MIT License

## 🙏 致谢

- [Three.js](https://threejs.org/) - 3D 渲染引擎
- [MediaPipe](https://mediapipe.dev/) - 手势识别
- 灵感来源于《火影忍者》中的螺旋丸技能

---

**Made with ❤️ and TypeScript**
