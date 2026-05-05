export const SHOP_QUERY = `#graphql
  query {
    shop {
      id
      metafield(namespace: "discount_engine", key: "all_discounts") {
        value
      }
    }
  }
`;

export const FUNCTIONS_QUERY = `#graphql
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
`;

export const CREATE_AUTOMATIC_DISCOUNT_MUTATION = (title, functionId, startsAt) => `#graphql
  mutation {
    discountAutomaticAppCreate(automaticAppDiscount: {
      title: "${title}",
      functionId: "${functionId}",
      startsAt: "${startsAt}",
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
`;

export const METAFIELD_DEFINITION_CREATE_MUTATION = `#graphql
  mutation {
    metafieldDefinitionCreate(definition: {
      name: "All Discounts"
      namespace: "discount_engine"
      key: "all_discounts"
      type: "json"
      ownerType: SHOP
      access: {
        storefront: PUBLIC_READ
      }
    }) {
      userErrors { message }
    }
  }
`;

export const METAFIELDS_SET_MUTATION = `#graphql
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors {
        message
        field
      }
    }
  }
`;

export const DELETE_AUTOMATIC_DISCOUNT_MUTATION = (id) => `#graphql
  mutation {
    discountAutomaticDelete(id: "${id}") {
      deletedAutomaticDiscountId
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_AUTOMATIC_DISCOUNT_MUTATION = (id, title) => `#graphql
  mutation {
    discountAutomaticAppUpdate(id: "${id}", automaticAppDiscount: {
      title: "${title}"
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
`;

export const ACTIVATE_DISCOUNT_MUTATION = (id) => `#graphql
  mutation {
    discountAutomaticActivate(id: "${id}") {
      automaticDiscountNode {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const DEACTIVATE_DISCOUNT_MUTATION = (id) => `#graphql
  mutation {
    discountAutomaticDeactivate(id: "${id}") {
      automaticDiscountNode {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
