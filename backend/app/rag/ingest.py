import argparse
import logging
import sys
import time
import hashlib
from typing import Dict, Any, Optional
from datasets import load_dataset
from app.db.session import SessionLocal
from app.models.rag import RAGDocument, RAGChunk, RAGIndexMetadata
from app.rag.chunking import chunk_legal_document
from app.rag.embeddings import embedding_provider
from app.rag.vector_store import vector_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rag_ingest")

DATASET_NAME = "KanoonGPT/indian-legal-documents"

def generate_stable_doc_id(item: Dict[str, Any]) -> str:
    """Returns stable document ID from dataset doc_id or SHA-256 hash of title+text."""
    raw_id = item.get("doc_id")
    if raw_id and str(raw_id).strip():
        return str(raw_id).strip()

    title = item.get("document_title", "")
    text = item.get("text", "")
    return hashlib.sha256(f"{title}_{text[:200]}".encode("utf-8")).hexdigest()

def ingest_corpus(
    limit: Optional[int] = None,
    batch_size: int = 32,
    rebuild: bool = False,
    resume: bool = True
) -> Dict[str, Any]:
    """
    Main ingestion pipeline:
    1. Connects to PostgreSQL.
    2. Streams dataset from Hugging Face.
    3. Normalizes legal records and splits into legal-aware chunks.
    4. Generates batch embeddings with fastembed.
    5. Persists documents, chunks, and embeddings to PostgreSQL.
    6. Tracks progress, skips duplicates, and records system statistics.
    """
    start_time = time.time()
    logger.info(f"Starting legal corpus ingestion from '{DATASET_NAME}'...")
    logger.info(f"Settings: limit={limit}, batch_size={batch_size}, rebuild={rebuild}, resume={resume}")

    db = SessionLocal()

    try:
        if rebuild:
            logger.warning("Rebuild requested. Clearing existing RAG documents and chunks...")
            db.query(RAGChunk).delete()
            db.query(RAGDocument).delete()
            db.commit()
            logger.info("Existing index cleared.")

        # Load existing document IDs to enable fast resuming
        existing_doc_ids = set()
        if resume and not rebuild:
            rows = db.query(RAGDocument.id).all()
            existing_doc_ids = {r[0] for r in rows}
            logger.info(f"Resume active: Found {len(existing_doc_ids)} already indexed documents in PostgreSQL.")

        logger.info(f"Connecting to Hugging Face dataset stream for '{DATASET_NAME}'...")
        ds_stream = load_dataset(DATASET_NAME, split="train", streaming=True)

        processed_count = 0
        indexed_count = 0
        skipped_count = 0
        failed_count = 0
        total_chunks_created = 0

        for item in ds_stream:
            if limit and processed_count >= limit:
                logger.info(f"Reached specified limit of {limit} documents.")
                break

            processed_count += 1
            doc_id = generate_stable_doc_id(item)

            # Skip already ingested documents
            if doc_id in existing_doc_ids:
                skipped_count += 1
                if skipped_count % 50 == 0:
                    logger.info(f"Skipped {skipped_count} already indexed documents.")
                continue

            title = item.get("document_title") or "Untitled Legal Document"
            doc_type = item.get("document_type") or "Act"
            jurisdiction = item.get("document_jurisdiction") or "India"
            authority = item.get("issuing_authority")
            issue_date = item.get("issue_date")
            short_desc = item.get("short_description")
            text = item.get("text") or ""

            # Validate text
            if len(text.strip()) < 50:
                logger.warning(f"Skipping document '{doc_id}' due to insufficient text content.")
                failed_count += 1
                continue

            try:
                # 1. Legal-Aware Chunking
                doc_metadata = {
                    "doc_id": doc_id,
                    "title": title,
                    "document_type": doc_type,
                    "jurisdiction": jurisdiction,
                    "issuing_authority": authority,
                    "issue_date": str(issue_date) if issue_date else None,
                    "short_description": short_desc,
                    "source": "KanoonGPT/indian-legal-documents"
                }

                chunks = chunk_legal_document(
                    doc_id=doc_id,
                    title=title,
                    text=text,
                    document_metadata=doc_metadata
                )

                if not chunks:
                    logger.warning(f"No chunks produced for document '{title}' ({doc_id}).")
                    failed_count += 1
                    continue

                # 2. Batch Embedding Generation
                chunk_texts = [c["chunk_text"] for c in chunks]
                vectors = embedding_provider.embed_texts(chunk_texts, batch_size=batch_size)

                # 3. Persist to PostgreSQL
                doc_record = {
                    "id": doc_id,
                    "document_title": title,
                    "document_type": doc_type,
                    "document_jurisdiction": jurisdiction,
                    "issuing_authority": authority,
                    "issue_date": str(issue_date) if issue_date else None,
                    "short_description": short_desc,
                    "source_url": None,
                    "raw_metadata": doc_metadata
                }

                vector_store.save_document_with_chunks(
                    db=db,
                    document_data=doc_record,
                    chunks_data=chunks,
                    vectors=vectors
                )

                existing_doc_ids.add(doc_id)
                indexed_count += 1
                total_chunks_created += len(chunks)

                if indexed_count % 10 == 0 or indexed_count == 1:
                    logger.info(
                        f"Indexed {indexed_count} docs ({total_chunks_created} chunks). "
                        f"Latest: '{title[:45]}...' [{doc_type}]"
                    )

            except Exception as e:
                logger.error(f"Failed to process document '{doc_id}': {e}")
                failed_count += 1

        # Finalize and persist system stats in PostgreSQL
        stats = vector_store.update_index_metadata(db)
        elapsed = time.time() - start_time

        logger.info("=" * 60)
        logger.info(f"Ingestion Completed in {elapsed:.2f} seconds.")
        logger.info(f"Processed: {processed_count}")
        logger.info(f"Newly Indexed: {indexed_count}")
        logger.info(f"Skipped (Resume): {skipped_count}")
        logger.info(f"Failed: {failed_count}")
        logger.info(f"Total Chunks in DB: {stats['total_chunks']}")
        logger.info(f"Total Documents in DB: {stats['total_documents']}")
        logger.info("=" * 60)

        return {
            "processed": processed_count,
            "indexed": indexed_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "total_chunks": stats["total_chunks"],
            "total_documents": stats["total_documents"],
            "elapsed_seconds": round(elapsed, 2)
        }

    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Legal Helper RAG Ingestion Pipeline")
    parser.add_argument("--limit", type=int, default=50, help="Maximum number of documents to process (0 for unlimited)")
    parser.add_argument("--batch-size", type=int, default=32, help="Embedding batch size")
    parser.add_argument("--rebuild", action="store_true", help="Clear and rebuild the entire index")
    parser.add_argument("--no-resume", action="store_true", help="Do not skip previously indexed documents")

    args = parser.parse_args()
    limit = None if args.limit <= 0 else args.limit

    ingest_corpus(
        limit=limit,
        batch_size=args.batch_size,
        rebuild=args.rebuild,
        resume=(not args.no_resume)
    )

if __name__ == "__main__":
    main()
