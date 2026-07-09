<script setup lang="ts">
import difficultyCard from '@/components/difficulty-card.vue';
import demoCart from '@/components/demo-cart.vue';
import type { DifficultyCart } from '@/ts-type/difficuty-cart';
import type { IdemoCart } from '@/ts-type/demo-cart';
import resjson from '../../../nodejs/mapArr.json'
import { ref } from 'vue';
import router from '@/router';
const typedResJson = resjson as IdemoCart[]
const newtypeResJson = ref<IdemoCart[]>(typedResJson)
const difficultyCartObj: DifficultyCart = [
    {
        dty: '全部',
        color: '#000'
    },
    {
        dty: '简单',
        color: 'rgb(28, 186, 199)'
    },
    {
        dty: '中等',
        color: 'rgb(255, 194, 99)'
    },
    {
        dty: '困难',
        color: 'rgb(246, 58, 74)'
    }
]
let n = ref(0) // 颜色初始下标

function cartclassify(index: number, nArr: IdemoCart[]) {
    n.value = index
    newtypeResJson.value = nArr
}
</script>

<template>
    <div class="box">
        <div class="header">
            <difficultyCard v-for="(item, index) in difficultyCartObj" :key="index" :diffcart="item" :mapindex="index"
                :n="n" @clickItem="cartclassify" :mapobj="typedResJson">
            </difficultyCard>
        </div>
        <div class="body">
            <demoCart v-for="(item, index) in newtypeResJson" :key="index" :mapitem="item"
                @click="router.push({ path: '/demo-detail', query: {
                    color:item.color,
                    difflty:item.difflty,
                    url:item.url,
                    title:item.demoexplain.title,
                    realize:item.demoexplain.realize,
                    Highlights:item.demoexplain.Highlights,
                    Challenges:item.demoexplain.Challenges

                }})"></demoCart>
        </div>
    </div>
    <router-view></router-view>
</template>

<style scoped lang="less">
.box {
    width: 1000px;
    height: 500px;
    margin: 0 auto;

    .header {
        width: 500px;
        height: 60px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .body {
        width: 100%;
        height: 440px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        justify-content: space-between;
        overflow: scroll;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
}
</style>
