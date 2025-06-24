from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import date, datetime, timedelta
import sqlite3

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


EMAIL_SENDER = "alcorlabgpu@gmail.com"
EMAIL_PASSWORD = "noef teax jhoi atgv"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def send_email(recipient_email: str, subject: str, body: str, is_html: bool = False):
    msg = MIMEMultipart("alternative")
    msg['From'] = EMAIL_SENDER
    msg['To'] = recipient_email
    msg['Subject'] = subject

    part = MIMEText(body, 'html' if is_html else 'plain')
    msg.attach(part)

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.send_message(msg)


app = FastAPI()

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://192.168.1.89:5173"    # <– il tuo IP in LAN
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# DB Setup
conn = sqlite3.connect("gpu_reservations.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_thesis_student INTEGER DEFAULT 0,
    tutor_name TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    email TEXT NOT NULL,
    gpu_id TEXT NOT NULL,
    day TEXT NOT NULL,
    created_at TEXT NOT NULL,
    tutor_name TEXT
)
""")
conn.commit()

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def cleanup_past_reservations():
    today_str = date.today().isoformat()
    cursor.execute("DELETE FROM reservations WHERE day < ?", (today_str,))
    conn.commit()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(email: str):
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    return cursor.fetchone()

def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user or not verify_password(password, user[3]):
        return None
    return user

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    return user

# Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    is_thesis_student: Optional[bool] = False
    tutor_name: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ReservationCreate(BaseModel):
    gpu_ids: List[str]
    days:    List[str]

# Routes
@app.post("/register", response_model=Token)
def register(user: UserCreate):
    if get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = get_password_hash(user.password)
    
    cursor.execute("""
        INSERT INTO users (name, email, hashed_password, is_thesis_student, tutor_name)
        VALUES (?, ?, ?, ?, ?)
    """, (
        user.name,
        user.email,
        hashed_pw,
        int(user.is_thesis_student),
        user.tutor_name
    ))
    conn.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token = create_access_token(data={"sub": user[2]})  # email
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/reservations")
def get_reservations(current_user: tuple = Depends(get_current_user)):
    cleanup_past_reservations()
    cursor.execute("SELECT user_name, email, gpu_id, day, tutor_name FROM reservations")
    rows = cursor.fetchall()
    return [
        {
            "user_name": row[0],
            "email": row[1],
            "gpu_id": row[2],
            "day": row[3],
            "tutor_name": row[4]
        }
        for row in rows
    ]

@app.post("/reservations")
def create_reservations(
    data: ReservationCreate,
    current_user: tuple = Depends(get_current_user)
):  
    cleanup_past_reservations()

    today_str = date.today().isoformat()
    for day in data.days:
        if day < today_str:
            raise HTTPException(
                status_code=400,
                detail=f"It is not possible to book past dates: {day}"
            )

    user_name     = current_user[1]  # nome
    user_email    = current_user[2]  # email
    tutor_name    = current_user[5] if len(current_user) > 5 else None  # tutor (può essere None)

    for gpu_id in data.gpu_ids:
        for day in data.days:
            cursor.execute(
                """
                INSERT INTO reservations
                  (user_name, email, gpu_id, day, created_at, tutor_name)
                VALUES (?,?,?,?,?,?)
                """,
                (
                  user_name,
                  user_email,
                  gpu_id,
                  day,
                  datetime.utcnow().isoformat(),
                  tutor_name
                )
            )
    conn.commit()
    
    lines = [
        f"<p>Hello <b>{user_name}</b>,</p>",
        "<p>Your GPU reservation has been <b>successfully created</b> with the following details:</p>",
        "<ul>",
        *[f"<li><b>{gpu}</b> on <b>{day}</b></li>" for gpu in data.gpu_ids for day in data.days],
        "</ul>"
        f"<p>Thesis supervisor: <b>{tutor_name}</b></p>" if tutor_name else "",
        "<p>Best regards</p>",
        "<p><b>ALCOR Lab GPU Reservation System</b>.</p>"
    ]

    send_email(
        recipient_email=user_email,
        subject="GPU Reservation Confirmation",
        body="\n".join(lines),
        is_html=True
    )

    return {"message": "Reservations successfully created"}

class DeleteReservation(BaseModel):
    gpu_ids: List[str]
    days: List[str]

@app.delete("/reservations")
def delete_reservations(
    data: DeleteReservation,
    current_user: tuple = Depends(get_current_user)
):
    # solo elimina righe dove email = utente corrente
    for gpu_id, day in zip(data.gpu_ids, data.days):
        cursor.execute(
            "DELETE FROM reservations WHERE gpu_id = ? AND day = ? AND email = ?",
            (gpu_id, day, current_user[2])
        )
    conn.commit()

    lines = [
        "<p>Hello,</p>",
        "<p>The following GPU reservations have been <b>successfully cancelled</b>:</p>",
        "<ul>",
        *[f"<li><b>{gpu}</b> on <b>{day}</b></li>" for gpu, day in zip(data.gpu_ids, data.days)],
        "</ul>",
        "<p>Best regards</p>",
        "<p><b>ALCOR Lab GPU Reservation System</b>.</p>"
    ]

    send_email(
        recipient_email=current_user[2],
        subject="GPU Reservation Cancellation",
        body="\n".join(lines),
        is_html=True
    )
    return {"message": "Reservations successfully deleted"}
