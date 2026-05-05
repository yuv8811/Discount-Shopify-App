import { useState, useCallback, useEffect, useRef } from "react";
import { useSubmit, useLoaderData, useNavigation } from "react-router";
import {
    Modal,
    TextField,
    BlockStack,
    Button,
    Icon,
    Select,
    Text,
    FormLayout,
} from "@shopify/polaris";
import ProductPicker from "./ProductPicker";
import { EditIcon } from "@shopify/polaris-icons";

export default function EditModal({ discount }) {
    const [active, setActive] = useState(false);
    const [title, setTitle] = useState(discount?.title || "");
    const [message, setMessage] = useState(discount?.message || "");
    const [status, setStatus] = useState(discount?.status || "active");
    const [buyQty, setBuyQty] = useState(discount?.buyQty || "1");
    const [getQty, setGetQty] = useState(discount?.getQty || "1");
    const [buyProducts, setBuyProducts] = useState(discount?.buyProducts || discount?.products || []);
    const [getProducts, setGetProducts] = useState(discount?.getProducts || []);

    const submit = useSubmit();
    const { shopId } = useLoaderData();
    const navigation = useNavigation();
    const wasSubmitting = useRef(false);

    const toggleModal = useCallback(() => setActive((active) => !active), []);

    const isSubmitting =
        navigation.state !== "idle" &&
        navigation.formData?.get("id") === discount.id;

    const handleSave = useCallback(() => {
        const formData = new FormData();
        formData.append("intent", "update");
        formData.append("id", discount.id);
        formData.append("shopId", shopId);
        formData.append("title", title);
        formData.append("message", message);
        formData.append("status", status);
        formData.append("buyQty", buyQty);
        formData.append("getQty", getQty);
        formData.append("buyProducts", JSON.stringify(buyProducts));
        formData.append("getProducts", JSON.stringify(getProducts));

        submit(formData, { method: "POST" });
    }, [discount.id, shopId, title, message, status, buyQty, getQty, buyProducts, getProducts, submit]);

    useEffect(() => {
        if (isSubmitting) {
            wasSubmitting.current = true;
        }

        if (wasSubmitting.current && navigation.state === "idle") {
            wasSubmitting.current = false;
            setActive(false);
        }
    }, [isSubmitting, navigation.state]);

    return (
        <>
            <Button variant="tertiary" size="small" onClick={toggleModal}>
                <Icon source={EditIcon} />
            </Button>

            <Modal
                open={active}
                onClose={toggleModal}
                heading="Edit discount"
                primaryAction={{
                    content: "Save changes",
                    onAction: handleSave,
                    loading: isSubmitting,
                    disabled: isSubmitting,
                }}
                secondaryActions={[
                    {
                        content: "Cancel",
                        onAction: toggleModal,
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <TextField
                            label="Discount name"
                            value={title}
                            onChange={setTitle}
                            autoComplete="off"
                        />
                        <TextField
                            label="Customer message"
                            value={message}
                            onChange={setMessage}
                            autoComplete="off"
                        />
                        <FormLayout>
                            <FormLayout.Group condensed>
                                <TextField
                                    label="Buy quantity"
                                    type="number"
                                    value={buyQty}
                                    onChange={setBuyQty}
                                    autoComplete="off"
                                />
                                <TextField
                                    label="Get quantity"
                                    type="number"
                                    value={getQty}
                                    onChange={setGetQty}
                                    autoComplete="off"
                                />
                            </FormLayout.Group>
                        </FormLayout>
                        <Select
                            label="Discount status"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: "active", label: "Active" },
                                { value: "inactive", label: "Inactive" }
                            ]}
                        />
                        <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">Buy Products</Text>
                            <ProductPicker
                                products={buyProducts}
                                onProductsChange={setBuyProducts}
                            />
                        </BlockStack>
                        <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">Get Products (Free)</Text>
                            <ProductPicker
                                products={getProducts}
                                onProductsChange={setGetProducts}
                            />
                        </BlockStack>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </>
    );
}
