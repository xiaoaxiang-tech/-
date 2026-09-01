/**
 * jsdom 环境下 Canvas 2D 上下文 mock。
 *
 * jsdom 的 canvas.getContext('2d') 返回 null，导致依赖 canvas 的程序化
 * 绘制代码（精灵表/背景生成、drawBackground、drawPlatform、粒子前景绘制）
 * 无法在测试中执行。此 helper 注入一个全功能 Proxy：
 * - 任何方法调用返回安全的空函数
 * - 任何属性读写都有兜底存储（fillStyle 等赋值不报错）
 * - createLinearGradient / createRadialGradient / createPattern 返回可调用对象
 * - measureText / getImageData 返回最小合法结构
 *
 * 同时 patch HTMLCanvasElement.prototype.getContext，让模块顶层
 * `if (isCanvas2DSupported()) { generateAll...() }` 也能在测试中执行。
 */
export function installCanvasMock(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => {} }
  const storage: Record<string, unknown> = {}
  const ctx = new Proxy(function () {} as any, {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => gradient
      }
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
      if (typeof prop === 'string') {
        if (!(prop in storage)) storage[prop] = () => {}
        return storage[prop]
      }
      return undefined
    },
    set(_t, prop, value) {
      storage[prop as string] = value
      return true
    },
  })
  ;(HTMLCanvasElement.prototype as any).getContext = function () {
    return ctx
  }
  return ctx as unknown as CanvasRenderingContext2D
}
