import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Button,
  Modal,
  ResourceList,
  ResourceItem,
  Text,
  BlockStack,
} from "@shopify/polaris";
import All_Discounts from "../config/All_Discounts";

export default function DiscountSelectorModal() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const activator = (
    <Button onClick={handleChange} variant="primary">
      Create discount
    </Button>
  );

  return (
    <>
      {activator}
      <Modal
        open={active}
        onClose={handleChange}
        title="Create Product Discounts"
        size="large"
      >
        <Modal.Section padding="0">
          <ResourceList
            resourceName={{ singular: "discount", plural: "discounts" }}
            items={All_Discounts}
            renderItem={(discount) => {
              const { title, subtitle } = discount;
              return (
                <ResourceItem
                  id={title}
                  onClick={() => {
                    const formattedType = title.includes("BOGO")
                      ? "Bogo"
                      : title.split(" ")[0];
                    navigate(`/app/discount/new?type=${formattedType}`);
                  }}
                  accessibilityLabel={`Create ${title}`}
                >
                  <BlockStack gap="100">
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      {title}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      {subtitle}
                    </Text>
                  </BlockStack>
                </ResourceItem>
              );
            }}
          />
        </Modal.Section>
      </Modal>
    </>
  );
}


