import asyncio
import threading

from app.api import generate as generate_api
from app.api import tests as tests_api
from app.models.schemas import (
    Certification,
    DeepDiveRequest,
    MockExamRequest,
    Question,
    TestSession,
    UserPublic,
)


USER = UserPublic(
    email="person@example.com",
    name="Person",
    tenant_id="tenant-id",
    tenant_slug="atlas",
)
CERT = Certification(
    id="cert",
    name="Certification",
    type="certification",
    level="associate",
    description="Test",
    topics=["topic"],
)


def test_deep_dive_offloads_sync_sdk_work(monkeypatch):
    event_loop_thread = threading.get_ident()
    worker_threads: list[int] = []

    def get_certification(_certification_id):
        worker_threads.append(threading.get_ident())
        return CERT

    def deep_dive(_certification, objective):
        worker_threads.append(threading.get_ident())
        return {"objective": objective, "core_concept": "Delta"}

    monkeypatch.setattr(generate_api.repo, "get_certification", get_certification)
    monkeypatch.setattr(generate_api, "deep_dive_objective", deep_dive)

    result = asyncio.run(
        generate_api.deep_dive(
            DeepDiveRequest(certification_id="cert", objective="Delta Lake"),
            USER,
        )
    )

    assert result.success is True
    assert worker_threads
    assert all(thread_id != event_loop_thread for thread_id in worker_threads)


def test_full_mock_exam_offloads_outer_sync_service(monkeypatch):
    event_loop_thread = threading.get_ident()
    worker_threads: list[int] = []
    ownership: list[tuple[str, str]] = []

    def build_mock_exam(certification_id, tenant_id, user_email):
        worker_threads.append(threading.get_ident())
        ownership.append((tenant_id, user_email))
        return TestSession(
            id="session",
            certification_id=certification_id,
            questions=[Question(
                id="q1",
                certification_id=certification_id,
                topic="topic",
                question_text="Question?",
                options=["A", "B"],
                correct_answers=[0],
            )],
            num_questions=1,
            topics=["topic"],
            ai_generated=True,
        )

    monkeypatch.setattr(tests_api.test_service, "build_mock_exam", build_mock_exam)

    result = asyncio.run(
        tests_api.create_mock_exam(MockExamRequest(certification_id="cert"), USER)
    )

    assert worker_threads
    assert all(thread_id != event_loop_thread for thread_id in worker_threads)
    assert ownership == [("tenant-id", "person@example.com")]
    assert result.num_questions == 1
