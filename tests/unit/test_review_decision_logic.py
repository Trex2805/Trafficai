import unittest


def decision_fields(action, previous_status):
    if action not in ("confirm", "reject"):
        raise ValueError("Unsupported review action")

    return {
        "review_status": "confirmed" if action == "confirm" else "rejected",
        "is_confirmed_violation": action == "confirm",
        "previous_status": previous_status,
    }


class ReviewDecisionLogicTests(unittest.TestCase):
    def test_confirm_maps_to_confirmed(self):
        result = decision_fields("confirm", "pending")
        self.assertEqual(result["review_status"], "confirmed")
        self.assertTrue(result["is_confirmed_violation"])

    def test_reject_maps_to_rejected(self):
        result = decision_fields("reject", "pending")
        self.assertEqual(result["review_status"], "rejected")
        self.assertFalse(result["is_confirmed_violation"])

    def test_invalid_action_is_rejected(self):
        with self.assertRaises(ValueError):
            decision_fields("maybe", "pending")


if __name__ == "__main__":
    unittest.main()
