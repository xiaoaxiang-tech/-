<template>
    <div :style="{ color: diffcart.color }" :class="{ active: n === mapindex }" @click="cartclassify(mapindex)">{{
        diffcart.dty }}</div>
</template>

<script setup lang="ts">
import type { IdemoCart } from '@/ts-type/demo-cart';
import type { DifficultyItem } from '@/ts-type/difficuty-cart';
import { ref } from 'vue';
let p = defineProps<{
    diffcart: DifficultyItem
    mapindex: number
    n: number
    mapobj: IdemoCart[] //demo旧数组
}>();

const emit = defineEmits<{
    clickItem: [index:number,nArr:IdemoCart[]]
}>()
function cartclassify(index: number) {
    let nArr;
    if (p.diffcart.dty === '全部') {
        nArr = p.mapobj
    } else {
        nArr = p.mapobj.filter(item => item.difflty === p.diffcart.dty)
    }
    emit('clickItem', index, nArr)
}
</script>

<style scoped lang="less">
div {
    width: 100px;
    height: 50px;
    // background-color: rgb(246, 179, 179, 0.5);
    box-shadow: 3px 3px 10px #ccc;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-family: 微软雅黑;
    font-size: 18px;
    font-weight: 900;
    border-radius: 15px;
    transition: all .3s;
}

.active {
    background-color: rgba(170, 169, 169, 0.5);
    backdrop-filter: blur(10px);
}
</style>