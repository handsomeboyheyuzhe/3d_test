import getfile from './getfile.js'
import * as THREE from 'three';
//导入控制器
import {
	OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js'
//导入模型库
import {
	GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
	RGBELoader
} from 'three/examples/jsm/loaders/RGBELoader.js';
import {
	DRACOLoader
} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
	OutlineEffect
} from 'three/addons/effects/OutlineEffect.js';
let camera, scene, renderer, effect, controls, clock, mixer, animations, isReloadModel = false,
	model, ambientLight;
let idleAction, walkAction, runAction;
let idleWeight, walkWeight, runWeight;
let actions, settings;
let singleStepMode = false;
let particleLight;
export default {
	data() {
		return {
			pdata: {},
			theta: 0,
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
			// group.position.x = group.position.x - center.x
			// group.position.y = group.position.y - center.y
			// group.position.z = group.position.z - center.z
			// group.position.x = 0
			// group.position.y = 0
			// group.position.z = 0
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
				setTimeout(() => { //让步主线程
					const container = document.getElementById(data.myCanvasId)
					// this.container = container
					camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight,
						0.1, 400);
					camera.position.set(0, 1, 1);
					// camera.rotation.y = 3.14;
					// camera.position.set(0.0, 400, 400 * 3.5);

					renderer = new THREE.WebGLRenderer({
						alpha: true,
						antialias: true, // 抗锯齿
						precision: 'highp',
						logarithmicDepthBuffer: false, //深度缓冲
					});
					gl = renderer.getContext();
					glVersion = gl.getParameter(gl.VERSION)
					console.log('opengl version', glVersion)
					renderer.setPixelRatio(window.devicePixelRatio);
					renderer.setSize(container.offsetWidth, container.offsetHeight);
					renderer.toneMapping = THREE.ACESFilmicToneMapping;
					renderer.shadowMap.enabled = true;
					renderer.toneMappingExposure = 1;
					renderer.outputEncoding = THREE.sRGBEncoding;
					//画布？
					container.appendChild(renderer.domElement);
					controls = new OrbitControls(camera, renderer.domElement);
					// controls.minPolarAngle = Math.PI / 2; //默认值0
					// controls.maxPolarAngle = Math.PI / 2; //默认值Math.PI
					controls.enableDamping = true;

					//禁止缩放
					// controls.minDistance = 1;
					// controls.maxDistance = 100;
					//禁止拖拽
					controls.enablePan = false;
					controls.autoRotate = data.autoRotate; //场景自动旋转
					controls.target.set(0, 0.1, 0);
					controls.update();
					this.onWindowResize()

				}, 20);

			} else {
				this.onWindowResize()
			}
			clock = new THREE.Clock();
			if (controls) {
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
			//可以添加点光源到物体上，然后控制物体移动，就可以制造太阳

			//环境光没有方向均匀的照在物体上
			scene.add(new THREE.AmbientLight(0xffffff, 1));
			const dirLight = new THREE.DirectionalLight(0xffffff, 3);
			dirLight.position.set(10, 10, -10);
			dirLight.castShadow = true;
			dirLight.shadow.camera.top = 2;
			dirLight.shadow.camera.bottom = -2;
			dirLight.shadow.camera.left = -2;
			dirLight.shadow.camera.right = 2;
			dirLight.shadow.camera.near = 0.1;
			dirLight.shadow.camera.far = 40;
			scene.add(dirLight);

			// const pointLight = new THREE.PointLight(0xffffff, 5, 800, 0);
			// pointLight.castShadow = true;
			// pointLight.position.set(0, 400, 0);
			// scene.add(pointLight)

			// scene.add(particleLight);

			// Lights

			scene.add(new THREE.AmbientLight(0xc1c1c1, 3));



		},
		async loadEnvironment() {
			let data = this.pdata
			if (data.environmentSrc) {
				new RGBELoader().load(await getfile(data.environmentSrc), async (texture) => {
					texture.mapping = THREE.EquirectangularReflectionMapping;
					scene.background = texture;
					scene.environment = texture;
					// scene.background = new THREE.Color(0x444488);
				});
			}
		},
		async loadModel() {
			let data = this.pdata
			// renderer.render( scene, camera );
			if (isReloadModel) {
				if (model) this.deleteObject(model)
				new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(data.decoderPath))
					.load(
						await getfile(data.src), (gltf) => {
							model = gltf.scene
							model.scale.set(...data.modelScale)
							model.rotateX(data.modelRotate[0])
							model.rotateY(data.modelRotate[1])
							model.rotateZ(data.modelRotate[2])
							model.translateX(0.5)
							data.isCenter ? this.center(model) : model.position.set(...data
								.modelPosition)
							this.createPanel()
							//获取动画
							animations = gltf.animations;
							mixer = new THREE.AnimationMixer(model);
							// console.log('gltf.scene',JSON.stringify(gltf.scene) ); // 输出场景对象
							// console.log('gltf.scenes',JSON.stringify(gltf.scene)); // 输出所有场景对象（如果有多个的话）
							// console.log('gltf.scene.nodes', JSON.stringify(gltf.scene.nodes, null, 2));
							// console.log(gltf.materials);
							// idleAction = mixer.clipAction(animations[0]);
							// walkAction = mixer.clipAction(animations[1]);
							// runAction = mixer.clipAction(animations[2]);
							// four = mixer.clipAction(animations[3]);
							// five = mixer.clipAction(animations[4]);
							// actions = [idleAction, walkAction, runAction];
							// if (data.autoPlay) {
							// 	// for (let s of gltf.animations) {
							// if (animations.length > 0) 
							// 		five.play();

							// 	// }
							console.log('animations', animations.length)
							// }
							// const meterial = new THREE.MeshStandardMaterial();
							// const planeGeometry = new THREE.PlaneGeometry(10, 10)
							// const plane = new THREE.Mesh(planeGeometry, meterial)
							// plane.position.set(0, -1, 0)
							// plane.rotation.x = -Math.PI / 2
							// plane.receiveShadow = true
							// scene.add(plane);

							const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE
								.MeshPhongMaterial({
									color: 0xcbcbcb,
									depthWrite: false
								}));
							mesh.rotation.x = -Math.PI / 2;
							mesh.receiveShadow = true;
							scene.add(mesh);


							const colors = new Uint8Array(2);
							for (let c = 0; c < colors.length; c++) {
								colors[c] = (c / colors.length) * 256;
							}
							const gradientMap = new THREE.DataTexture(colors, colors.length, 1,
								THREE.RedFormat);
							gradientMap.needsUpdate = true;
							model.traverse(function(object) {
								console.log('object',JSON.stringify(object))
								
								if (object.isMesh) {
									// console.log('有一个mesh', object.name)
									
									let whiteMaterial = new THREE.MeshToonMaterial({
										color: 0xc6cea2,
										gradientMap: gradientMap,
										
									});
								
									object.castShadow = true;
									// object.material = whiteMaterial;
								}

								// const material = object.material;
								// if (material && (material.isMeshStandardMaterial || material.isMeshPhongMaterial)) {
								// 	material.flatShading = false; // 确保启用平滑着色
								// 	console.log('开启平滑着色')
								// }
							});

							scene.add(model);
							// this.activateAllActions();
							effect = new OutlineEffect(renderer);
							this.$ownerInstance.callMethod('receiveRenderData', {
								name: 'loaded'
							})
							this.animate();
						});
			} else {
				model.scale.set(...data.modelScale)
				model.rotateX(data.modelRotate[0])
				model.rotateY(data.modelRotate[1])
				model.rotateZ(data.modelRotate[2])
				model.position.set(...data.modelPosition)
			}

		},
		createPanel() {
			settings = {
				'show model': true,
				'show skeleton': false,
				'modify step size': 0.05,
				'from walk to idle': function() {
					this.prepareCrossFade(walkAction, idleAction, 1.0);
				},
				'from idle to walk': function() {
					this.prepareCrossFade(idleAction, walkAction, 0.5);
				},
				'from walk to run': function() {
					this.prepareCrossFade(walkAction, runAction, 2.5);
				},
				'from run to walk': function() {
					this.prepareCrossFade(runAction, walkAction, 5.0);
				},
				'use default duration': true,
				'set custom duration': 3.5,
				'modify idle weight': 1.0,
				'modify walk weight': 0.0,
				'modify run weight': 0.0,
				'modify time scale': 1.0
			};
		},
		playAnimationTwo(val) {
			let {
				p1,
				p2
			} = val

			if (p1) {
				console.log('p1 p2', p1, p2)
				this.prepareCrossFade(actions[p1 - 1], actions[p2 - 1], 5.5);
				// idleAction.crossFadeTo(walkAction, 5.0, true);
			}
		},
		playAnimation(i = 0) {
			this.call('play', i)
		},
		stopAnimation(i = 0) {
			this.call('stop', i)
		},
		executeCrossFade(startAction, endAction, duration) {
			this.setWeight(endAction, 1);
			endAction.time = 0;
			startAction.crossFadeTo(endAction, duration, true);

		},
		unPauseAllActions() {
			actions.forEach(function(action) {
				action.paused = false;
			});

		},
		synchronizeCrossFade(startAction, endAction, duration) {
			mixer.addEventListener('loop', onLoopFinished);
			let that = this

			function onLoopFinished(event) {
				if (event.action === startAction) {
					mixer.removeEventListener('loop', onLoopFinished);
					that.executeCrossFade(startAction, endAction, duration);
				}
			}
		},
		prepareCrossFade(startAction, endAction, defaultDuration) {
			// Switch default / custom crossfade duration (according to the user's choice)
			const duration = defaultDuration;
			// Make sure that we don't go on in singleStepMode, and that all actions are unpaused
			singleStepMode = false;
			this.unPauseAllActions();
			// If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
			// else wait until the current action has finished its current loop
			if (startAction === idleAction) {
				this.executeCrossFade(startAction, endAction, duration);
			} else {
				this.synchronizeCrossFade(startAction, endAction, duration);
			}
		},
		activateAllActions() {
			this.setWeight(idleAction, settings['modify idle weight']);
			this.setWeight(walkAction, settings['modify walk weight']);
			this.setWeight(runAction, settings['modify run weight']);

			actions.forEach(function(action) {
				action.play();

			});

		},
		setWeight(action, weight) {
			action.enabled = true;
			action.setEffectiveTimeScale(1);
			action.setEffectiveWeight(weight);
		},
		onWindowResize() {
			const container = document.getElementById(this.pdata.myCanvasId)
			camera.aspect = container.offsetWidth / container.offsetHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(container.offsetWidth, container.offsetHeight);
		},
		animate() {
			this.animationID = requestAnimationFrame(this.animate);

			//3渲2的灯光位置变换
			// const timer = Date.now() * 0.00025;

			// particleLight.position.x = Math.sin(timer * 7) * 300;
			// particleLight.position.y = Math.cos(timer * 5) * 400;
			// particleLight.position.z = Math.cos(timer * 3) * 300;
			if (mixer)
				mixer.update(clock.getDelta());
			// this.theta+=0.02
			// if(this.theta>3.12)
			// 	this.theta=0
			// camera.position.set(5 * Math.sin(this.theta), 0, 5 * Math.cos(this.theta));
			// console.log('theta', this.theta)
			// camera.rotation.y += 0.02;
			controls.update(); // required if damping enabled
			// this.render();
			effect.render(scene, camera);
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
			console.info('into callPlayer', args, name)
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
				scene = null
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
	unmounted() {
		this.callPlayer({
			name: 'dispose'
		})
	}
}