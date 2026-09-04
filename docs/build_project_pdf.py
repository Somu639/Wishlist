"""Generate the StyleAI / Myntra AI Wishlist project PDF."""

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).resolve().parent / "StyleAI_Myntra_AI_Wishlist.pdf"
PINK = HexColor("#ff3f6c")
INK = HexColor("#282c3f")
MUTED = HexColor("#7e818c")
LINE = HexColor("#eaeaec")
SHELL = HexColor("#f5f5f6")
OK = HexColor("#03a685")


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker", parent=base["Normal"], textColor=PINK,
            fontName="Helvetica-Bold", fontSize=10, letterSpacing=1.4,
            spaceAfter=8,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Title"], textColor=INK,
            fontName="Helvetica-Bold", fontSize=28, leading=34, alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=base["Normal"], textColor=MUTED,
            fontName="Helvetica", fontSize=12, leading=18, spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"], textColor=INK,
            fontName="Helvetica-Bold", fontSize=16, leading=20,
            spaceBefore=14, spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], textColor=PINK,
            fontName="Helvetica-Bold", fontSize=12, leading=16,
            spaceBefore=10, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], textColor=INK,
            fontName="Helvetica", fontSize=10, leading=14.5, spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"], textColor=MUTED,
            fontName="Helvetica", fontSize=8.5, leading=12, spaceAfter=4,
        ),
        "cell": ParagraphStyle(
            "cell", parent=base["Normal"], textColor=INK,
            fontName="Helvetica", fontSize=8.5, leading=11,
        ),
        "cell_b": ParagraphStyle(
            "cell_b", parent=base["Normal"], textColor=INK,
            fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], textColor=MUTED,
            fontName="Helvetica", fontSize=8, alignment=TA_LEFT,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PINK)
    canvas.rect(0, A4[1] - 6, A4[0], 6, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(18 * mm, 10 * mm, "Myntra  ·  AI Wishlist Style Preview  ·  Internal prototype")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{doc.page}")
    canvas.restoreState()


def bullets(items, s):
    return ListFlowable(
        [ListItem(Paragraph(item, s["body"]), leftIndent=8, bulletColor=PINK) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=9,
    )


def table(headers, rows, s, col_widths):
    head = [Paragraph(h, s["cell_b"]) for h in headers]
    body = [[Paragraph(str(c), s["cell"]) for c in row] for row in rows]
    t = Table([head, *body], colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SHELL),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#fafafa")]),
    ]))
    return t


def build():
    s = styles()
    story = []

    story.append(Paragraph("MYNTRA PRODUCT PROTOTYPE", s["cover_kicker"]))
    story.append(Paragraph("StyleAI — AI Wishlist<br/>Style Preview", s["cover_title"]))
    story.append(Paragraph(
        "MVP that reduces wishlist purchase uncertainty. Shoppers upload a photo; "
        "Groq analyzes it with the product image and metadata and returns structured "
        "style-confidence guidance. This is AI Style Preview — not generated virtual try-on.",
        s["cover_sub"],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Live frontend: https://wishlist-1ick.vercel.app", s["body"]))
    story.append(Paragraph("GitHub: https://github.com/Somu639/Wishlist", s["body"]))
    story.append(Paragraph("Date: 4 September 2026  ·  Audience: Product, design, engineering", s["small"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. Problem and north star", s["h1"]))
    story.append(Paragraph(
        "Wishlisted fashion sits unused because shoppers cannot tell whether a piece "
        "will style with what they already wear. Fake scarcity and discount badges do "
        "not answer that question. StyleAI gives an honest, photo-based style recommendation "
        "so the shopper can add to bag or leave the item with more confidence.",
        s["body"],
    ))
    story.append(Paragraph(
        "<b>North star:</b> 30-day wishlist → purchase conversion. Experiment: conversion "
        "among users who use AI Style Preview vs those who do not.",
        s["body"],
    ))

    story.append(Paragraph("2. Product flow", s["h1"]))
    story.append(Paragraph(
        "Home / Women PLP → Wishlist (heart) → AI Style on a card → upload shopper photo → "
        "Get My AI Recommendation → score, verdict, why it works, style-it-with, occasions, "
        "what to consider → Move to Bag / Place Order.",
        s["body"],
    ))
    story.append(bullets([
        "Storefront opens on Women clothing with 8 seeded products (dress, kurti, saree, co-ord, jeans, shirt, blazer, anarkali).",
        "Myntra-style header: Men, Women, Kids, Home &amp; Living, Beauty, Studio; search; Profile / Wishlist / Bag badges.",
        "Wishlist intelligence tiles: Ready to Buy, Need Reconsideration, Style Uncertainty, Possibly Outdated, Alternative Available.",
        "AI modal is labelled AI Style Preview. It never claims the shopper is wearing the product.",
        "Bag shows MRP, discount, convenience fee, free delivery, and Place Order (demo checkout).",
    ], s))

    story.append(Paragraph("3. What the AI returns", s["h1"]))
    story.append(table(
        ["Field", "Rule"],
        [
            ["overall_score", "Integer 0–100 for style compatibility, not attractiveness"],
            ["verdict", "3–6 words, or exactly “Unable to confidently analyze the image.”"],
            ["why_it_works", "Exactly 3 short styling reasons"],
            ["styling_suggestions", "Exactly 3 wearable combinations"],
            ["best_occasions", "Exactly 3 India / urban occasions from metadata"],
            ["matching_colors / accessories", "Exactly 3 each"],
            ["confidence_gaps", "Exactly 2 honest caveats"],
            ["purchase_recommendation", "1–2 sentences, not pushy, no fit guarantee"],
            ["size_guidance", "Metadata sizes only — a photo cannot confirm size"],
            ["disclaimer", "AI-generated style guidance; not a guarantee of fit or appearance."],
        ],
        s, [48 * mm, 124 * mm],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Forbidden: body-shaming, attractiveness ranking, race / caste / skin-tone ranking, "
        "age or health inference, exact measurements, guaranteed fit, sexualised language, "
        "hallucinated fabric / brand / price.",
        s["body"],
    ))

    story.append(Paragraph("4. Catalog (seeded wishlist)", s["h1"]))
    story.append(table(
        ["ID", "Product", "Brand", "Price", "MRP", "Off"],
        [
            ["PROD001", "Floral Wrap Midi Dress", "HERE&amp;NOW", "₹1,299", "₹2,599", "50%"],
            ["PROD002", "Bandhani Print Cotton Kurti", "BIBA", "₹999", "₹1,799", "44%"],
            ["PROD003", "Kanjivaram Silk Saree", "Kalki Fashion", "₹8,499", "₹12,999", "35%"],
            ["PROD004", "Oversized Linen Co-ord Set", "MANGO", "₹3,499", "₹5,999", "42%"],
            ["PROD005", "High-Rise Straight Fit Jeans", "Levis", "₹2,799", "₹3,999", "30%"],
            ["PROD006", "Relaxed Fit Printed Oversized Shirt", "H&amp;M", "₹1,499", "₹2,499", "40%"],
            ["PROD007", "Structured Power Blazer", "AND", "₹3,999", "₹6,499", "38%"],
            ["PROD008", "Embroidered Anarkali Suit Set", "W for Woman", "₹4,299", "₹6,999", "39%"],
        ],
        s, [22 * mm, 62 * mm, 38 * mm, 20 * mm, 20 * mm, 14 * mm],
    ))

    story.append(PageBreak())
    story.append(Paragraph("5. Architecture", s["h1"]))
    story.append(Paragraph(
        "Three runtimes share the same catalog and Groq prompt. Streamlit Community Cloud "
        "cannot host the Express REST API, so Vercel is self-contained for the public demo.",
        s["body"],
    ))
    story.append(table(
        ["Surface", "Role", "URL / command"],
        [
            ["Vercel frontend", "React storefront + wishlist + bag + AI modal", "https://wishlist-1ick.vercel.app"],
            ["Vercel /api/style", "Serverless Groq vision analysis", "POST JSON: product_id + image_base64"],
            ["Express backend", "SQLite wishlist/cart + /api/analyze-style", "http://localhost:5000"],
            ["Streamlit backend", "Python Groq UI (same catalog + intelligence)", "http://localhost:8501 · streamlit_backend/app.py"],
            ["GitHub", "Source of truth", "https://github.com/Somu639/Wishlist"],
        ],
        s, [38 * mm, 62 * mm, 72 * mm],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Stack", s["h2"]))
    story.append(bullets([
        "Frontend: React 18, Vite, Tailwind. Colors: #ff3f6c pink, #282c3f ink, #ff905a discount, #03a685 success.",
        "Express: Node 22+, node:sqlite, multer (memory), sharp, Groq SDK, helmet, CORS for *.vercel.app.",
        "Vercel function: api/style.js — no native deps; retries JSON-mode / product-URL failures; hides reasoning.",
        "Streamlit: streamlit_backend/app.py + groq + Pillow. Secrets: GROQ_API_KEY, GROQ_VISION_MODEL.",
        "Vision model default: qwen/qwen3.6-27b. Photos resized (768–1024px JPEG) and never written to disk.",
    ], s))

    story.append(Paragraph("6. Express API", s["h1"]))
    story.append(table(
        ["Method", "Path", "Purpose"],
        [
            ["GET", "/health", "Health + AI capabilities"],
            ["GET", "/api/wishlist", "Wishlist + intelligence summary"],
            ["POST", "/api/wishlist", "Add { product_id }"],
            ["DELETE", "/api/wishlist/:id", "Remove from wishlist"],
            ["GET / POST / DELETE", "/api/cart", "Bag lines; source=ai_preview tracks conversion"],
            ["POST", "/api/analyze-style", "Multipart userPhoto + product_id"],
            ["POST", "/api/analyze-style/save", "Persist analysis JSON"],
            ["POST / GET", "/api/analytics/*", "Events and summary"],
            ["POST", "/api/style (Vercel)", "JSON image_base64 + product_id"],
        ],
        s, [38 * mm, 52 * mm, 82 * mm],
    ))

    story.append(Paragraph("7. How to run locally", s["h1"]))
    story.append(Paragraph("<b>Express + React</b>", s["h2"]))
    story.append(Paragraph(
        "1. In backend/.env set a real GROQ_API_KEY (gsk_…) and GROQ_VISION_MODEL=qwen/qwen3.6-27b.<br/>"
        "2. <font face='Courier'>cd backend &amp;&amp; npm install &amp;&amp; npm run dev</font> → http://localhost:5000<br/>"
        "3. <font face='Courier'>cd frontend &amp;&amp; npm install &amp;&amp; npm run dev</font> → http://localhost:5173<br/>"
        "Vite proxies /api to Express. Wishlist seeds 8 items into SQLite on first boot.",
        s["body"],
    ))
    story.append(Paragraph("<b>Streamlit Python backend</b>", s["h2"]))
    story.append(Paragraph(
        "<font face='Courier'>pip install -r streamlit_backend/requirements.txt<br/>"
        "streamlit run streamlit_backend/app.py</font><br/>"
        "Put GROQ_API_KEY in .streamlit/secrets.toml (gitignored) or the environment. UI: http://localhost:8501",
        s["body"],
    ))

    story.append(Paragraph("8. Deploy", s["h1"]))
    story.append(Paragraph("<b>Vercel (already live)</b>", s["h2"]))
    story.append(bullets([
        "Repo root is the Vercel project. vercel.json builds frontend/ and exposes api/style.js (maxDuration 60s).",
        "Do not put requirements.txt at repo root — Vercel then looks for a Python entrypoint and the build fails.",
        "Set GROQ_API_KEY (and optional GROQ_VISION_MODEL) in Vercel → Settings → Environment Variables, then Redeploy.",
        "Wishlist/bag use localStorage when Express is absent, so the storefront is never empty.",
        "Hard-refresh https://wishlist-1ick.vercel.app after each deploy (Ctrl+Shift+R).",
    ], s))
    story.append(Paragraph("<b>Streamlit Community Cloud</b>", s["h2"]))
    story.append(bullets([
        "share.streamlit.io → Somu639/Wishlist → main → main file streamlit_backend/app.py.",
        "Secrets TOML: GROQ_API_KEY and GROQ_VISION_MODEL. Packages come from streamlit_backend/requirements.txt.",
        "Streamlit is a UI, not a REST host. The Vercel React app cannot call it as /api.",
    ], s))

    story.append(Paragraph("9. Analytics events", s["h1"]))
    story.append(Paragraph(
        "wishlist_view, wishlist_product_selected, photo_uploaded, try_on_started, "
        "ai_analysis_completed, ai_analysis_failed, style_recommendation_viewed, "
        "add_to_cart, add_to_cart_after_ai, conversion_after_ai, try_another_product. "
        "Payloads may include product_id, product_category, ai_score, analysis_latency_ms.",
        s["body"],
    ))

    story.append(Paragraph("10. Privacy and product rules", s["h1"]))
    story.append(bullets([
        "Shopper photos stay in memory, are resized, sent to Groq, and discarded.",
        "UI copy says AI Style Preview — never try-on, overlay, or “this definitely fits you.”",
        "Size guidance uses available_sizes from metadata only.",
        "If the photo is dark, cropped, or covered: score 20–40 and verdict “Unable to confidently analyze the image.”",
        "No fake scarcity, countdown timers, or invented discounts.",
        "Footer marks this as an internal product prototype.",
    ], s))

    story.append(Paragraph("11. Known limits", s["h1"]))
    story.append(bullets([
        "backend/.env in local clones may still hold the placeholder your_groq_api_key_here — paste a real gsk_ key.",
        "Groq developer-plan rate limits return HTTP 429; the UI asks the shopper to wait and retry.",
        "Men / Kids / Home &amp; Living / Beauty / Studio aisles are empty in this 8-SKU women’s catalog.",
        "Place Order is a demo toast — no payment is collected.",
        "SQLite on serverless should use /tmp if Express is hosted on Render (render.yaml sets SQLITE_PATH).",
    ], s))

    story.append(Paragraph("12. Repo layout", s["h1"]))
    story.append(Paragraph(
        "<font face='Courier' size='8'>"
        "backend/src/  Express API, Groq service, SQLite<br/>"
        "frontend/src/  Storefront, Wishlist, Style Preview, Bag<br/>"
        "frontend/src/data/  Catalog + localStorage store + intelligence<br/>"
        "api/style.js  Vercel serverless Groq endpoint<br/>"
        "streamlit_backend/  Streamlit app, prompts, Groq, requirements.txt<br/>"
        "docs/  This PDF"
        "</font>",
        s["body"],
    ))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "End of brief. Live demo: https://wishlist-1ick.vercel.app",
        s["small"],
    ))

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title="StyleAI — Myntra AI Wishlist Style Preview",
        author="StyleAI prototype",
        subject="Product and engineering brief",
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return OUT


if __name__ == "__main__":
    path = build()
    print(path)
    print("bytes", path.stat().st_size)
