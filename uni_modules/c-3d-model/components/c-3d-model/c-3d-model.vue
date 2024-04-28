<template>
	<!-- #ifdef H5||APP-PLUS -->
	<view class="c-3d-model"  :style="{width,height}"  :modelData="modelData" :change:modelData="three.init" :fun='fun'
		:change:fun='three.callPlayer'>
		<div :id='myCanvasId'></div>
	</view>
	<!-- #endif -->
	<!-- #ifdef MP -->
	<!-- <demo :width="750" :height="1000" :style="{width,height}"></demo> -->
	<view class="c-3d-model"  :style="{width,height}" >
		<canvas class="canvas" :id="myCanvasId" type="webgl" 
			disable-scroll="true"
			@touchstart.stop="touchStart" 
			@touchmove.stop="touchMove" 
			@touchend.stop="touchEnd"></canvas>
	</view>
	<!-- #endif -->
</template>
<script>
	/**
	 * c-3d-model 3d模型预览组件
	 * @description 用于3d模型预览 工业配件展示
	 * @property {String} canvasId 画布id
	 * @property {String} width 图像宽度 默认750rpx 单位rpx/px
	 * @property {String} height 图像高度 默认750rpx 单位rpx/px
	 * @property {String} src 模型地址 小程序只支持网络地址
	 * @property {String} decoderPath DRACO解码器目录地址 APP|H5推荐使用线上地址 小程序小程序暂不支持DRACO
	 * @property {String} environmentSrc 环境贴图地址
	 * @property {Number} ambientLight 环境光强度0-1 默认0.5
	 * @property {Array} modelScale 缩放模型 默认[1, 1, 1]
	 * @property {Array} modelRotate 旋转模型 默认[0, 0, 0]
	 * @property {Array} modelPosition 模型位置 默认[0, 0, 0]
	 * @property {Boolean} autoPlay 是否自动播放模型中的第一组剪辑动画 默认true
	 * @property {Boolean} autoRotate 场景是否自动旋转
	 * @property {Boolean} isCenter 是否通过包围盒自动计算使模型居中 默认false 为true时modelPosition参数失效
	 * @event {Function()} loaded 监听模型加载完成
	 * 组件内方法统一使用 call(funName, args) 调用组件方法 详见文档
	 * */
	import uuid from './js/uuid.js'
	// #ifdef MP

	import * as THREE from 'three-platformize';
	import { WechatPlatform } from 'three-platformize/src/WechatPlatform';
	import { RGBELoader } from 'three-platformize/examples/jsm/loaders/RGBELoader.js';
	import { GLTFLoader } from 'three-platformize/examples/jsm/loaders/GLTFLoader.js';
	// import {OrbitControls} from 'three-platformize/examples/jsm/controls/OrbitControls.js'
	import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
	import {DRACOLoader} from 'three-platformize/examples/jsm/loaders/DRACOLoader.js'

	let camera, scene, renderer, controls, clock, mixer, animations, isReloadModel = false,
		model, ambientLight, THREEglobal,mycanvas;
	// #endif
	export default {
		props: {
			canvasId: {
				type: String
			},
			width: {
				type: String,
				default: '750rpx'
			},
			height: {
				type: String,
				default: '750rpx'
			},
			decoderPath: { //DRACO解码器目录地址 APP|H5推荐使用线上地址 小程序小程序暂不支持DRACO
				type: String,
				default: ''
			},
			src: { //模型地址
				type: String,
			},
			environmentSrc: { //环境贴图地址
				type: String,
			},
			ambientLight: { //环境光强度 0-1
				type: Number,
				default: 0.5
			},
			modelScale: { //缩放模型
				type: Array,
				default:()=> [1, 1, 1] //x,y,z
			},
			modelRotate: { //旋转模型
				type: Array,
				default:()=>  [0, 0, 0] //x,y,z
			},
			modelPosition: { //模型位置
				type: Array,
				default:()=> [0, 0, 0] //x,y,z
			},
			autoPlay: { //是否自动播放模型中的第一组剪辑动画
				type: Boolean,
				default: true
			},
			autoRotate: { //场景是否自动旋转
				type: Boolean,
				default: false
			},
			isCenter:{
				type: Boolean,
				default: false
			}
		},
		emits: ['loaded'],
		data() {
			return {
				fun: {}
			}
		},
		computed: {
			myCanvasId() {
				if (!this.canvasId) {
					return 'c' + uuid(18)
				} else {
					return this.canvasId
				}
			},
			modelData() {
				return {
					myCanvasId: this.myCanvasId,
					width: this.width,
					height: this.height,
					decoderPath: this.decoderPath,
					src: this.src,
					environmentSrc: this.environmentSrc,
					ambientLight: this.ambientLight,
					modelScale: this.modelScale,
					modelRotate: this.modelRotate,
					modelPosition: this.modelPosition,
					autoPlay: this.autoPlay,
					autoRotate: this.autoRotate,
					isCenter:this.isCenter
				}
			}

		},
		watch: {
			modelData() {
				// #ifdef MP
				this.init()
				// #endif
			}
		},
		methods: {
			//释放资源
			disposeScene(scene) {
			    scene.traverse(function(object) {
			        if (object instanceof THREE.Mesh) {
			            object.geometry.dispose();
			            object.material.dispose();
			        }
			        if (object instanceof THREE.Texture) {
			            object.dispose();
			        }
			    });
			},
			//移除场景对象
			removeObjects(scene) {
			    scene.traverse(function(object) {
			        if (object.parent) {
			            object.parent.remove(object);
			        }
			    });
			},
			//从渲染器中移除
			removeFromRenderer(renderer, scene) {
			    renderer.renderLists.dispose();
			    renderer.renderLists.freeMemory();
			    renderer.render(scene, null, 0);
			    renderer.renderLists.init();
			    renderer.renderLists.push(scene, null, 0);
			},
			call(name, args) {
				this.fun = {
					name,
					args
				}
				// #ifdef MP
				if (name == 'play' || name == 'stop') {
					const length = animations.length
					if (length == 0) {
						console.error('模型文件中无剪辑动画');
					} else if (args > length) {
						console.error('模型文件中无该剪辑动画，动画组数：', length);
					} else {
						mixer.clipAction(animations[args])[name]()
					}
				}
				if(name=='dispose'){
					if (model) this.deleteObject(model)
					if(scene){
						this.disposeScene(scene)
						this.removeObjects(scene)
					}
					for (let i = scene.children.length - 1; i >= 0; i--) {
					    scene.remove(scene.children[i]);
					}
					// let gl = renderer.domElement.getContext("webgl");
					// gl && gl.getExtension("WEBGL_lose_context").loseContext();
					THREE.PLATFORM.dispose();
					scene.clear();
					renderer.dispose();
					renderer.forceContextLoss();
					renderer.content = null;
					THREEglobal.cancelAnimationFrame(this.animationID) // 去除animationFrame
					
					camera=null
					scene=null
					renderer=null
					controls=null
					clock=null 
					mixer=null
					animations=null
					isReloadModel = false
					model=null 
					ambientLight=null 
					THREEglobal=null
					mycanvas=null
					console.log('场景销毁');
				}
				// this.callPlayer(fun.value)
				// #endif
			},
			playAnimation(i = 0) {
				this.call('play', i)
			},
			stopAnimation(i = 0) {
				this.call('stop', i)
			},
			// #ifdef MP
			getContext() {
				return new Promise((resolve) => {
					const {
						pixelRatio
					} = uni.getSystemInfoSync()
					uni.createSelectorQuery()
						.in(this)
						.select(`#${this.myCanvasId}`)
						.fields({
							node: true,
							size: true
						})
						.exec(res => {
							const {
								width,
								height
							} = res[0]
							const canvas = res[0].node
							// canvas.width = res[0].width
							// canvas.height = res[0].height
							resolve({
								canvas,
								width,
								height,
								pixelRatio
							})
						})
				})
			},
			async init() {
				isReloadModel = this.oldSrc != this.src || !model
				this.oldSrc = this.src
				if (!scene) {
					// console.log('init');
					let {
						canvas,
						width,
						height,
						pixelRatio
					} = await this.getContext()
					const platform = new WechatPlatform(canvas); // webgl canvas
					// platform.enableDeviceOrientation('game'); // 开启DeviceOrientation
					THREE.PLATFORM.set(platform);
					this.platform = platform;
					mycanvas = THREEglobal = canvas

					// 	//setTimeout(()=>{//让步主线程
					scene = new THREE.Scene();
					//相机
					camera = new THREE.PerspectiveCamera(45, width / height, 0.25, 20);
					camera.position.set(0, 0.4, 0.7);
					renderer = new THREE.WebGLRenderer({
						alpha: true,
						antialias: true, // 抗锯齿
						precision: 'highp',
						logarithmicDepthBuffer: false, //深度缓冲
					});
					renderer.setPixelRatio(pixelRatio*0.5);
					renderer.setSize(width, height);
					renderer.toneMapping = THREE.ACESFilmicToneMapping;
					renderer.toneMappingExposure = 1;
					renderer.outputEncoding = THREE.sRGBEncoding;
					//控制器
					controls = new OrbitControls(camera, renderer.domElement);
					controls.enableDamping = true;
					// controls.enabled = false
					controls.minDistance = 0.1;
					controls.maxDistance = 1;
					controls.autoRotate = this.autoRotate; //场景自动旋转
					controls.target.set(0, 0.1, 0);
					controls.update();
					this.onWindowResize()
					this.animate();
					// 	//},20)

				} else {
					this.onWindowResize()
				}
				clock = new THREE.Clock();
				if (controls) {
					controls.autoRotate = this.autoRotate; //场景自动旋转
				}
				/*
					光源设置
				 */
				this.light()
				//环境
				this.loadEnvironment()
				// model
				this.loadModel()
			},
			onWindowResize() {
				camera.aspect = parseInt(this.width) / parseInt(this.height);
				camera.updateProjectionMatrix();
				renderer.setSize( parseInt(this.width),parseInt(this.height));
			},
			animate() {
				this.animationID=THREEglobal.requestAnimationFrame(this.animate)
				if (mixer) mixer.update(clock.getDelta());

				controls.update(); // required if damping enabled

				this.render();
			},
			render() {
				renderer.render(scene, camera);
			},
			light() {
				let data = this.modelData
				// 环境光
				if (data.ambientLight) {
					if (ambientLight) {
						ambientLight.intensity = data.ambientLight //环境光的强度
					} else {
						ambientLight = new THREE.AmbientLight(0xffffff, data.ambientLight);
						scene.add(ambientLight);
					}

				//点光源
				// const point = new THREE.PointLight(0xffffff,1);
				// point.position.set( 0, 0.4, 0.7 ); //点光源位置
				// scene.add(point); //点光源添加到场景中
				// const point2 = new THREE.PointLight(0xffffff,1);
				// point2.position.set(5,5,-200 ); //点光源位置
				// scene.add(point2); //点光源添加到场景中
				// 半球光
				// const hemiLight = new THREE.HemisphereLight();
				// hemiLight.intensity = 0.8
				// scene.add( hemiLight );
				
				//平行光
				// const light = new THREE.DirectionalLight( 0xffffff,0.2);
				// light.position.set(-50,10,-100);
				// scene.add( light );
				// const light2 = new THREE.DirectionalLight( 0xffffff,0.2);
				// light2.position.set(50,10,100);
				// scene.add( light2 );
				// const light3 = new THREE.DirectionalLight( 0xffffff,1);
				// light3.position.set(0,0,100);
				// scene.add( light3 );
				// const light4 = new THREE.DirectionalLight( 0xffffff,0.8);
				// light4.position.set(0,0,-50);
				// scene.add( light4 );
				}
				
			},
			loadEnvironment() {
				let data = this.modelData
				if (data.environmentSrc) {
					// .setDataType(THREE.UnsignedByteType)
					new RGBELoader().load(data.environmentSrc, (texture) => {
						texture.mapping = THREE.EquirectangularReflectionMapping;
						scene.background = texture;
						scene.environment = texture;
					});
				}
			},
			deleteObject(group) {
				// 递归遍历组对象group释放所有后代网格模型绑定几何体占用内存
				group.traverse(function(obj) {
					if (obj.type === 'Mesh') {
						obj.geometry.dispose();
						obj.material.dispose();
					}
				})
				// 删除场景对象scene的子对象group
				scene.remove(group);
			},
			center(group) {
				/**
				 * 包围盒全自动计算：模型整体居中
				 */
				let box3 = new THREE.Box3()
				// 计算层级模型group的包围盒
				// 模型group是加载一个三维模型返回的对象，包含多个网格模型
				box3.expandByObject(group)
				// 计算一个层级模型对应包围盒的几何体中心在世界坐标中的位置
				let center = new THREE.Vector3()
				box3.getCenter(center)
				// console.log('查看几何体中心坐标', center);
			
				// 重新设置模型的位置，使之居中。
				group.position.x = group.position.x - center.x
				group.position.y = group.position.y - center.y
				group.position.z = group.position.z - center.z
			},
			loadModel() {
				let data = this.modelData
				if (isReloadModel) {
					if (model) this.deleteObject(model)
					new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(data.decoderPath)).load(
						data.src, (gltf) => {
							model = gltf.scene
							model.scale.set(...data.modelScale)
							model.rotateX(data.modelRotate[0])
							model.rotateY(data.modelRotate[1])
							model.rotateZ(data.modelRotate[2])
							data.isCenter?this.center(model):model.position.set(...data.modelPosition)
							mixer = new THREE.AnimationMixer(model);
							if (data.autoPlay) {
								animations = gltf.animations
								// for (let s of gltf.animations) {
								if (animations.length > 0) mixer.clipAction(animations[0]).play();
								// }
							}
							scene.add(model);
							this.$emit('loaded')
						});
				} else {
					model.scale.set(...data.modelScale)
					model.rotateX(data.modelRotate[0])
					model.rotateY(data.modelRotate[1])
					model.rotateZ(data.modelRotate[2])
					model.position.set(...data.modelPosition)
				}

			},
			touchStart(e) {
				this.platform.dispatchTouchEvent(e);
			},
			touchMove(e) {
				this.platform.dispatchTouchEvent(e);
			},
			touchEnd(e) {
				this.platform.dispatchTouchEvent(e);
			}
			// #endif
			// #ifndef MP
			receiveRenderData(val) {
				// console.log(val);
				this.$emit(val.name, val.val)
			},
			// #endif
			
		},
		mounted() {
			// #ifdef MP
			this.init()
			// #endif
		},
		destroyed() {
		},
		beforeDestroy() {
			this.call('dispose')
		}
	}
</script>
<!-- #ifndef MP -->

<!-- #ifdef VUE3 -->
<script src='./js/render.js' module="three" lang="renderjs"></script>
<!-- #endif -->

<!-- #ifdef VUE2 -->
<script module="three" lang="renderjs">
	import threeRender from "./js/render.js"
	export default {
		mixins:[threeRender]
	}
</script>
<!-- #endif -->

<!-- #endif -->

<style lang="scss" scoped>
	.c-3d-model {
		// width: v-bind(width);
		// height: v-bind(height);

		/* #ifndef MP */
		div {
			width: 100%;
			height: 100%;
		}

		/* #endif */

		.canvas {
			width: 100%;
			height: 100%;
		}
	}
</style>