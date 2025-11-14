// unitTypes.js
export const UnitTypes = {
    basic: {
        color: 0x00ff00,      // vert
        hp: 10,
        maxHp: 10,
        damage: 2,
        speed: 0.3,
        attackCooldown: 1,    // secondes entre attaques
        cost: 20,
        reward: 25
    },
    ranged: {
        color: 0x0000ff,      // bleu
        hp: 8,
        maxHp: 8,
        damage: 3,
        speed: 0.25,
        attackCooldown: 1.5,
        range: 10,            // portée des attaques
        cost: 30,
        reward: 35
    },
    heavy: {
        color: 0xffff00,      // jaune
        hp: 20,
        maxHp: 20,
        damage: 4,
        speed: 0.15,
        attackCooldown: 2,
        cost: 60,
        reward: 70
    }
};
