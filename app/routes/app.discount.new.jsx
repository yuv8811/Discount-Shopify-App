import { useLoaderData, useActionData, redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import BogoForm from "../components/DiscountForms/BogoForm";

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

  console.log("Saving discount:", { title, message, buyQty, getQty, discountType, discountValue });
  
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
    products: buyProducts.map(p => p.id),
    createdAt: new Date().toISOString()
  };

  // 1. Get the Function ID
  const functionQuery = await admin.graphql(`
    query {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
          app {
            title
          }
        }
      }
    }
  `);
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
    const discResp = await admin.graphql(`
      mutation {
        discountAutomaticAppCreate(automaticAppDiscount: {
          title: "${finalTitle}",
          functionId: "${functionId}",
          startsAt: "${new Date().toISOString()}",
          discountClasses: [PRODUCT],
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: false
          }
        }) {
          automaticAppDiscount {
            discountId
          }
          userErrors {
            field
            message
          }
        }
      }
    `);

    const discResult = await discResp.json();
    console.log("Native Discount Creation Result:", JSON.stringify(discResult));
    
    if (discResult.data?.discountAutomaticAppCreate?.userErrors?.length > 0) {
      nativeErrors = discResult.data.discountAutomaticAppCreate.userErrors;
      console.error("Shopify User Errors:", nativeErrors);
    }
  } else {
    nativeErrors = [{ message: "No Shopify Function found. Make sure you have deployed your extension.", field: ["functionId"] }];
  }



  // 3. Ensure the SHOP Metafield Definition exists
  const defResp = await admin.graphql(`
    mutation {
      metafieldDefinitionCreate(definition: {
        name: "All Discounts"
        namespace: "discount_engine"
        key: "all_discounts"
        type: "json"
        ownerType: SHOP
        access: {
          storefront: "public_read"
        }
      }) {
        userErrors { message }
      }
    }
  `);

  const defResult = await defResp.json();
  console.log("Definition Create Result:", JSON.stringify(defResult));

  // 4. Fetch existing discounts and append
  const updatedDiscounts = [...currentDiscounts, newDiscount];

  // 5. Save to SHOP Metafield
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
        userErrors { message }
      }
    }
  `);
  const setResult = await setResp.json();
  console.log("Metafield Set Result:", JSON.stringify(setResult));

  if (nativeErrors.length > 0) {
    return { 
      success: true, 
      nativeDiscountError: nativeErrors 
    };
  }

  return redirect("/app");
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
          <s-banner tone="critical" title="Native Discount Creation Failed">
            <s-list>
              {actionData.nativeDiscountError.map((err, i) => (
                <s-list-item key={i}>{err.message} (Field: {err.field?.join(", ")})</s-list-item>
              ))}
            </s-list>
            <s-text>The data was saved to your app's registry, but Shopify couldn't create the official discount logic.</s-text>
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