# Cloudflare Pages 部署指南

这是纯静态 PWA，无 Functions、数据库、密钥或服务端环境变量。构建产物为 `dist/`。当前没有登录 Cloudflare 或 GitHub，也没有执行公网部署。

## 方式一：直接上传（最少步骤）

1. 在项目目录安装 Node.js 24，然后运行 `npm install`、`npm run build`。
2. 登录 Cloudflare Dashboard，进入 **Workers & Pages**，创建 **Pages** 项目，选择直接上传静态资产（Direct Upload / Upload assets，界面名称可能随版本调整）。
3. 项目名可用 `beauty-quest`，上传 `dist/` 中的全部内容，或使用交付的 `LovelyRabbit-pages.zip`。
4. 确保上传包根目录就是 `index.html`，旁边有 `assets/`、`sw.js`、`manifest.webmanifest` 和 PNG 图标。不要在根目录再套一层 `dist/` 或源码目录。
5. 完成部署后，Cloudflare 会返回实际 `https://...pages.dev` 地址。用手机打开这个真实地址，不要使用本文里的占位地址。
6. 等待页面联网加载完成，按 PWA-INSTALL.md 安装到手机桌面。

直接上传项目和 Git 集成项目的切换存在平台限制；想自动部署时建议从一开始选择方式二，或另建 Git 集成项目。

## 方式二：Git 自动构建

1. 自行创建 GitHub / GitLab 仓库，提交当前源代码与 package-lock.json。不要提交 node_modules、work、测试个人备份或浏览器数据。
2. 在 Cloudflare Pages 创建项目并连接该仓库，选择部署分支。
3. 框架预设选择 **React (Vite)**，或手动填写：

| 配置项                 | 值                                                       |
| ---------------------- | -------------------------------------------------------- |
| Build command          | `npm run build`                                          |
| Build output directory | `dist`                                                   |
| Root directory         | 仓库根目录；若项目位于子目录，填该子目录                 |
| Node.js                | 24（项目含 `.node-version`；也可设置 `NODE_VERSION=24`） |
| Secrets / API keys     | 不需要                                                   |

4. 平台安装依赖并构建后检查日志，确认部署成功并记录它实际返回的网址。
5. 后续 push 会触发新部署。先备份手机数据，再测试升级；网站更新会替换静态资源，不会主动清空 IndexedDB。

## 可选：Wrangler 手动部署

本机登录授权由你完成，以下命令会上传真实资源：

```powershell
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name beauty-quest
```

仅在你决定发布并登录后执行；本次未执行以上登录与上传。

## 上线后验收

- 首页可以选择或跳过心愿设置，首次数据为 0 积分。
- 打卡后重开页面积分保留；兑换后可用余额减少，累计积分 不减。
- 浏览器开发者工具 Application → Manifest：名称、standalone、192/512 图标和 maskable 均存在。
- Application → Service Workers：作用域 `/`，状态 activated；Cache Storage 有 Workbox 预缓存。
- 联网打开一次后，切换飞行模式，完全关闭再打开桌面应用，能进入页面并打卡。恢复联网后数据仍在本地。
- 在小米 Civi 4 Pro 的小米浏览器和 Chrome 中分别测试。两个浏览器的数据不共享。
- 先导出一份 JSON，确认文件落地，再在另一个浏览器导入恢复，检查记录与积分。

## 常见问题

**打开空白 / 资源 404**：检查 ZIP 根目录；当前配置面向站点根路径 `/`，不能直接放到任意子目录。如果确实需要子路径，需要同步调整 Vite base、Manifest scope/start_url 与图标绝对路径再构建。

**离线没生效**：必须 HTTPS（localhost 除外）；必须使用生产构建并至少成功联网打开一次；开发模式不注册离线 SW。确认缓存完成后再断网。不要用手机访问电脑的 `http://局域网IP:端口` 来验收 PWA 安装/离线，因为它通常不具备安全上下文。

**新版没有马上出现**：退出所有应用窗口后重新打开，检查部署是否完成。SW 使用 autoUpdate；请先完成当前表单保存，避免等待更新时丢失尚未保存的输入。`public/_headers` 为 SW、HTML、Manifest 配置重新验证，为带 hash 资源配置长期缓存。

**更换域名后记录没了**：浏览器按来源隔离数据；旧域名先导出，新域名再导入。正式使用后保持域名稳定。

## 官方参考

- [Cloudflare Pages 构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)：React (Vite) 的构建命令与 dist 目录。
- [Cloudflare Pages 直接上传](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
- [Vite 静态站点部署](https://vite.dev/guide/static-deploy.html)。
- [vite-plugin-pwa 官方指南](https://vite-pwa-org.netlify.app/guide/)。


