"""
Phase 3 — Storage layer (infrastructure only).

1. Evidence-packet cache (in-memory, keyed by village + category + capital)
2. Village vector store (TF-IDF embeddings of each mock village profile)

RAG / retrieval into Gemini is deferred (orange). This module only stands up
the store, populates it, and exposes a nearest-neighbor query API.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("storage")

# ---------------------------------------------------------------------------
# 1. Evidence-packet cache
# ---------------------------------------------------------------------------

_cache: Dict[Tuple[str, str, float], Tuple[float, Dict[str, Any]]] = {}
_cache_lock = threading.Lock()
_cache_hits = 0
_cache_misses = 0
_CACHE_MAX_ENTRIES = 256


def _cache_key(
    village_id: str,
    business_category: str,
    available_capital: float,
) -> Tuple[str, str, float]:
    return (
        village_id.strip(),
        business_category.strip().lower(),
        round(float(available_capital), 2),
    )


def cache_get(
    village_id: str,
    business_category: str,
    available_capital: float,
) -> Optional[Dict[str, Any]]:
    global _cache_hits, _cache_misses
    key = _cache_key(village_id, business_category, available_capital)
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            _cache_misses += 1
            logger.info("CACHE MISS key=%s (hits=%d misses=%d)", key, _cache_hits, _cache_misses)
            return None
        _cache_hits += 1
        age_ms = (time.time() - entry[0]) * 1000
        logger.info(
            "CACHE HIT key=%s age_ms=%.1f (hits=%d misses=%d)",
            key, age_ms, _cache_hits, _cache_misses,
        )
        return dict(entry[1])


def cache_set(
    village_id: str,
    business_category: str,
    available_capital: float,
    packet: Dict[str, Any],
) -> None:
    key = _cache_key(village_id, business_category, available_capital)
    with _cache_lock:
        if len(_cache) >= _CACHE_MAX_ENTRIES and key not in _cache:
            oldest_key = min(_cache.items(), key=lambda kv: kv[1][0])[0]
            del _cache[oldest_key]
        _cache[key] = (time.time(), dict(packet))
        logger.info("CACHE SET key=%s size=%d", key, len(_cache))


def cache_stats() -> Dict[str, int]:
    with _cache_lock:
        return {
            "entries": len(_cache),
            "hits": _cache_hits,
            "misses": _cache_misses,
        }


def cache_clear() -> None:
    global _cache_hits, _cache_misses
    with _cache_lock:
        _cache.clear()
        _cache_hits = 0
        _cache_misses = 0
    logger.info("CACHE CLEARED")


# ---------------------------------------------------------------------------
# 2. Village vector store (TF-IDF, in-process)
# ---------------------------------------------------------------------------

def _village_profile_text(village: Dict[str, Any]) -> str:
    enterprises = " ".join(village.get("existing_local_enterprises", []))
    conn = village.get("connectivity", {})
    bands = village.get("household_income_bands", {})
    parts = [
        f"village {village.get('name', '')} id {village.get('village_id', '')}",
        f"population {village.get('population', 0)} households {village.get('households', 0)}",
        f"road {conn.get('road', '')} market {conn.get('market_day_access', '')} internet {conn.get('internet', '')}",
        f"income low {bands.get('low', {}).get('share_of_households_pct', 0)} "
        f"typical {bands.get('typical', {}).get('share_of_households_pct', 0)} "
        f"higher {bands.get('higher', {}).get('share_of_households_pct', 0)}",
        f"enterprises {enterprises}",
        f"target {village.get('target_enterprise_type', '')}",
    ]
    return " ".join(parts).lower()


class VillageVectorStore:
    def __init__(self) -> None:
        self._vectorizer: Optional[TfidfVectorizer] = None
        self._matrix = None
        self._ids: List[str] = []
        self._docs: List[str] = []
        self._meta: List[Dict[str, Any]] = []
        self._lock = threading.Lock()

    def index_villages(self, villages: List[Dict[str, Any]]) -> int:
        docs = [_village_profile_text(v) for v in villages]
        ids = [v["village_id"] for v in villages]
        meta = [
            {
                "village_id": v["village_id"],
                "name": v.get("name"),
                "population": v.get("population"),
                "households": v.get("households"),
                "existing_local_enterprises": v.get("existing_local_enterprises", []),
                "target_enterprise_type": v.get("target_enterprise_type"),
            }
            for v in villages
        ]
        with self._lock:
            if not docs:
                self._vectorizer = None
                self._matrix = None
                self._ids, self._docs, self._meta = [], [], []
                return 0
            vectorizer = TfidfVectorizer()
            matrix = vectorizer.fit_transform(docs)
            self._vectorizer = vectorizer
            self._matrix = matrix
            self._ids = ids
            self._docs = docs
            self._meta = meta
        logger.info("VECTOR STORE indexed %d villages: %s", len(ids), ids)
        return len(ids)

    def query(self, text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        with self._lock:
            if self._vectorizer is None or self._matrix is None or not self._ids:
                return []
            q = self._vectorizer.transform([text.lower()])
            scores = cosine_similarity(q, self._matrix)[0]
            ranked = sorted(
                range(len(self._ids)),
                key=lambda i: float(scores[i]),
                reverse=True,
            )[: max(1, top_k)]
            results = []
            for i in ranked:
                results.append({
                    "village_id": self._ids[i],
                    "score": round(float(scores[i]), 4),
                    "metadata": dict(self._meta[i]),
                    "profile_text": self._docs[i],
                })
            return results

    def size(self) -> int:
        with self._lock:
            return len(self._ids)


village_store = VillageVectorStore()


def bootstrap_vector_store(villages: List[Dict[str, Any]]) -> int:
    return village_store.index_villages(villages)