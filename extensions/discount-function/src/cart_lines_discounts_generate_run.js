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

  for (const discount of discounts) {
    if (discount.status !== 'active') continue;

    const buyQty = parseInt(discount.buyQty) || 1;
    const getQty = parseInt(discount.getQty) || 1;
    
    const buyProductIds = (discount.buyProducts || discount.products || []).map(p => typeof p === 'string' ? p : p.id);
    const getProductIds = (discount.getProducts || []).map(p => typeof p === 'string' ? p : p.id);

    const buyMatchingLines = input.cart.lines.filter(line => {
      const productId = line.merchandise.product?.id;
      return buyProductIds.includes(productId);
    });

    const totalBuyQty = buyMatchingLines.reduce((sum, line) => sum + line.quantity, 0);

    if (totalBuyQty >= buyQty) {
      const getMatchingLines = input.cart.lines.filter(line => {
        const productId = line.merchandise.product?.id;
        if (getProductIds.length === 0) return buyProductIds.includes(productId);
        return getProductIds.includes(productId);
      });

      if (getMatchingLines.length > 0) {
        allCandidates.push({
          message: discount.message || "BOGO Offer Applied",
          targets: getMatchingLines.map(line => ({ cartLine: { id: line.id } })),
          value: discount.discountType === "free" || !discount.discountType
            ? { percentage: { value: 100 } } 
            : { percentage: { value: parseFloat(discount.discountValue) || 100 } }
        });
      }
    }
  }

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
