#!/usr/bin/env node
/**
 * vitest 单元测试启动包装器
 *
 * 背景：Windows 上 Node 的 ESM 模块缓存按 URL 字符串区分模块，
 * `file:///C:/...` 与 `file:///c:/...` 会被视为两个不同模块。
 * 当终端从 `c:\`（小写盘符）启动 vitest 时，module runner 通过 cwd 解析
 * `vitest` 包得到小写 URL，而 vitest 主进程经 `node_modules/.bin` 的 `%~dp0`
 * 得到大写 URL，导致 @vitest/runner 被加载两次、内部 runner 状态分裂，
 * 报错 `Cannot read properties of undefined (reading 'config')`。
 *
 * 解决：启动前将 cwd 盘符统一为大写，并以大写 URL 加载 vitest，保证主进程、
 * worker、module runner 三处模块 URL 大小写一致。
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// 消除 vitest 4 native config loader 对 vite.config 无扩展名导入的提示性警告
process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true'

function normalizeWindowsDrive(p) {
  if (process.platform !== 'win32') return p
  return p.replace(/^([a-z]):/i, (m) => m.toUpperCase())
}

const cwd = normalizeWindowsDrive(process.cwd())
if (cwd !== process.cwd()) {
  process.chdir(cwd)
}

// 从大写 cwd 解析 vitest 入口，确保 URL 大小写与主进程/worker 一致
const require = createRequire(pathToFileURL(join(cwd, 'package.json')).href)
// './package.json' 在 vitest 的 exports 中对外暴露，可据此定位包目录
const pkgJsonPath = require.resolve('vitest/package.json')
const vitestDir = dirname(pkgJsonPath)
const cliEntry = join(vitestDir, 'dist', 'cli.js')

await import(pathToFileURL(cliEntry).href)
