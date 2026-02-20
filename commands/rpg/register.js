/**
 * commands/rpg/register.js
 * Register a new player character.
 * Usage: !register <name> <class>
 */

import { hasPlayer, createPlayer } from '../../lib/game/player.js';
import { config } from '../../config.js';

let handler = async (m, { args }) => {
  const sender = m.sender;

  if (hasPlayer(sender)) {
    return m.reply(
      `⚔️ You already have a character!\nUse *!profile* to view it.`
    );
  }

  const name = args[0];
  const cls  = args.slice(1).join(' ');

  const validClasses = Object.keys(config.rpg.classes);

  if (!name || !cls) {
    const classInfo = validClasses.map(c => {
      const info = config.rpg.classes[c];
      return `  ${info.description}`;
    }).join('\n');

    return m.reply(
      `🏰 *Welcome to the RPG World!*\n\n` +
      `Usage: *!register <name> <class>*\n\n` +
      `Available classes:\n${classInfo}\n\n` +
      `Example: *!register Kira Assassin*`
    );
  }

  const matchedClass = validClasses.find(c => c.toLowerCase() === cls.toLowerCase());
  if (!matchedClass) {
    return m.reply(
      `❌ Unknown class: *${cls}*\n` +
      `Valid classes: ${validClasses.join(', ')}`
    );
  }

  const cleanName = name.slice(0, 20).replace(/[<>]/g, '');
  const player    = await createPlayer(sender, cleanName, matchedClass);
  const info      = config.rpg.classes[matchedClass];

  return m.reply(
    `✅ *Character Created!*\n\n` +
    `👤 Name:  *${player.name}*\n` +
    `⚔️ Class: *${player.class}* ${info.description.split(' ')[0]}\n` +
    `🎖️ Rank:  *${player.rank}*\n` +
    `❤️ HP:    *${player.maxHp}*\n` +
    `💙 Mana:  *${player.maxMana}*\n` +
    `⚔️ ATK:   *${player.attack}*\n` +
    `🛡️ DEF:   *${player.defense}*\n` +
    `💨 SPD:   *${player.speed}*\n\n` +
    `💰 Starting Gold: *${player.gold}*\n\n` +
    `Use *!profile* to view your stats\n` +
    `Use *!battle* to fight your first monster!`
  );
};

handler.help    = ['register <name> <class>'];
handler.tags    = ['rpg'];
handler.command = /^register$/i;
handler.cooldown = 5;

export default handler;
