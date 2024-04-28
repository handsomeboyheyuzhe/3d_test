<template>
    <view>
        <c-3d-model ref="modelRef" :height="height" :src='src'
            :environmentSrc='environmentSrc' 
            :decoderPath='decoderPath' :autoRotate='autoRotate'
            :modelScale="modelScale" :ambientLight='0' @loaded='onLoaded'></c-3d-model>
         <view class="content">
            <view>区域渲染</view>
            <view class="btnBox">
                <button @click="height='800rpx'" size="mini">高度800rpx</button>
                <button @click="height='1000rpx'" size="mini">高度1000rpx</button>
            </view>
            <view>动画控制</view>
            <view class="btnBox">
                <button @click="$refs.modelRef.playAnimation(0)" size="mini">播放</button>
                <button @click="$refs.modelRef.stopAnimation(0)" size="mini">停止</button>
            </view>
            <view>场景控制</view>
            <view class="btnBox">
                <button @click="autoRotate=true" size="mini">自动旋转</button>
                <button @click="autoRotate=false" size="mini">停止旋转</button>
            </view>
            <view>模型</view>
            <view class="btnBox">
                <button @click="modelScale=[0.6,0.6,0.6],src='/static/model/blender.glb'" size="mini">盘子</button>
                <!-- #ifdef MP -->
                <!-- 小程序端暂不支持DRACO压缩模型-->
                <button @click="modelScale=[0.2,0.2,0.2],src='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/5d175218-1f6a-41ff-9e6b-7247304dfb05.glb'" size="mini">头盔</button>
                <!-- #endif -->
                <!-- #ifndef MP -->
                <button @click="modelScale=[0.2,0.2,0.2],src='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/1ec4ee9c-4108-49b6-8560-fdf27989db69.gltf'" size="mini">头盔</button>
                <!-- #endif -->
            </view>
            <view>环境</view>
            <view class="btnBox">
                <button @click="environmentSrc='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/b45a40ff-e04f-43d7-afea-399e398ee35a.hdr'" size="mini">环境一</button>
                <button @click="environmentSrc='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/09941b83-5dad-4cae-855e-5de245973954.hdr'" size="mini">环境二</button>
                <button @click="environmentSrc='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/4339b8c6-481b-48f9-bc62-3b12cb7194d4.hdr'" size="mini">环境三</button>
                <button @click="environmentSrc='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/2edfd004-f4d2-45f1-8dac-3be1096bd0ce.hdr'" size="mini">环境四</button>
            </view>
         </view>
    </view>
</template>

<script>

    export default {
        data() {
            return {
                height: '1000rpx',
                autoRotate:false,
                decoderPath:'https://cloud.vuedata.wang/draco/',
                modelScale:[0.3,0.3,0.3],
                src:'/static/model/dog.glb',
                environmentSrc:'https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/b45a40ff-e04f-43d7-afea-399e398ee35a.hdr'
            }
        },
        methods: {
            onLoaded() {
                console.log('模型加载完成');
            }
        },
        onUnload() {
            this.$refs.modelRef.call('dispose')
        }
    }
</script>

<style lang="scss">
    .page{
        width: 100vw;
        overflow-x: hidden;
    }
    .content{
        padding: 20rpx;
        font-size: 28rpx;
    }
    .btnBox{
        width: 100%;
        display: flex;align-items: center;
        margin-top: 20rpx;
        margin-bottom: 30rpx;
    }
</style>