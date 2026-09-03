import streamlit as st

from streamlit_backend.catalog import PRODUCTS, get_product
from streamlit_backend.groq_style import analyze_style, get_vision_model
from streamlit_backend.intelligence import classify_wishlist

st.set_page_config(page_title="StyleAI Backend", page_icon="👗", layout="wide")

if "wishlist_ids" not in st.session_state:
    st.session_state.wishlist_ids = [item["product_id"] for item in PRODUCTS]
if "cart" not in st.session_state:
    st.session_state.cart = []
if "analysis" not in st.session_state:
    st.session_state.analysis = None
if "selected_id" not in st.session_state:
    st.session_state.selected_id = PRODUCTS[0]["product_id"]


def rupees(value):
    return f"₹{int(value):,}"


st.markdown(
    """
    <style>
      .stApp { background: #fafafa; }
      h1, h2, h3 { font-family: Georgia, serif; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("StyleAI")
st.caption("Python backend on Streamlit — AI Style Preview, not virtual try-on. Photos are sent to Groq and not stored.")

wishlist = [item for item in PRODUCTS if item["product_id"] in st.session_state.wishlist_ids]
classified, summary = classify_wishlist(wishlist)

with st.sidebar:
    st.subheader("Service")
    st.write(f"Vision model: `{get_vision_model()}`")
    st.write(f"Wishlist items: **{len(wishlist)}**")
    st.write(f"Bag items: **{len(st.session_state.cart)}**")
    st.markdown("---")
    st.markdown(
        "Add `GROQ_API_KEY` in **Manage app → Secrets** on Streamlit Community Cloud."
    )

intel_cols = st.columns(len(summary))
for col, tile in zip(intel_cols, summary):
    col.metric(tile["label"], tile["count"])

st.markdown("### My Wishlist")
if not classified:
    st.info("Wishlist is empty.")
else:
    cols = st.columns(4)
    for index, item in enumerate(classified):
        with cols[index % 4]:
            st.image(item["image_url"], width="stretch")
            st.markdown(f"**{item['product_name']}**")
            st.caption(f"{item['brand']} · {item['category']}")
            st.write(rupees(item["price"]))
            st.caption(item["intelligence_reason"])
            if st.button("AI Style", key=f"ai_{item['product_id']}"):
                st.session_state.selected_id = item["product_id"]
                st.session_state.analysis = None
            if st.button("Remove", key=f"rm_{item['product_id']}"):
                st.session_state.wishlist_ids = [
                    pid for pid in st.session_state.wishlist_ids if pid != item["product_id"]
                ]
                st.rerun()

product = get_product(st.session_state.selected_id)
st.markdown("---")
st.markdown("### AI Style Preview")
if product:
    left, right = st.columns([1, 1])
    with left:
        st.image(product["image_url"], caption=product["product_name"], width="stretch")
        st.write(f"{product['color']} · {product['material']}")
        st.write(f"Sizes: {', '.join(product['available_sizes'])}")
    with right:
        uploaded = st.file_uploader(
            "Upload a shopper photo (JPG, PNG, or WEBP)",
            type=["jpg", "jpeg", "png", "webp"],
        )
        st.caption("Lock privacy: the photo is processed in memory, sent to Groq, and discarded.")
        run = st.button("Get My AI Recommendation", type="primary", disabled=uploaded is None)
        if run and uploaded is not None:
            try:
                with st.spinner("Analyzing style…"):
                    result, latency_ms = analyze_style(
                        uploaded.getvalue(),
                        product,
                        product["image_url"],
                    )
                st.session_state.analysis = {
                    "product_id": product["product_id"],
                    "result": result,
                    "latency_ms": latency_ms,
                }
            except Exception as exc:
                st.error(str(exc))

analysis = st.session_state.analysis
if analysis and analysis["product_id"] == st.session_state.selected_id:
    result = analysis["result"]
    st.markdown("### Your AI Style Result")
    st.metric("Style score", f"{result['overall_score']} / 100")
    st.subheader(result["verdict"])
    st.write(f"Analyzed in {analysis['latency_ms']} ms")

    c1, c2 = st.columns(2)
    with c1:
        st.markdown("**Why it works**")
        for line in result["why_it_works"]:
            st.write(f"- {line}")
        st.markdown("**Style it with**")
        for line in result["styling_suggestions"]:
            st.write(f"- {line}")
    with c2:
        st.markdown("**Best for**")
        for line in result["best_occasions"]:
            st.write(f"- {line}")
        st.markdown("**What to consider**")
        for line in result["confidence_gaps"]:
            st.write(f"- {line}")

    st.info(result["purchase_recommendation"])
    st.caption(result["size_guidance"])
    st.caption(result["disclaimer"])

    if st.button("Add to bag"):
        st.session_state.cart.append(
            {
                "product_id": product["product_id"],
                "product_name": product["product_name"],
                "price": product["price"],
            }
        )
        st.success("Added to bag")

st.markdown("### Bag")
if not st.session_state.cart:
    st.write("Bag is empty.")
else:
    total = sum(item["price"] for item in st.session_state.cart)
    for index, item in enumerate(st.session_state.cart):
        st.write(f"{item['product_name']} — {rupees(item['price'])}")
    st.write(f"**Total {rupees(total)}**")
