
(function() {
  console.log("Discount Engine: Logic Loaded");

  const discounts = window.discountEngine?.discounts || [];
  if (!discounts.length) return;

  // Intercept cart additions
  const originalFetch = window.fetch;
  window.fetch = async function() {
    const response = await originalFetch.apply(this, arguments);
    const url = arguments[0];

    // Check if we are adding to cart
    if (typeof url === 'string' && (url.includes('/cart/add.js') || url.includes('/cart/add'))) {
      const clone = response.clone();
      try {
        const data = await clone.json();
        const items = data.items || [data];
        
        for (const item of items) {
          const productId = `gid://shopify/Product/${item.product_id}`;
          
          // Find if this product triggers a discount (checking both new and old field names)
          const activeDiscount = discounts.find(d => {
            if (d.status !== 'active') return false;
            const buyProductIds = (d.buyProducts || d.products || []).map(p => typeof p === 'string' ? p : p.id);
            return buyProductIds.includes(productId);
          });
          
          if (activeDiscount) {
            console.log("Discount Engine: Trigger found for", activeDiscount.title);
            
            const getProducts = activeDiscount.getProducts || [];
            let variantToAdd = item.id; // Default to same product
            
            if (getProducts.length > 0) {
              const firstRewardProduct = getProducts[0];
              if (firstRewardProduct.variants && firstRewardProduct.variants.length > 0) {
                // Extract numerical ID from GID if necessary
                const variantGid = firstRewardProduct.variants[0].id;
                variantToAdd = variantGid.split('/').pop();
              }
            }

            const buyQty = parseInt(activeDiscount.buyQty) || 1;
            const getQty = parseInt(activeDiscount.getQty) || 1;

            // Simple check: If we're adding the trigger product, add the reward
            console.log("Discount Engine: Auto-adding reward items...");
            await originalFetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [{
                  id: variantToAdd,
                  quantity: getQty
                }]
              })
            });
            
            // Refresh cart to show changes
            window.location.reload();
          }
        }
      } catch (e) {
        console.error("Discount Engine: Error processing cart addition", e);
      }
    }

    return response;
  };
})();
