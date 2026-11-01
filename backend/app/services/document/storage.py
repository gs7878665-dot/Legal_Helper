import os
import uuid
import pathlib
from typing import Optional, BinaryIO
from fastapi import HTTPException, status
from app.config import settings

class LocalStorageAdapter:
    """
    Private local file storage adapter for user documents.
    Enforces tenant scoping, safe generated paths, and path-traversal prevention.
    """
    def __init__(self, base_path: Optional[str] = None):
        if base_path:
            self.base_dir = pathlib.Path(base_path).resolve()
        else:
            # Default to backend/storage/documents
            backend_dir = pathlib.Path(__file__).resolve().parent.parent.parent.parent
            self.base_dir = (backend_dir / settings.DOCUMENTS_STORAGE_PATH).resolve()

        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, storage_key: str) -> pathlib.Path:
        # Prevent any relative directory traversal (e.g. ../../)
        clean_key = pathlib.PurePath(storage_key).as_posix().lstrip("/\\")
        target_path = (self.base_dir / clean_key).resolve()

        if not str(target_path).startswith(str(self.base_dir)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: Invalid storage path traversal detected."
            )
        return target_path

    def save_file(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        filename: str,
        content: bytes
    ) -> str:
        """
        Saves uploaded file bytes into a private user-scoped directory.
        Returns the safe relative storage_key.
        """
        safe_ext = pathlib.Path(filename).suffix.lower()
        if safe_ext not in [".pdf", ".docx", ".txt"]:
            safe_ext = ".bin"

        # Unique server-side generated relative key: user_id/document_id.ext
        storage_key = f"{user_id}/{document_id}{safe_ext}"
        target_path = self._resolve_safe_path(storage_key)

        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, "wb") as f:
            f.write(content)

        return storage_key

    def get_file_bytes(self, storage_key: str) -> bytes:
        """Read bytes of a private document."""
        target_path = self._resolve_safe_path(storage_key)
        if not target_path.exists():
            raise FileNotFoundError(f"Stored file '{storage_key}' not found.")
        with open(target_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_key: str) -> bool:
        """Remove file from private storage."""
        try:
            target_path = self._resolve_safe_path(storage_key)
            if target_path.exists():
                target_path.unlink()
                return True
        except Exception:
            return False
        return False

    def exists(self, storage_key: str) -> bool:
        try:
            target_path = self._resolve_safe_path(storage_key)
            return target_path.exists()
        except Exception:
            return False


document_storage = LocalStorageAdapter()
