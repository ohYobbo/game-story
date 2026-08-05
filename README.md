# 像素工坊

一款以游戏公司经营为主题的像素风网页模拟游戏。玩家需要组建团队、选择平台与题材、完成多阶段开发，并通过评分、销量和公司成长打造自己的游戏工作室。

## 主要玩法

- 企划、程序、美术、音乐和除错五阶段游戏开发
- 平台、类型、题材、组合评价和八维开发方向
- 员工招聘、培训、升级、体力、薪资与转职
- 委托开发、宣传推广、粉丝人群和旅行商人
- 媒体评分、周销量、排行榜、续作与年度奖项
- 办公室扩建、自研主机和二十年经营结算
- 浏览器本地保存与自动保存

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS/PostCSS
- Node.js 内置测试运行器

项目不依赖专用托管平台、云数据库或账号服务。游戏存档保存在当前浏览器的 localStorage 中。

## 环境要求

- Node.js 22.13 或更高版本
- npm

## 本地运行

安装依赖：

    npm install

启动开发服务器：

    npm run dev

默认访问地址为 http://localhost:3000。

## 常用命令

    npm run dev
    npm run build
    npm run start
    npm run lint
    npm test

- npm run dev：启动本地开发环境
- npm run build：生成标准 Next.js 生产构建
- npm run start：运行已经构建的生产版本
- npm run lint：执行代码检查
- npm test：构建项目并运行界面、素材和数值测试

## 项目结构

    app/
      page.tsx          页面编排与交互绑定
      game/             类型、静态数据、规则、引擎与存档迁移
      components/       仪表盘、业务弹窗与通用像素组件
      styles/           仪表盘、弹窗与响应式样式
      game-balance.ts   核心数值函数
      globals.css        全局基础与既有像素动画
      layout.tsx         页面布局与分享信息
    public/
      game-ui/          人物、办公室、图标和面板素材
    tests/              构建、界面、引擎、迁移和数值测试
    ROADMAP.md          后续开发计划

## 存档说明

游戏每八秒自动保存，也可以通过界面手动保存。存档仅存在当前浏览器中，清理浏览器数据或点击“新开公司”会移除当前进度。

## 开发计划

后续的代码拆分、决策反馈、负责人创作演出和玩法补全计划见 [ROADMAP.md](./ROADMAP.md)。

## 说明

本项目的经营题材与节奏参考了《游戏发展国》等游戏公司模拟作品，角色、界面、素材、文案和数值均为本项目原创实现。
