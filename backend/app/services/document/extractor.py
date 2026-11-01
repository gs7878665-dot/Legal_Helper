import io
import re
from typing import Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument


class DocumentExtractor:
    """
    Reusable document text extraction and normalization service.
    Supports PDF and DOCX files with safe fallback and scan detection.
    """

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Cleans and normalizes extracted document text.
        Replaces Windows CRLF with LF, collapses excessive blank lines,
        and trims unwanted whitespace.
        """
        if not text:
            return ""

        # Normalize line breaks
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Replace non-breaking spaces and zero-width spaces
        text = text.replace("\u00a0", " ").replace("\u200b", "")

        # Collapse excessive blank lines (more than 2 consecutive newlines)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Collapse multiple horizontal spaces
        text = re.sub(r"[ \t]+", " ", text)

        return text.strip()

    @classmethod
    def extract_from_pdf(cls, file_bytes: bytes) -> str:
        """
        Extract text from a PDF file using pypdf.
        Raises ValueError if file is corrupted, encrypted, or image-only scanned.
        """
        try:
            stream = io.BytesIO(file_bytes)
            reader = PdfReader(stream)

            if reader.is_encrypted:
                try:
                    # Attempt empty password decrypt
                    reader.decrypt("")
                except Exception:
                    raise ValueError("This PDF document is encrypted with a password. Please provide an unencrypted document.")

            extracted_pages = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_pages.append(page_text.strip())

            full_text = "\n\n".join(extracted_pages)
            normalized = cls.normalize_text(full_text)

            if not normalized or len(normalized) < 15:
                raise ValueError(
                    "This PDF document appears to be an image-only scan or contains no extractable text layer. "
                    "OCR is not currently enabled. Please provide a text-based document or paste the legal text directly."
                )

            return normalized

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to read or parse the PDF document: {str(e)}")

    @classmethod
    def extract_from_docx(cls, file_bytes: bytes) -> str:
        """
        Extract text from a DOCX file using python-docx.
        """
        try:
            stream = io.BytesIO(file_bytes)
            doc = DocxDocument(stream)

            paragraphs = []
            for p in doc.paragraphs:
                if p.text and p.text.strip():
                    paragraphs.append(p.text.strip())

            # Also extract text inside tables
            for table in doc.tables:
                for row in table.rows:
                    row_cells = [c.text.strip() for c in row.cells if c.text.strip()]
                    if row_cells:
                        paragraphs.append(" | ".join(row_cells))

            full_text = "\n\n".join(paragraphs)
            normalized = cls.normalize_text(full_text)

            if not normalized:
                raise ValueError("The provided DOCX document does not contain any readable text.")

            return normalized

        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to read or parse the DOCX document: {str(e)}")

    @classmethod
    def extract_from_txt(cls, file_bytes: bytes) -> str:
        """Extract text from plain text file."""
        try:
            decoded = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                decoded = file_bytes.decode("latin-1")
            except Exception as e:
                raise ValueError(f"Unable to decode text file: {str(e)}")

        normalized = cls.normalize_text(decoded)
        if not normalized:
            raise ValueError("The provided text document is empty.")
        return normalized

    @classmethod
    def extract_text(cls, filename: str, mime_type: str, file_bytes: bytes) -> Tuple[str, int]:
        """
        Dispatches extraction based on file extension and MIME type.
        Returns:
            (extracted_text, word_count)
        """
        lower_name = filename.lower()
        if lower_name.endswith(".pdf") or "pdf" in mime_type:
            text = cls.extract_from_pdf(file_bytes)
        elif lower_name.endswith(".docx") or "wordprocessingml" in mime_type or "officedocument" in mime_type:
            text = cls.extract_from_docx(file_bytes)
        elif lower_name.endswith(".txt") or "text/plain" in mime_type:
            text = cls.extract_from_txt(file_bytes)
        else:
            raise ValueError(f"Unsupported file format '{filename}'. Supported formats are: PDF, DOCX, TXT.")

        words = len(text.split())
        return text, words


document_extractor = DocumentExtractor()
