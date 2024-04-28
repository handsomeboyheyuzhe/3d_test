# c-3d-model

### 
- c-3d-model 3d模型预览组件 用于3d模型预览 工业配件展示

	
### c-design交流群号：330647926

### 示例预览

[https://cloud.vuedata.wang/cdesign/#/pages/3d-model/3d-model](https://cloud.vuedata.wang/cdesign/#/pages/3d-model/3d-model)
####
![微信小程序预览](https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/8683b0e7-76a2-4bc4-bbe3-48abc0be8848.png?x-oss-process=image/resize,m_fixed,w_240)

### 一、使用示例
#### vue2/vue3
```html
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
				<button @click="modelScale=[0.6,0.6,0.6],src='https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/8db3e88d-879f-4f1d-bf34-616f36ecad80.glb'" size="mini">盘子</button>
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
				modelScale:[0.6,0.6,0.6],
				src:'https://mp-eeab6da6-80cd-4e80-844a-66b2a7203834.cdn.bspapp.com/cloudstorage/8db3e88d-879f-4f1d-bf34-616f36ecad80.glb',
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
```
### 二、Props

| 字段				| 类型		| 必填	| 默认值				| 描述																																							|
| -----------		| --------	| ----	| ----------------------| -------------------------------	
| canvasId			| String	| 否|  'c'+uuid(18)	| canvasId 画布id 可不填此项																																	|
| width				| String	| 否|  750rpx		| 图像宽度 单位rpx/px																																			|
| height			| String	| 否|  750rpx		| 图像高度 单位rpx/px																																			|
| src				| String	| 是|				| 模型地址 小程序只支持网络地址																																			|
| decoderPath		| String	| 否|    			| DRACO解码器目录地址 APP H5推荐使用线上地址 小程序小程序暂不支持DRACO																																					|
| environmentSrc	| String	| 否|  			    | 环境贴图地址																																					|
| ambientLight		| Number	| 否|  0.5			| 环境光强度 0-1																																					|
| modelScale		| Array		| 否|  [1, 1, 1]	| 缩放模型																																					|
| modelRotate		| Array 	| 否|  [0, 0, 0]	| 旋转模型																																					|
| modelPosition		| Array		| 否|  [0, 0, 0]	| 模型位置																																				|
| autoPlay			| Boolean	| 否|  true			| 是否自动播放模型中的第一组剪辑动画																																					|
| autoRotate		| Boolean	| 否|  false		| 场景是否自动旋转			
| isCenter		| Boolean	| 否|  false		| 是否通过包围盒自动计算使模型居中 为true时modelPosition参数失效																																				|

### 三、Event
| 字段			| 描述										|
| ---------		| ------------------------					|
| loaded	| 监听模型文件加载完成				|


### 四、Methods

#### 组件内方法统一使用 call(funName, args) 调用

```js
	this.$refs.cSvgaRef.call('stop',0)
	//or
	const cSvgaRef = ref()
	cSvgaRef.value.call('stop',0)
```

#### funName args入参为array类型 单个参数可传入string|number类型 
* play(animationIndex); - 播放剪辑动画 animationIndex第几组
* stop(animationIndex); - 停止播放剪辑动画 animationIndex第几组
* dispose(); - 销毁场景  小程序端需要在离开当前页面时主动调用

### 注意：H5|APP端使用需要安装three依赖通过 npm i three  npm i three-platformize
### 微信小程序端退出当前页面需要主动销毁场景this.$refs.modelRef.call('dispose')
### 组件暂时只支持GLTF格式
### 微信小程序IOS端场景内存无法彻底释放,使用时应控制模型大小尽量减少页面切换次数,可避免闪退情况发生 

GLTF介绍
GLTF是一种被广泛使用的文件格式，用来储存3D模型和3D场景。在c-3d-model里你可以非常轻松地引入任意GLTF模型，并将其渲染出来。

使用GLTF的优势
📦 单一文件，完整场景
使用GLTF打包后的GLB文件，可将一整个场景的所有要素包揽进去。轻松管理你的3D资源。

🌍 成熟生态，海量资源
来自全世界的优秀创作者，在不同社区中分享作品。配合c-3d-model的渲染能力，简直是随取随用。