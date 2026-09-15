import os
import random
import smtplib
import threading
from email.mime.text import MIMEText

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")


def generate_otp():
    return str(random.randint(100000, 999999))


def send_activation_email(to_email, otp_code, wait_seconds=8):
    """
    Sends the activation email over Gmail SMTP.

    Runs the actual SMTP call in a background thread and waits up to
    `wait_seconds` for it to finish. This means:
      - If Gmail responds normally (usually 1-3 seconds), the caller
        gets a real success/failure result.
      - If the connection is blocked or unusually slow, we stop waiting
        after `wait_seconds` instead of risking a full request timeout.

    Returns:
        (success: bool, message: str or None)
    """

    result = {"success": False, "error": None}

    def _send():
        try:
            subject = "Your Internship Logbook Activation Code"
            body = (
                f"Your activation code is: {otp_code}\n\n"
                "Use this code to set your password and activate your account."
            )

            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = GMAIL_ADDRESS
            msg["To"] = to_email

            with smtplib.SMTP("smtp.gmail.com", 587, timeout=6) as server:
                server.starttls()
                server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
                server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())

            result["success"] = True

        except Exception as e:
            result["error"] = str(e)

    thread = threading.Thread(target=_send, daemon=True)
    thread.start()
    thread.join(timeout=wait_seconds)

    if thread.is_alive():
        return False, (
            "Email is taking longer than expected and may still be "
            "sending in the background. Gmail SMTP may be blocked on "
            "this host."
        )

    if result["success"]:
        return True, None

    return False, result["error"] or "Unknown email error."