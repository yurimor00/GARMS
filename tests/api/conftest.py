"""Configuração comum dos testes de API (pytest + Playwright APIRequestContext).

Os testes chamam a EAPI a correr (no compose, no cluster ou em `npm run dev:eapi`).
Endereço em EAPI_URL (por omissão http://localhost:3000).
"""

import os

import pytest
from playwright.sync_api import APIRequestContext, Playwright

EAPI_URL = os.environ.get("EAPI_URL", "http://localhost:3000")


@pytest.fixture(scope="session")
def eapi(playwright: Playwright) -> APIRequestContext:
    """Cliente HTTP para a EAPI (não abre browser nenhum)."""
    contexto = playwright.request.new_context(base_url=EAPI_URL)
    yield contexto
    contexto.dispose()


def validar_formato_erro(corpo: dict) -> None:
    """Formato `Erro` dos contratos: { codigo, mensagem, campos? }, com codigo em MAIÚSCULAS."""
    assert set(corpo) <= {"codigo", "mensagem", "campos"}, f"campos a mais no Erro: {corpo}"
    assert isinstance(corpo.get("codigo"), str) and corpo["codigo"].isupper()
    assert isinstance(corpo.get("mensagem"), str) and corpo["mensagem"]
