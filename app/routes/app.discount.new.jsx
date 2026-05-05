import { useLoaderData, useActionData, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import BogoForm from "../components/DiscountForms/BogoForm";
import {
  SHOP_QUERY,
  FUNCTIONS_QUERY,
  CREATE_AUTOMATIC_DISCOUNT_MUTATION,
  METAFIELD_DEFINITION_CREATE_MUTATION,
  METAFIELDS_SET_MUTATION
} from "../graphql";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  return { type };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = formData.get("title");
  const message = formData.get("message");
  const buyQty = formData.get("buyQty");
  const getQty = formData.get("getQty");
  const discountType = formData.get("discountType");
  const discountValue = formData.get("discountValue");
  const buyProducts = JSON.parse(formData.get("buyProducts") || "[]");
  const getProducts = JSON.parse(formData.get("getProducts") || "[]");

  console.log("Saving discount:", { title, message, buyQty, getQty, discountType, discountValue });

  const response = await admin.graphql(SHOP_QUERY);

  const result = await response.json();
  const shopId = result.data.shop.id;
  console.log("Shop ID:", shopId);

  let currentDiscounts = [];
  try {
    const rawValue = result.data.shop.metafield?.value;
    if (rawValue) {
      currentDiscounts = JSON.parse(rawValue);
    }
  } catch (e) {
    console.error("Error parsing existing discounts:", e);
  }

  // Handle Title Indexing
  let finalTitle = title;
  let index = 1;
  while (currentDiscounts.some(d => d.title === finalTitle)) {
    finalTitle = `${title} (${index})`;
    index++;
  }

  const newDiscount = {
    id: Date.now().toString(),
    title: finalTitle,
    message,
    buyQty,
    getQty,
    discountType,
    discountValue,
    buyProducts,
    getProducts,
    createdAt: new Date().toISOString()
  };

  // 1. Get the Function ID
  const functionQuery = await admin.graphql(FUNCTIONS_QUERY);
  const functionData = await functionQuery.json();
  const nodes = functionData.data?.shopifyFunctions?.nodes || [];
  console.log("All Available Functions:", JSON.stringify(nodes));

  // Try to find by title/type, otherwise take the first one available
  let functionId = nodes.find(
    f => f.title.toLowerCase().includes("discount") || f.apiType.toLowerCase().includes("discounts")
  )?.id;

  if (!functionId && nodes.length > 0) {
    console.log("Warning: No specific discount function found. Falling back to the first available function.");
    functionId = nodes[0].id;
  }

  console.log("Selected Function ID:", functionId);

  let nativeErrors = [];

  // 2. Create the Native Shopify Discount (Automatic)
  if (functionId) {
    const discResp = await admin.graphql(
      CREATE_AUTOMATIC_DISCOUNT_MUTATION(finalTitle, functionId, new Date().toISOString())
    );

    const discResult = await discResp.json();
    console.log("Native Discount Creation Result:", JSON.stringify(discResult));

    if (discResult.data?.discountAutomaticAppCreate?.userErrors?.length > 0) {
      nativeErrors = discResult.data.discountAutomaticAppCreate.userErrors;
      console.error("Shopify User Errors:", nativeErrors);
    } else {
      newDiscount.shopifyId = discResult.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
    }
  } else {
    nativeErrors = [{ message: "No Shopify Function found. Make sure you have deployed your extension.", field: ["functionId"] }];
  }



  // 4. Save to SHOP Metafield ONLY if Shopify creation succeeded
  if (nativeErrors.length === 0) {
    // Ensure the SHOP Metafield Definition exists
    await admin.graphql(METAFIELD_DEFINITION_CREATE_MUTATION);

    const updatedDiscounts = [...currentDiscounts, newDiscount];

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

    return redirect("/app");
  }

  // If there were errors, don't save to registry and return errors to UI
  return {
    success: false,
    nativeDiscountError: nativeErrors
  };
};


export default function DiscountCreate() {
  const { type } = useLoaderData();
  const actionData = useActionData();
  let renderForm;

  if (type === "Bogo") {
    renderForm = <BogoForm />;
  } else {
    renderForm = (
      <s-box padding="loose">
        <s-text>Form for {type} is coming soon...</s-text>
      </s-box>
    );
  }

  return (
    <s-page
      narrowWidth
      backAction={{ content: "Discounts", url: "/app" }}
      title={`Create ${type.toUpperCase()} Discount`}
    >
      <s-stack gap="base">
        {actionData?.nativeDiscountError && (
          <s-banner tone="critical" title="Discount Creation Failed">
            <s-list>
              {actionData.nativeDiscountError.map((err, i) => (
                <s-list-item key={i}>{err.message} {err.field ? `(Field: ${err.field.join(", ")})` : ""}</s-list-item>
              ))}
            </s-list>
            <s-text>Please fix the errors above. The discount has not been saved to the registry.</s-text>
          </s-banner>
        )}

        {actionData?.success && !actionData?.nativeDiscountError && (
          <s-banner tone="success" title="Discount Saved Successfully">
            <s-text>Your discount is now active and visible in the Shopify Discounts page.</s-text>
          </s-banner>
        )}

        <s-layout>
          <s-layout-section>
            {renderForm}
          </s-layout-section>
        </s-layout>
      </s-stack>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
