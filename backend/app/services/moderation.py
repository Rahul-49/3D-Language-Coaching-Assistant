# Simple profanity/negativity filter placeholder

BANNED = {"damn", "shit", "fuck"}


def is_allowed(text: str) -> bool:
    tokens = {t.strip('.,!?').lower() for t in text.split()}
    return not (tokens & BANNED)
