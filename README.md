# 我的个人知识库

这个仓库现在已经接好了 Quartz，可以把 [`wiki/`](C:\Users\zsc\my-wiki\wiki) 里的 Markdown 直接发布成一个可点击、可搜索的网站。

## 文件分工

- [`AGENTS.md`](C:\Users\zsc\my-wiki\AGENTS.md)：知识库唯一工作规范，定义 `raw -> wiki` 的整理流程
- [`README.md`](C:\Users\zsc\my-wiki\README.md)：给人看的仓库使用说明
- [`scripts/README.md`](C:\Users\zsc\my-wiki\scripts\README.md)：辅助脚本说明，只负责原始材料层，不定义知识库规则

## 本地预览

1. 安装依赖：`npm ci`
2. 启动本地站点：`npm run dev`
3. 浏览器打开终端里显示的本地地址

Quartz 会直接读取 `wiki/` 目录，不需要额外复制到 `content/`。

## 发布到 GitHub Pages

1. 把仓库推到 GitHub
2. 在 GitHub 仓库设置里启用 `Pages`
3. 确保默认分支是 `main`
4. 推送后，`.github/workflows/deploy-pages.yml` 会自动构建并发布

## 发布前要改的一处

当前 [`quartz.config.ts`](C:\Users\zsc\my-wiki\quartz.config.ts) 已经按你的仓库地址配置为：

`baseUrl: "cloriselvis.github.io/wiki"`

如果以后你改仓库名或绑定自定义域名，再把它改掉：

- 项目页：`你的 GitHub 用户名.github.io/仓库名`
- 自定义域名：`docs.example.com`

## 说明

- `raw/` 仍然放原始材料
- `wiki/` 仍然是实际知识库内容源
- Quartz 只是把 `wiki/` 渲染成网站
