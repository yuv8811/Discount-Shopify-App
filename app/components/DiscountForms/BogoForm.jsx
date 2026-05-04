import { useState } from "react";
import { useSubmit, useNavigation, useNavigate } from "react-router";
import ProductPicker from "../ProductPicker";

export default function BogoForm() {
    const submit = useSubmit();
    const navigation = useNavigation();
    const navigate = useNavigate();

    const isSubmitting = navigation.state === "submitting";

    // Form State
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [buyQty, setBuyQty] = useState();
    const [getQty, setGetQty] = useState();
    const [discountType, setDiscountType] = useState();
    const [discountValue, setDiscountValue] = useState();
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");

    // Product State
    const [buyProducts, setBuyProducts] = useState([]);
    const [getProducts, setGetProducts] = useState([]);

    const handleSubmit = () => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("message", message);
        formData.append("buyQty", buyQty);
        formData.append("getQty", getQty);
        formData.append("discountType", discountType);
        formData.append("discountValue", discountValue);
        formData.append("startDate", startDate);
        formData.append("startTime", startTime);
        formData.append("buyProducts", JSON.stringify(buyProducts));
        formData.append("getProducts", JSON.stringify(getProducts));

        submit(formData, { method: "POST" });
    };

    return (
        <s-form>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* ... existing sections ... */}
                <s-section>
                    <s-stack gap="extraTight">
                        <s-text variant="headingLg">Create Buy X Get Y</s-text>
                        <s-text tone="subdued">
                            Define what customers need to buy and what they get in return
                        </s-text>
                    </s-stack>
                </s-section>

                <s-section heading="Basic details">
                    <s-card>
                        <s-stack gap="base">
                            <s-text-field
                                label="Discount name"
                                value={title}
                                onChange={(e) => setTitle(e.target ? e.target.value : e)}
                                placeholder="BOGO Summer Sale"
                            />
                            <s-text-field
                                label="Customer message"
                                value={message}
                                onChange={(e) => setMessage(e.target ? e.target.value : e)}
                                placeholder="Buy 2 get 1 free"
                            />
                        </s-stack>
                    </s-card>
                </s-section>

                <s-section heading="Customer buys">
                    <s-card>
                        <s-stack gap="base">
                            <s-number-field
                                label="Minimum quantity"
                                value={buyQty}
                                onChange={(e) => setBuyQty(e.target ? e.target.value : e)}
                                min={1}
                            />
                            <s-text tone="subdued">Applies to</s-text>
                            <ProductPicker
                                products={buyProducts}
                                onProductsChange={setBuyProducts}
                            />
                        </s-stack>
                    </s-card>
                </s-section>

                <s-section heading="Customer gets">
                    <s-card>
                        <s-stack gap="base">
                            <s-number-field
                                label="Quantity rewarded"
                                value={getQty}
                                onChange={(e) => setGetQty(e.target ? e.target.value : e)}
                                min={1}
                            />
                            <s-text tone="subdued">Reward applies to</s-text>
                            <ProductPicker
                                products={getProducts}
                                onProductsChange={setGetProducts}
                            />
                        </s-stack>
                    </s-card>
                </s-section>

                <s-section heading="Reward value">
                    <s-card>
                        <s-stack gap="base">
                            <s-choice-list
                                title="Type"
                                selected={[discountType]}
                                choices={[
                                    { label: "Free (100%)", value: "free" },
                                    { label: "Percentage off", value: "percentage" },
                                ]}
                                onChange={(value) => setDiscountType(value[0])}
                            />
                            {discountType === "percentage" && (
                                <s-number-field
                                    label="Discount percentage"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target ? e.target.value : e)}
                                    suffix="%"
                                />
                            )}
                        </s-stack>
                    </s-card>
                </s-section>

                <s-section heading="Schedule">
                    <s-card>
                        <s-stack direction="inline" gap="base">
                            <s-text-field
                                type="date"
                                label="Start date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target ? e.target.value : e)}
                            />
                            <s-text-field
                                type="time"
                                label="Start time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target ? e.target.value : e)}
                            />
                        </s-stack>
                    </s-card>
                </s-section>

                <s-section heading="Summary">
                    <s-banner tone="info">
                        Buy {buyQty} items → Get {getQty} item{" "}
                        {discountType === "free"
                            ? "FREE"
                            : `${discountValue}% OFF`}
                    </s-banner>
                </s-section>

                <s-section>
                    <s-box>
                        <s-stack direction="inline" align="end" gap="base">
                            <s-button onClick={() => navigate("/app")}>Discard</s-button>
                            <s-button
                                variant="primary"
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save discount"}
                            </s-button>
                        </s-stack>
                    </s-box>
                </s-section>
            </div>
        </s-form>
    );
}
