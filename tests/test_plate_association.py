import unittest

from backend.services.plate_association import (
    associate_plate_to_vehicle,
)


class PlateAssociationTests(unittest.TestCase):
    def test_associates_plate_inside_car(self):
        result = associate_plate_to_vehicle(
            [40, 80, 60, 90],
            [{
                "track_id": 7,
                "class_name": "car",
                "bbox_xyxy": [10, 20, 100, 100],
            }],
        )
        self.assertEqual(result["vehicle_track_id"], 7)
        self.assertEqual(result["vehicle_class"], "car")
        self.assertEqual(result["association_status"], "geometry_candidate")

    def test_accepts_strong_partial_overlap(self):
        result = associate_plate_to_vehicle(
            [80, 80, 120, 100],
            [{
                "track_id": 8,
                "class_name": "motorcycle",
                "bbox_xyxy": [70, 60, 100, 120],
            }],
        )
        self.assertEqual(result["vehicle_track_id"], 8)

    def test_rejects_weak_overlap(self):
        result = associate_plate_to_vehicle(
            [100, 100, 120, 110],
            [{
                "track_id": 9,
                "class_name": "car",
                "bbox_xyxy": [90, 90, 105, 105],
            }],
        )
        self.assertIsNone(result["vehicle_track_id"])
        self.assertEqual(result["association_status"], "unassigned")

    def test_ignores_non_vehicle_detection(self):
        result = associate_plate_to_vehicle(
            [40, 40, 60, 50],
            [{
                "track_id": 10,
                "class_name": "person",
                "bbox_xyxy": [0, 0, 100, 100],
            }],
        )
        self.assertIsNone(result["vehicle_track_id"])

    def test_invalid_plate_box_is_unassigned(self):
        result = associate_plate_to_vehicle(
            [10, 10, 10, 20],
            [],
        )
        self.assertEqual(result["association_status"], "unassigned")


if __name__ == "__main__":
    unittest.main()
