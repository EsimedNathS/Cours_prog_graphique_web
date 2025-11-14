import * as THREE from 'three'
import { Scene } from './scene'
import { Camera } from './camera'
import { UI } from './ui'
import { GameManager } from './gameManager.js';

// wifi-poly-09
// Z7ngicz_

export class Application {
    
    constructor() {
        this.renderer = new THREE.WebGLRenderer({antialias: true})
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement)

        this.scene = new Scene();
        // this.scene.addCube({x: 2, y: 2, z: 2}, {x: 0, y: 1, z: 0}, 0xff0000);
        this.initParams();

        this.camera = new Camera(this.renderer);

        this.scene.addAmbientLight(0xffffff, 0.1);
        this.scene.addDirectionalLight();

        this.scene.addGround(
            this.groundParams.texture,
            this.groundParams.repeats
        );
        this.scene.addSkybox(this.skyboxParams.file)

        this.scene.loadScene('/scenes/scene_1.json')

        this.ui = new UI()
        this.ui.addGlobalUI(this.globalParams, this.camera.toogleControls.bind(this.camera), 
            () => {
                this.scene.exportScene({ skybox : this.skyboxParams, ground: this.groundParams})
            },
            () => {
                importInput.click()
            },
            this.scene.clearScene.bind(this.scene)
        )
        this.ui.addSkyboxUI(this.skyboxFiles, this.skyboxParams, this.scene.addSkybox.bind(this.scene))
        this.ui.addGroundUI(this.groundTextures, this.groundParams, this.scene.addGround.bind(this.scene))
        // this.ui.addSunUI(this.scene.sun)
        this.ui.addSelectionUI()

        this.selectedObject = null
        this.selectedMesh = null
        this.selectedMeshMaterial = null
        this.renderer.domElement.addEventListener('click', (event) => {
            if (this.globalParams.useWASD) return
            if (this.selectedObject != null) {
                this.selectedMesh.material = this.selectedMeshMaterial
                this.selectedObject = null
            }
            const rect = this.renderer.domElement.getBoundingClientRect()
            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            )
            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(mouse, this.camera.camera)
            const intersects = raycaster.intersectObjects(this.scene.scene.children, true)
            const hit = intersects.find(i => i.object && i.object.userData && i.object.userData.isSelectable)
            if (hit) {
                this.selectedMesh = hit.object
                this.selectedObject = this.selectedMesh.userData.object
                this.selectedMeshMaterial = this.selectedMesh.material
                this.selectedMesh.material = new THREE.MeshStandardMaterial({ color: 0xffff00 })
                this.ui.updateSelectionUI(this.selectedObject)
            } else {
                this.ui.hideSelectionUI()
            }
        });

        this.moveSelectedObject = false
        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyG': this.moveSelectedObject = !this.moveSelectedObject; break
            }
        })
        document.addEventListener('mousemove', (event) => {
            if (this.moveSelectedObject && this.selectedObject != null) {
                const rect = this.renderer.domElement.getBoundingClientRect()
                const mouse = new THREE.Vector2(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -((event.clientY - rect.top) / rect.height) * 2 + 1
                )
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, this.camera.camera);
                const intersects = raycaster.intersectObject(this.scene.ground, true);
                if (intersects.length > 0) {
                    this.selectedObject.position.copy(intersects[0].point);
                    this.ui.updateSelectionUI(this.selectedObject)
                }
            }
        });

        this.scene.addBases();
        this.gameManager = new GameManager(this.scene, this.ui);
        this.ui.addGameplayUI(this.gameManager);

        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    render() {
        const delta = this.clock.getDelta();
        this.gameManager.updateUnits(delta);
        this.renderer.render(this.scene.scene, this.camera.camera)
    }

    initParams() {
        this.groundTextures = [
            'aerial_grass_rock',
            'brown_mud_leaves_01',
            'forrest_ground_01',
            'gravelly_sand',
            'forest_floor'
        ]
        this.groundParams = {
            texture: this.groundTextures[0],
            repeats: 750,
        }

        this.skyboxFiles = [
            'DaySkyHDRI019A_2K-TONEMAPPED.jpg',
            'DaySkyHDRI050A_2K-TONEMAPPED.jpg',
            'NightSkyHDRI009_2K-TONEMAPPED.jpg',
        ]
        this.skyboxParams = {
            file: this.skyboxFiles[0]
        }

        this.globalParams = {
            useWASD: false // ou true pour le mode "contrôle caméra"
        };
    }

}
