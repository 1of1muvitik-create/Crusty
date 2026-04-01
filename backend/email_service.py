import smtplib
import os
from email.message import EmailMessage
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")


def _send(msg: EmailMessage) -> bool:
    """Internal helper — sends an EmailMessage via configured SMTP."""
    if not SMTP_USER or not SMTP_PASS:
        print("[email_service] SMTP_USER or SMTP_PASS not set — cannot send email.")
        return False
    try:
        if SMTP_PORT == 587:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS)
                s.send_message(msg)
        else:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as s:
                s.login(SMTP_USER, SMTP_PASS)
                s.send_message(msg)
        print(f"[email_service] Email sent to {msg['To']}")
        return True
    except Exception as e:
        print(f"[email_service] Failed to send to {msg['To']}: {e}")
        return False


def send_reset_email(to_email: str, reset_code: str) -> bool:
    """Send a password reset code email."""
    msg = EmailMessage()
    msg["Subject"] = "Crusties — Password Reset Code"
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    msg.set_content(
        f"You requested a password reset for your Crusties account.\n\n"
        f"Your verification code is: {reset_code}\n\n"
        f"This code expires in 15 minutes. If you did not request this, ignore this email.\n\n— The Crusties Team"
    )
    msg.add_alternative(
        f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;
                    border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#1f2937;">Password Reset Code</h2>
          <p style="color:#6b7280;">Use the code below to reset your Crusties password. The code expires in <strong>15 minutes</strong>.</p>
          <div style="margin:24px 0;padding:16px 20px;background:#f3f4f6;border-radius:8px;font-size:20px;letter-spacing:0.2em;font-weight:bold;text-align:center;">
            {reset_code}
          </div>
          <p style="color:#9ca3af;font-size:13px;">If you didn't request this, you can ignore this email.</p>
        </div>
        """,
        subtype="html",
    )
    return _send(msg)


def send_user_notification(
    to_email: str,
    to_name: str,
    subject: str,
    heading: str,
    body: str,
    action_label: Optional[str] = None,
    action_url: Optional[str] = None,
) -> bool:
    """
    Send a styled account notification email to a user.

    Args:
        to_email:     Recipient email address
        to_name:      Recipient display name
        subject:      Email subject line
        heading:      Bold heading shown at top of email body
        body:         HTML body content (can use <br>, <strong>, etc.)
        action_label: Optional button label (e.g. "Log In Now")
        action_url:   Optional button URL — only shown if action_label is set
    """
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to_email

    # Plain text fallback
    import re
    plain_body = re.sub(r"<[^>]+>", "", body).strip()
    plain_text = f"Hi {to_name},\n\n{heading}\n\n{plain_body}"
    if action_label and action_url:
        plain_text += f"\n\n{action_label}: {action_url}"
    plain_text += "\n\n— The Crusties Team"
    msg.set_content(plain_text)

    # Button HTML (only if provided)
    button_html = ""
    if action_label and action_url:
        button_html = f"""
          <a href="{action_url}"
             style="display:inline-block;margin:24px 0;padding:12px 28px;background:#f97316;
                    color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
            {action_label}
          </a>
        """

    msg.add_alternative(
        f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;
                    border:1px solid #e5e7eb;border-radius:8px;">
          <h1 style="color:#1f2937;font-size:22px;margin-bottom:4px;">Crusties</h1>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0 24px;">
          <h2 style="color:#1f2937;font-size:18px;margin-bottom:12px;">{heading}</h2>
          <div style="color:#4b5563;font-size:15px;line-height:1.6;">
            {body}
          </div>
          {button_html}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            This is an automated message from Crusties. Please do not reply to this email.
          </p>
        </div>
        """,
        subtype="html",
    )

    return _send(msg)
