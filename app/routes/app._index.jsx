import { useState } from "react";
import { useLoaderData, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import Modal from "../components/Modal";
import EditModal from "../components/EditModal"
import {
  SHOP_QUERY,
  METAFIELDS_SET_MUTATION,
  DELETE_AUTOMATIC_DISCOUNT_MUTATION,
  DELETE_CODE_DISCOUNT_MUTATION,
  UPDATE_AUTOMATIC_DISCOUNT_MUTATION,
  ACTIVATE_DISCOUNT_MUTATION,
  DEACTIVATE_DISCOUNT_MUTATION,
} from "../graphql";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(SHOP_QUERY);

  const result = await response.json();
  let discounts = [];
  try {
    const rawValue = result.data.shop.metafield?.value;
    if (rawValue) {
      discounts = JSON.parse(rawValue);
    }
  } catch (e) {
    console.error("Error parsing discounts:", e);
  }

  return { discounts, shopId: result.data.shop.id };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");
  const shopId = formData.get("shopId");

  // Fetch current discounts
  const response = await admin.graphql(SHOP_QUERY);
  const result = await response.json();
  let currentDiscounts = [];
  try {
    const rawValue = result.data.shop.metafield?.value;
    if (rawValue) currentDiscounts = JSON.parse(rawValue);
  } catch (e) { }

  let updatedDiscounts = [...currentDiscounts];

  if (intent === "delete") {
    const idsToDelete = formData.getAll("id");

    // Process each ID
    for (const idToDelete of idsToDelete) {
      const discount = currentDiscounts.find((d) => d.id === idToDelete);
      if (discount?.shopifyId) {
        const isCodeDiscount = discount.shopifyId.includes("DiscountCodeNode");
        const mutation = isCodeDiscount
          ? DELETE_CODE_DISCOUNT_MUTATION(discount.shopifyId)
          : DELETE_AUTOMATIC_DISCOUNT_MUTATION(discount.shopifyId);

        await admin.graphql(mutation);
      }
    }

    updatedDiscounts = currentDiscounts.filter(
      (d) => !idsToDelete.includes(d.id)
    );
  } else if (intent === "update") {
    const title = formData.get("title");
    const message = formData.get("message");
    const status = formData.get("status");
    const buyQty = formData.get("buyQty");
    const getQty = formData.get("getQty");
    const buyProducts = JSON.parse(formData.get("buyProducts") || "[]");
    const getProducts = JSON.parse(formData.get("getProducts") || "[]");

    const discountToUpdate = currentDiscounts.find((d) => d.id === id);

    if (discountToUpdate?.shopifyId) {
      // 1. Update basic info (title)
      await admin.graphql(
        UPDATE_AUTOMATIC_DISCOUNT_MUTATION(discountToUpdate.shopifyId, title)
      );

      // 2. Handle status change (Activate/Deactivate)
      if (status === "active") {
        await admin.graphql(ACTIVATE_DISCOUNT_MUTATION(discountToUpdate.shopifyId));
      } else {
        // Deactivate the discount in Shopify for any non-active status
        await admin.graphql(DEACTIVATE_DISCOUNT_MUTATION(discountToUpdate.shopifyId));
      }
    }

    updatedDiscounts = currentDiscounts.map((d) => {
      if (d.id === id) {
        return { ...d, title, message, status, buyQty, getQty, buyProducts, getProducts };
      }
      return d;
    });
  }

  // Save back to Shopify
  const setResp = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: "discount_engine",
          key: "all_discounts",
          type: "json",
          value: JSON.stringify(updatedDiscounts),
        },
      ],
    },
  });

  const setResult = await setResp.json();
  if (setResult.data?.metafieldsSet?.userErrors?.length > 0) {
    return { success: false, errors: setResult.data.metafieldsSet.userErrors };
  }

  return { success: true };
};

export default function Index() {
  const { discounts, shopId } = useLoaderData();
  const submit = useSubmit();
  const [selectedIndices, setSelectedIndices] = useState([]);

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this discount?")) {
      const formData = new FormData();
      formData.append("id", id);
      formData.append("shopId", shopId);
      formData.append("intent", "delete");
      submit(formData, { method: "POST" });
    }
  };

  const handleBulkDelete = () => {
    const count = selectedIndices.length;
    if (confirm(`Are you sure you want to delete ${count} selected discounts?`)) {
      const formData = new FormData();
      selectedIndices.forEach((index) => {
        formData.append("id", discounts[index].id);
      });
      formData.append("shopId", shopId);
      formData.append("intent", "delete");
      submit(formData, { method: "POST" });
      setSelectedIndices([]);
    }
  };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIndices(discounts.map((_, i) => i));
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectIndividual = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };



  return (
    <s-page heading="Discounts">
      <Modal slot="primary-action" />
      <s-section>
        <s-grid gridTemplateColumns="repeat(12, 1fr)">
          <s-grid-item gridColumn="span 4">
            <s-heading>Total Discounts</s-heading>
            <s-text>{discounts.length}</s-text>
          </s-grid-item>
          <s-grid-item gridColumn="span 4">
            <s-heading>Active Discounts</s-heading>
            <s-text>{discounts.filter((d) => d.status === "active").length}</s-text>
          </s-grid-item>
          <s-grid-item gridColumn="span 4">
            <s-heading>Inactive Discounts</s-heading>
            <s-text>{discounts.filter((d) => d.status === "inactive").length}</s-text>
          </s-grid-item>
        </s-grid>
      </s-section>
      <s-section>
        {discounts.length === 0 ? (
          <>
            <s-box padding="loose">
              <img
                src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                alt="Empty state"
                style={{ width: "240px", marginBottom: "24px", filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.05))" }}
              />
            </s-box>
            <s-stack align="center" gap="tight">
              <s-text variant="headingXl" textAlign="center">Supercharge your sales</s-text>
              <s-box maxWidth="400px">
                <s-text tone="subdued" variant="bodyLg" textAlign="center">
                  Create high-converting BOGO and tiered discounts in seconds. Start by creating your first offer today.
                </s-text>
              </s-box>
              <s-box padding="loose">
                <Modal />
              </s-box>
            </s-stack>
          </>
        ) : (
          <s-box borderWidth="base" borderRadius="base" background="surface" padding="none">

            <s-box padding="base" borderBottomWidth="base">
              <s-stack direction="inline" gap="base" align="center">
                <div style={{ flex: 1 }}>
                  {selectedIndices.length > 0 ? (
                    <s-text>{selectedIndices.length} selected</s-text>
                  ) : (
                    <s-text variant="headingMd">All Discounts</s-text>
                  )}
                </div>
                {selectedIndices.length > 0 && (
                  <s-button variant="tertiary" tone="critical" onClick={handleBulkDelete}>
                    <s-icon type="delete" />
                  </s-button>
                )}
              </s-stack>
            </s-box>

            <s-table>
              <s-table-header-row>
                <s-table-header>
                  <s-checkbox
                    checked={discounts.length > 0 && selectedIndices.length === discounts.length}
                    onChange={handleSelectAll}
                  />
                </s-table-header>
                <s-table-header>Title</s-table-header>
                <s-table-header>Discount Type</s-table-header>
                <s-table-header>Status</s-table-header>
                <s-table-header>Code</s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {discounts.map((discount, index) => {
                  const status = discount.status || "active";
                  const type = discount.type || "Bogo";
                  return (
                    <s-table-row key={index}>
                      <s-table-cell>
                        <s-checkbox
                          checked={selectedIndices.includes(index)}
                          onChange={() => handleSelectIndividual(index)}
                        />
                      </s-table-cell>
                      <s-table-cell>
                        <s-text variant="bodyMd" fontWeight="bold">
                          {discount.title}
                        </s-text>
                      </s-table-cell>
                      <s-table-cell>{type}</s-table-cell>
                      <s-table-cell>
                        <s-badge tone={status === "active" ? "success" : "critical"}>
                          {status}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>{discount.code || "N/A"}</s-table-cell>
                      <s-table-cell>
                        <s-stack direction="inline" gap="extraTight">
                          <EditModal discount={discount} />
                          <s-button
                            variant="tertiary"
                            tone="critical"
                            size="small"
                            onClick={() => handleDelete(discount.id)}
                          >
                            <s-icon type="delete" />
                          </s-button>
                        </s-stack>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          </s-box>
        )}
      </s-section>
    </s-page>
  )
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
