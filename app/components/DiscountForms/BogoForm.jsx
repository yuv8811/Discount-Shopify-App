import { useState, useCallback, useRef, useEffect } from "react";
import { useSubmit, useNavigation, useNavigate } from "react-router";
import ProductPicker from "../ProductPicker";
import { Page } from "@shopify/polaris";

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
    const [selectedTab, setSelectedTab] = useState(0);
    const [discountCode, setDiscountCode] = useState("");

    const generateCode = useCallback(() => {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        setDiscountCode(code);
    }, []);

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

    const startDatePickerRef = useRef(null);
    const endDatePickerRef = useRef(null);

    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const generateTimes = useCallback(() => {
        const times = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const hour = h.toString().padStart(2, "0");
                const minute = m.toString().padStart(2, "0");
                times.push(`${hour}:${minute}`);
            }
        }
        return times;
    }, []);

    useEffect(() => {
        const picker = startDatePickerRef.current;
        if (picker) {
            const handleChange = (e) => {
                const newDate = e.detail || e.target.value;
                if (newDate) {
                    setStartDate(newDate);
                    setShowStartDatePicker(false);
                }
            };
            picker.addEventListener("change", handleChange);
            return () => picker.removeEventListener("change", handleChange);
        }
    }, [showStartDatePicker, startDate]);

    useEffect(() => {
        const picker = endDatePickerRef.current;
        if (picker) {
            const handleChange = (e) => {
                const newDate = e.detail || e.target.value;
                if (newDate) {
                    setEndDate(newDate);
                    setShowEndDatePicker(false);
                }
            };
            picker.addEventListener("change", handleChange);
            return () => picker.removeEventListener("change", handleChange);
        }
    }, [showEndDatePicker, endDate]);

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
        formData.append("method", selectedTab === 0 ? "automatic" : "code");
        formData.append("code", discountCode);

        submit(formData, { method: "POST" });
    }, [submit, title, message, buyQty, getQty, discountType, discountValue, startDate, startTime, endDate, endTime, buyProducts, getProducts, selectedTab, discountCode]);

    const summaryBanner = (
        <s-banner tone="info" hideIcon>
            <s-stack gap="200">
                <s-text variant="bodyMd">
                    Buy <strong>{buyQty || "___"}</strong> {parseInt(buyQty) === 1 ? "item" : "items"} → Get{" "}
                    <strong>
                        {discountType === "free"
                            ? `${getQty || "___"} ${parseInt(getQty) === 1 ? "item" : "items"} FREE`
                            : `${discountValue || "___"}% OFF`}
                    </strong>
                </s-text>
            </s-stack>
        </s-banner>
    );

    return (
        <Page title="Create Buy X Get Y" backAction={{ content: "Discounts", onAction: () => navigate("/app") }}>
            <s-stack gap="base">
                {/* Basic details */}
                <s-section>
                    <s-box borderWidth="base" borderRadius="base" background="surface" padding="base">
                        <s-stack gap="base">
                            <s-heading>Basic details</s-heading>
                            <s-text-field
                                label="Discount name"
                                value={title}
                                onChange={(e) => setTitle(e.currentTarget.value)}
                                placeholder="BOGO Summer Sale"
                                details="Customers will see this in their cart and at checkout."
                            />
                            <s-text-field
                                label="Customer message"
                                value={message}
                                onChange={(e) => setMessage(e.currentTarget.value)}
                                placeholder="Buy 2 get 1 free"
                            />

                            <s-box paddingBlockStart="base">
                                <s-stack>
                                    <s-text tone="subdued">Method</s-text>
                                    <s-box paddingBlockStart="small">
                                        <s-stack direction="inline" gap="small">
                                            <s-button
                                                variant={selectedTab === 0 ? "primary" : "secondary"}
                                                onClick={() => setSelectedTab(0)}
                                            >
                                                Automatic
                                            </s-button>
                                            <s-button
                                                variant={selectedTab === 1 ? "primary" : "secondary"}
                                                onClick={() => setSelectedTab(1)}
                                            >
                                                Code
                                            </s-button>
                                        </s-stack>
                                        <s-box padding="400">
                                            {selectedTab === 0 ? (
                                                <s-text>
                                                    Customers will get this discount automatically in their cart and at checkout.
                                                </s-text>
                                            ) : (
                                                <s-stack gap="300">
                                                    <s-stack direction="inline" align="space-between" blockAlign="end">
                                                        <div style={{ flexGrow: 1 }}>
                                                            <s-text-field
                                                                label="Discount code"
                                                                value={discountCode}
                                                                onChange={(e) => setDiscountCode(e.currentTarget.value)}
                                                                placeholder="SUMMER2024"
                                                            />
                                                        </div>
                                                        <s-button onClick={generateCode}>Generate</s-button>
                                                    </s-stack>
                                                    <s-text tone="subdued">
                                                        Customers must enter this code at checkout.
                                                    </s-text>
                                                </s-stack>
                                            )}
                                        </s-box>
                                    </s-box>
                                </s-stack>
                            </s-box>
                        </s-stack>
                    </s-box>
                </s-section>

                {/* Customer buys */}
                <s-section>
                    <s-box borderWidth="base" borderRadius="base" background="surface" padding="base">
                        <s-stack gap="small">
                            <s-heading>Customer buys</s-heading>
                            <s-number-field
                                label="Minimum Quantity"
                                details="Number of items required to be bought to avail the discount"
                                placeholder="0"
                                step="1"
                                min="0"
                                value={buyQty}
                                onChange={(e) => setBuyQty(e.currentTarget.value)}
                            ></s-number-field>
                            <s-box paddingBlockStart="200">
                                <s-stack gap="200">
                                    <s-text tone="subdued">Applies to</s-text>
                                    <ProductPicker
                                        products={buyProducts}
                                        onProductsChange={setBuyProducts}
                                    />
                                </s-stack>
                            </s-box>
                        </s-stack>
                    </s-box>
                </s-section>

                {/* Customer gets */}
                <s-section>
                    <s-box borderWidth="base" borderRadius="base" background="surface" padding="base">
                        <s-stack gap="small">
                            <s-heading>Customer gets</s-heading>
                            <s-number-field
                                label="Reward Quantity"
                                details={`Number of items customer will get as ${selectedTab === 0 ? "free" : "discounted"}`}
                                placeholder="0"
                                step="1"
                                min="0"
                                value={getQty}
                                onChange={(e) => setGetQty(e.currentTarget.value)}
                            ></s-number-field>
                            <s-box paddingBlockStart="200">
                                <s-stack gap="200">
                                    <s-text tone="subdued">Reward applies to</s-text>
                                    <ProductPicker
                                        products={getProducts}
                                        onProductsChange={setGetProducts}
                                    />
                                </s-stack>
                            </s-box>
                        </s-stack>
                    </s-box>
                </s-section>

                {/* Schedule */}
                <s-section>
                    <s-box borderWidth="base" borderRadius="base" background="surface" padding="base">
                        <s-stack gap="small">
                            <s-heading>Schedule</s-heading>
                            <s-stack direction="inline" gap="base">
                                <s-box inlineSize="49%">
                                    <s-stack>
                                        <s-text-field
                                            label="Start date"
                                            placeholder="yyyy-mm-dd"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.currentTarget.value)}
                                            onFocus={() => setShowStartDatePicker(true)}
                                        ></s-text-field>
                                        {showStartDatePicker && (
                                            <s-box padding="200" borderWidth="base" borderRadius="base" background="surface" style={{ position: "absolute", zIndex: 11, marginTop: "60px" }}>
                                                <s-stack gap="200">
                                                    <s-date-picker
                                                        ref={startDatePickerRef}
                                                        type="single"
                                                        name="start-date"
                                                        value={startDate}
                                                        view={startDate?.split("-").slice(0, 2).join("-") || ""}
                                                    ></s-date-picker>
                                                    <s-button variant="tertiary" tone="critical" onClick={() => setShowStartDatePicker(false)}>Close</s-button>
                                                </s-stack>
                                            </s-box>
                                        )}
                                    </s-stack>
                                </s-box>
                                <s-box inlineSize="49%">
                                    <s-stack>
                                        <s-text-field
                                            label="Start time"
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.currentTarget.value)}
                                            onFocus={() => setShowStartTimePicker(true)}
                                        />
                                        {showStartTimePicker && (
                                            <s-box
                                                borderWidth="base"
                                                borderRadius="base"
                                                background="surface"
                                                style={{ position: "absolute", zIndex: 10, width: "100%", marginTop: "60px" }}
                                            >
                                                <div style={{ maxHeight: "225px", overflowY: "auto" }}>
                                                    <s-stack gap="0">
                                                        {generateTimes().map((t) => (
                                                            <s-button
                                                                key={t}
                                                                variant="tertiary"
                                                                onClick={() => {
                                                                    setStartTime(t);
                                                                    setShowStartTimePicker(false);
                                                                }}
                                                            >
                                                                {t}
                                                            </s-button>
                                                        ))}
                                                        <s-button variant="tertiary" tone="critical" onClick={() => setShowStartTimePicker(false)}>Close</s-button>
                                                    </s-stack>
                                                </div>
                                            </s-box>
                                        )}
                                    </s-stack>
                                </s-box>
                            </s-stack>
                            <s-stack direction="inline" gap="base">
                                <s-box inlineSize="49%">
                                    <s-stack>
                                        <s-text-field
                                            label="End date"
                                            placeholder="yyyy-mm-dd"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.currentTarget.value)}
                                            onFocus={() => setShowEndDatePicker(true)}
                                        ></s-text-field>
                                        {showEndDatePicker && (
                                            <s-box padding="200" borderWidth="base" borderRadius="base" background="surface" style={{ position: "absolute", zIndex: 11, marginTop: "60px" }}>
                                                <s-stack gap="200">
                                                    <s-date-picker
                                                        ref={endDatePickerRef}
                                                        autoComplete='off'
                                                        type="single"
                                                        name="end-date"
                                                        value={endDate}
                                                        view={endDate?.split("-").slice(0, 2).join("-") || ""}
                                                    ></s-date-picker>
                                                    <s-button variant="tertiary" tone="critical" onClick={() => setShowEndDatePicker(false)}>Close</s-button>
                                                </s-stack>
                                            </s-box>
                                        )}
                                    </s-stack>
                                </s-box>
                                <s-box inlineSize="49%">
                                    <s-stack>
                                        <s-text-field
                                            label="End time"
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.currentTarget.value)}
                                            onFocus={() => setShowEndTimePicker(true)}
                                        />
                                        {showEndTimePicker && (
                                            <s-box
                                                borderWidth="base"
                                                borderRadius="base"
                                                background="surface"
                                                style={{ position: "absolute", zIndex: 10, width: "100%", marginTop: "60px" }}
                                            >
                                                <div style={{ maxHeight: "225px", overflowY: "auto" }}>
                                                    <s-stack gap="0">
                                                        {generateTimes().map((t) => (
                                                            <s-button
                                                                key={t}
                                                                variant="tertiary"
                                                                onClick={() => {
                                                                    setEndTime(t);
                                                                    setShowEndTimePicker(false);
                                                                }}
                                                            >
                                                                {t}
                                                            </s-button>
                                                        ))}
                                                        <s-button variant="tertiary" tone="critical" onClick={() => setShowEndTimePicker(false)}>Close</s-button>
                                                    </s-stack>
                                                </div>
                                            </s-box>
                                        )}
                                    </s-stack>
                                </s-box>
                            </s-stack>
                        </s-stack>
                    </s-box>
                </s-section>
                <s-section>
                    <s-box borderWidth="base" borderRadius="base" background="surface" padding="base">
                        <s-stack gap="small-100">
                            <s-box>
                                <s-heading>Summary</s-heading>
                            </s-box>
                            <s-box>
                                {summaryBanner}
                                <s-text tone="subdued">
                                    Performance and usage will appear here once the discount is active.
                                </s-text>
                            </s-box>
                        </s-stack>
                    </s-box>
                </s-section>
            </s-stack>
        </Page>
    );
}

