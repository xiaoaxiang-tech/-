const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer"); // 需要安装：npm install puppeteer

const app = express();
app.use(cors());
app.use(express.static("video"));
app.use(express.static("案列/前端案列"));

// 全局复用浏览器实例（提升性能，避免每次请求都启动新浏览器）
let browser;
async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,          // 无头模式
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // 解决部分环境权限问题
    });
  }
  return browser;
}

app.get("/demo-height", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing url parameter", height: 800 });
  }

  // 简单校验 URL 格式（防止 SSRF 等风险，可根据需要加强）
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL", height: 800 });
  }

  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    // 设置合理的超时和等待策略
    await page.goto(url, {
      waitUntil: "networkidle2", // 等待网络空闲，确保大部分动态内容加载
      timeout: 15000             // 15秒超时
    });

    // 获取页面滚动高度（兼容多种情况）
    const height = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
    });

    await page.close(); // 关闭当前页面，保留浏览器实例

    // 返回高度 + 50px 余量（与原逻辑一致）
    res.json({ height: height + 50 });
  } catch (err) {
    console.error("Puppeteer error:", err.message);
    // 发生错误时返回默认高度 800
    res.json({ height: 800 });
  }
});

// 优雅关闭：进程结束时关闭浏览器
process.on("SIGINT", async () => {
  if (browser) await browser.close();
  process.exit();
});

app.listen(3000, () => {
  console.log("服务器启动：http://localhost:3000");
});