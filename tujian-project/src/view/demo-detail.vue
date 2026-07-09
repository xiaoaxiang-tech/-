<template>
    <iframe :src="demoexplain.url" frameborder="0" scrolling="no" style="overflow: hidden !important;"
        :style="{ height: height + 'px' }"></iframe>
    <div class="demo-info">
        <div>
            <span class="label">名字:</span>
            <span class="text">{{ demoexplain.title }}</span>
        </div>
        <div>
            <span class="label">难度:</span>
            <span class="diff" :style="{ color: demoexplain.color }">{{ demoexplain.difflty }}</span>
        </div>
        <div>
            <span class="label">实现:</span>
            <span class="text">{{ demoexplain.realize }}</span>
        </div>
        <div>
            <span class="label">难点:</span>
            <span class="text">{{ demoexplain.Challenges }}</span>
        </div>
        <div>
            <span class="label">亮点:</span>
            <span class="text highlight">{{ demoexplain.Highlights }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getIfreamAPL } from '@/axios/API';
import type { IdemoExplain } from '@/ts-type/demo-cart';
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router';

const route = useRoute()

const demoexplain = route.query as unknown as IdemoExplain
let height = ref(800)
onMounted(async () => {
    let res = await getIfreamAPL(demoexplain.url)
    height.value = res
})
</script>

<style scoped lang="less">
iframe {
    width: 100%;
    transition: all .3s;
}

// 变量区（你以后想改主题直接改这里）
@bg-color: #f8fafc;
@label-color: #2d3748;
@text-color: #4a5568;
@highlight-color: #2b8a3e;

.demo-info {
    max-width: 900px;
    margin: 20px auto;
    padding: 20px 25px;
    background: @bg-color;
    border-radius: 14px;
    line-height: 1.8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

    // 子元素嵌套
    div {
        margin: 10px 0;
        font-size: 15px;
    }

    // 标签样式
    .label {
        display: inline-block;
        min-width: 50px;
        margin-right: 10px;
        font-weight: 600;
        color: @label-color;
        font-size: 15px;
    }

    // 文本
    .text {
        color: @text-color;
        font-weight: 500;
    }

    // 难度
    .diff {
        font-weight: 600;
        font-size: 15px;
    }

    // 亮点突出
    .highlight {
        color: @highlight-color !important;
        font-weight: 600;
    }
}
</style>