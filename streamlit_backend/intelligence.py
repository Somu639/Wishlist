from datetime import datetime, timezone

CLASSIFICATIONS = {
    "ready_to_buy": "Ready to Buy",
    "needs_reconsideration": "Need Reconsideration",
    "style_uncertainty": "Style Uncertainty",
    "possibly_outdated": "Possibly Outdated",
    "alternative_available": "Alternative Available",
}

SUMMER_TAGS = {"summer", "beach", "resort"}
COMPLEMENTS = {
    "Jeans": ["Top", "Blazer", "Kurti"],
    "Top": ["Jeans", "Blazer"],
    "Blazer": ["Jeans", "Top"],
    "Dress": ["Blazer"],
    "Kurti": ["Jeans", "Blazer"],
    "Co-ord Set": ["Blazer"],
    "Saree": ["Ethnic Wear"],
    "Ethnic Wear": ["Saree", "Kurti"],
}


def _tags(item):
    tags = item.get("style_tags") or []
    return [str(t).lower() for t in tags]


def classify_wishlist(items):
    now = datetime.now(timezone.utc)
    classified = []
    for item in items:
        tags = _tags(item)
        month = now.month
        off_summer = month >= 9 or month <= 2
        seasonal = off_summer and any(t in SUMMER_TAGS for t in tags) and not any(
            t in {"versatile", "office", "festive", "wedding", "classic", "neutral", "minimal"} for t in tags
        )
        if seasonal:
            kind = "possibly_outdated"
            reason = "This looks tied to a warmer-weather style, which may not match the current season."
        elif any(t in {"trendy", "street-style", "boho"} for t in tags):
            kind = "style_uncertainty"
            reason = "This product may no longer match your current preferences versus the rest of your wishlist."
        elif any(t in {"festive", "wedding", "occasion-wear"} for t in tags) or item.get("category") == "Blazer":
            kind = "needs_reconsideration"
            reason = (
                "Still a useful layer — check how it sits with your saved jeans and shirts before buying."
                if item.get("category") == "Blazer"
                else "This is occasion wear. Confirm the event and styling before you buy."
            )
        elif "versatile" in tags or "classic" in tags or float(item.get("rating") or 0) >= 4.4:
            kind = "ready_to_buy"
            reason = "Your saved item is still aligned with your style."
        else:
            kind = "needs_reconsideration"
            reason = "Details still fit your list, but a quick style check would make the decision clearer."

        classified.append(
            {
                **item,
                "classification": kind,
                "classification_label": CLASSIFICATIONS[kind],
                "intelligence_reason": reason,
            }
        )

    counts = {key: 0 for key in CLASSIFICATIONS}
    for row in classified:
        counts[row["classification"]] += 1
    summary = [{"id": key, "label": label, "count": counts[key]} for key, label in CLASSIFICATIONS.items()]
    return classified, summary
