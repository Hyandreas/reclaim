"""Real retrieval over the MSA clause corpus.

Primary path: Vultr embeddings (cosine over cached corpus vectors).
Fallback: a deterministic pure-python TF-IDF cosine index built at import.
``retrieve`` never raises - TF-IDF cannot fail, so results are always returned.
"""
from __future__ import annotations

import json
import math
import re
import time
import urllib.request
from typing import Any

import env_config
from reclaim_core import DOCUMENTS

_EMBED_MODEL = "vultr/VultronRetrieverFlash-Qwen3.5-0.8B"
_TIMEOUT = 12

# --- corpus chunking (sentence level) ----------------------------------------


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _build_chunks() -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for doc_id, doc in DOCUMENTS.items():
        for i, sentence in enumerate(_split_sentences(doc["excerpt"])):
            chunks.append({"chunkId": f"{doc_id}#{i}", "docId": doc_id, "text": sentence})
    return chunks


_CHUNKS: list[dict[str, Any]] = _build_chunks()

# --- deterministic TF-IDF index (built once at import) ------------------------


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _build_tfidf() -> tuple[dict[str, float], list[dict[str, float]]]:
    docs_tokens = [_tokenize(chunk["text"]) for chunk in _CHUNKS]
    n_docs = len(docs_tokens) or 1
    doc_freq: dict[str, int] = {}
    for tokens in docs_tokens:
        for term in set(tokens):
            doc_freq[term] = doc_freq.get(term, 0) + 1
    idf = {term: math.log((n_docs + 1) / (freq + 1)) + 1 for term, freq in doc_freq.items()}
    vectors: list[dict[str, float]] = []
    for tokens in docs_tokens:
        counts: dict[str, int] = {}
        for term in tokens:
            counts[term] = counts.get(term, 0) + 1
        length = len(tokens) or 1
        vectors.append({term: (count / length) * idf[term] for term, count in counts.items()})
    return idf, vectors


_IDF, _TFIDF_VECS = _build_tfidf()
_DEFAULT_IDF = math.log((len(_CHUNKS) + 1) / 1) + 1


def _query_vector(query: str) -> dict[str, float]:
    tokens = _tokenize(query)
    counts: dict[str, int] = {}
    for term in tokens:
        counts[term] = counts.get(term, 0) + 1
    length = len(tokens) or 1
    return {term: (count / length) * _IDF.get(term, _DEFAULT_IDF) for term, count in counts.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    common = set(a) & set(b)
    numerator = sum(a[t] * b[t] for t in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return numerator / (norm_a * norm_b)


# --- Vultr embeddings path ----------------------------------------------------

_corpus_embeddings: list[list[float]] | None = None
_mode: str | None = None  # "vultr-embeddings" | "local-tfidf" once resolved


def _embed(texts: list[str]) -> list[list[float]]:
    base = env_config.get("VULTR_INFERENCE_BASE_URL")
    key = env_config.get("VULTR_INFERENCE_API_KEY")
    if not base or not key:
        raise RuntimeError("vultr embeddings not configured")
    url = base.rstrip("/") + "/embeddings"
    data = json.dumps({"model": _EMBED_MODEL, "input": texts}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return [row["embedding"] for row in body["data"]]


def _ensure_corpus() -> None:
    """Resolve retrieval mode once, embedding the corpus if Vultr is reachable."""
    global _corpus_embeddings, _mode
    if _mode is not None:
        return
    try:
        _corpus_embeddings = _embed([chunk["text"] for chunk in _CHUNKS])
        _mode = "vultr-embeddings"
    except Exception:
        _corpus_embeddings = None
        _mode = "local-tfidf"


def _dot_cosine(a: list[float], b: list[float]) -> float:
    numerator = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return numerator / (norm_a * norm_b)


def mode_info() -> dict[str, Any]:
    """Return the resolved retrieval mode without running a query."""
    _ensure_corpus()
    return {"mode": _mode, "live": _mode == "vultr-embeddings"}


def retrieve(query: str, k: int = 3) -> list[dict[str, Any]]:
    """Return the top ``k`` corpus chunks for ``query``. Never raises."""
    _ensure_corpus()
    scored: list[dict[str, Any]] = []
    if _mode == "vultr-embeddings" and _corpus_embeddings is not None:
        try:
            query_vec = _embed([query])[0]
            for chunk, vec in zip(_CHUNKS, _corpus_embeddings):
                scored.append((_dot_cosine(query_vec, vec), chunk, "vultr-embeddings"))
        except Exception:
            scored = []
    if not scored:
        query_vec = _query_vector(query)
        for chunk, vec in zip(_CHUNKS, _TFIDF_VECS):
            scored.append((_cosine(query_vec, vec), chunk, "local-tfidf"))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [
        {
            "chunkId": chunk["chunkId"],
            "docId": chunk["docId"],
            "score": round(score, 3),
            "text": chunk["text"],
            "mode": mode,
        }
        for score, chunk, mode in scored[:k]
    ]
