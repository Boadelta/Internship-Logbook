import os
import random
import requests

BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
BREVO_FROM_EMAIL = os.environ.get("BREVO_FROM_EMAIL")


def generate_otp():
    return str(random.randint(100000, 999999))


def send_activation_email(to_email, otp_code):
    """
    Sends the activation email via Brevo's HTTP API.

    Uses HTTPS (port 443) instead of SMTP, avoiding any SMTP-port
    blocking issues on the hosting platform.

    Returns:
        (success: bool, error_message: str or None)
    """

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            json={
                "sender": {"email": BREVO_FROM_EMAIL, "name": "Internship Logbook"},
                "to": [{"email": to_email}],
                "subject": "Your Internship Logbook Activation Code",
                "textContent": (
                    f"Your activation code is: {otp_code}\n\n"
                    "Use this code to set your password and activate your account."
                )
            },
            timeout=10
        )

        if response.status_code >= 400:
            return False, response.text

        return True, None

    except Exception as e:
        return False, str(e)