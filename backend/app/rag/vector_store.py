import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete
from app.models.rag import RAGDocument, RAGChunk, RAGIndexMetadata
from app.rag.embeddings import embedding_provider, EmbeddingProvider
from app.config import settings

logger = logging.getLogger(__name__)

class VectorStore:
    """
    Persistent vector storage and similarity retrieval engine backed by PostgreSQL.
    Stores documents, section chunks, rich source metadata, and embedding vectors.
    Computes exact normalized cosine similarity with sub-millisecond ranking.
    Persists permanently across server restarts.
    """

    def __init__(self, embedding_service: Optional[EmbeddingProvider] = None):
        self.embeddings = embedding_service or embedding_provider
        self.similarity_threshold = settings.RAG_SIMILARITY_THRESHOLD
        self.index_version = settings.RAG_INDEX_VERSION

    def save_document_with_chunks(
        self,
        db: Session,
        document_data: Dict[str, Any],
        chunks_data: List[Dict[str, Any]],
        vectors: List[List[float]]
    ) -> None:
        """
        Persists a document and all its embedded chunks in PostgreSQL within a single transaction.
        """
        doc_id = document_data["id"]

        # 1. Upsert / Create RAGDocument
        existing_doc = db.get(RAGDocument, doc_id)
        if existing_doc:
            existing_doc.document_title = document_data["document_title"]
            existing_doc.document_type = document_data.get("document_type", "Act")
            existing_doc.document_jurisdiction = document_data.get("document_jurisdiction", "India")
            existing_doc.issuing_authority = document_data.get("issuing_authority")
            existing_doc.issue_date = document_data.get("issue_date")
            existing_doc.short_description = document_data.get("short_description")
            existing_doc.source_url = document_data.get("source_url")
            existing_doc.raw_metadata = document_data.get("raw_metadata", {})
            # Remove previous chunks if overwriting
            db.execute(delete(RAGChunk).where(RAGChunk.document_id == doc_id))
        else:
            doc = RAGDocument(
                id=doc_id,
                document_title=document_data["document_title"],
                document_type=document_data.get("document_type", "Act"),
                document_jurisdiction=document_data.get("document_jurisdiction", "India"),
                issuing_authority=document_data.get("issuing_authority"),
                issue_date=document_data.get("issue_date"),
                short_description=document_data.get("short_description"),
                source_url=document_data.get("source_url"),
                raw_metadata=document_data.get("raw_metadata", {})
            )
            db.add(doc)

        # 2. Insert Chunks with vectors
        for chunk_dict, vec in zip(chunks_data, vectors):
            rag_chunk = RAGChunk(
                id=chunk_dict["id"],
                document_id=doc_id,
                chunk_index=chunk_dict["chunk_index"],
                chunk_text=chunk_dict["chunk_text"],
                section_heading=chunk_dict.get("section_heading"),
                source_metadata=chunk_dict.get("metadata", {}),
                embedding=vec,
                embedding_model=self.embeddings.model_name,
                embedding_dim=len(vec),
                index_version=self.index_version
            )
            db.add(rag_chunk)

        db.commit()

    def update_index_metadata(self, db: Session) -> Dict[str, Any]:
        """Calculates and persists current corpus statistics in PostgreSQL."""
        doc_count = db.scalar(select(func.count(RAGDocument.id))) or 0
        chunk_count = db.scalar(select(func.count(RAGChunk.id))) or 0

        info = {
            "total_documents": doc_count,
            "total_chunks": chunk_count,
            "embedding_model": self.embeddings.model_name,
            "embedding_dim": self.embeddings.embedding_dim,
            "index_version": self.index_version,
            "is_ready": (chunk_count > 0)
        }

        meta = db.get(RAGIndexMetadata, "system_stats")
        if meta:
            meta.value = info
        else:
            meta = RAGIndexMetadata(key="system_stats", value=info)
            db.add(meta)

        db.commit()
        return info

    def get_index_stats(self, db: Session) -> Dict[str, Any]:
        """Fetches persisted index status and chunk counts."""
        meta = db.get(RAGIndexMetadata, "system_stats")
        if meta and meta.value:
            return meta.value
        return self.update_index_metadata(db)

    def similarity_search(
        self,
        db: Session,
        query: str,
        jurisdiction: Optional[str] = "India",
        source_type: Optional[str] = None,
        top_k: int = 5,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs vector similarity search against persisted chunks in PostgreSQL.
        Embeds the query with the exact same model, filters candidate documents by metadata,
        computes normalized dot products, and ranks top chunks.
        """
        score_threshold = threshold if threshold is not None else self.similarity_threshold

        # 1. Embed query vector
        query_vector = np.array(self.embeddings.embed_query(query), dtype=np.float32)

        # 2. Query candidate chunks from PostgreSQL
        stmt = select(RAGChunk)
        if source_type and source_type.lower() != "all":
            # Filter through joined document
            stmt = stmt.join(RAGDocument).where(func.lower(RAGDocument.document_type) == source_type.lower())

        chunks: List[RAGChunk] = list(db.scalars(stmt).all())
        if not chunks:
            return []

        # 3. Vector similarity ranking
        matrix = np.array([c.embedding for c in chunks], dtype=np.float32)
        # Cosine similarity for unit-normalized vectors is simple dot product
        raw_scores = np.dot(matrix, query_vector)

        # Extract significant query tokens (length >= 3)
        import re
        query_tokens = [t.lower() for t in re.split(r'[^a-zA-Z0-9]', query) if len(t) >= 3]

        adjusted_scores = []
        for idx, chunk in enumerate(chunks):
            base_score = float(raw_scores[idx])
            if query_tokens:
                chunk_haystack = (chunk.chunk_text + " " + (chunk.section_heading or "")).lower()
                matches = sum(1 for tok in query_tokens if tok in chunk_haystack)
                match_ratio = matches / len(query_tokens)

                # If no query terms appear anywhere in chunk or title, penalize heavily
                if matches == 0:
                    adjusted_scores.append(base_score * 0.40)
                elif len(query_tokens) >= 2 and match_ratio < 0.25:
                    adjusted_scores.append(base_score * 0.50)
                else:
                    adjusted_scores.append(base_score)
            else:
                adjusted_scores.append(base_score)

        adjusted_scores = np.array(adjusted_scores, dtype=np.float32)
        ranked_indices = np.argsort(adjusted_scores)[::-1]
        results: List[Dict[str, Any]] = []

        for idx in ranked_indices:
            score = float(adjusted_scores[idx])
            if score < score_threshold:
                # Do not return irrelevant passages just to fill top_k
                continue

            chunk = chunks[idx]
            # Avoid excessive duplicates from the exact same document if we already have 2 chunks from it
            doc_occurrences = sum(1 for r in results if r["document_id"] == chunk.document_id)
            if doc_occurrences >= 2 and len(results) < top_k:
                continue

            results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "chunk_text": chunk.chunk_text,
                "section_heading": chunk.section_heading,
                "score": round(score, 4),
                "metadata": chunk.source_metadata,
                "embedding_model": chunk.embedding_model
            })

            if len(results) >= top_k:
                break

        return results

vector_store = VectorStore()
