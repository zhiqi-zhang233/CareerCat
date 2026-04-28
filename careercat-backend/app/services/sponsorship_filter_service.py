NO_SPONSORSHIP_PATTERNS = [
    "will not sponsor",
    "do not sponsor",
    "does not sponsor",
    "no sponsorship",
    "sponsorship is not available",
    "unable to sponsor",
    "cannot sponsor",
    "must be authorized to work in the u.s. without sponsorship",
    "must be authorized to work in the us without sponsorship",
]

YES_SPONSORSHIP_PATTERNS = [
    "visa sponsorship available",
    "sponsorship available",
    "will sponsor",
    "h-1b sponsorship",
    "h1b sponsorship",
]


def infer_visa_sponsorship(text: str) -> str:
    lower = (text or "").lower()

    if any(pattern in lower for pattern in NO_SPONSORSHIP_PATTERNS):
        return "No"

    if any(pattern in lower for pattern in YES_SPONSORSHIP_PATTERNS):
        return "Yes"

    return "Unknown"


def should_block_for_sponsorship(needs_sponsorship: bool, visa_sponsorship: str) -> bool:
    return bool(needs_sponsorship) and visa_sponsorship == "No"
