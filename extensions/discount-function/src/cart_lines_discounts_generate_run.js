import {
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  const metafieldValue = input.shop.metafield?.value;
  if (!metafieldValue) {
    return { operations: [] };
  }

  let discounts = [];
  try {
    discounts = JSON.parse(metafieldValue);
  } catch (e) {
    return { operations: [] };
  }

  const allCandidates = [];
  const triggeringCode = input.triggeringDiscountCode?.toLowerCase();

  for (const discount of discounts) {
    if (discount.status === 'inactive') continue;

    // Filter by method: if a code is being applied, only look at matching code discounts
    if (triggeringCode) {
      if (discount.method !== 'code' || discount.code?.toLowerCase() !== triggeringCode) continue;
    } else {
      if (discount.method === 'code') continue;
    }

    const buyProductIds = (discount.buyProducts || discount.products || []).map(p => typeof p === 'string' ? p : p.id);
    const getProductIds = (discount.getProducts || []).map(p => typeof p === 'string' ? p : p.id);
    const buyQty = parseInt(discount.buyQty) || 1;
    const getQty = parseInt(discount.getQty) || 1;

    let buyLines = [];
    let getLines = [];

    for (const line of input.cart.lines) {
      const productId = line.merchandise.product?.id;
      
      const matchesBuy = (buyProductIds.length === 0) || buyProductIds.includes(productId);
      const matchesGet = (getProductIds.length === 0) || getProductIds.includes(productId);

      if (matchesBuy) buyLines.push(line);
      if (matchesGet) getLines.push(line);
    }

    const totalBuyQty = buyLines.reduce((sum, l) => sum + l.quantity, 0);
    const totalGetQty = getLines.reduce((sum, l) => sum + l.quantity, 0);

    console.error(`Discount: ${discount.title}, TotalBuy: ${totalBuyQty}, TotalGet: ${totalGetQty}`);

    if (totalBuyQty >= buyQty && totalGetQty > 0) {
      // Check if Buy and Get sets overlap (Same Product BOGO)
      const buyLineIds = new Set(buyLines.map(l => l.id));
      const getLineIds = new Set(getLines.map(l => l.id));
      const areSameProducts = buyLines.length === getLines.length && 
                              buyLines.every(l => getLineIds.has(l.id));

      let eligibleRewardQty = 0;
      if (areSameProducts) {
        const setSize = buyQty + getQty;
        eligibleRewardQty = Math.floor(totalBuyQty / setSize) * getQty;
      } else {
        eligibleRewardQty = Math.min(
          Math.floor(totalBuyQty / buyQty) * getQty,
          totalGetQty
        );
      }

      console.error(`Eligible Reward Qty: ${eligibleRewardQty}`);

      if (eligibleRewardQty > 0) {
        let remainingRewardQty = eligibleRewardQty;
        const percentageValue = discount.discountType === "free" || !discount.discountType
          ? 100.0
          : parseFloat(discount.discountValue) || 100.0;

        const targets = [];
        for (const line of getLines) {
          if (remainingRewardQty <= 0) break;

          const discountQty = Math.min(line.quantity, remainingRewardQty);
          targets.push({
            cartLine: {
              id: line.id,
              quantity: discountQty
            }
          });

          remainingRewardQty -= discountQty;
        }

        if (targets.length > 0) {
          allCandidates.push({
            message: discount.message || "BOGO Applied",
            targets: targets,
            value: {
              percentage: {
                value: percentageValue
              }
            },
            associatedDiscountCode: triggeringCode ? { code: discount.code } : null
          });
        }
      }
    }
  }

  console.error(`Total Candidates: ${allCandidates.length}`);

  if (allCandidates.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: allCandidates,
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
