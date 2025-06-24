import smtplib
import sqlite3
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# === CONFIGURA QUI ===
EMAIL_SENDER = "alcorlabgpu@gmail.com"
EMAIL_PASSWORD = "noef teax jhoi atgv"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
DB_PATH = "gpu_reservations.db"

def send_email(recipient_email, subject, html_body):
    msg = MIMEMultipart("alternative")
    msg["From"] = EMAIL_SENDER
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.send_message(msg)
        print(f"✅ Email sent to {recipient_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")

def send_warning(recipient_email):
    subject = "⚠️ GPU Reservation Usage Warning"
    body = """
    <p>Hello,</p>
    <p>This is a reminder that you have one or more GPUs currently reserved in the ALCOR Lab GPU system.</p>
    <p><b>Please make sure you are actually using the GPUs you have booked.</b></p>
    <p>If the reservation is not actively used, it may be automatically removed to free resources for other users.</p>
    <p>Thank you for your cooperation.<br>
    <b>ALCOR Lab GPU Reservation System</b></p>
    """
    send_email(recipient_email, subject, body)

def send_cancellation(recipient_email, count):
    subject = "❌ GPU Reservations Cancelled Due to Inactivity"
    body = f"""
    <p>Hello,</p>
    <p>We noticed that your GPU reservation(s) appear to be inactive.</p>
    <p><b>{count} reservation(s) associated with your email have been removed</b> to free up resources for other users.</p>
    <p>If you believe this was a mistake, feel free to book again via the ALCOR Lab GPU Reservation System.</p>
    <p>Regards,<br>
    <b>ALCOR Lab GPU Reservation System</b></p>
    """
    send_email(recipient_email, subject, body)

def remove_reservations_by_email(email):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM reservations WHERE email = ?", (email,))
    count = cursor.fetchone()[0]

    if count == 0:
        print("ℹ️ No reservations found for this email.")
        conn.close()
        return

    cursor.execute("DELETE FROM reservations WHERE email = ?", (email,))
    conn.commit()
    conn.close()

    print(f"🗑️ Removed {count} reservation(s) for {email}")
    send_cancellation(email, count)

def main():
    email = input("Enter the user's email: ").strip()
    action = input("Type 'warn' to send a warning or 'remove' to delete reservations: ").strip().lower()

    if action == "warn":
        send_warning(email)
    elif action == "remove":
        remove_reservations_by_email(email)
    else:
        print("❌ Invalid action. Please enter 'warn' or 'remove'.")

if __name__ == "__main__":
    main()
