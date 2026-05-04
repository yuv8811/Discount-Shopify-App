
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
          
          // Find if this product triggers a discount
          const activeDiscount = discounts.find(d => d.products.includes(productId));
          
          if (activeDiscount) {
            console.log("Discount Engine: Trigger found for", activeDiscount.title);
            
            // We need to add the same product (since it's BOGO on same product usually)
            // Or if it's a different product, we'd need that ID. 
            // For now, our app stores "products" as the list it applies to.
            // We'll add 1 more of the same item to fulfill the "Get" part.
            
            // Wait, we should only add if it's not already being added in enough quantity.
            // But usually, customers just add 1.
            
            // Simple logic: If they add a "Buy" product, we ensure the "Get" logic is triggered.
            // Actually, Shopify Functions handle the DISCOUNT, we just need to ensure 
            // the customer has enough items.
            
            if (item.quantity < (parseInt(activeDiscount.buyQty) + parseInt(activeDiscount.getQty))) {
               console.log("Discount Engine: Auto-adding reward items...");
               await originalFetch('/cart/add.js', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   items: [{
                     id: item.id, // Variant ID
                     quantity: parseInt(activeDiscount.getQty)
                   }]
                 })
               });
               // Refresh cart if necessary
               window.location.reload();
            }
          }
        }
      } catch (e) {
        console.error("Discount Engine: Error processing cart addition", e);
      }
    }

    return response;
  };
})();
