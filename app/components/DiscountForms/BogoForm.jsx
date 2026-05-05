import { useState, useRef, useEffect, useCallback } from "react";
import { useSubmit, useNavigation, useNavigate } from "react-router";
import {
    Page,
    Layout,
    Card,
    BlockStack,
    FormLayout,
    TextField,
    Text,
    Banner,
    Button,
    Box,
    Divider,
    PageActions,
} from "@shopify/polaris";
import ProductPicker from "../ProductPicker";

export default function BogoForm() {
    const submit = useSubmit();
    const navigation = useNavigation();
    const navigate = useNavigate();

    const isSubmitting = navigation.state === "submitting";

    // Form State
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [buyQty, setBuyQty] = useState("1");
    const [getQty, setGetQty] = useState("1");
    const [discountType, setDiscountType] = useState("free"); // Default to free since user removed the selector
    const [discountValue, setDiscountValue] = useState("");

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const [startDate, setStartDate] = useState(today);
    const [startTime, setStartTime] = useState(nowTime);
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("23:59");

    // Product State
    const [buyProducts, setBuyProducts] = useState([]);
    const [getProducts, setGetProducts] = useState([]);

    const handleSubmit = useCallback(() => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("message", message);
        formData.append("buyQty", buyQty);
        formData.append("getQty", getQty);
        formData.append("discountType", discountType);
        formData.append("discountValue", discountValue);
        formData.append("startDate", startDate);
        formData.append("startTime", startTime);
        formData.append("endDate", endDate);
        formData.append("endTime", endTime);
        formData.append("buyProducts", JSON.stringify(buyProducts));
        formData.append("getProducts", JSON.stringify(getProducts));

        submit(formData, { method: "POST" });
    }, [submit, title, message, buyQty, getQty, discountType, discountValue, startDate, startTime, endDate, endTime, buyProducts, getProducts]);

    const summaryBanner = (
        <Banner tone="info" hideIcon>
            <BlockStack gap="200">
                <Text variant="bodyMd" as="p">
                    Buy <strong>{buyQty || "___"}</strong> {parseInt(buyQty) === 1 ? "item" : "items"} → Get{" "}
                    <strong>
                        {discountType === "free"
                            ? `${getQty || "___"} ${parseInt(getQty) === 1 ? "item" : "items"} FREE`
                            : `${discountValue || "___"}% OFF`}
                    </strong>
                </Text>
            </BlockStack>
        </Banner>
    );

    return (
        <Page
            title="Create Buy X Get Y"
            subtitle="Define what customers need to buy and what they get in return"
            backAction={{ content: "Discounts", onAction: () => navigate("/app") }}
        >
            <Layout>
                <Layout.Section>
                    <BlockStack gap="500">
                        {/* Basic details */}
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Basic details
                                </Text>
                                <TextField
                                    label="Discount name"
                                    value={title}
                                    onChange={setTitle}
                                    autoComplete="off"
                                    placeholder="BOGO Summer Sale"
                                    helpText="Customers will see this in their cart and at checkout."
                                />
                                <TextField
                                    label="Customer message"
                                    value={message}
                                    onChange={setMessage}
                                    autoComplete="off"
                                    placeholder="Buy 2 get 1 free"
                                />
                            </BlockStack>
                        </Card>

                        {/* Customer buys */}
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Customer buys
                                </Text>
                                <TextField
                                    label="Minimum quantity"
                                    type="number"
                                    value={buyQty}
                                    onChange={setBuyQty}
                                    autoComplete="off"
                                    min={1}
                                />
                                <Box paddingBlockStart="200">
                                    <BlockStack gap="200">
                                        <Text variant="bodySm" tone="subdued">
                                            Applies to
                                        </Text>
                                        <ProductPicker
                                            products={buyProducts}
                                            onProductsChange={setBuyProducts}
                                        />
                                    </BlockStack>
                                </Box>
                            </BlockStack>
                        </Card>

                        {/* Customer gets */}
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Customer gets
                                </Text>
                                <TextField
                                    label="Quantity rewarded"
                                    type="number"
                                    value={getQty}
                                    onChange={setGetQty}
                                    autoComplete="off"
                                    min={1}
                                />
                                <Box paddingBlockStart="200">
                                    <BlockStack gap="200">
                                        <Text variant="bodySm" tone="subdued">
                                            Reward applies to
                                        </Text>
                                        <ProductPicker
                                            products={getProducts}
                                            onProductsChange={setGetProducts}
                                        />
                                    </BlockStack>
                                </Box>
                            </BlockStack>
                        </Card>

                        {/* Schedule */}
                        <Card>
                            <BlockStack gap="400">
                                <Text variant="headingMd" as="h2">
                                    Schedule
                                </Text>
                                <FormLayout>
                                    <FormLayout.Group>
                                        <TextField
                                            label="Start date"
                                            type="date"
                                            value={startDate}
                                            onChange={setStartDate}
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="Start time"
                                            type="time"
                                            value={startTime}
                                            onChange={setStartTime}
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>
                                    <FormLayout.Group>
                                        <TextField
                                            label="End date"
                                            type="date"
                                            value={endDate}
                                            onChange={setEndDate}
                                            autoComplete="off"
                                        />
                                        <TextField
                                            label="End time"
                                            type="time"
                                            value={endTime}
                                            onChange={setEndTime}
                                            autoComplete="off"
                                        />
                                    </FormLayout.Group>
                                </FormLayout>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </Layout.Section>

                <Layout.Section variant="oneThird">
                    <BlockStack gap="500">
                        <Card>
                            <BlockStack gap="300">
                                <Text variant="headingMd" as="h2">
                                    Summary
                                </Text>
                                {summaryBanner}
                                <Divider />
                                <BlockStack gap="200">
                                    <Text variant="bodySm" tone="subdued">
                                        Performance and usage will appear here once the discount is active.
                                    </Text>
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </Layout.Section>

                <Layout.Section>
                    <PageActions
                        primaryAction={{
                            content: "Save discount",
                            onAction: handleSubmit,
                            loading: isSubmitting,
                            disabled: isSubmitting || !title,
                        }}
                        secondaryActions={[
                            {
                                content: "Discard",
                                onAction: () => navigate("/app"),
                            },
                        ]}
                    />
                </Layout.Section>
            </Layout>
        </Page>
    );
}
