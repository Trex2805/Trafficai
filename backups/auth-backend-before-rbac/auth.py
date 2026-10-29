import os
import re
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from pwdlib import PasswordHash

from backend.core.mongodb import db

router = APIRouter(prefix="/auth", tags=["Authentication"])

users = db["users"]
password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

JWT_ALGORITHM = "HS256"
JWT_ISSUER = "TrafficAI"
TOKEN_MINUTES = 30

AUTH_SECRET = os.getenv("TRAFFICAI_AUTH_SECRET")
if not AUTH_SECRET or len(AUTH_SECRET) < 32:
    raise RuntimeError(
        "TRAFFICAI_AUTH_SECRET is missing or too short. "
        "Configure it in the project .env file."
    )


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    requested_role: Literal["user", "authority", "developer"] = "user"


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)


def normalize_email(email: str) -> str:
    email = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return email


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "requested_role": user.get("requested_role", user["role"]),
        "status": user["status"],
    }


def create_access_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "iss": JWT_ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_MINUTES),
    }
    return jwt.encode(payload, AUTH_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            AUTH_SECRET,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iat", "iss"]},
        )
        user_id = payload["sub"]
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user identifier")
    except (jwt.InvalidTokenError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is unavailable or not active.",
        )

    return user


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest):
    email = normalize_email(request.email)
    name = request.name.strip()

    if len(name) < 2:
        raise HTTPException(status_code=422, detail="Enter your full name.")

    # Only standard users are activated by public registration.
    # Privileged access requests must be approved separately.
    privileged_request = request.requested_role in {"authority", "developer"}
    user = {
        "name": name,
        "email": email,
        "password_hash": password_hash.hash(request.password),
        "role": "user",
        "requested_role": request.requested_role,
        "status": "pending" if privileged_request else "active",
        "created_at": datetime.now(timezone.utc),
    }

    try:
        users.create_index("email", unique=True, name="uq_users_email")
        result = users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user["_id"] = result.inserted_id
    return {
        "message": (
            "Account created. Privileged access requires approval."
            if privileged_request
            else "Account created successfully."
        ),
        "user": public_user(user),
    }


@router.post("/login")
def login(request: LoginRequest):
    email = normalize_email(request.email)
    user = users.find_one({"email": email})

    if not user or not password_hash.verify(
        request.password, user.get("password_hash", "")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if user.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval or has been disabled.",
        )

    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": TOKEN_MINUTES * 60,
        "user": public_user(user),
    }


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": public_user(current_user)}
