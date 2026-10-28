import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app
from backend.api.routes import auth


class RegistrationPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_developer_registration_requires_invitation(self):
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "name": "Policy Test",
                "email": "policy-test-no-invite@example.invalid",
                "password": "long-test-password-123",
                "requested_role": "developer",
            },
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_developer_invitation_is_rejected(self):
        with patch.object(auth.invitations, "find_one_and_update", return_value=None):
            response = self.client.post(
                "/api/v1/auth/register",
                json={
                    "name": "Policy Test",
                    "email": "policy-test-invalid-invite@example.invalid",
                    "password": "long-test-password-123",
                    "requested_role": "developer",
                    "invitation_token": "x" * 48,
                },
            )
        self.assertEqual(response.status_code, 403)

    def test_invitation_creation_requires_admin_key(self):
        with patch.object(auth, "ADMIN_KEY", "test-only-admin-secret-for-unit-tests-2026"):
            response = self.client.post(
                "/api/v1/auth/admin/developer-invitations",
                json={"expires_in_hours": 24},
            )
        self.assertEqual(response.status_code, 403)

    def test_authority_approval_requires_admin_key(self):
        with patch.object(auth, "ADMIN_KEY", "test-only-admin-secret-for-unit-tests-2026"):
            response = self.client.post(
                "/api/v1/auth/admin/authority-requests/507f1f77bcf86cd799439011/approve",
                json={
                    "eligibility_verified": True,
                    "verification_note": "Eligibility checked for testing.",
                },
            )
        self.assertEqual(response.status_code, 403)

    def test_authority_approval_requires_verification_flag(self):
        with patch.object(auth, "ADMIN_KEY", "test-only-admin-secret-for-unit-tests-2026"):
            response = self.client.post(
                "/api/v1/auth/admin/authority-requests/507f1f77bcf86cd799439011/approve",
                headers={"X-Admin-Key": "test-only-admin-secret-for-unit-tests-2026"},
                json={
                    "eligibility_verified": False,
                    "verification_note": "Not verified for testing.",
                },
            )
        self.assertEqual(response.status_code, 400)


    def test_valid_invitation_activates_developer(self):
        from bson import ObjectId
        from unittest.mock import Mock

        invitation = {
            "_id": ObjectId(),
            "token_hash": "mocked-hash",
        }
        inserted_id = ObjectId()

        with patch.object(auth.invitations, "find_one_and_update", return_value=invitation), \
             patch.object(auth.users, "create_index"), \
             patch.object(auth.users, "insert_one", return_value=Mock(inserted_id=inserted_id)):
            response = self.client.post(
                "/api/v1/auth/register",
                json={
                    "name": "Invited Developer",
                    "email": "developer-flow@example.invalid",
                    "password": "long-test-password-123",
                    "requested_role": "developer",
                    "invitation_token": "test-invitation-token-" + "x" * 32,
                },
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()["user"]
        self.assertEqual(body["role"], "developer")
        self.assertEqual(body["status"], "active")

    def test_authority_registration_remains_pending(self):
        from bson import ObjectId
        from unittest.mock import Mock

        inserted_id = ObjectId()
        with patch.object(auth.users, "create_index"), \
             patch.object(auth.users, "insert_one", return_value=Mock(inserted_id=inserted_id)):
            response = self.client.post(
                "/api/v1/auth/register",
                json={
                    "name": "Authority Applicant",
                    "email": "authority-flow@example.invalid",
                    "password": "long-test-password-123",
                    "requested_role": "authority",
                },
            )

        self.assertEqual(response.status_code, 201)
        body = response.json()["user"]
        self.assertEqual(body["role"], "user")
        self.assertEqual(body["status"], "pending")

    def test_authority_approval_activates_matching_pending_request(self):
        from unittest.mock import Mock

        with patch.object(auth, "ADMIN_KEY", "test-only-admin-secret-for-unit-tests-2026"), \
             patch.object(auth.users, "update_one", return_value=Mock(modified_count=1)) as update:
            response = self.client.post(
                "/api/v1/auth/admin/authority-requests/507f1f77bcf86cd799439011/approve",
                headers={"X-Admin-Key": "test-only-admin-secret-for-unit-tests-2026"},
                json={
                    "eligibility_verified": True,
                    "verification_note": "Verified using test review procedure.",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], "Authority account approved and activated.")
        self.assertEqual(update.call_args.args[0]["status"], "pending")
        self.assertEqual(update.call_args.args[0]["requested_role"], "authority")


if __name__ == "__main__":
    unittest.main(verbosity=2)
