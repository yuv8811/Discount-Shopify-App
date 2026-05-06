(function () {
  console.log("Discount Engine: Logic Loaded");

  const discounts = window.discountEngine?.discounts || [];
  if (!discounts.length) return;

  // Reusable function to evaluate and mutate the cart
  async function evaluateBogoState() {
    try {
      console.log("Discount Engine: Evaluating cart state...");
      const cartResp = await fetch('/cart.js');
      const cart = await cartResp.json();

      let mutationOccurred = false;

      for (const discount of discounts) {
        if (discount.status === 'inactive') continue;

        const buyProductIds = (discount.buyProducts || discount.products || []).map(p => typeof p === 'string' ? p : p.id);
        const getProducts = discount.getProducts || [];
        if (getProducts.length === 0) continue;

        const buyQtyRequirement = parseInt(discount.buyQty) || 1;
        const getQtyReward = parseInt(discount.getQty) || 1;

        // Check if Buy and Get products are the same
        const firstRewardProduct = getProducts[0];
        const rewardVariantGid = firstRewardProduct.variants?.[0]?.id;
        if (!rewardVariantGid) continue;
        const rewardVariantId = rewardVariantGid.split('/').pop();
        const rewardProductGid = firstRewardProduct.id;

        const isSameProduct = buyProductIds.includes(rewardProductGid);

        if (isSameProduct) {
          // "Buy X Get X Free" logic
          const totalItems = cart.items.reduce((sum, item) => {
            const gid = `gid://shopify/Product/${item.product_id}`;
            return buyProductIds.includes(gid) ? sum + item.quantity : sum;
          }, 0);

          // For every (Buy + Get) items, Get items should be free.
          // If we have 1 item (Buy 1 Get 1), we need 1 more to make a set of 2.
          const setSize = buyQtyRequirement + getQtyReward;
          const remainder = totalItems % setSize;

          if (remainder >= buyQtyRequirement && remainder < setSize) {
            // We have enough to trigger a reward, but haven't added the reward item yet
            const neededToCompleteSet = setSize - remainder;
            console.log(`Discount Engine: Completing BOGO set. Adding ${neededToCompleteSet} more of the same product.`);

            await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [{ id: rewardVariantId, quantity: neededToCompleteSet }]
              })
            });
            mutationOccurred = true;
          }
        } else {
          // "Buy A Get B Free" logic
          const totalBuyQty = cart.items.reduce((sum, item) => {
            const gid = `gid://shopify/Product/${item.product_id}`;
            return buyProductIds.includes(gid) ? sum + item.quantity : sum;
          }, 0);

          if (totalBuyQty >= buyQtyRequirement) {
            const targetRewardQty = Math.floor(totalBuyQty / buyQtyRequirement) * getQtyReward;
            const existingReward = cart.items.find(item => item.variant_id.toString() === rewardVariantId.toString());
            const currentRewardQty = existingReward ? existingReward.quantity : 0;

            if (currentRewardQty < targetRewardQty) {
              console.log(`Discount Engine: Adding ${targetRewardQty - currentRewardQty} reward items (different product)`);
              await fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: [{ id: rewardVariantId, quantity: targetRewardQty - currentRewardQty }]
                })
              });
              mutationOccurred = true;
            }
          }
        }
      }

      if (mutationOccurred) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Discount Engine: Error in evaluation", e);
    }
  }

  // Run on page load
  evaluateBogoState();

  // Intercept cart additions/updates
  const originalFetch = window.fetch;
  window.fetch = async function () {
    const response = await originalFetch.apply(this, arguments);
    const url = arguments[0];

    const isCartMutation = typeof url === 'string' && (
      url.includes('/cart/add') ||
      url.includes('/cart/update') ||
      url.includes('/cart/change') ||
      url.includes('/cart/clear')
    );

    if (isCartMutation) {
      // Small delay to let Shopify process the mutation
      setTimeout(evaluateBogoState, 500);
    }

    return response;
  };

  // Global function for code-based application
  window.applyDiscountCode = async function (code) {
    if (!code) return;

    const matchingDiscount = discounts.find(d =>
      d.status !== 'inactive' &&
      d.method === 'code' &&
      d.code?.toLowerCase() === code.toLowerCase()
    );

    if (matchingDiscount) {
      const getProducts = matchingDiscount.getProducts || [];
      const getQty = parseInt(matchingDiscount.getQty) || 1;

      if (getProducts.length > 0) {
        const firstRewardProduct = getProducts[0];
        const rewardVariantGid = firstRewardProduct.variants?.[0]?.id;
        const variantToAdd = rewardVariantGid ? rewardVariantGid.split('/').pop() : null;

        if (variantToAdd) {
          try {
            await originalFetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: [{ id: variantToAdd, quantity: getQty }] })
            });
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.error("Discount Engine: Error adding reward product", e);
          }
        }
      }
    }

    window.location.href = "/discount/" + encodeURIComponent(code) + "?redirect=/cart";
  };
})();
