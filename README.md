# Skeleton Puppet · 本地骨骼木偶游戏

> **人体骨骼模型授权说明。** 用户已确认取得公开发布此项目所需的模型授权；授权文件未包含在本仓库中。下载页面 [Void 的 Lowpoly Human Skeleton (Rigged)](https://sketchfab.com/3d-models/lowpoly-human-skeleton-rigged-08ab10e2a78549ab86e1b6129678b3aa) 标示 CC BY，但下载包内 `assets/void-original/model/license.txt` 指向另一位作者 [step](https://sketchfab.com/step) 的模型页面，并标示 Sketchfab Standard。这项来源信息冲突仍保留记录，详见 [ASSET-LICENSE-REVIEW.md](ASSET-LICENSE-REVIEW.md)。不要仅凭本仓库推断模型可供第三方单独再分发。

从本项目目录运行 `python3 -m http.server 8768`，打开 `http://localhost:8768/`。目前 8767 端口由旧备份目录占用，不代表这个项目。独立关节测试为 `joint-test.html`。

## 当前进度

- 上方控制手：`stage-hand.js` 用短骨段和关节球构成五根可单独抬起的手指；手固定在舞台上方，横向平放。五条线直接从各指尖连至木偶的对应牵引点。
- 下方人体骨骼：用户下载的原始 glTF，路径为 `assets/void-original/model/Lowpoly Human Skeleton (Rigged).gltf`。浏览器已验证 4 个蒙皮网格、61 个关节节点和 1 个动画；`puppet-rig.js` 通过 Skin joints 控制四肢与颈部。
- 五条丝线：仅落在左/右手腕、左/右脚踝和头部的绑定关节，肘膝不接线。各肢体带弹簧阻尼与回位，躯干位置保持固定。肩肘、髋膝和颈部可独立转动；测试页提供五个牵引滑块、九个关节快捷按钮，并允许选择全部 61 个 Skin joint 分别调节 X/Y/Z。
- 整体浮动：摄像头中的手掌位置经过校准和平滑后，只让控制手、丝线与木偶一起在小范围内左右上下移动；手离开画面后缓慢回到原位。木偶本身另有轻微摇曳与关节跟随。
- 摄像头：右上角实时预览；继续使用 MediaPipe Hand Landmarker，并在预览中叠加 21 个关键点、骨指连线和五指独立牵引值。首次将放松的手放入画面以校准，点击摄像头重新校准。牵引量按画面中手掌的局部方向计算，避开侧面手姿下不稳定的深度值，再加死区与平滑；整手移动不会直接拉动木偶。
- Level 1 Discover：自由探索五指与木偶的对应关系，点击 CONTINUE 后可选择进入 Level 2 或继续探索。抬指时相关骨面会轻微发光。
- Level 2 Move & Learn：食指抬左臂、无名指抬右臂、拇指抬左腿、点击胸廓。前三项需要先放松手指，再持续牵引对应关节；反馈卡片各有 2–3 句英文知识，介绍肱骨、桡骨和尺骨、股骨，以及 12 对肋骨保护心肺。玩家按 NEXT 进入下一任务。正式页面没有测试滑块，全部游戏文案为英文。
- 骨面高亮：从原始蒙皮网格中按连通面提取骨面，保持与原始关节同步运动。映射依据和局限见 [BONE-REGIONS.md](BONE-REGIONS.md)。
- Skeleton Check：Level 2 完成后由玩家点击 START SKELETON CHECK 进入同一舞台的四题知识问答。每次一题，点击 A/B/C 后锁定选项，显示温和的正确或错误反馈与解释；NEXT/FINISH 手动推进，结束后 PLAY AGAIN 从第一题重新开始。题目数据在 `quiz-questions.js`，状态仍由 `game-flow.js` 管理。
- Level 3 — Bone Challenge：Skeleton Check 结束后点击 START BONE CHALLENGE。四道已学骨骼题每局随机且不重复；手臂或腿部题需先松开手指，再以现有牵引控制带动对应关节并保持约 320ms；胸廓题只接受模型胸廓射线点击。答对后高亮对应侧骨面并等待 NEXT，全部完成可 PLAY AGAIN 或 START OVER。此关取代原先规划的自由舞蹈。

## 开发验证

访问 `http://localhost:8768/?dev=1` 可打开独立的五指牵引滑块及无名指 raw、normalized、filtered、control 读数，沿用正式关卡的动作判定流程；`?dev=1&task=4` 直接测试胸廓点击；`?dev=1&check=1` 从 Level 2 完成反馈进入问答和 Bone Challenge 测试。运行 `node --test *.test.mjs` 检查手势计算、关卡状态和答题流程。本项目是静态 ES Modules 网页，无单独构建命令；可用 `node --check` 检查 JS 语法并直接通过本地服务器测试。

## 2026-11-15 局部优化

教学高亮改为暖橙金色 `#ffb35c`，反馈期间不透明度升至 0.88，约 280ms 渐入并在 NEXT 后渐退；原始骨面与 Rig 未改。无名指单独使用 0.11 死区、0.43 归一化跨度和 0.24 滤波速率，略微抑制邻指被动联动；右腕牵引增益 1.2，Task 2 的控制阈值 0.20、关节抬升阈值 0.045。其他四指参数未动。提示框与知识卡仅调整圆角、排版、按钮和动效。

## 尚需处理

腿部牵引现朝镜头方向抬起，实际幅度与自然度仍需真人手势继续调参。侧面手势、左右手兼容与遮挡下的稳定性尚无真人完整测试。原模型未逐件命名桡骨与尺骨；本轮为左前臂补了镜像骨面映射，但两根骨面的准确个体名称仍未验证。Bone Challenge 的 HUMERUS 与 RADIUS & ULNA 都使用抬臂动作，因此动作本身无法区分玩家是否认识这两种骨骼，完成后只高亮相应骨面。

模型下载包的来源信息存在冲突；用户已确认取得本项目公开发布授权，详见 [ASSET-LICENSE-REVIEW.md](ASSET-LICENSE-REVIEW.md)。BONE MIRROR 与旧项目未改动。
