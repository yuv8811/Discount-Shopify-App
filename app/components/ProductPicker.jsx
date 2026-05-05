import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Button,
  BlockStack,
  InlineStack,
  Box,
  Text,
  Card,
  ResourceList,
  ResourceItem,
  Thumbnail,
} from "@shopify/polaris";

export default function ProductPicker({ products = [], onProductsChange }) {
  const shopify = useAppBridge();

  const openPicker = async () => {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: products.map((p) => ({ id: p.id })),
    });

    if (selection) {
      onProductsChange(selection);
    }
  };

  const removeProduct = (id) => {
    onProductsChange(products.filter((p) => p.id !== id));
  };

  return (
    <BlockStack gap="300">
      <Box>
        <Button onClick={openPicker}>
          {products.length > 0 ? "Edit products" : "Select products"}
        </Button>
      </Box>

      {products.length > 0 && (
        <Card padding="0">
          <ResourceList
            resourceName={{ singular: "product", plural: "products" }}
            items={products}
            renderItem={(product) => {
              const { id, title, variants, images } = product;
              const media = (
                <Thumbnail
                  source={images?.[0]?.originalSrc || images?.[0]?.src || ""}
                  alt={title}
                />
              );

              return (
                <ResourceItem
                  id={id}
                  media={media}
                  accessibilityLabel={`View details for ${title}`}
                  onClick={() => {}}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text variant="bodyMd" fontWeight="bold" as="h3">
                        {title}
                      </Text>
                      <Text tone="subdued" variant="bodySm">
                        {variants?.length || 0} variants
                      </Text>
                    </BlockStack>
                    <Button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => removeProduct(id)}
                    >
                      Remove
                    </Button>
                  </InlineStack>
                </ResourceItem>
              );
            }}
          />
        </Card>
      )}
    </BlockStack>
  );
}