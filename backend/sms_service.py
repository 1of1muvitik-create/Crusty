import random

# simple in-memory store for verification codes (phone -> code)
_codes = {}

async def send_verification_code(phone: str) -> bool:
    """Simulate sending an SMS verification code. Always returns True and
    prints the code to the console for development. In production you'd
    integrate with a real SMS provider (Twilio, Nexmo, etc.)."""
    code = f"{random.randint(100000, 999999)}"
    _codes[phone] = code
    print(f"[sms_service] verification code for {phone}: {code}")
    return True

async def verify_code(phone: str, code: str) -> bool:
    """Check whether the provided code matches the one previously sent."""
    valid = _codes.get(phone) == code
    if valid:
        # consume code once used
        _codes.pop(phone, None)
    return valid
