import pytest
import json
import os
from app import create_app
from models import db, Farm, Pen, Cattle

@pytest.fixture(scope='module')
def test_client():
    """Create a test client for the Flask application."""
    os.environ['FLASK_ENV'] = 'testing'
    app = create_app('testing')

    with app.test_client() as client:
        with app.app_context():
            db.create_all()

            # Create test data
            farm = Farm(name='Test Farm', address='123 Test Lane')
            db.session.add(farm)
            db.session.commit()

            pen = Pen(pen_number='Test Pen', farm_id=farm.id)
            db.session.add(pen)
            db.session.commit()

            # Add cattle with different statuses
            cattle_data = [
                {'ear_tag': 'C001', 'status': 'healthy', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C002', 'status': 'healthy', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C003', 'status': 'healthy', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C004', 'status': 'healthy', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C005', 'status': 'sick', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C006', 'status': 'sick', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C007', 'status': 'quarantine', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C008', 'status': None, 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C009', 'status': None, 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C010', 'status': None, 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C011', 'status': 'sold', 'pen_id': pen.id, 'farm_id': farm.id},
                {'ear_tag': 'C012', 'status': 'sold', 'pen_id': pen.id, 'farm_id': farm.id},
            ]

            for data in cattle_data:
                cattle = Cattle(**data)
                db.session.add(cattle)

            db.session.commit()

        yield client

        with app.app_context():
            db.drop_all()

def test_dashboard_summary_fix(test_client):
    """
    Tests the fix in the cattle_health_rate calculation.
    The new implementation should return a health rate of 70.0.
    Total cattle = 12, Sold cattle = 2, Effective total = 10
    Sick = 2, Quarantine = 1
    Healthy count for rate = 10 - 2 - 1 = 7
    Health rate = (7 / 10) * 100 = 70.0
    """
    response = test_client.get('/api/v1/dashboard/summary')
    assert response.status_code == 200

    data = json.loads(response.data)
    assert data['success'] is True

    assert data['data']['cattle_health_rate'] == 70.0