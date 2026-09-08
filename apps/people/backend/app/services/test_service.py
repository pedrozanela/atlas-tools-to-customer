"""
Montagem e correção de simulados.
"""
import logging
import random
import threading
import time
import uuid
from dataclasses import dataclass
from typing import List

from app.models.schemas import (
    TestSetupRequest, TestSession, Question, TestSubmitRequest, TestResult,
    AnswerResult, TopicScore, DomainAllocation,
)
from app.services import repo

logger = logging.getLogger(__name__)

_SESSION_TTL_SEC = 2 * 60 * 60
_MAX_PENDING_SESSIONS = 512


@dataclass(frozen=True)
class _PendingSession:
    certification_id: str
    questions: tuple[Question, ...]
    tenant_id: str
    user_email: str | None
    created_at: float


_pending_sessions: dict[str, _PendingSession] = {}
_pending_sessions_lock = threading.Lock()


def _normalise_email(email: str | None) -> str | None:
    return email.strip().lower() if email else None


def register_session(session: TestSession, tenant_id: str = "mock",
                     user_email: str | None = None) -> None:
    """Keep the authoritative question set server-side until it is graded."""
    now = time.monotonic()
    pending = _PendingSession(
        certification_id=session.certification_id,
        questions=tuple(session.questions),
        tenant_id=tenant_id,
        user_email=_normalise_email(user_email),
        created_at=now,
    )
    with _pending_sessions_lock:
        expired = [
            sid for sid, item in _pending_sessions.items()
            if now - item.created_at > _SESSION_TTL_SEC
        ]
        for sid in expired:
            _pending_sessions.pop(sid, None)
        if len(_pending_sessions) >= _MAX_PENDING_SESSIONS:
            oldest = min(_pending_sessions, key=lambda sid: _pending_sessions[sid].created_at)
            _pending_sessions.pop(oldest, None)
        _pending_sessions[session.id] = pending


def _consume_session(session_id: str, tenant_id: str,
                     user_email: str | None) -> _PendingSession:
    with _pending_sessions_lock:
        pending = _pending_sessions.get(session_id)
        if not pending or time.monotonic() - pending.created_at > _SESSION_TTL_SEC:
            _pending_sessions.pop(session_id, None)
            raise ValueError("Sessão de simulado inválida ou expirada")
        if pending.tenant_id != tenant_id or pending.user_email != _normalise_email(user_email):
            raise ValueError("Sessão de simulado não pertence ao usuário atual")
        # Consume atomically so the same result cannot be submitted twice.
        _pending_sessions.pop(session_id, None)
        return pending


def build_mock_exam(certification_id: str, tenant_id: str = "mock",
                    user_email: str | None = None) -> TestSession:
    """Step 4.4 — simulado completo: nº real de questões do exam guide,
    distribuído pelos domínios nas proporções oficiais (cert_info)."""
    cert = repo.get_certification(certification_id)
    if not cert:
        raise ValueError(f"Certificação não encontrada: {certification_id}")

    from app.services.cert_info import get_cert_info
    from app.services.llm_gen import build_mock_exam as gen_mock

    info = get_cert_info(certification_id)
    if not info:
        raise ValueError(f"Sem informações de exame para: {certification_id}")

    domains = info.get("domains") or []
    try:
        total = int(str(info.get("questions", "45")).strip())
    except (TypeError, ValueError):
        total = 45

    questions, dist = gen_mock(certification=cert, domains=domains, total=total)
    if questions:
        try:
            repo.add_questions(questions)     # para a correção encontrá-las depois
        except Exception as e:
            logger.warning(f"Não foi possível persistir questões do simulado: {e}")

    random.shuffle(questions)
    session = TestSession(
        id=str(uuid.uuid4()),
        certification_id=certification_id,
        questions=questions,
        num_questions=len(questions),
        topics=[d["name"] for d in domains],
        ai_generated=True,
        is_mock=True,
        distribution=[DomainAllocation(**d) for d in dist],
    )
    register_session(session, tenant_id=tenant_id, user_email=user_email)
    return session


def build_test(req: TestSetupRequest, tenant_id: str = "mock",
               user_email: str | None = None) -> TestSession:
    cert = repo.get_certification(req.certification_id)
    if not cert:
        raise ValueError(f"Certificação não encontrada: {req.certification_id}")

    topics = req.topics or cert.topics
    pool = repo.questions_for(req.certification_id, topics)

    selected: List[Question] = []
    ai_used = False

    # Questões geradas via LLM (opcional)
    if req.ai_generate and req.ai_count > 0:
        try:
            from app.services.llm_gen import generate_questions
            gen = generate_questions(
                certification=cert, count=min(req.ai_count, 10), topics=topics,
            )
            if gen:
                # persiste para que a correção encontre as questões e para coletá-las
                try:
                    repo.add_questions(gen)
                except Exception as e:
                    logger.warning(f"Não foi possível persistir questões geradas: {e}")
            selected.extend(gen)
            ai_used = len(gen) > 0
        except Exception as e:
            logger.warning(f"Falha na geração via LLM, seguindo só com o banco: {e}")

    # Completa com questões do banco (sem repetir as geradas)
    remaining = max(req.num_questions - len(selected), 0)
    bank = [q for q in pool if q.id not in {s.id for s in selected}]
    random.shuffle(bank)
    selected.extend(bank[:remaining])

    random.shuffle(selected)
    selected = selected[: req.num_questions]

    session = TestSession(
        id=str(uuid.uuid4()),
        certification_id=req.certification_id,
        questions=selected,
        num_questions=len(selected),
        topics=topics,
        ai_generated=ai_used,
    )
    register_session(session, tenant_id=tenant_id, user_email=user_email)
    return session


def grade_test(req: TestSubmitRequest, tenant_id: str = "mock", user_email: str | None = None) -> TestResult:
    from app.config import get_settings
    pending = _consume_session(req.session_id, tenant_id, user_email)
    if req.certification_id != pending.certification_id:
        raise ValueError("A certificação não corresponde à sessão criada")

    expected_ids = [q.id for q in pending.questions]
    submitted_ids = [a.question_id for a in req.answers]
    if len(submitted_ids) != len(set(submitted_ids)):
        raise ValueError("A submissão contém questões duplicadas")
    if set(submitted_ids) != set(expected_ids):
        raise ValueError("A submissão deve conter exatamente as questões da sessão")

    # repetição: questões desta sessão que o usuário já viu antes (neste tenant)
    answered_ids = set(expected_ids)
    seen_before = (repo.seen_question_ids(tenant_id, user_email, req.certification_id)
                   if user_email else set())
    repeated = len(answered_ids & seen_before)

    pool = {q.id: q for q in pending.questions}
    submitted = {a.question_id: a for a in req.answers}
    results: List[AnswerResult] = []
    topic_acc: dict[str, list[int]] = {}

    answered_count = 0
    for question_id in expected_ids:
        q = pool[question_id]
        ans = submitted[question_id]
        if len(ans.selected) != len(set(ans.selected)) or any(
            index < 0 or index >= len(q.options) for index in ans.selected
        ):
            raise ValueError(f"Resposta inválida para a questão {question_id}")
        if ans.selected:
            answered_count += 1
        correct = sorted(ans.selected) == sorted(q.correct_answers)
        results.append(AnswerResult(
            question_id=q.id, topic=q.topic, selected=ans.selected,
            correct_answers=q.correct_answers, is_correct=correct,
            explanation=q.explanation,
        ))
        c, t = topic_acc.setdefault(q.topic, [0, 0])
        topic_acc[q.topic] = [c + (1 if correct else 0), t + 1]

    total = len(results)
    correct_n = sum(1 for r in results if r.is_correct)
    by_topic = [TopicScore(topic=t, correct=v[0], total=v[1])
                for t, v in sorted(topic_acc.items())]

    pass_mark = get_settings().PASS_MARK
    score_pct = round(100 * correct_n / total, 1) if total else 0.0
    result = TestResult(
        session_id=req.session_id,
        certification_id=req.certification_id,
        score_pct=score_pct,
        correct=correct_n,
        total=total,
        answered=answered_count,
        passed=score_pct >= pass_mark,
        pass_mark=pass_mark,
        repeated_questions=repeated,
        duration_sec=req.duration_sec,
        by_topic=by_topic,
        results=results,
    )

    passed = result.passed
    try:
        repo.save_test_result(result, tenant_id, user_email, ai_generated=False, topics=[],
                              passed=passed, repeated_questions=repeated)
    except Exception as e:
        logger.warning(f"Não foi possível persistir a sessão: {e}")

    return result
