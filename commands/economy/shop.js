/**
 * commands/economy/shop.js
 * Browse the rotating shop with live economy pricing.
 * Usage: !shop [page]
 *
 * 7. Shop pricing logic:
 *   shopPrice = economy.currentPrice × worldEvent.buyPriceMult
 *   sellPrice = economy.currentPrice × shopSellRatio × worldEvent.sellPriceMult
 *   Rotating inventory refreshes every hour (anti-monotony).
 */

import {
  getShopInventory,
  getBuyPrice,
  getSellPrice,
  getWorldEvent,
  getPriceEntry,
}               from '../../lib/game/economy.js';
import { getItem, RARITY_EMOJI } from '../../lib/game/item.js';
import { trendArrow }            from '../../lib/utils/random.js';
import { config }                from '../../config.js';

const PAGE_SIZE = 8;

let handler = async (m, { args }) => {
  const page     = Math.max(1, parseInt(args[0]) || 1);
  const shopList = getShopInventory();
  const world    = getWorldEvent();

  const totalPages = Math.ceil(shopList.length / PAGE_SIZE);
  const slice      = shopList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // World event banner
  const eventBanner = world.id !== 'none'
    ? `\n${world.emoji} *World Event:* ${world.name} — ${world.description}\n`
    : '';

  // Build item list with live prices
  const lines = slice.map(itemId => {
    const item    = getItem(itemId);
    if (!item) return null;

    const buyPrice  = getBuyPrice(itemId);
    const sellPrice = getSellPrice(itemId);
    const entry     = getPriceEntry(itemId);
    const emoji     = RARITY_EMOJI[item.rarity] || '⬜';
    const trend     = entry ? trendArrow(entry.currentPrice, entry.basePrice) : '➡️';

    return (
      `${emoji} *${item.name}* ${trend}\n` +
      `   💰 Buy: *${buyPrice}g* | Sell Back: *${sellPrice}g*\n` +
      `   ID: \`${item.id}\` | ${item.description}`
    );
  }).filter(Boolean);

  return m.reply(
    `🏪 *Market Shop* — Page ${page}/${totalPages}\n` +
    eventBanner +
    `─────────────────────────\n` +
    lines.join('\n\n') +
    `\n─────────────────────────\n` +
    `💡 *!buy <item_id> [qty]* to purchase\n` +
    `💡 *!sell <item_id> [qty]* to sell\n` +
    `💡 *!price <item_id>* for market details\n` +
    (totalPages > 1 ? `📄 *!shop ${page + 1}* for next page` : '')
  );
};

handler.help    = ['shop [page]'];
handler.tags    = ['economy'];
handler.command = /^shop$/i;
handler.cooldown = config.cooldowns.shop;

export default handler;
