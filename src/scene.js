import * as THREE from 'three'
import { createStandardMaterial, loadGltf, textureloader } from './tools.js';
import { UnitTypes } from './unitTypes.js';
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

    addBases() {
        // Base du joueur
        const playerBaseGeometry = new THREE.BoxGeometry(10, 10, 10);
        const playerBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const playerBase = new THREE.Mesh(playerBaseGeometry, playerBaseMaterial);
        playerBase.position.set(-10.71, 5, 63.65); // un peu à gauche
        playerBase.castShadow = true;
        playerBase.receiveShadow = true;
        playerBase.name = "PlayerBase";
        this.scene.add(playerBase);

        // Base ennemie
        const enemyBaseGeometry = new THREE.BoxGeometry(10, 10, 10);
        const enemyBaseMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const enemyBase = new THREE.Mesh(enemyBaseGeometry, enemyBaseMaterial);
        enemyBase.position.set(81.35, 5, -23.63); // un peu à droite
        enemyBase.castShadow = true;
        enemyBase.receiveShadow = true;
        enemyBase.name = "EnemyBase";
        this.scene.add(enemyBase);

        // On peut les garder pour les manipuler plus tard
        this.playerBase = playerBase;
        this.enemyBase = enemyBase;
    }

    createEnemy(type = 'basic') {
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
        const enemy = new THREE.Mesh(geometry, material);
        enemy.castShadow = true;
        enemy.receiveShadow = true;

        // Position de spawn
        enemy.position.copy(this.enemyBase.position.clone().add(new THREE.Vector3(-6, 0, 0)));

        // Données pour le mouvement et PV
        enemy.userData = {
            type,
            speed: 0.3 + Math.random() * 0.2,
            hp: 10,
            maxHp: 10,
            damage: 2,
            isEnemy: true,
            atBase: false,          // l’ennemi a atteint la base
            attackCooldown: 1,      // intervalle en secondes entre attaques
            lastAttackTime: 0       // timestamp de la dernière attaque
        };

        // --- Barre de pv ---
        // Cadre fixe
        const frameGeometry = new THREE.PlaneGeometry(3.2, 0.9); // un peu plus grand
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hpFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        hpFrame.position.set(0, 2, 0);
        enemy.add(hpFrame);

        // Barre interne
        const barGeometry = new THREE.PlaneGeometry(3, 0.7);
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const hpBar = new THREE.Mesh(barGeometry, barMaterial);
        hpBar.position.set(0, 2, 0.01); // légèrement devant le cadre
        enemy.add(hpBar);

        enemy.userData.hpBar = hpBar;
        enemy.userData.hpBarMaxWidth = 3; // pour savoir la largeur d'origine

        // Ajouter à la liste des ennemis et à la scène
        if (!this.enemies) this.enemies = [];
        this.enemies.push(enemy);
        this.scene.add(enemy);
    }

    createUnit(type = 'basic', isEnemy = false) {
        const config = UnitTypes[type];
        if (!config) throw new Error(`Type d’unité inconnu : ${type}`);

        let geometry;
        switch(type) {
            case 'basic':
                geometry = new THREE.BoxGeometry(2, 2, 2);
                break;
            case 'ranged':
                geometry = new THREE.CylinderGeometry(1, 1, 2, 16);
                break;
            case 'heavy':
                geometry = new THREE.BoxGeometry(3, 3, 3);
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
        }

        const color = isEnemy ? 0xff0000 : config.color;
        const material = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // --- UserData et barre de PV ---
        mesh.userData = {
            type,
            speed: config.speed + Math.random() * 0.2,
            isEnemy: isEnemy,
            hp: config.hp,
            maxHp: config.maxHp,
            damage: config.damage,
            attackCooldown: config.attackCooldown,
            range: config.range || 1
        };

        // Barre de PV
        const frameGeometry = new THREE.PlaneGeometry(3.2, 0.9);
        const frameMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hpFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        hpFrame.position.set(0, 2, 0);
        mesh.add(hpFrame);

        const barGeometry = new THREE.PlaneGeometry(3, 0.7);
        const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const hpBar = new THREE.Mesh(barGeometry, barMaterial);
        hpBar.position.set(0, 2, 0.01);
        mesh.add(hpBar);

        mesh.userData.hpBar = hpBar;
        mesh.userData.hpBarMaxWidth = 3;

        this.scene.add(mesh);
        return { mesh };
    }



    updateEnemies(delta) {
        if (!this.enemies || this.enemies.length === 0) return;

        const target = this.playerBase.position.clone();

        for (const enemy of this.enemies) {
            const dir = target.clone().sub(enemy.position).normalize();
            enemy.position.addScaledVector(dir, enemy.userData.speed * delta * 60);

            // Collision simple (proche de la base)
            if (enemy.position.distanceTo(target) < 6) {
                // TODO: infliger des dégâts à la base plus tard
                console.log("💥 Un ennemi attaque la base !");
            }
        }
    }
}

export { Scene }