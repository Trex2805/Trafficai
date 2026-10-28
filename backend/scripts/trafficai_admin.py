import argparse
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

ADMIN_KEY = os.getenv("TRAFFICAI_ADMIN_KEY", "")
BASE_URL = os.getenv("TRAFFICAI_ADMIN_API_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api/v1/auth"


def call(method, path, **kwargs):
    if len(ADMIN_KEY) < 32:
        raise SystemExit("Administrator key is missing or invalid in the project .env.")
    headers = kwargs.pop("headers", {})
    headers["X-Admin-Key"] = ADMIN_KEY
    try:
        response = requests.request(
            method, API + path, headers=headers, timeout=15, **kwargs
        )
    except requests.RequestException as exc:
        raise SystemExit(f"Could not contact TrafficAI API ({type(exc).__name__}).")

    body = response.json() if response.content else {}
    if not response.ok:
        detail = body.get("detail", f"HTTP {response.status_code}")
        raise SystemExit(f"Request rejected: {detail}")
    return body


def main():
    parser = argparse.ArgumentParser(description="TrafficAI administrator operations")
    sub = parser.add_subparsers(dest="command", required=True)

    invite = sub.add_parser("invite-developer", help="Create a one-time developer invitation")
    invite.add_argument("--hours", type=int, default=72)

    revoke = sub.add_parser("revoke-invitation", help="Revoke an unused developer invitation")
    revoke.add_argument("--invitation-id", required=True)

    sub.add_parser("list-authority", help="List pending RTO authority requests")

    approve = sub.add_parser("approve-authority", help="Approve a verified authority request")
    approve.add_argument("--user-id", required=True)

    args = parser.parse_args()

    if args.command == "invite-developer":
        if not 1 <= args.hours <= 168:
            raise SystemExit("Invitation lifetime must be 1 to 168 hours.")
        result = call(
            "POST", "/admin/developer-invitations",
            json={"expires_in_hours": args.hours},
        )
        print("Developer invitation created.")
        print("Copy this token now; it is shown only once:")
        print(result["invitation_token"])
        print("Expires:", result["expires_at"])

    elif args.command == "revoke-invitation":
        result = call(
            "DELETE",
            f"/admin/developer-invitations/{args.invitation_id}",
        )
        print(result.get("message", "Invitation revoked."))

    elif args.command == "list-authority":
        result = call("GET", "/admin/authority-requests")
        requests_list = result.get("requests", [])
        if not requests_list:
            print("No pending authority requests.")
        for item in requests_list:
            print(
                f"ID: {item['id']}\n"
                f"Name: {item['name']}\n"
                f"Email: {item['email']}\n"
                f"Created: {item.get('created_at')}\n"
                "------------------------------"
            )

    elif args.command == "approve-authority":
        print("Before continuing, independently verify the applicant's eligibility.")
        confirmation = input("Have you verified this applicant's authority? Type YES to continue: ")
        if confirmation != "YES":
            raise SystemExit("Approval cancelled.")
        note = input("Enter a concise verification note (minimum 10 characters): ").strip()
        if len(note) < 10:
            raise SystemExit("Verification note must contain at least 10 characters.")
        result = call(
            "POST",
            f"/admin/authority-requests/{args.user_id}/approve",
            json={
                "eligibility_verified": True,
                "verification_note": note,
            },
        )
        print(result.get("message", "Authority request approved."))


if __name__ == "__main__":
    main()
