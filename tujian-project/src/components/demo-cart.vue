<template>
    <div class="demo-cart">
        <div class="top-video">
            <img :src="mapitem.video" muted autoplay loop></img>
        </div>
        <div class="footer">
            <div class="fleft">
                <span :style="{ color: mapitem.color }">{{ mapitem.difflty }}</span>
                <span>{{ mapitem.dateTime }}</span>
            </div>
            <div class="fright">
                <div class="html-container">
                    <span>html</span>
                    <div class="ratio-container">
                        <div class="ratio" :style="{ width: mapitem.html }"></div> <span>{{ mapitem.html }}</span>
                    </div>
                </div>
                <div class="css-container">
                    <span>css</span>
                    <div class="ratio-container">
                        <div class="ratio" :style="{ width: mapitem.css }"></div> <span>{{ mapitem.css }}</span>
                    </div>
                </div>
                <div class="js-container">
                    <span>js</span>
                    <div class="ratio-container">
                        <div class="ratio" :style="{ width: mapitem.js }"></div> <span>{{ mapitem.js }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IdemoCart } from '@/ts-type/demo-cart';
import { ref } from 'vue'
defineProps<{
    mapitem: IdemoCart
}>()

</script>

<style scoped lang="less">
.demo-cart {
    width: calc(100% / 3px);
    height: 250px;
    cursor: pointer;
    box-shadow: 3px 3px 10px #ccc;

    .top-video {
        width: 100%;
        height: 70%;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .footer {
        width: 100%;
        height: 30%;
        display: flex;

        .fleft {
            width: 25%;
            height: 100%;
            box-shadow: 3px 3px 10px #ccc;
            display: flex;
            flex-direction: column;
            justify-content: center;

            span {
                margin: 5px 0;
                font-weight: 600;
                font-family: 微软雅黑;
            }
        }

        .fright {
            width: 75%;
            height: 100%;
            box-shadow: 3px 3px 10px #ccc;
            padding-left: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-around;

            .html-container {
                width: 100%;
                height: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;

                span {
                    width: fit-content;
                    font-family: 微软雅黑;
                    font-weight: 900;
                    color: rgb(28, 186, 199);
                }

                .ratio-container {
                    width: 80%;
                    height: 15px;
                    background-color: #f4f4f4;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;

                    .ratio {
                        height: 100%;
                        border-radius: 30px;
                        background-color: rgb(28, 186, 199);
                        margin: 0 5px 0 0;
                    }
                }
            }

            .css-container {
                width: 100%;
                height: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;

                span {
                    width: fit-content;
                    font-family: 微软雅黑;
                    font-weight: 900;
                    color: rgb(255, 194, 99);
                }

                .ratio-container {
                    width: 80%;
                    height: 15px;
                    background-color: #f4f4f4;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;

                    .ratio {
                        height: 100%;
                        border-radius: 30px;
                        background-color: rgb(255, 194, 99);
                        margin: 0 5px 0 0;
                    }
                }
            }


            .js-container {
                width: 100%;
                height: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;

                span {
                    width: fit-content;
                    font-family: 微软雅黑;
                    font-weight: 900;
                    color: rgb(246, 58, 74);
                }

                .ratio-container {
                    width: 80%;
                    height: 15px;
                    background-color: #f4f4f4;
                    border-radius: 30px;
                    display: flex;
                    align-items: center;

                    .ratio {
                        height: 100%;
                        border-radius: 30px;
                        background-color: rgb(246, 58, 74);
                        margin: 0 5px 0 0;
                    }
                }
            }

        }
    }
}
</style>