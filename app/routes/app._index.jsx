import { useState } from "react";
import { useLoaderData, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import Modal from "../components/Modal";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      shop {
        id
        metafield(namespace: "discount_engine", key: "all_discounts") {
          value
        }
      }
    }
  `);

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
  const idToDelete = formData.get("id");
  const shopId = formData.get("shopId");
  const wipeAll = formData.get("wipeAll") === "true";

  if (wipeAll) {
    await admin.graphql(`
      mutation {
        metafieldsSet(metafields: [
          {
            ownerId: "${shopId}",
            namespace: "discount_engine",
            key: "all_discounts",
            type: "json",
            value: "[]"
          }
        ]) {
          userErrors { message }
        }
      }
    `);
    return { success: true };
  }

  // 1. Fetch current discounts
  const response = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "discount_engine", key: "all_discounts") {
          value
        }
      }
    }
  `);
  const result = await response.json();
  let currentDiscounts = [];
  try {
    const rawValue = result.data.shop.metafield?.value;
    if (rawValue) currentDiscounts = JSON.parse(rawValue);
  } catch (e) { }

  // 2. Find the discount to delete and filter out
  const discountToDelete = currentDiscounts.find(d => d.id === idToDelete);
  const updatedDiscounts = currentDiscounts.filter(d => d.id !== idToDelete);

  // 3. Delete from Shopify if shopifyId exists
  if (discountToDelete?.shopifyId) {
    console.log("Deleting from Shopify:", discountToDelete.shopifyId);
    await admin.graphql(`
      mutation {
        discountAutomaticDelete(id: "${discountToDelete.shopifyId}") {
          deletedAutomaticDiscountId
          userErrors {
            field
            message
          }
        }
      }
    `);
  }

  // 3. Save back
  const setResp = await admin.graphql(`
    mutation {
      metafieldsSet(metafields: [
        {
          ownerId: "${shopId}",
          namespace: "discount_engine",
          key: "all_discounts",
          type: "json",
          value: ${JSON.stringify(JSON.stringify(updatedDiscounts))}
        }
      ]) {
        userErrors { message field }
      }
    }
  `);

  const setResult = await setResp.json();
  console.log("Delete Metafield Set Result:", JSON.stringify(setResult));

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
      submit(formData, { method: "POST" });
    }
  };

  const handleWipeAll = () => {
    if (confirm("Are you sure you want to WIPE ALL discounts from the registry? This cannot be undone.")) {
      const formData = new FormData();
      formData.append("wipeAll", "true");
      formData.append("shopId", shopId);
      submit(formData, { method: "POST" });
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
    <s-page
      heading="Discounts"
      fullWidth
    >
      <Modal slot="primary-action" />
      <s-section>
        <div style={{ display: 'flex', gap: '16px', width: '100%', alignItems: 'stretch' }}>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="surface"
            style={{ flex: 1 }}
          >
            <s-stack gap="tight">
              <s-text variant="bodySm" tone="subdued">
                Total Discounts
              </s-text>
              <s-text variant="headingLg">{discounts.length}</s-text>
            </s-stack>
          </s-box>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="surface"
            style={{ flex: 1 }}
          >
            <s-stack gap="tight">
              <s-text variant="bodySm" tone="subdued">
                Inactive Discounts
              </s-text>
              <s-text variant="headingLg">
                {discounts.filter(d => d.status === 'inactive' || d.status === 'draft').length}
              </s-text>
            </s-stack>
          </s-box>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="surface"
            style={{ flex: 1 }}
          >
            <s-stack gap="tight">
              <s-text variant="bodySm" tone="subdued">
                Active Discounts
              </s-text>
              <s-text variant="headingLg">
                {discounts.filter(d => d.status !== 'inactive' && d.status !== 'draft').length || (discounts.length > 0 ? discounts.length : 0)}
              </s-text>
            </s-stack>
          </s-box>
        </div>
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
                  <s-icon type="delete" tone="critical" />
                )}
                <s-button variant="tertiary" tone="critical" onClick={handleWipeAll}>
                  Wipe All Registry
                </s-button>
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
                        <s-badge tone={status === "active" ? "success" : status === "inactive" ? "critical" : "warning"}>
                          {status}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-stack direction="inline" gap="extraTight">
                          <s-button variant="tertiary" size="small">
                            <s-icon type="edit" />
                          </s-button>
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
