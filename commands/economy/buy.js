/**
 * commands/economy/buy.js
 * Purchase items from the shop.
 * Usage: !buy <item_id> [qty]
 *
 * 8a. Buy logic:
 *   1. Get current buy price (with world event multiplier)
 *   2. Charge player gold
 *   3. Add item to inventory
 *   4. recordBuy() → demand++ → price rises
 *   5. Show new price trend to player
 */

import { getPlayer, savePlayer, addItem } from '../../lib/game/player.js';
import { getItem, RARITY_EMOJI }           from '../../lib/game/item.js';
import {
  getBuyPrice, recordBuy, getPriceEntry, getWorldEvent,
}                                          from '../../lib/game/economy.js';
import { trendArrow }                      from '../../lib/utils/random.js';

let handler = async (m, { args }) => {
  const player = getPlayer(m.sender);
  if (!player) return m.reply(`❌ Register first: *!register <n> <class>*`);

  const itemId = args[0];
  const qty    = Math.max(1, Math.min(99, parseInt(args[1]) || 1));

  if (!itemId) {
    return m.reply(`Usage: *!buy <item_id> [qty]*\nExample: *!buy health_potion 5*\n\nSee *!shop* for available items.`);
  }

  const item = getItem(itemId);
  if (!item) return m.reply(`❌ Unknown item: *${itemId}*\nSee *!shop* for available items.`);

  // Check if item is in shop inventory
  const { getShopInventory } = await import('../../lib/game/economy.js');
  const shopList = getShopInventory();
  if (!shopList.includes(itemId)) {
    return m.reply(`❌ *${item.name}* is not available in the shop right now.\nShop rotates hourly — check back later!`);
  }

  const unitPrice  = getBuyPrice(itemId);
  const totalCost  = unitPrice * qty;
  const emoji      = RARITY_EMOJI[item.rarity] || '⬜';
  const world      = getWorldEvent();

  if (player.gold < totalCost) {
    return m.reply(
      `💸 Not enough gold!\n` +
      `${emoji} *${item.name}* costs *${unitPrice}g × ${qty} = ${totalCost}g*\n` +
      `Your gold: *${player.gold}g*\n` +
      `Need *${totalCost - player.gold}g* more.`
    );
  }

  // Deduct gold and add item
  player.gold -= totalCost;
  addItem(player, itemId, qty);
  await savePlayer(player);

  // Record buy in economy (demand ↑ → price ↑)
  const newPrice = await recordBuy(itemId, qty);
  const entry    = getPriceEntry(itemId);
  const trend    = entry ? trendArrow(entry.currentPrice, entry.basePrice) : '📈';

  const worldNote = world.id !== 'none' && world.effects.buyPriceMult
    ? `\n(${world.emoji} ${world.name}: ×${world.effects.buyPriceMult} price active)`
    : '';

  return m.reply(
    `✅ *Purchase Complete!*\n\n` +
    `${emoji} *${item.name}* × ${qty}\n` +
    `💰 Paid: *${totalCost}g* (${unitPrice}g each)\n` +
    `💰 Remaining: *${player.gold}g*\n` +
    `${worldNote}\n\n` +
    `📈 Market Impact: ${trend} New price: *${newPrice}g*\n` +
    `(Demand increased due to your purchase)`
  );
};

handler.help    = ['buy <item_id> [qty]'];
handler.tags    = ['economy'];
handler.command = /^buy$/i;
handler.cooldown = 5;

export default handler;
