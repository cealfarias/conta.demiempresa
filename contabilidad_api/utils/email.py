import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email: str, subject: str, body: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not smtp_user or not smtp_password:
        print(f"Skipping email to {to_email}. SMTP credentials not configured.")
        return False

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_user, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False

def notificar_nuevo_ticket(ticket_asunto: str, ticket_mensaje: str, usuario_email: str):
    """Notifica al administrador que se ha creado un nuevo ticket."""
    admin_email = "cealfarias@gmail.com"
    subject = f"Nuevo Ticket de Soporte: {ticket_asunto}"
    body = f"""
    <h2>Se ha creado un nuevo ticket de soporte</h2>
    <p><strong>De:</strong> {usuario_email}</p>
    <p><strong>Asunto:</strong> {ticket_asunto}</p>
    <p><strong>Mensaje:</strong></p>
    <blockquote>{ticket_mensaje}</blockquote>
    <p><a href="https://contabilidad.demiempresa.online/dashboard/seguridad">Ver en el sistema</a></p>
    """
    send_email(admin_email, subject, body)

def notificar_nuevo_mensaje_ticket(ticket_asunto: str, mensaje: str, autor_username: str, ticket_owner_email: str):
    """Notifica cuando hay una nueva respuesta en un ticket."""
    # Si el autor es admin, notificamos al dueño del ticket
    if autor_username == "admin":
        destinatario = ticket_owner_email
        subject = f"Nueva respuesta en tu ticket: {ticket_asunto}"
        body = f"""
        <h2>Soporte Técnico ha respondido a tu ticket</h2>
        <p><strong>Asunto:</strong> {ticket_asunto}</p>
        <p><strong>Respuesta:</strong></p>
        <blockquote>{mensaje}</blockquote>
        <p><a href="https://contabilidad.demiempresa.online/dashboard/seguridad">Ver en el sistema</a></p>
        """
    else:
        # Si el autor es un cliente, notificamos al admin
        destinatario = "cealfarias@gmail.com"
        subject = f"Nueva respuesta del cliente en: {ticket_asunto}"
        body = f"""
        <h2>El cliente ({autor_username}) ha respondido</h2>
        <p><strong>Asunto:</strong> {ticket_asunto}</p>
        <p><strong>Mensaje:</strong></p>
        <blockquote>{mensaje}</blockquote>
        <p><a href="https://contabilidad.demiempresa.online/dashboard/seguridad">Ver en el sistema</a></p>
        """
    
    send_email(destinatario, subject, body)
