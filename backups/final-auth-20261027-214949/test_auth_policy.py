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


if __name__ == "__main__":
    unittest.main(verbosity=2)
