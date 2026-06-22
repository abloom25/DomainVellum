# Domain Vellum — 个人域名有效期监控看板

- 日期: 2026-06-22
- 状态: Draft (待用户审阅)
- 技术栈: Vue 3 + Vite + TypeScript(已初始化于 `package.json`)
- 部署形态: 纯前端静态站点,无后端

---

## 1. 产品定位

个人域名有效期监控看板。仓库内放置配置文件 `public/domains.json` 列出用户持有的域名;页面打开后批量查询各域名的有效期(RDAP),在单一页面上展示所有域名的到期状态;发现临近过期或已过期时,自动通过 Bark 推送消息到用户手机。

面向场景:用户(域名注册商为腾讯云)持有少量固定域名(`.com` `.org` `.site` `.cn`),希望有一个自托管的轻量看板随时查看域名健康度,并在紧急情况收到推送。

非目标:
- 不做交互式"输入任意域名查询"工具(域名集合在配置文件中固定)。
- 不做定时后台检查(纯前端,触发时机为页面被访问)。
- 不做域名交易/续费链接跳转。
- 不搬运 abloom.site 任何个人 bio 文案,仅参考其视觉设计语言。

---

## 2. 关键决策记录

| 决策点 | 选择 | 理由 |
|---|---|---|
| 查询交互形态 | 配置文件驱动的看板(非交互查询) | 域名集合固定且为用户自有,看板比查询工具更贴合使用场景 |
| 数据源 | RDAP(`rdap.org` 统一入口) | HTTPS+JSON,字段标准化(RFC 7483),无需 API key,覆盖全部目标 TLD |
| CORS 兜底 | RDAP 直连失败 → CORS 代理重试 | 解决 `.cn` 等 RDAP 服务器 CORS 不稳定问题 |
| CORS 代理 | 默认 `https://corsproxy.io/?url=`,支持 `VITE_CORS_PROXY` 覆盖 | 可替换,避免单点依赖 |
| 推送渠道 | Bark(iOS) | 单一 HTTP 调用,国内直连可用,适合个人 |
| 推送触发时机 | 页面访问时检查并触发(无后台 cron) | 纯前端约束,用户已知悉 |
| Token 管理 | Vite 环境变量构建时注入,不入仓库 | 避免硬编码泄露 |
| 注册商识别 | 从 RDAP `entities[role=registrar]` 提取 `fn`,正则匹配 `/tencent|腾讯/i` 判定腾讯云 | 纯前端可做,无需密钥 |
| UI 风格 | 参考 abloom.site 视觉语言(暗色、编号分区、等宽数据、中英双语标签、克制动效) | 用户指定参考,但不含其 bio 文案 |
| 阈值 | warning=90 天,critical=30 天 | 通用域名续费提醒惯例 |
| 配置文件 | `public/domains.json`(运行时 fetch) | 改域名无需改源码,重新部署即可 |

---

## 3. 配置文件

### 3.1 `public/domains.json`
```json
{
  "domains": ["abloom.site", "example.com", "example.org", "example.cn"],
  "thresholds": {
    "warning": 90,
    "critical": 30
  }
}
```

- `domains`: 字符串数组,目标域名列表。
- `thresholds`: 状态分级阈值(天)。可选,缺省值 `warning=90, critical=30`。

运行时 `fetch('/domains.json')` 读取。修改域名只需编辑此文件并重新部署,无需改动源码。

### 3.2 环境变量

`.env.example`:
```
VITE_BARK_TOKEN=your_bark_device_token_here
VITE_CORS_PROXY=https://corsproxy.io/?url=
```

- `VITE_BARK_TOKEN`: Bark 设备 token(必填,缺失则隐藏推送区)。
- `VITE_CORS_PROXY`: CORS 代理前缀(可选,缺省 `https://corsproxy.io/?url=`)。

`.env` 已在 `.gitignore` 中(确认见 §10 检查清单)。

---

## 4. 数据层设计 `src/lib/`

### 4.1 `types.ts`
```ts
export type DomainStatus =
  | 'expired'   // days < 0
  | 'critical'  // 0 <= days <= critical
  | 'warning'   // critical < days <= warning
  | 'normal'    // days > warning
  | 'unknown'   // 查询失败

export interface DomainInfo {
  domain: string
  registrar: string | null
  isTencent: boolean
  expirationDate: string | null      // ISO 8601
  registrationDate: string | null    // ISO 8601
  daysRemaining: number | null
  status: DomainStatus
  error: string | null
  checkedAt: string                  // ISO 8601
}

export interface DomainConfig {
  domains: string[]
  thresholds: {
    warning: number
    critical: number
  }
}
```

### 4.2 `rdap.ts`
核心函数:`queryDomain(domain: string): Promise<DomainInfo>`

流程:
1. 构造 URL:`https://rdap.org/domain/${domain}`
2. 第一步直连 `fetch(url)`,期望 2xx JSON
3. 若失败(网络错误、非 2xx、CORS 拦截):套代理重试 `fetch(VITE_CORS_PROXY + encodeURIComponent(url))`
4. 解析 RFC 7483 响应:
   - `events` 数组:取 `eventAction === 'expiration'` 的 `eventDate` → 到期日;取 `eventAction === 'registration'` 的 `eventDate` → 注册日
   - `entities` 数组:递归查找 `roles` 含 `'registrar'` 的实体,从其 `vcardArray` 解析 `fn` 字段 → 注册商名
5. 计算 `daysRemaining = floor((expirationDate - now) / day)`
6. 腾讯云识别:`/tencent|腾讯/i.test(registrar)` → `isTencent = true`
7. 状态分级:按 `daysRemaining` 与阈值比较(配置文件阈值或缺省)
8. 任何步骤抛错 → 状态 `unknown`,记录 `error` 信息,但不 reject

返回完整 `DomainInfo`。

### 4.3 `pool.ts`
简易并发池:
```ts
export async function runPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number = 5,
): Promise<R[]>
```
- 限制并发为 5,避免被 RDAP 服务器限流。
- 不短路:某项失败不影响其他项。

### 4.4 `bark.ts`
核心函数:`pushBark(title: string, body: string, options?: { group?: string; sound?: string }): Promise<boolean>`

流程:
1. 读取 `import.meta.env.VITE_BARK_TOKEN`,为空 → 返回 `false` 并 warn
2. `POST https://api.day.app/${token}` JSON body `{ title, body, group, sound }`
3. 2xx → `true`,否则 `false`

### 4.5 `cache.ts`(本地缓存)
- `getCache(domain): DomainInfo | null` —— 读 `localStorage` key `dv:cache:${domain}`,超 24h 视为失效返回 null
- `setCache(domain, info)` —— 写入并附时间戳
- 仅缓存 `status !== 'unknown'` 的结果,避免缓存失败态

---

## 5. 业务编排 `src/composables/useDomainCheck.ts`

### 5.1 主流程
```
loadConfig()                           // fetch /domains.json
  -> 对每个 domain:
       查 cache -> 命中且未过期 -> 直接用
       否则 -> runPool 并发查询(queryDomain)
  -> 汇总所有 DomainInfo
  -> 更新响应式状态
  -> evaluatePush(results)             // 评估是否需要推送
```

### 5.2 自动推送评估 `evaluatePush`
- 紧急集合:`status === 'expired'` 或 `status === 'critical'` 的域名
- 紧急指纹:对紧急集合按域名排序,拼接 `${domain}:${daysRemaining}`,取字符串
- 去重:
  - 读 `localStorage` key `dv:lastPush`,内容 `{ fingerprint, ts }`
  - 若指纹相同且 `now - ts < 24h` → 不推
  - 否则推送,推送成功后写回 `dv:lastPush`
- 推送内容:
  - title: `域名到期提醒`
  - body: 逐行列出紧急域名及剩余天数,如:
    ```
    abloom.site 剩余 12 天
    example.cn 已过期 3 天
    ```

### 5.3 手动测试推送
- UI 按钮触发 `pushBark('Domain Vellum 测试', '推送通道正常')`
- 不受去重限制
- 记录 `dv:lastManualPush` 时间戳供 UI 显示

---

## 6. 状态分级

| status | 条件(daysRemaining 为 d,critical=30,warning=90) | 颜色 | 含义 |
|---|---|---|---|
| expired | d < 0 | 红 `#e5484d` | 已过期 |
| critical | 0 <= d <= 30 | 橙红 `#f76915` | 一个月内到期 |
| warning | 30 < d <= 90 | 黄 `#f5c518` | 三个月内到期 |
| normal | d > 90 | 低饱和绿 `#3dd68c` | 正常 |
| unknown | daysRemaining 为 null | 灰 `#808080` | 查询失败 |

颜色选取遵循 abloom.site 的低饱和暗色调,所有颜色在深色背景下对比度满足 WCAG AA。

---

## 7. UI 设计

### 7.1 视觉语言(参考 abloom.site)
- 背景:近黑 `#0a0a0a` 主色,卡片/区块略亮 `#141414`
- 文字:主文 `#e8e8e8`,次文 `#888`,弱化 `#555`
- 字体:系统无衬线 + 等宽(`ui-monospace, 'JetBrains Mono', monospace`)用于数据
- 编号分区:每个区块左上角 `01 /` `02 /` 形式标题,中英双语
- 细分割线:`1px solid #1f1f1f`
- 动效:克制,仅 hover 微透明度变化和状态加载淡入,无大幅位移
- 双语标签:中文主标 + 英文副标,如 `域名状态 / Domains`

### 7.2 页面结构(自上而下)

**Header**
- 左:标题 `Domain Vellum`(等宽大字)+ 副标 `域名有效期监控看板 / Domain Expiry Monitor`
- 右:实时时钟(等宽,`HH:MM:SS` + `Asia/Shanghai`),纯功能性,致敬 abloom.site 时钟元素

**StatusMarquee(状态滚动条)**
- 一行横向滚动,功能性摘要(非 bio):
  ```
  ◆ {critical+expired} 紧急 ◆ {warning} 即将到期 ◆ {normal} 正常 ◆ {unknown} 失败 ◆ 上次检查 {time}
  ```
- 无紧急时不滚动紧急项

**01 / 域名状态 Domains**
- 域名列表,每行(桌面端):
  - 域名(等宽,主文)
  - 注册商(小字次文,`isTencent` 时追加 `腾讯云` 徽章)
  - 到期日(等宽 `YYYY-MM-DD`)
  - 剩余天数(等宽彩色大数字 + `天` / `天前`)
  - 状态 pill(§6 颜色)
- 移动端:折成卡片,域名在上,数据网格在下
- 加载中:行显示骨架/`查询中…`
- 点击行:展开详情(注册日、注册商全名、原始 error 等)

**02 / 概览 Summary**
- 五个统计格:总数 / 正常 / 即将到期 / 已过期 / 失败
- 每格:等宽大数字 + 双语标签

**推送区(嵌入 02 区或独立小区)**
- "测试推送"按钮
- 上次推送时间(读 `dv:lastPush.ts` 格式化)
- 推送状态文本(`就绪` / `已发送` / `失败` / `未配置`)
- `VITE_BARK_TOKEN` 缺失时整区隐藏

**Footer**
- 极简单行:左 `Domain Vellum · est. 2026`;右 设计参考链接 `Design inspired by abloom.site` 指向 `https://abloom.site/`
- 此链接为用户明确要求放置的 abloom.site 出口

### 7.3 组件清单
```
src/components/
  AppHeader.vue        标题 + 实时时钟
  StatusMarquee.vue    状态滚动条
  DomainList.vue       01 区容器
  DomainRow.vue        单行(桌面行 / 移动卡片自适应)
  StatusPill.vue       状态彩色标签
  SummaryPanel.vue     02 区统计
  PushPanel.vue        推送测试 + 状态
  AppFooter.vue        页脚 + abloom.site 链接
```

### 7.4 响应式
- 桌面(≥ 768px):域名列表为紧凑行布局
- 移动(< 768px):折成卡片,时钟缩小,统计格变 2 列

---

## 8. 文件结构

```
DomainVellum/
  public/
    domains.json              配置文件(用户维护)
    favicon.ico               (已存在)
  src/
    App.vue                   根组件,组合各区块
    main.ts                   (已存在,入口)
    components/
      AppHeader.vue
      StatusMarquee.vue
      DomainList.vue
      DomainRow.vue
      StatusPill.vue
      SummaryPanel.vue
      PushPanel.vue
      AppFooter.vue
    composables/
      useDomainCheck.ts        编排:配置加载+并发查询+推送评估
      useClock.ts              实时时钟
    lib/
      types.ts
      rdap.ts
      pool.ts
      bark.ts
      cache.ts
    styles/
      main.css                全局样式(abloom 风格 token + reset)
  .env.example                VITE_BARK_TOKEN / VITE_CORS_PROXY 示例
  .gitignore                  (确认含 .env)
  (其余已存在文件保持不变)
```

---

## 9. 错误处理

| 场景 | 处理 |
|---|---|
| `/domains.json` 加载失败 | 全屏空状态:`配置加载失败 / Config load failed`,不进入查询流程 |
| RDAP 直连失败 | 自动套代理重试一次,仍失败则该域名 `status=unknown` |
| 代理也失败 | 该域名 `status=unknown`,`error` 记录最后一条错误,不阻断其他域名 |
| 解析 RDAP 响应失败(缺字段) | 能取到 expiration 就分级,取不到则 `status=unknown` |
| `VITE_BARK_TOKEN` 未配置 | 隐藏推送区,console.warn,主流程不受影响 |
| Bark 推送 HTTP 非 2xx | 推送状态标 `失败`,不写 `dv:lastPush`(下次仍会尝试) |
| `localStorage` 不可用(隐私模式) | 缓存与去重功能降级跳过,不影响主查询流程 |

---

## 10. 检查清单(实现时确认)

- [ ] `.gitignore` 含 `.env`
- [ ] `.env.example` 提交但 `.env` 不提交
- [ ] `public/domains.json` 用真实占位(用户后续替换)
- [ ] RDAP 解析对 `entities` 嵌套 `subEntities` 做递归(部分注册商信息在子实体)
- [ ] CORS 代理 URL 拼接:`proxy + encodeURIComponent(rdapUrl)`(代理前缀本身含 `?url=` 等参数)
- [ ] 时钟用 `requestAnimationFrame` 或 `setInterval(1000)`,组件卸载时清理
- [ ] 并发池对空数组安全(返回空数组)
- [ ] 所有 `fetch` 设置合理超时(建议 10s,通过 `AbortController`)

---

## 11. 待用户确认的假设

1. **"放一个 abloom.site 的"**:理解为在 Footer 放一个指向 `https://abloom.site/` 的链接,文案 `Design inspired by abloom.site`。若实际意图不同(如放 logo、放跳转入口),请纠正。
2. 配置文件用 `public/domains.json`(运行时 fetch)而非 TS 模块 —— 默认采纳。
3. 阈值 warning=90 / critical=30 天 —— 默认采纳。
4. 自动推送去重:指纹(紧急域名+剩余天数)+ 24h 冷却 —— 默认采纳。
5. 标题 `Domain Vellum` —— 默认采纳。

---

## 12. 非功能性要求

- **构建**:`pnpm build` 产出静态站点,可托管于 Cloudflare Pages / Vercel / GitHub Pages
- **类型检查**:`pnpm type-check` 通过(vue-tsc)
- **Lint**:`pnpm lint` 通过(oxlint + eslint)
- **无障碍**:语义化 HTML,颜色对比度 WCAG AA,键盘可操作
- **性能**:首屏不阻塞,域名查询异步并行;单个域名查询失败不阻断整体渲染
- **安全**:Bark token 不入仓库;不向第三方泄露域名列表(CORS 代理仅转发单个 RDAP URL)

---

## 13. 后续步骤

本 spec 经用户审阅通过后,转入 `writing-plans` 技能制定分步实现计划。
