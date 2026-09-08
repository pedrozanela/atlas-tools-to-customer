"""
Testes da geração via LLM: mock e parsing robusto da resposta do modelo.
"""
import json
from types import SimpleNamespace
from app.services import llm_gen
from app.services.repo import get_certification
from tests.conftest import ASSOC

CERT = get_certification(ASSOC)
TOPICS = CERT.topics


def test_mock_gera_quantidade_pedida():
    qs = llm_gen.generate_questions(CERT, count=4, topics=TOPICS)
    assert len(qs) == 4
    assert all(q.is_ai_generated for q in qs)
    assert all(q.certification_id == ASSOC for q in qs)
    assert all(q.topic in TOPICS for q in qs)


def test_mock_respeita_limite_maximo():
    qs = llm_gen.generate_questions(CERT, count=999, topics=TOPICS)
    assert len(qs) <= 10  # LLM_MAX_GENERATE


def test_parse_json_valido():
    raw = json.dumps([{
        "topic": TOPICS[0], "question_text": "Q?", "question_type": "multiple_choice",
        "options": ["a", "b", "c", "d"], "correct_answers": [2],
        "explanation": "pq sim", "difficulty": 3,
    }])
    qs = llm_gen._parse(raw, CERT, TOPICS)
    assert len(qs) == 1
    assert qs[0].correct_answers == [2] and qs[0].is_ai_generated


def test_parse_ignora_indice_fora_do_range():
    raw = json.dumps([{
        "topic": TOPICS[0], "question_text": "Q?", "options": ["a", "b"],
        "correct_answers": [5], "explanation": "", "difficulty": 2,
    }])
    # índice 5 inválido -> sem respostas válidas -> questão descartada
    assert llm_gen._parse(raw, CERT, TOPICS) == []


def test_parse_detecta_multiple_select():
    raw = json.dumps([{
        "topic": TOPICS[0], "question_text": "Q?", "options": ["a", "b", "c"],
        "correct_answers": [0, 2], "explanation": "", "difficulty": 4,
    }])
    qs = llm_gen._parse(raw, CERT, TOPICS)
    assert len(qs) == 1 and qs[0].question_type == "multiple_select"


def test_parse_topico_invalido_cai_no_primeiro():
    raw = json.dumps([{
        "topic": "Tópico Inexistente", "question_text": "Q?", "options": ["a", "b"],
        "correct_answers": [0], "explanation": "", "difficulty": 2,
    }])
    qs = llm_gen._parse(raw, CERT, TOPICS)
    assert len(qs) == 1 and qs[0].topic == TOPICS[0]


def test_parse_com_texto_em_volta_e_fences():
    raw = "Claro! Aqui estão:\n```json\n" + json.dumps([{
        "topic": TOPICS[1], "question_text": "Q?", "options": ["a", "b"],
        "correct_answers": [1], "explanation": "", "difficulty": 2,
    }]) + "\n```\nEspero ter ajudado."
    qs = llm_gen._parse(raw, CERT, TOPICS)
    assert len(qs) == 1 and qs[0].correct_answers == [1]


def test_parse_lixo_retorna_vazio():
    assert llm_gen._parse("desculpe, não consigo", CERT, TOPICS) == []


def test_parse_json_array_prefix_recovers_complete_items_from_truncated_tail():
    raw = '```json\n[{"task":"One"},{"task":"Two"},{"task":"Thr'
    assert llm_gen._parse_json_array_prefix(raw) == [
        {"task": "One"},
        {"task": "Two"},
    ]


def test_parse_json_array_prefix_skips_non_json_brackets_before_array():
    raw = 'Intro [not JSON].\n[{"task":"One"},{"task":"Two"},{"task":"Thr'
    assert llm_gen._parse_json_array_prefix(raw) == [
        {"task": "One"},
        {"task": "Two"},
    ]


def test_hands_on_uses_bounded_response_for_cross_zone_proxy(monkeypatch):
    captured = {}

    def fake_chat(system, user, max_tokens=4000):
        captured["max_tokens"] = max_tokens
        captured["prompt"] = user
        return json.dumps([
            {
                "task": f"Task {index}",
                "objective": TOPICS[index % len(TOPICS)],
                "est_minutes": 20,
                "steps": ["One", "Two", "Three"],
                "doc_url": "https://docs.databricks.com/",
            }
            for index in range(6)
        ])

    monkeypatch.setattr(llm_gen, "get_settings", lambda: SimpleNamespace(MOCK_MODE=False))
    monkeypatch.setattr(llm_gen, "_chat", fake_chat)

    tasks = llm_gen.hands_on_checklist(CERT)

    assert len(tasks) == 6
    assert captured["max_tokens"] == 1600
    assert "exactly 6 concise hands-on tasks" in captured["prompt"]
    assert "each task under 18 words" in captured["prompt"]


def test_hands_on_recovers_complete_tasks_from_truncated_response(monkeypatch):
    monkeypatch.setattr(llm_gen, "get_settings", lambda: SimpleNamespace(MOCK_MODE=False))
    monkeypatch.setattr(
        llm_gen,
        "_chat",
        lambda *_args, **_kwargs: (
            'Intro [not JSON].\n[{"task":"One","steps":[]},'
            '{"task":"Two","steps":[]},{"task":"Thr'
        ),
    )

    tasks = llm_gen.hands_on_checklist(CERT)

    assert [task["task"] for task in tasks] == ["One", "Two"]


def test_hands_on_filters_non_objects_and_caps_result_at_six(monkeypatch):
    response = ["ignore"] + [
        {"task": f"Task {index}", "steps": []}
        for index in range(7)
    ]
    monkeypatch.setattr(llm_gen, "get_settings", lambda: SimpleNamespace(MOCK_MODE=False))
    monkeypatch.setattr(llm_gen, "_chat", lambda *_args, **_kwargs: json.dumps(response))

    tasks = llm_gen.hands_on_checklist(CERT)

    assert [task["task"] for task in tasks] == [f"Task {index}" for index in range(6)]
