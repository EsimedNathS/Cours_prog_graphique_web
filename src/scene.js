import * as THREE from 'three'
import { createStandardMaterial, loadGltf, textureloader } from './tools.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class Scene {
    constructor() {
        this.loadedObjects = {};
        this.scene = new THREE.Scene();
    }

    addCube(size, position, color) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
        const material = new THREE.MeshStandardMaterial({color: color})
        const cube = new THREE.Mesh(geometry, material)
        cube.position.set(position.x, position.y, position.z)
        this.scene.add(cube)
        return cube
    }

    addAmbientLight(color, intensity) {
        const light = new THREE.AmbientLight(color, intensity);
        this.scene.add(light);
    }

    addGround(texture, repeats) {
        const planeSize = 5000
        const planeMatPBR = createStandardMaterial(texture, repeats)
        const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize)
        planeGeo.setAttribute('uv2', new THREE.BufferAttribute(planeGeo.attributes.uv.array, 2))

        this.ground = new THREE.Mesh(planeGeo, planeMatPBR)
        this.ground.rotation.x = Math.PI * -.5
        this.ground.receiveShadow = true

        this.scene.add(this.ground)
    }

    addDirectionalLight() {
        this.sun = new THREE.DirectionalLight(0xFFFFFF, 3.0)
        this.sun.position.set(50, 100, 0)
        this.sun.target.position.set(0, 0, 0)
        this.sun.castShadow = true
        this.sun.shadow.camera.left = -100
        this.sun.shadow.camera.right = 100
        this.sun.shadow.camera.top = 100
        this.sun.shadow.camera.bottom = -100
        this.sun.shadow.camera.near = 1
        this.sun.shadow.camera.far = 200
        this.sun.shadow.mapSize.set(2048, 2048)
        this.scene.add(this.sun)
        this.sunHelper = new THREE.DirectionalLightHelper(this.sun)
        this.scene.add(this.sunHelper)
        return this.sunHelper
    }

    addSkybox(file) {
        textureloader.load(
            `skybox/${file}`,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping
                texture.colorSpace = THREE.SRGBColorSpace
                this.scene.background = texture
            })
    }

    async loadScene(url) {
        const response = await fetch(url)
        const data = await response.json()

        for (const obj of data.nodes) {
            if (this.loadedObjects[obj.name] == undefined) {
                this.loadedObjects[obj.name] = await loadGltf(obj.name)
            }

            let mesh = this.loadedObjects[obj.name].clone()

            mesh.position.fromArray(obj.position.split(',').map(Number))
            mesh.quaternion.fromArray(obj.rotation.split(',').map(Number))
            mesh.scale.fromArray(obj.scale.split(',').map(Number))

            mesh.traverse(o => { 
                if (o.isMesh) { 
                    o.userData = { 
                        isSelectable: true,
                        object : mesh,
                    };
                }
            });
            this.scene.add(mesh)
        }

        let params = {}
        if (data.params) {
            if (data.params.skybox) {
                params.skybox = data.params.skybox
            }
            if (data.params.ground) {
                params.ground = data.params.ground
            }
        }
        return params
    }

    exportScene(params) {
        let exportData = {
            params: params,
            nodes: [],
        };
        let toExport = new Set()
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSelectable) {
                toExport.add(obj.userData.object);
            }
        });
        toExport.forEach((obj) => {  
            exportData.nodes.push({
                name: obj.name || '',
                position: `${obj.position.x},${obj.position.y},${obj.position.z}`,
                rotation: `${obj.quaternion.x},${obj.quaternion.y},${obj.quaternion.z},${obj.quaternion.w}`,
                scale: `${obj.scale.x},${obj.scale.y},${obj.scale.z}`
            });
        });

        const jsonStr = JSON.stringify(exportData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'scene_export.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    clearScene() {
        let objectsToRemove = new Set()
        this.scene.traverse((obj) => {
            if (obj.userData && obj.userData.isSelectable) {
                objectsToRemove.add(obj.userData.object)
            }
        })
        objectsToRemove.forEach((obj) => {  
            this.scene.remove(obj)
        })        
    }
    
}

export { Scene }