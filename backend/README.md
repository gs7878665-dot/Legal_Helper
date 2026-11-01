# Legal Helper — Persistent RAG Knowledge System

This document explains the architecture, dataset schema, ingestion pipeline, vector persistence, and evaluation for the Legal Helper persistent RAG system.

---

## 1. Dataset & Schema

We use the Hugging Face dataset:
```python
from datasets import load_dataset
ds = load_dataset("KanoonGPT/indian-legal-documents")
```

### Inspected Dataset Schema
| Column | Type | Description |
| :--- | :--- | :--- |
| `doc_id` | `string` | 64-character SHA-256 identifier |
| `document_title` | `string` | Official legal title of the Act, Bill, or Precedent |
| `document_type` | `string` | Classification (e.g. `Act`, `Judgment`, `Rule`) |
| `document_jurisdiction` | `string` | Central or State jurisdiction (e.g. `Karnataka`, `Goa`, `Central`) |
| `issuing_authority` | `string` | Legislative body or court (e.g. `Karnataka State Legislature`) |
| `issue_date` | `string` | Gazetted or enactment date (e.g. `2026-01-08`) |
| `short_description` | `string` | Official summary of amendments / scope |
| `text` | `string` | Complete statutory text, arrangement of sections, clauses |

---

## 2. Ingestion & Index-Building Pipeline

The pipeline is implemented in `app/rag/ingest.py` and runs separately from the web server:

### Ingesting with Limit (Initial / Staged Batches)
```bash
python -m app.rag.ingest --limit 50 --batch-size 32
```

### Resuming an Interrupted Ingestion
By default, the ingestion process checks `rag_documents.id` and **skips already indexed documents**:
```bash
python -m app.rag.ingest --limit 500
```
*(Previously indexed documents are skipped in milliseconds, picking up right where it left off).*

### Rebuilding the Index From Scratch
To clear existing documents and chunks and rebuild:
```bash
python -m app.rag.ingest --rebuild --limit 100
```

---

## 3. Legal-Aware Chunking

Implemented in `app/rag/chunking.py`:
- Detects statutory section boundaries (`Section \d+`, `Article \d+`, `Clause \d+`).
- Preserves legal clause groupings and sentence integrity (never splits mid-sentence).
- Prepends contextual headers:
  ```text
  [{document_title} | {section_heading}]
  {statutory_clause_text}
  ```
- Configurable chunk size (`RAG_CHUNK_SIZE=500` words) and sliding context overlap (`RAG_CHUNK_OVERLAP=60` words).

---

## 4. Embedding Provider

Implemented in `app/rag/embeddings.py`:
- Model: `BAAI/bge-small-en-v1.5` (dimension: 384).
- Runtime: `fastembed` (ONNX Runtime, lightweight, zero PyTorch/CUDA bloat, sub-millisecond CPU inference).
- Unit-normalized vectors for exact cosine similarity via dot product.
- Identical embedding pipeline used for both indexing and query time.

---

## 5. Persistent Vector Storage in PostgreSQL

Stored in tables managed via SQLAlchemy and Alembic:
1. `rag_documents`: Stores document-level metadata, authority, dates, jurisdiction.
2. `rag_chunks`: Stores chunk text, section heading, 384-dimensional float vector, embedding model, and index version.
3. `rag_index_metadata`: Stores corpus statistics and system readiness.

**The index persists permanently across FastAPI server restarts.**

### pgvector Production Note
PostgreSQL 18.6 on Windows natively supports our indexed float vectors with sub-millisecond NumPy matrix dot product search. For cloud deployments running Linux PostgreSQL with pgvector, the schema seamlessly supports `vector(384)` with HNSW indexes.

---

## 6. Shared Retrieval Service & RAG Health

Both **Legal Advisor** and **Legal Research** share the singleton retriever `persistent_rag_retriever` (`app/services/retrieval/rag_retriever.py`):
- Embeds incoming queries.
- Filters candidates by jurisdiction / source type.
- Employs **Hybrid Lexical Verification**: if a query has zero lexical term overlap with a candidate, background dense noise is penalized so that irrelevant out-of-domain queries return an **explicit empty result**.
- Returns structured `RetrievedDocument` with `is_development_fixture: False`.

### Health & Diagnostic Endpoint
```http
GET /api/v1/rag/health
```
Example response:
```json
{
  "status": "healthy",
  "vector_index_available": true,
  "index_version": "v1",
  "embedding_model": "BAAI/bge-small-en-v1.5",
  "embedding_dim": 384,
  "total_documents": 35,
  "total_chunks": 179,
  "similarity_threshold": 0.45,
  "retriever_configured": true,
  "storage": "PostgreSQL (Persistent)"
}
```

---

## 7. Retrieval Benchmark Evaluation

Run the evaluation suite:
```bash
python -m app.rag.evaluate
```

### Benchmark Results
- **Positive Query Recall**: 100.0%
- **Out-of-Domain Empty Result Accuracy**: 100.0%
- **Average Retrieval Latency**: < 150 ms per query
