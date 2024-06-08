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
let particleLight,sphere;

export default {
	data() {
		return {
			pdata: {},
			theta: 0,
			currentAction:0,
			lastAction:0,
			speed:[0.006,0.003,0.001]
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
					camera = new THREE.PerspectiveCamera(60, container.offsetWidth / container.offsetHeight,
						0.1, 400);
					camera.position.set(0.5, 1.5, 1.5);
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
					// controls.minPolarAngle = Math.PI / 6; //默认值0
					// controls.maxPolarAngle = Math.PI / 2.5; //默认值Math.PI
					controls.enableDamping = true;
					//禁止缩放
					// controls.minDistance = 2.2;
					// controls.maxDistance = 3;
					//禁止拖拽
					controls.enablePan = false;
					controls.autoRotate = data.autoRotate; //场景自动旋转
					controls.target.set(0, 0.5, 0);
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
			scene.add(new THREE.AmbientLight(0xffffff, 20));
			const dirLight = new THREE.DirectionalLight(0xffffff, 40);
			dirLight.position.set(5, 15, 15);
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
			// scene.add(new THREE.AmbientLight(0xc1c1c1, 3));
		},
		async loadEnvironment() {
			let data = this.pdata
			if (data.environmentSrc) {
				new RGBELoader().load(await getfile(data.environmentSrc), async (texture) => {
					texture.mapping = THREE.EquirectangularReflectionMapping;
					// scene.background = texture;
					// scene.environment = texture;
					// scene.background = new THREE.Color(0xffffff);
				});
			}
		},
		async  loadMultipleModels(dataArray, scene, renderer) {
		    const loader = new GLTFLoader();
		    if (dataArray.some(data => data.useDracoCompression)) {
		        // 假设您有一个字段来确定是否使用Draco压缩
		        loader.setDRACOLoader(new DRACOLoader().setDecoderPath(dataArray[0].decoderPath));
		    }
		    const promises = dataArray.map(async (data, index) => {
		        const file = await getfile(data.src);
		        return new Promise((resolve, reject) => {
		            loader.load(
		                file,
		                (gltf) => {
		                    const model = gltf.scene;
		                    scene.add(model);
		
		                    // 为每个模型设置不同的OutlineEffect，或者根据需要共享
		                    let effect = null;
		                    if (index === 0) { // 假设只为第一个模型设置轮廓效果
		                        effect = new OutlineEffect(renderer, {
		                            defaultThickness: 0.015,
		                            defaultColor: [0.0, 0.0, 0],
		                            defaultAlpha: 0.9,
		                        });
		                    }
		
		                    // 调用某个方法通知模型加载完成
		                    this.$ownerInstance.callMethod('receiveRenderData', {
		                        name: 'loaded',
		                        modelIndex: index // 可以传递模型的索引或标识
		                    });
		
		                    this.animate(); // 如果需要为每个模型调用animate，请确保逻辑正确
		                    resolve(model); // 解析Promise，以便在外部知道模型何时加载完成
		                },
		                (xhr) => {
		                    console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // 可选的加载进度回调
		                },
		                (error) => {
		                    console.error('An error happened', error);
		                    reject(error); // 拒绝Promise，以处理加载错误
		                }
		            );
		        });
		    });
		    // 等待所有模型加载完成
		    await Promise.all(promises);
		    // 所有模型加载完成后可以执行的代码
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
							// model.translateX(0.5)
							data.isCenter ? this.center(model) : model.position.set(...data
								.modelPosition)
							this.createPanel()
							// //获取动画
							animations = gltf.animations;
							mixer = new THREE.AnimationMixer(model);
							console.log(gltf.materials);
							idleAction = mixer.clipAction(animations[0]);
							walkAction = mixer.clipAction(animations[1]);
							// console.log('name1',animations[0].name)
							// console.log('name1',animations[1].name)
							runAction = mixer.clipAction(animations[2]);
							// four = mixer.clipAction(animations[3]);
							// five = mixer.clipAction(animations[4]);
							actions = [idleAction, walkAction,runAction];
							// if (data.autoPlay) {
							// 	// for (let s of gltf.animations) {
							// if (animations.length > 0) 
									// idleAction.play()
							// }
							// console.log('animations', animations.length)
							// }
							// const meterial = new THREE.MeshStandardMaterial();
							// const planeGeometry = new THREE.PlaneGeometry(10, 10)
							// const plane = new THREE.Mesh(planeGeometry, meterial)
							// plane.position.set(0, -1, 0)
							// plane.rotation.x = -Math.PI / 2
							// plane.receiveShadow = true
							// scene.add(plane);
							const alexhelper = new THREE.AxesHelper(5)
							scene.add(alexhelper)
							
							const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32); // 半径为0.1，经度32，纬度32
							const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // 绿色材质
							 sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
							sphere.position.set(-1, 0.2, 0.2);
							
							// 将球体添加到场景中
							scene.add(sphere);
							const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE
								.ShadowMaterial({
									color: 0xffffff,
									opacity: 1
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
							let index = 0

							model.traverse(function(object) {
								index++
								let color=0x875e4c
								
								if (object.isMesh) {
									// console.log("name", object.name)
									let whiteMaterial = new THREE.MeshToonMaterial({
										 color: color,
										 gradientMap: gradientMap,
									});
									object.castShadow = true;
									object.material = whiteMaterial;
									color=0xffffff
								}
								const material = object.material;
								// if (material && (material.isMeshStandardMaterial || material.isMeshPhongMaterial)) {
								// 	material.flatShading = false; // 确保启用平滑着色
								// 	console.log('开启平滑着色')
								// }
							});
							scene.add(model);
							this.activateAllActions();
							effect = new OutlineEffect(renderer, {
								defaultThickness: 0.005, //线条粗细
								defaultColor: [0.0, 0.0, 0], //线条颜色
								efaultAlpha: 0.9,
							});
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
				'modify idle weight': 0.0,
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
				this.lastAction=this.currentAction
				this.prepareCrossFade(actions[this.currentAction], actions[p2 - 1], 5.5);
				this.currentAction=p2-1
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
			// this.setWeight(runAction, settings['modify run weight']);
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
			// const weight0 = actions[0].getEffectiveWeight();
			// const weight1 = actions[1].getEffectiveWeight();
			// const weight2 = actions[2].getEffectiveWeight();
			// console.log('idleAction', weight0);
			// console.log('walkAction', weight1);
			// console.log('runAction', weight2);
			// console.log('this.lastAction',this.lastAction,this.currentAction)
			// let speed=actions[this.lastAction].getEffectiveWeight()*this.speed[this.lastAction]+actions[this.currentAction].getEffectiveWeight()*this.speed[this.currentAction];
			// sphere.position.x += speed;
			// if(sphere.position.x>1)
			// 	sphere.position.x=-1
			if (mixer)
				mixer.update(clock.getDelta());
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