import argparse
import sys

from backend.core.mongodb import db

def main():
    parser = argparse.ArgumentParser(
        description="Approve an existing TrafficAI developer or authority request."
    )
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=["developer", "authority"])
    args = parser.parse_args()

    email = args.email.strip().lower()
    users = db["users"]
    user = users.find_one({"email": email})

    if not user:
        print("No account found for that email.")
        return 1

    if user.get("requested_role") != args.role:
        print("Approval refused: requested role does not match.")
        return 1

    if user.get("status") != "pending":
        print("Approval refused: account is not pending.")
        return 1

    result = users.update_one(
        {"_id": user["_id"], "status": "pending", "requested_role": args.role},
        {"$set": {"role": args.role, "status": "active"}},
    )

    if result.modified_count != 1:
        print("Approval failed: account changed concurrently.")
        return 1

    print(f"Approved {email} as {args.role}. The user can now log in.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
