import os
import random
import smtplib
from email.mime.text import MIMEText

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")


def generate_otp():
    return str(random.randint(100000, 999999))


def send_activation_email(to_email, otp_code):
    subject = "Your Internship Logbook Activation Code"
    body = (
        f"Your activation code is: {otp_code}\n\n"
        "Use this code to set your password and activate your account."
    )

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_ADDRESS, to_email, msg.as_string())