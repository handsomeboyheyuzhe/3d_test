import getfile from './getfile.js'
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';

let camera, scene, renderer, controls, clock, mixer, animations, isReloadModel = false,model, ambientLight;
export default {
	data() {
		return {
			pdata: {}
		}
	},
	methods: {
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
		async init(val, oldValue, vm) {
			let data;
			if (val) {
				data = val
				isReloadModel = this.pdata.src != data.src
				this.pdata = data
			} else {
				data = this.pdata
			}
			if (!scene) {
				scene = new THREE.Scene();
				setTimeout(()=>{//让步主线程
					const container = document.getElementById(data.myCanvasId)
					// this.container = container
					camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 0.25, 20);
					camera.position.set(0, 0.4, 0.7);
					renderer = new THREE.WebGLRenderer({
						alpha: true,
						antialias: true, // 抗锯齿
						precision: 'highp',
						logarithmicDepthBuffer: false, //深度缓冲
					});
					renderer.setPixelRatio(window.devicePixelRatio);
					renderer.setSize(container.offsetWidth, container.offsetHeight);
					renderer.toneMapping = THREE.ACESFilmicToneMapping;
					renderer.toneMappingExposure = 1;
					renderer.outputEncoding = THREE.sRGBEncoding;
					container.appendChild(renderer.domElement);
					controls = new OrbitControls(camera, renderer.domElement);
					controls.enableDamping = true;
					controls.minDistance = 0.1;
					controls.maxDistance = 1;
					controls.autoRotate = data.autoRotate; //场景自动旋转
					controls.target.set(0, 0.1, 0);
					controls.update();
					this.onWindowResize()
					this.animate();
				},20);
				// controls.autoRotate = data.autoRotate; //场景自动旋转
				// this.loadModel()
				// this.loadEnvironment()
				// this.light()
				// this.onWindowResize()
				// return
			}else{
				this.onWindowResize()
			}
			clock = new THREE.Clock();
			if(controls){
				controls.autoRotate = data.autoRotate; //场景自动旋转
			}
			/*
				光源设置
			 */
			this.light()
			//环境 
			this.loadEnvironment()
			// model 
			this.loadModel()
			
			
			// window.addEventListener('resize', this.onWindowResize );
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
		light() {
			let data = this.pdata
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
		async loadEnvironment() {
			let data = this.pdata
			if (data.environmentSrc) {
				new RGBELoader().load(await getfile(data.environmentSrc), async (texture) => {
					texture.mapping = THREE.EquirectangularReflectionMapping;
					scene.background = texture;
					scene.environment = texture;
				});
			}
		},
		async loadModel() {
			let data = this.pdata
			if (isReloadModel) {
				if (model) this.deleteObject(model)
				new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(data.decoderPath)).load(
					await getfile(data.src), (gltf) => {
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
						this.$ownerInstance.callMethod('receiveRenderData', {
							name: 'loaded'
						})
					});
			} else {
				model.scale.set(...data.modelScale)
				model.rotateX(data.modelRotate[0])
				model.rotateY(data.modelRotate[1])
				model.rotateZ(data.modelRotate[2])
				model.position.set(...data.modelPosition)
			}

		},
		onWindowResize() {
			const container = document.getElementById(this.pdata.myCanvasId)
			camera.aspect = container.offsetWidth / container.offsetHeight;
			camera.updateProjectionMatrix();

			renderer.setSize(container.offsetWidth, container.offsetHeight);

		},
		animate() {
			this.animationID=requestAnimationFrame(this.animate);

			if (mixer) mixer.update(clock.getDelta());

			controls.update(); // required if damping enabled

			this.render();

		},
		render() {
			renderer.render(scene, camera);
		},
		async callPlayer(val) {
			if (!val.name) return;
			let {
				name,
				args
			} = val
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
			if (name == 'dispose') {
				console.log('场景销毁');
				scene?.clear();
				renderer.dispose();
				renderer.forceContextLoss();
				renderer.content = null;
				cancelAnimationFrame(this.animationID) // 去除animationFrame
				let gl = renderer.domElement.getContext("webgl");
				gl && gl.getExtension("WEBGL_lose_context").loseContext();
				scene=null
			}
			// console.log(name, args);
			// if(Array.isArray(args)){
			// 	this.player[name](...args)
			// }else{
			// 	this.player[name](args)
			// }
		}
	},
	async mounted() {
		// await this.init();
	},
	unmounted(){
		this.callPlayer({name:'dispose'})
	}
}