<div align="center">

# Domain Vellum

个人域名有效期监控看板 / Domain Expiry Monitor

通过 RDAP 协议查询域名有效期,在单一页面上展示所有域名的到期状态;发现临近过期或已过期时,自动通过 Bark 推送消息到手机。纯前端,无后端,可托管于任意静态站点平台。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vue](https://img.shields.io/badge/Vue-3.5-42b883.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6.svg)](https://www.typescriptlang.org/)

[功能](#功能) · [快速开始](#快速开始) · [部署](#部署) · [配置](#配置) · [技术栈](#技术栈)

</div>

## 部署

一键部署到以下平台(点击图标,Fork 后自动构建):

| 平台 | 一键部署 |
|---|---|
| Vercel | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabloom25%2FDomainVellum&project-name=domain-vellum&repository-name=domain-vellum) |
| Netlify | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/abloom25/DomainVellum) |
| Cloudflare Pages | [![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://deploy.workers.cloudflare.com/?url=https://github.com/abloom25/DomainVellum) |

### 各平台说明

<details>
<summary><strong>Cloudflare Pages</strong></summary>

仓库内已包含 `public/_headers` 和 `public/_redirects`,构建后自动生效。

- 构建命令:`pnpm build`
- 输出目录:`dist`
- 环境变量:按需添加 `VITE_BARK_TOKEN`、`VITE_CORS_PROXY`
</details>

<details>
<summary><strong>Netlify</strong></summary>

已包含 `netlify.toml`,接入仓库后自动识别。

- 构建命令:`pnpm build`(配置文件已指定)
- 发布目录:`dist`(配置文件已指定)
</details>

<details>
<summary><strong>Vercel</strong></summary>

已包含 `vercel.json`,导入仓库后自动部署。

- 框架:Vite(自动识别)
- 环境变量:在 Vercel Dashboard 设置 `VITE_BARK_TOKEN`
</details>

<details>
<summary><strong>GitHub Pages</strong></summary>

已包含 `.github/workflows/deploy.yml`,推送到 `main` 分支自动构建并部署到 GitHub Pages。

工作流会自动设置 `BASE_PATH=/<仓库名>/`,无需手动配置。

部署前在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**。

> 若使用自定义域名或 `username.github.io` 根仓库,需删除 workflow 中的 `BASE_PATH` 环境变量。
</details>

## 快速开始

```sh
git clone https://github.com/abloom25/DomainVellum.git
cd DomainVellum
pnpm install
pnpm dev
```

打开 `http://localhost:5173`,编辑 `public/domains.json` 添加你的域名,刷新即可。

## 配置

### `public/domains.json`

```json
{
  "domains": ["example.com", "example.org"],
  "thresholds": {
    "warning": 90,
    "critical": 30
  },
  "siteName": "Domain Vellum",
  "favicon": "http://img.assets.abloom.site/img/2026/06/22/6a39001255781.png"
}
```

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `domains` | `string[]` | — | 监控的域名列表 |
| `thresholds.warning` | `number` | `90` | 即将到期阈值(天) |
| `thresholds.critical` | `number` | `30` | 紧急阈值(天) |
| `siteName` | `string?` | `Domain Vellum` | 站点名称(显示在 Header 与浏览器标题) |
| `favicon` | `string?` | 见默认 | 站点图标 URL |

### 环境变量

复制 `.env.example` 为 `.env`:

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `VITE_BARK_TOKEN` | 否 | — | Bark 设备 token,缺失则隐藏推送区 |
| `VITE_CORS_PROXY` | 否 | `https://corsproxy.io/?url=` | CORS 代理前缀 |
| `BASE_PATH` | 否 | `/` | 部署子路径(仅 GitHub Pages 项目页面需要) |

### 脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 类型检查 + 生产构建,输出到 `dist` |
| `pnpm preview` | 预览生产构建 |
| `pnpm type-check` | vue-tsc 类型检查 |
| `pnpm lint` | oxlint + eslint |
| `pnpm format` | oxfmt 格式化 |

## 功能

- **配置驱动** —— 在 `public/domains.json` 列出域名,打开页面自动批量查询
- **RDAP 查询** —— 基于 IANA bootstrap 路由到各 TLD 权威 RDAP 服务器,失败自动走 CORS 代理兜底
- **状态分级** —— 已过期 / 紧急(≤30天) / 即将到期(≤90天) / 正常 / 查询失败,各自配色
- **注册商识别** —— 自动识别注册商,腾讯云(DNSPod / Tencent)域名标注徽章并提供续费直达链接
- **到期进度条** —— 从注册日到到期日的生命周期进度可视化
- **详情展开** —— 点击域名行展开查看 DNSSEC、域名状态码、NS 服务器、注册时长等
- **手动刷新 / 单域名重试** —— 顶部重新检查全部,失败域名可单独重试
- **Bark 推送** —— 页面访问时检测到紧急域名自动推送(24h 去重),支持手动测试
- **本地缓存** —— 查询结果缓存 24h,避免重复请求
- **加载骨架屏** —— 初次加载时显示骨架占位
- **暗色星空背景** —— 视觉语言参考 [abloom.site](https://abloom.site/)

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 8 |
| 数据源 | RDAP (RFC 7483) over HTTPS |
| 推送 | Bark (iOS) |
| Lint | oxlint + eslint |
| 样式 | 纯手写 CSS(无 UI 组件库) |

## 项目结构

```
src/
  components/    UI 组件
  composables/   业务编排(useDomainCheck / useClock)
  lib/           数据层(rdap / bark / cache / pool / types)
  styles/        全局样式
public/
  domains.json   配置文件(用户维护)
  _headers       Cloudflare Pages 头
  _redirects     SPA fallback
```

## 已知限制

- `.cn` 域名的 RDAP 服务器(CNNIC)从浏览器不可达(CORS + 代理不稳),会显示为"查询失败"。如需监控 `.cn`,建议加一个轻量 serverless 代理(如 Cloudflare Worker)。
- 推送仅在页面被访问时触发,无后台定时检查。如需定时监控,需配合 serverless cron。

## License

[MIT](LICENSE)
