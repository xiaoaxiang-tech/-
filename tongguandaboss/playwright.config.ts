import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * 说明：
 * - 默认使用 preview server（需先 npm run build）；设 E2E_DEV=1 时改用 vite dev server。
 * - chromium 的 launchOptions.args 中：
 *   --disable-direct-write：chromium v151 在 Windows 上经 DirectWrite 渲染中文字体
 *     （Microsoft YaHei）会崩溃渲染进程，禁用后稳定。
 *   注意：本机（无独立 GPU 驱动）的 chromium 对「每帧 canvas drawImage」存在渲染进程
 *   崩溃的系统级问题，e2e 完整流程建议在带 GPU/系统浏览器的环境运行。
 */

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Maximum time one test can run for. */
  timeout: 120 * 1000,
  expect: {
    /**
     * 游戏启动时会同步生成全部像素精灵与 9 个主题背景（主线程阻塞数秒~数十秒），
     * 因此元素断言超时放宽。
     */
    timeout: 30000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 3 : 2,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // 默认用 preview（静态构建产物，速度快且稳定）；设 E2E_DEV=1 时改用 vite dev server
    baseURL: process.env.E2E_DEV ? 'http://localhost:5173' : 'http://localhost:4173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Only on CI systems run the tests headless */
    headless: process.env.CI ? true : true, // 默认无头运行（如需观察浏览器窗口可加 --headed）
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-direct-write',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //   },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: {
    //     channel: 'msedge',
    //   },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: {
    //     channel: 'chrome',
    //   },
    // },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  // outputDir: 'test-results/',

  /* Run your local dev server before starting the tests */
  webServer: {
    /**
     * 默认使用 preview server（需先 npm run build）。
     * 设 E2E_DEV=1 时使用 vite dev server 以便快速反馈循环。
     * Playwright 会复用已运行的 server（reuseExistingServer）。
     */
    command: process.env.E2E_DEV ? 'npm run dev' : 'npm run preview',
    port: process.env.E2E_DEV ? 5173 : 4173,
    reuseExistingServer: !process.env.CI,
  },
})
