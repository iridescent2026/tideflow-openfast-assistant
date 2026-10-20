# 界面视觉资产

`tidal-principle-art-hd.png` 为透明三图图集（2172×724），`tidal-platform-hd.png` 为透明平台概念插图（1774×887）；内置 imagegen 依据选定图重绘，均不代表精确工程结构或实测曲线。`engineering-ocean-tower-hd.png` 和 `tidal-reading-ocean-hd.png` 为细节重绘背景，实际均为 1586×992，文件名的 hd 不表示原生 4K。提示词及尺寸限制见 `docs/tidal-redrawn-assets-prompts.txt`、`docs/v0.9.1-illustration-detail.md`。

`tidal-reading-ocean.png` 复用既有深海环境图 `model-ocean-environment.png`，用于潮汐图册阅读区域。`tidal-reading-nacelle.png` 使用内置 imagegen 生成透明机舱概念剖视图，提示词见 `docs/tidal-reading-assets-prompts.txt`。插图不代表实际设备尺寸或控制器安装位置；所有文字、波浪边框、问答和入口均独立实现。

`engineering-ocean-tower.png` 使用内置 imagegen 去除原海景中的静态叶片，保留机舱、塔架和平台，提示词见 `docs/engineering-rotor-prompt.txt`。网页以单独绘制的银白 SVG 叶轮覆盖机舱连接点，28 秒旋转一周，可暂停/启动，并在不可见或页面后台时暂停。旋转为视觉演示，不对应真实求解转速。

`engineering-ocean-scene-fit.png` 是海洋背景的完整叶尖构图版本，通过内置 imagegen 编辑原背景、缩小并完整展示风机上部。编辑提示词见 `docs/engineering-ocean-framing-prompt.txt`。仍仅用作原理示意背景。

`engineering-ocean-scene.png` 使用内置 imagegen 编辑用户选定的海洋概念图，去除界面面板和文字，仅保留海景、风机和系泊视觉。提示词见 `docs/engineering-ocean-prompt.txt`，界面说明见 `docs/v0.8-engineering-ocean.md`。可点击的导航、箭头、异形透明面板与选中态独立以 HTML/CSS/SVG 实现。

`engineering-silver-scene.png` 使用内置 imagegen 生成，服务于银白工程原理图解。提示词见 `docs/engineering-atlas-prompt.txt`。它是原理视觉示意，不是精确建模、测量或仿真结果。载荷箭头、模块标注和所有说明由独立 HTML/SVG 实现。

`brand-lockup-ink.svg` 沿用现有品牌图形和字形，仅将文字改为深海蓝，用于工程原理页的浅色侧栏；保留彩色波浪标识。

`model-ocean-environment.png` 使用内置 imagegen 根据用户选定界面生成，作为模型结构页的独立艺术环境背景。图中不包含模型、文字或界面控件；所有交互独立实现。它不代表实测海域或等比水深，生成提示词见 `docs/model-ocean-prompt.txt`，实现边界见 `docs/v0.6-ocean-interface.md`。

`ocean-home.png` 与 `oc4-model.png` 使用内置 image_gen 生成，用于海上风电应用的视觉示意。它们不是工程几何文件、海域观测、测量结果或仿真输出。页面中的导航、按钮、参数、部件选择与说明文本独立以 HTML/CSS/JavaScript 实现。工程原理页的线图为可编辑 SVG，统一使用银白结构和青蓝标记。

首页生成提示词：专业海上风电工程应用的宽屏深海青背景；单台银白色三叶片风机与三立柱半潜式平台置于画面右侧，左侧保留深色海面留白，细腻真实海浪、少量等深线、克制黄色安全栏杆及蓝色叶尖，无文字、无标志、无界面。

模型生成提示词：银白色 NREL 5 MW 风机与 OC4 半潜式平台，冷白与浅冰青背景，半透明海水剖切展示水下立柱、悬链线系泊与海床锚点；真实工程材质，青蓝海水与标记、少量黄色安全栏杆、细微网格；无文字、无界面、无尺寸标注。模型图仅承担结构视觉表达，不声称几何精确。
# 全景实验舱资源

`lab-ocean-panorama.png` 为内置 imagegen 生成的晴天海域环境纹理，用于三维背景和金属/玻璃反射。门、座椅、控制台、风机和交互控件由本机几何及 HTML 构建。生成提示词见 `docs/lab-panorama-prompt.txt`。
