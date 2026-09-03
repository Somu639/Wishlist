import io
import json
import os
import re
import time

from groq import Groq
from PIL import Image

from prompts import build_system_prompt, build_user_prompt


def _secret(name, default=""):
    try:
        import streamlit as st

        if name in st.secrets:
            return st.secrets[name]
    except Exception:
        pass
    return os.environ.get(name, default)


def get_vision_model():
    return _secret("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")


def extract_json(raw_content):
    if not raw_content:
        raise ValueError("Empty AI content")
    text = re.sub(r"<think>[\s\S]*?</think>", "", raw_content, flags=re.I)
    text = re.sub(r"<reasoning>[\s\S]*?</reasoning>", "", text, flags=re.I).strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, flags=re.I)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object in AI response")
    return json.loads(text[start : end + 1])


def validate_analysis(data):
    required = [
        "overall_score",
        "verdict",
        "why_it_works",
        "styling_suggestions",
        "best_occasions",
        "matching_colors",
        "accessories",
        "confidence_gaps",
        "purchase_recommendation",
        "size_guidance",
        "disclaimer",
    ]
    for field in required:
        if data.get(field) is None:
            raise ValueError(f"AI response missing required field: {field}")

    try:
        data["overall_score"] = max(0, min(100, int(round(float(data["overall_score"])))))
    except (TypeError, ValueError):
        data["overall_score"] = 75

    for field in [
        "why_it_works",
        "styling_suggestions",
        "best_occasions",
        "matching_colors",
        "accessories",
        "confidence_gaps",
    ]:
        value = data[field]
        if not isinstance(value, list):
            value = [str(value)]
        data[field] = [str(item) for item in value]

    data["verdict"] = str(data["verdict"])
    data["purchase_recommendation"] = str(data["purchase_recommendation"])
    data["size_guidance"] = str(data["size_guidance"])
    data["disclaimer"] = str(data["disclaimer"]) or (
        "AI-generated style guidance; not a guarantee of fit or appearance."
    )
    return data


def image_to_jpeg_b64(raw_bytes, max_size=1024, quality=82):
    image = Image.open(io.BytesIO(raw_bytes))
    image = image.convert("RGB")
    image.thumbnail((max_size, max_size))
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=quality)
    import base64

    return base64.b64encode(out.getvalue()).decode("ascii")


def analyze_style(user_bytes, product, product_image_url):
    api_key = _secret("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        raise RuntimeError("GROQ_API_KEY is not configured. Add it in Streamlit secrets.")

    client = Groq(api_key=api_key, timeout=45.0)
    user_b64 = image_to_jpeg_b64(user_bytes)
    content = [
        {"type": "text", "text": build_user_prompt(product)},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{user_b64}"}},
    ]
    if product_image_url:
        content.append({"type": "image_url", "image_url": {"url": product_image_url}})

    started = time.time()
    response = client.chat.completions.create(
        model=get_vision_model(),
        messages=[
            {"role": "system", "content": build_system_prompt()},
            {"role": "user", "content": content},
        ],
        temperature=0.3,
        max_tokens=1600,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    parsed = validate_analysis(extract_json(raw))
    return parsed, int((time.time() - started) * 1000)
