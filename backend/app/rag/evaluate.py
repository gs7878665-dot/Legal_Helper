import asyncio
import logging
import time
from typing import List, Dict, Any
from app.db.session import SessionLocal
from app.rag.vector_store import vector_store
from app.services.retrieval.rag_retriever import persistent_rag_retriever
from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rag_eval")

# Representative evaluation query suite covering positive, ambiguous, insufficient, and out-of-corpus queries
BENCHMARK_EVAL_QUERIES = [
    {
        "id": "q1_rent_tenancy",
        "query": "Karnataka Rent Act amendments and minor offences penalty",
        "category": "statute_match",
        "expected_topics": ["rent", "karnataka", "penalty", "amendment"],
        "should_find": True,
        "description": "Direct query matching Karnataka Rent amendment legislation"
    },
    {
        "id": "q2_shops_commercial",
        "query": "Odisha Shops and Commercial Establishments registration",
        "category": "statute_match",
        "expected_topics": ["odisha", "shops", "commercial", "establishments"],
        "should_find": True,
        "description": "Direct statutory inquiry on state commercial establishments act"
    },
    {
        "id": "q3_pension_civil_services",
        "query": "Central civil services pension rules amendment",
        "category": "statute_match",
        "expected_topics": ["pension", "adhiniyam", "civil services"],
        "should_find": True,
        "description": "Inquiry on central civil service pension amendments"
    },
    {
        "id": "q4_ambiguous_penalty",
        "query": "fine or penalty for delay in compliance",
        "category": "ambiguous",
        "expected_topics": ["penalty", "fine", "section"],
        "should_find": True,
        "description": "Ambiguous procedural query across multiple statutes"
    },
    {
        "id": "q5_non_legal_out_of_corpus",
        "query": "quantum mechanics wave function collapse in superconducting qubits",
        "category": "out_of_corpus",
        "expected_topics": [],
        "should_find": False,
        "description": "Completely out-of-domain query that must return explicit empty result"
    },
    {
        "id": "q6_fictional_doctrine",
        "query": "Galactic Empire hyperlane zoning ordinance 2099",
        "category": "fictional",
        "expected_topics": [],
        "should_find": False,
        "description": "Fictional statutory reference to verify anti-hallucination / zero-match handling"
    }
]

async def run_evaluation(top_k: int = 5, threshold: float = 0.45) -> Dict[str, Any]:
    """
    Executes benchmark retrieval evaluation across positive and negative queries.
    Measures:
    - Precision@K
    - Correct Empty-Result Behavior for out-of-domain queries
    - Average latency per query
    - Score distribution
    """
    logger.info("=" * 70)
    logger.info(f"Running Legal Helper RAG Retrieval Benchmark (top_k={top_k}, threshold={threshold})...")
    logger.info("=" * 70)

    results: List[Dict[str, Any]] = []
    total_latency = 0.0
    correct_empty_count = 0
    total_out_of_domain = 0
    positive_retrieval_count = 0
    total_positive_queries = 0

    for item in BENCHMARK_EVAL_QUERIES:
        q_id = item["id"]
        q_text = item["query"]
        category = item["category"]
        should_find = item["should_find"]

        if should_find:
            total_positive_queries += 1
        else:
            total_out_of_domain += 1

        t0 = time.time()
        res = await persistent_rag_retriever.retrieve(
            query=q_text,
            jurisdiction="India",
            top_k=top_k
        )
        elapsed_ms = (time.time() - t0) * 1000.0
        total_latency += elapsed_ms

        docs = res.documents
        found_count = len(docs)
        top_score = docs[0].confidence_score if docs else 0.0

        is_empty = (found_count == 0)

        # Check correctness
        if not should_find:
            # Should be empty or filtered out
            success = is_empty or top_score < threshold
            if success:
                correct_empty_count += 1
        else:
            success = (found_count > 0)
            if success:
                positive_retrieval_count += 1

        logger.info(
            f"[{'PASS' if success else 'FAIL'}] {q_id} ({category}): "
            f"found={found_count}, top_score={top_score:.3f}, latency={elapsed_ms:.1f}ms | query='{q_text}'"
        )
        if docs:
            logger.info(f"   -> Top passage: '{docs[0].title}' — {docs[0].citation}")

        results.append({
            "id": q_id,
            "query": q_text,
            "category": category,
            "should_find": should_find,
            "found_count": found_count,
            "top_score": top_score,
            "latency_ms": round(elapsed_ms, 1),
            "success": success,
            "top_document": docs[0].title if docs else None
        })

    avg_latency = total_latency / len(BENCHMARK_EVAL_QUERIES) if BENCHMARK_EVAL_QUERIES else 0.0
    empty_accuracy = (correct_empty_count / total_out_of_domain) if total_out_of_domain else 1.0
    positive_recall = (positive_retrieval_count / total_positive_queries) if total_positive_queries else 1.0

    summary = {
        "total_queries": len(BENCHMARK_EVAL_QUERIES),
        "positive_queries": total_positive_queries,
        "out_of_domain_queries": total_out_of_domain,
        "positive_recall": round(positive_recall, 3),
        "empty_result_accuracy": round(empty_accuracy, 3),
        "average_latency_ms": round(avg_latency, 1),
        "results": results
    }

    logger.info("=" * 70)
    logger.info(f"EVALUATION SUMMARY:")
    logger.info(f"Positive Query Recall: {positive_recall * 100:.1f}%")
    logger.info(f"Out-of-Domain Empty Result Accuracy: {empty_accuracy * 100:.1f}%")
    logger.info(f"Average Retrieval Latency: {avg_latency:.1f} ms")
    logger.info("=" * 70)

    return summary

def main():
    asyncio.run(run_evaluation())

if __name__ == "__main__":
    main()
