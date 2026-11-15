# 下方人体骨骼模型：来源和授权记录

本地测试模型来自用户下载的 Sketchfab 页面：[Lowpoly Human Skeleton (Rigged) — Void](https://sketchfab.com/3d-models/lowpoly-human-skeleton-rigged-08ab10e2a78549ab86e1b6129678b3aa)，页面显示 CC BY。用户于 2026-11-15 提供原始格式压缩包，并明确同意继续用于本地开发。

**冲突：**下载包内 `assets/void-original/model/license.txt` 却写明原作者为 [step](https://sketchfab.com/step)，来源为 [另一个模型页面](https://sketchfab.com/3d-models/lowpoly-human-skeleton-rigged-1ee3b5f2758445d0b7101b0343c1e95a)，许可证为 Sketchfab Standard。两个声明不能同时当作已核实的授权。

当前模型仅用于本地原型与技术测试。公开发布、分享源码/资产包或商业使用前，需要向原作者或 Sketchfab 核对实际授权。不得仅以 Void 页面所示的 CC BY 署名替代核对。原始 `license.txt`、下载包和原始纹理均保存在 `assets/void-original/`，未删除或改写。

技术改动：通过 `PuppetRig` 读取原始 glTF 的 61 个 Skin joints，用代码控制肩、肘、髋、膝和颈部；显示时将蒙皮材质调为暖骨白，源文件未修改。模型中的单独骨头名称不充分，目前无法准确独立高亮肱骨、桡尺骨、股骨、胫腓骨和肋骨。
