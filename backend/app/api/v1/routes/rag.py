from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.rag.vector_store import vector_store
from app.config import settings

router = APIRouter(prefix="/rag", tags=["RAG Knowledge Base"])

@router.get("/health", summary="Get RAG vector index health and statistics")
def get_rag_health(db: Session = Depends(get_db)):
    """
    Reports persistent vector index status, chunk counts, embedding model,
    and retriever configuration.
    """
    stats = vector_store.get_index_stats(db)

    is_available = stats.get("total_chunks", 0) > 0

    return {
        "status": "healthy" if is_available else "standby",
        "vector_index_available": is_available,
        "index_version": stats.get("index_version", settings.RAG_INDEX_VERSION),
        "embedding_model": stats.get("embedding_model", settings.EMBEDDING_MODEL),
        "embedding_dim": stats.get("embedding_dim", settings.EMBEDDING_DIM),
        "total_documents": stats.get("total_documents", 0),
        "total_chunks": stats.get("total_chunks", 0),
        "similarity_threshold": settings.RAG_SIMILARITY_THRESHOLD,
        "retriever_configured": True,
        "storage": "PostgreSQL (Persistent)"
    }
