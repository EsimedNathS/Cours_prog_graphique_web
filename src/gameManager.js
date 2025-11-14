import * as THREE from 'three';
import { UnitTypes } from './unitTypes.js';

export class GameManager {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;

        // argent et PV
        this.money = 50;
        this.playerHP = 100000;
        this.enemyHP = 100000;

        // boucle de spawn
        this.enemySpawnInterval = null;

        // démarrage du jeu
        this.startEnemySpawnLoop();
        this.updateUI();
    }

    // Système de combat
    update(delta) {
        if (!this.scene.enemies) return;

        for (const enemy of this.scene.enemies) {
            // Déplacement vers la base
            const dir = this.scene.playerBase.position.clone().sub(enemy.position).normalize();
            enemy.position.addScaledVector(dir, enemy.userData.speed * delta * 60);

            // Si l’ennemi est à la base, il inflige des dégâts
            if (enemy.position.distanceTo(this.scene.playerBase.position) < 8) {
                this.damagePlayerBase(1);
                this.scene.scene.remove(enemy);
            }
        }
    }

    startEnemySpawnLoop() {
        const spawnEnemy = () => {
            // Vérifie le nombre actuel d'ennemis
            if (this.scene.enemies && this.scene.enemies.length >= 2) {
                // Replanifie le spawn plus tard sans créer d'ennemi
                const next = 1000 + Math.random() * 2000; // retry rapide
                this.enemySpawnInterval = setTimeout(spawnEnemy, next);
                return;
            }

            if (!this.scene.createEnemy) {
                console.warn("⚠️ createEnemy() n'existe pas dans Scene !");
                return;
            }

            // Crée un ennemi
            this.scene.createEnemy();

            // Prochain spawn
            const next = 5000 + Math.random() * 5000;
            this.enemySpawnInterval = setTimeout(spawnEnemy, next);
        };

        spawnEnemy(); // lance le premier spawn
    }


    spawnUnit(type = 'basic', isEnemy = false) {
        // Les unités alliées vont vers la base ennemie
        const targetBase = isEnemy ? this.scene.playerBase : this.scene.enemyBase;
        const spawnBase = isEnemy ? this.scene.enemyBase : this.scene.playerBase;

        if (!targetBase || !spawnBase) return;

        // On crée un cube via la Scene
        const unit = this.scene.createUnit(type, isEnemy);

        // Position devant la base
        const spawnPos = spawnBase.position.clone();
        spawnPos.x += isEnemy ? 6 : -6; // devant la base selon le côté
        unit.mesh.position.copy(spawnPos);

        // On garde une référence pour les updates
        if (isEnemy) {
            if (!this.scene.enemies) this.scene.enemies = [];
            this.scene.enemies.push(unit.mesh);
        } else {
            if (!this.scene.playerUnits) this.scene.playerUnits = [];
            this.scene.playerUnits.push(unit.mesh);
        }

        return unit;
    }

    updateUnits(delta) {
        const spacing = 2.5;   // espacement entre unités dans la file
        const stopDistance = 15; // distance devant la base
        const time = performance.now() / 1000;
        

        // ---- Déplacement des unités alliées ----
        if (this.scene.playerUnits) {
            for (let i = 0; i < this.scene.playerUnits.length; i++) {
                const unit = this.scene.playerUnits[i];
                const target = this.scene.enemyBase.position.clone();

                if (unit.userData.inCombat) continue; // stoppe si en combat

                // File d’attente
                if (i > 0) {
                    const prev = this.scene.playerUnits[i - 1];
                    if (unit.position.distanceTo(prev.position) < spacing) continue;
                }

                const dist = unit.position.distanceTo(target);
                if (dist > stopDistance) {
                    const dir = target.sub(unit.position).normalize();
                    unit.position.addScaledVector(dir, unit.userData.speed * delta * 60);
                } else {
                    if (!unit.userData.lastAttackTime) unit.userData.lastAttackTime = 0;
                    if (time - unit.userData.lastAttackTime > unit.userData.attackCooldown) {
                        this.damageEnemyBase(unit.userData.damage);
                        unit.userData.lastAttackTime = time;
                    }
                }
            }
        }

        // ---- Déplacement des ennemis ----
        if (this.scene.enemies) {
            for (let i = 0; i < this.scene.enemies.length; i++) {
                const enemy = this.scene.enemies[i];
                const target = this.scene.playerBase.position.clone();

                if (enemy.userData.inCombat) continue; // stoppe si en combat

                // File d’attente
                if (i > 0) {
                    const prev = this.scene.enemies[i - 1];
                    if (enemy.position.distanceTo(prev.position) < spacing) continue;
                }

                const dist = enemy.position.distanceTo(target);
                if (dist > stopDistance) {
                    const dir = target.sub(enemy.position).normalize();
                    enemy.position.addScaledVector(dir, enemy.userData.speed * delta * 60);
                    enemy.userData.atBase = false;
                } else {
                    enemy.userData.atBase = true;
                    if (!enemy.userData.lastAttackTime) enemy.userData.lastAttackTime = 0;
                    if (time - enemy.userData.lastAttackTime > enemy.userData.attackCooldown) {
                        this.damagePlayerBase(enemy.userData.damage);
                        enemy.userData.lastAttackTime = time;
                    }
                }
            }
        }

        // ---- Gestion des collisions (combat entre unités) ----
        this.handleCollisions();
    }

    handleCollisions() {
        if (!this.scene.playerUnits || !this.scene.enemies) return;

        const combatDelay = 2; 
        const boxSize = new THREE.Vector3(20, 4, 4);
        const time = performance.now() / 1000;

        const allUnits = [
            ...this.scene.playerUnits.map(u => ({ unit: u, isEnemy: false })),
            ...this.scene.enemies.map(u => ({ unit: u, isEnemy: true }))
        ];

        const unitsToRemove = [];
        const removedUUIDs = new Set(); // pour éviter les suppressions multiples

        for (const { unit, isEnemy } of allUnits) {

            // si déjà marqué à retirer, on skip
            if (removedUUIDs.has(unit.uuid)) continue;

            const unitPos = unit.getWorldPosition(new THREE.Vector3());
            const unitBox = new THREE.Box3().setFromCenterAndSize(unitPos, boxSize);

            const enemiesList = isEnemy ? this.scene.playerUnits : this.scene.enemies;

            let nearestEnemy = null;
            let minDist = Infinity;

            for (const enemy of enemiesList) {
                // Skip si l'ennemi est déjà mort
                if (removedUUIDs.has(enemy.uuid)) continue;

                const enemyPos = enemy.getWorldPosition(new THREE.Vector3());
                const enemyBox = new THREE.Box3().setFromCenterAndSize(enemyPos, boxSize);

                if (unitBox.intersectsBox(enemyBox)) {
                    const dist = unitPos.distanceTo(enemyPos);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestEnemy = enemy;
                        unit.userData.inCombat = true;
                        nearestEnemy.userData.inCombat = true;
                    }
                }
            }

            if (nearestEnemy) {
                if (!unit.userData.engaged) unit.userData.engaged = {};
                if (!unit.userData.engaged[nearestEnemy.uuid]) unit.userData.engaged[nearestEnemy.uuid] = time;

                const elapsed = time - unit.userData.engaged[nearestEnemy.uuid];
                if (elapsed >= combatDelay) {
                    unit.userData.hp -= nearestEnemy.userData.damage;
                    nearestEnemy.userData.hp -= unit.userData.damage;

                    this.updateHpBar(unit);
                    this.updateHpBar(nearestEnemy);

                    unit.userData.lastAttackTime = time;
                    nearestEnemy.userData.lastAttackTime = time;

                    unit.userData.engaged[nearestEnemy.uuid] = time;
                }

                // Marquer les morts pour suppression
                if (unit.userData.hp <= 0) {
                    unitsToRemove.push({ unit, isEnemy });
                    removedUUIDs.add(unit.uuid);
                }
                if (nearestEnemy.userData.hp <= 0) {
                    unitsToRemove.push({ unit: nearestEnemy, isEnemy: !isEnemy });
                    removedUUIDs.add(nearestEnemy.uuid);

                    // Reset de l'unité gagnante
                    unit.userData.inCombat = false;
                    unit.userData.engaged = {};
                }

            } else {
                unit.userData.inCombat = false;
                if (unit.userData.engaged) unit.userData.engaged = {};
            }
        }

        // Supprimer toutes les unités mortes et donner l'argent
        for (const { unit, isEnemy } of unitsToRemove) {
            this.removeDeadUnit(unit, isEnemy);
        }
    }



    updateHpBar(unit) {
        if (!unit || !unit.userData.hpBar) return;

        const ratio = Math.max(unit.userData.hp / unit.userData.maxHp, 0);

        // Mise à l’échelle
        unit.userData.hpBar.scale.x = ratio;

        // Repositionnement pour que la barre se vide vers la droite
        unit.userData.hpBar.position.x = -(unit.userData.hpBarMaxWidth * (1 - ratio)) / 2;
    }

    removeDeadUnit(unit, isEnemy) {

        // Si c'est un ennemi tu gagnes de l'argent
        if (isEnemy && unit.userData.type) {
            const reward = UnitTypes[unit.userData.type].reward || 0;
            this.money += reward;
        }

        // Retirer de la scène et de la liste
        this.scene.scene.remove(unit);
        if (isEnemy) {
            const idx = this.scene.enemies.indexOf(unit);
            if (idx !== -1) this.scene.enemies.splice(idx, 1);
        } else {
            const idx = this.scene.playerUnits.indexOf(unit);
            if (idx !== -1) this.scene.playerUnits.splice(idx, 1);
        }
    }

    // Gestion de l’argent
    addMoney(amount) {
        this.money += amount;
        this.updateUI();
    }

    spendMoney(amount) {
        if (this.money >= amount) {
            this.money -= amount;
            this.updateUI();
            return true;
        }
        return false;
    }

    // Gestion des PV
    damagePlayerBase(amount) {
        this.playerHP -= amount;
        if (this.playerHP <= 0) {
            this.playerHP = 0;
            console.log('💀 GAME OVER');
        }
        this.updateUI();
    }

    damageEnemyBase(amount) {
        this.enemyHP -= amount;
        if (this.enemyHP <= 0) {
            this.enemyHP = 0;
        }
        this.updateUI();
    }

    // Interface
    updateUI() {
        if (this.ui && this.ui.updateStats) {
            this.ui.updateStats({
                money: this.money,
                playerHP: this.playerHP,
                enemyHP: this.enemyHP
            });
        }
    }
}
