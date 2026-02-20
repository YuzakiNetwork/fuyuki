/**
 * commands/economy/sell.js
 * Sell items to the shop.
 * Usage: !sell <item_id> [qty]
 *
 * 8b. Sell logic:
 *   1. Get sell price (currentPrice × shopSellRatio × worldEvent.sellPriceMult)
 *   2. Remove from inventory
 *   3. Add gold to player
 *   4. recordSell() → supply++ → price falls
 *   5. Show price trend
 */

import { getPlayer, savePlayer, hasItem, removeItem } from '../../lib/game/player.js';
import { getItem, RARITY_EMOJI }                       from '../../lib/game/item.js';
import {
  getSellPrice, recordSell, getPriceEntry, getWorldEvent,
}                                                      from '../../lib/game/economy.js';
import { trendArrow }                                  from '../../lib/utils/random.js';

let handler = async (m, { args }) => {
  const player = getPlayer(m.sender);
  if (!player) return m.reply(`❌ Register first: *!register <n> <class>*`);

  const itemId = args[0];
  const qty    = Math.max(1, Math.min(99, parseInt(args[1]) || 1));

  if (!itemId) {
    return m.reply(
      `Usage: *!sell <item_id> [qty]*\nExample: *!sell wolf_fang 3*\n\n` +
      `See *!inventory* for your items.`
    );
  }

  const item = getItem(itemId);
  if (!item) return m.reply(`❌ Unknown item: *${itemId}*`);

  if (!hasItem(player, itemId, qty)) {
    const slot = player.inventory.find(i => i.itemId === itemId);
    const owned = slot ? slot.qty : 0;
    return m.reply(
      `❌ Not enough *${item.name}*.\n` +
      `You own: *${owned}* | Trying to sell: *${qty}*`
    );
  }

  // Prevent selling equipped gear
  if (Object.values(player.equipment).includes(itemId)) {
    return m.reply(
      `⚠️ *${item.name}* is currently equipped!\n` +
      `Use *!equip ${itemId}* to unequip it first.`
    );
  }

  const unitPrice  = getSellPrice(itemId);
  const totalGold  = unitPrice * qty;
  const emoji      = RARITY_EMOJI[item.rarity] || '⬜';
  const world      = getWorldEvent();

  // Execute transaction
  removeItem(player, itemId, qty);
  player.gold += totalGold;
  await savePlayer(player);

  // Record sell in economy (supply ↑ → price ↓)
  const newSellPrice = await recordSell(itemId, qty);
  const entry        = getPriceEntry(itemId);
  const trend        = entry ? trendArrow(entry.currentPrice, entry.basePrice) : '📉';

  const worldNote = world.id !== 'none' && world.effects.sellPriceMult
    ? `\n(${world.emoji} ${world.name}: ×${world.effects.sellPriceMult} bonus active!)`
    : '';

  return m.reply(
    `💰 *Sold!*\n\n` +
    `${emoji} *${item.name}* × ${qty}\n` +
    `💰 Received: *+${totalGold}g* (${unitPrice}g each)${worldNote}\n` +
    `💰 Your gold: *${player.gold}g*\n\n` +
    `📉 Market Impact: ${trend} Shop now pays: *${newSellPrice}g*\n` +
    `(Supply increased — price dropped slightly)`
  );
};

handler.help    = ['sell <item_id> [qty]'];
handler.tags    = ['economy'];
handler.command = /^sell$/i;
handler.cooldown = 5;

export default handler;
