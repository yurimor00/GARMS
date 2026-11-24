"""EAPI: comportamento base, comum a todos os endpoints (health checks, erros, correlationId).

Os testes dos endpoints do contrato (ACC-01, WDB-01, ...) entram em ficheiros próprios, por episódio.
"""

import re

from conftest import validar_formato_erro

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")


def test_EAPI_health_live_responde_200(eapi):
    resposta = eapi.get("/health/live")
    assert resposta.status == 200
    assert resposta.json() == {"estado": "ok", "servico": "eapi", "versao": resposta.json()["versao"]}


def test_EAPI_health_com_dependencias_ligadas(eapi):
    resposta = eapi.get("/health")
    assert resposta.status == 200, resposta.text()
    corpo = resposta.json()
    assert corpo["estado"] == "ok"
    assert corpo["dependencias"] == {"redis": "ok", "rabbitmq": "ok"}


def test_EAPI_rota_inexistente_404_no_formato_erro(eapi):
    resposta = eapi.get("/api/v1/rota-que-nao-existe")
    assert resposta.status == 404
    assert resposta.headers["content-type"].startswith("application/json")
    corpo = resposta.json()
    validar_formato_erro(corpo)
    assert corpo["codigo"] == "NAO_ENCONTRADO"


def test_EAPI_json_mal_formado_400_no_formato_erro(eapi):
    resposta = eapi.post(
        "/api/v1/qualquer",
        headers={"Content-Type": "application/json"},
        data='{"nome": ',
    )
    assert resposta.status == 400
    validar_formato_erro(resposta.json())


def test_EAPI_devolve_o_correlation_id_recebido(eapi):
    resposta = eapi.get("/health/live", headers={"X-Correlation-Id": "teste-pytest-1"})
    assert resposta.headers["x-correlation-id"] == "teste-pytest-1"


def test_EAPI_cria_correlation_id_quando_nao_vem(eapi):
    resposta = eapi.get("/health/live")
    assert UUID.match(resposta.headers["x-correlation-id"])


def test_EAPI_nao_revela_a_tecnologia(eapi):
    resposta = eapi.get("/health/live")
    assert "x-powered-by" not in resposta.headers
