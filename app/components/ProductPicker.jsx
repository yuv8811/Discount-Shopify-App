import { useAppBridge } from "@shopify/app-bridge-react";

export default function ProductPicker({ products = [], onProductsChange }) {
    const shopify = useAppBridge();

    const openPicker = async () => {
        const selection = await shopify.resourcePicker({
            type: "product",
            multiple: true,
            selectionIds: products.map(p => ({ id: p.id }))
        });

        if (selection) {
            onProductsChange(selection);
        }
    };

    const removeProduct = (id) => {
        onProductsChange(products.filter((p) => p.id !== id));
    };

    return (
        <s-stack gap="base">
            <s-button variant="primary" onClick={openPicker}>
                {products.length > 0 ? "Edit products" : "Select products"}
            </s-button>

            {products.length > 0 && (
                <s-card>
                    <s-stack gap="none">
                        {products.map((product, index) => {
                            const imageUrl = product.images?.[0]?.originalSrc || product.images?.[0]?.src;
                            return (
                                <s-box
                                    key={product.id}
                                    padding="base"
                                    borderBottomWidth={index !== products.length - 1 ? "base" : "none"}
                                >
                                    <s-stack direction="inline" align="center" gap="base">
                                        <s-box>
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={product.title} style={{ width: "40px", height: "40px", objectFit: "cover" }} />
                                            ) : (
                                                <div style={{ width: "40px", height: "40px", background: "#f1f1f1" }} />
                                            )}
                                        </s-box>
                                        <s-stack gap="extraTight" style={{ flex: 1 }}>
                                            <s-text fontWeight="bold">{product.title}</s-text>
                                            <s-text tone="subdued" variant="bodySm">
                                                {product.variants?.length || 0} variants
                                            </s-text>
                                        </s-stack>
                                        <s-button variant="tertiary" tone="critical" size="small" onClick={() => removeProduct(product.id)}>
                                            Remove
                                        </s-button>
                                    </s-stack>
                                </s-box>
                            );
                        })}
                    </s-stack>
                </s-card>
            )}
        </s-stack>
    );
}