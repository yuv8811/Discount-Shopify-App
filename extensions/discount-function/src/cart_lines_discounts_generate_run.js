import {
  DiscountClass,
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

  const operations = [];

  for (const discount of discounts) {
    // Only process BOGO for now
    const buyQty = parseInt(discount.buyQty);
    const getQty = parseInt(discount.getQty);
    const targetProductIds = discount.products;

    // Find cart lines that match the target products
    const matchingLines = input.cart.lines.filter(line => {
      const productId = line.merchandise.product?.id;
      return targetProductIds.includes(productId);
    });

    const totalMatchingQty = matchingLines.reduce((sum, line) => sum + line.quantity, 0);

    // If we have enough items to trigger the discount
    if (totalMatchingQty >= buyQty) {
      // Calculate how many free items are earned
      const timesApplied = Math.floor(totalMatchingQty / buyQty);
      const earnedRewardQty = timesApplied * getQty;

      // Apply to the first matching line for simplicity, or spread it
      if (matchingLines.length > 0) {
        operations.push({
          productDiscountsAdd: {
            candidates: [
              {
                message: discount.message || "BOGO Offer Applied",
                targets: matchingLines.map(line => ({ cartLine: { id: line.id } })),
                value: discount.discountType === "free" 
                  ? { percentage: { value: 100 } } 
                  : { percentage: { value: parseFloat(discount.discountValue) } }
              },
            ],
            selectionStrategy: ProductDiscountSelectionStrategy.First,
          },
        });
      }
    }
  }

  return { operations };
}