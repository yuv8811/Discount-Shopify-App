import { useNavigate } from "react-router";
import All_Discounts from "../config/All_Discounts";

export default function Modal(props) {
  const navigate = useNavigate();
    return (
        <>
            <s-button {...props} commandFor="discount-selector-modal" command="--show" variant="primary">
                Create discount
            </s-button>

            <s-modal id="discount-selector-modal" heading="Create Product Discounts" size="large">
                <s-box padding="none">
                    <s-stack gap="none">
                        {All_Discounts.map((discount, index) => (
                            <s-box
                                key={index}
                                padding="base"
                                borderBottomWidth={index === All_Discounts.length - 1 ? "none" : "base"}
                                style={{ background: "white" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "16px" }}>
                                    <s-stack gap="extraTight" style={{ flex: 1 }}>
                                        <s-text variant="bodyMd" fontWeight="bold">
                                            {discount.title}
                                        </s-text>
                                        <s-text variant="bodySm" tone="subdued">
                                            {discount.subtitle}
                                        </s-text>
                                    </s-stack>

                                    <s-button onClick={() => {
                                        const type = discount.title.split(" ")[0]; // Get the first word as type for simplicity, or map it
                                        // Better: use the path and format it
                                        const formattedType = discount.title.includes("BOGO") ? "Bogo" : discount.title.split(" ")[0];
                                        navigate(`/app/discount/new?type=${formattedType}`);
                                    }}>
                                        Create
                                    </s-button>
                                </div>
                            </s-box>
                        ))}
                    </s-stack>
                </s-box>
            </s-modal>
        </>
    );
}


