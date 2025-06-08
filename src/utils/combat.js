export function calculateAttackResult(attacker, defender) {
  // attacker.attack = { min: 6, max: 10 }
  const attackValue = Math.floor(Math.random() * (attacker.attack.max - attacker.attack.min + 1)) + attacker.attack.min;
  const isCrit = Math.random() < 0.3;
  const critMultiplier = isCrit ? 1.5 : 1;
  const rawDamage = Math.floor((attackValue - defender.defense) * critMultiplier);
  const damage = Math.max(1, rawDamage); // Always at least 1 damage
  return { damage, isCrit, attackValue };
} 