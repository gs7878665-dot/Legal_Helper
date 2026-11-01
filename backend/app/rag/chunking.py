import re
from typing import List, Dict, Any, Optional
from app.config import settings

# Regex patterns for identifying legal structure
SECTION_PATTERN = re.compile(
    r'(?i)(?:^|\n)\s*((?:Section|Sec\.|Article|Art\.|Clause|Rule|Order)\s+\d+[A-Z]?(?:\s*[-–—:]\s*[^\n]+)?)',
    re.MULTILINE
)
NUMBERED_CLAUSE_PATTERN = re.compile(r'(?i)(?:^|\n)\s*(\(\w+\)|\d+\.)\s+', re.MULTILINE)
OCR_NOISE_PATTERN = re.compile(r'==>\s*picture\s*\[\s*\d+\s*x\s*\d+\s*\]\s*intentionally\s*omitted\s*<==', re.IGNORECASE)

def clean_legal_text(text: str) -> str:
    """
    Normalizes legal text while preserving clause numbering, statutory sections,
    and paragraph indentation. Removes OCR noise and unprintable control chars.
    """
    if not text:
        return ""

    # Remove OCR image placeholder noise
    cleaned = OCR_NOISE_PATTERN.sub('', text)

    # Normalize carriage returns
    cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')

    # Remove non-printable control characters except newline and tab
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', cleaned)

    # Normalize excessive vertical whitespace (more than 2 consecutive newlines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)

    # Clean redundant spaces at line ends
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in cleaned.split('\n')]
    return '\n'.join(lines).strip()

def extract_section_heading(text_block: str) -> Optional[str]:
    """Finds the most prominent statutory section or heading in the text block."""
    match = SECTION_PATTERN.search(text_block)
    if match:
        heading = match.group(1).strip()
        # Cap length to 255 chars
        return heading[:250]
    return None

def split_into_semantic_paragraphs(text: str) -> List[str]:
    """Splits document text into paragraphs or section blocks."""
    # Split by double newlines or clear section starts
    blocks = re.split(r'\n\s*\n', text)
    result: List[str] = []
    for b in blocks:
        b_clean = b.strip()
        if b_clean:
            result.append(b_clean)
    return result

def split_large_paragraph(para: str, max_words: int) -> List[str]:
    """Splits a single large paragraph along sentence or clause boundaries."""
    # Split along sentence terminators
    sentences = re.split(r'(?<=[.?!;])\s+(?=[A-Z0-9\(\[])', para)
    parts: List[str] = []
    current_part: List[str] = []
    current_words = 0

    for s in sentences:
        s_words = len(s.split())
        if current_words + s_words > max_words and current_part:
            parts.append(' '.join(current_part))
            current_part = [s]
            current_words = s_words
        else:
            current_part.append(s)
            current_words += s_words

    if current_part:
        parts.append(' '.join(current_part))

    return parts

def chunk_legal_document(
    doc_id: str,
    title: str,
    text: str,
    document_metadata: Optional[Dict[str, Any]] = None,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Splits legal documents into coherent chunks with context headers.
    - Honors statutory section boundaries and paragraph groupings.
    - Preserves sentence integrity.
    - Prepends document title and active section heading for self-contained retrieval.
    """
    target_size = chunk_size or settings.RAG_CHUNK_SIZE
    overlap = chunk_overlap or settings.RAG_CHUNK_OVERLAP

    cleaned = clean_legal_text(text)
    if not cleaned:
        return []

    paragraphs = split_into_semantic_paragraphs(cleaned)
    if not paragraphs:
        return []

    chunks: List[Dict[str, Any]] = []
    current_chunk_paragraphs: List[str] = []
    current_chunk_words = 0
    current_section = "General Provisions"
    chunk_idx = 0

    for para in paragraphs:
        # Check if paragraph introduces a new section heading
        sec_heading = extract_section_heading(para)
        if sec_heading:
            current_section = sec_heading

        para_words = len(para.split())

        # If a single paragraph is larger than target_size, split along sentences
        if para_words > target_size:
            sub_parts = split_large_paragraph(para, target_size)
            for part in sub_parts:
                part_words = len(part.split())
                if current_chunk_words + part_words > target_size and current_chunk_paragraphs:
                    # Finalize current chunk
                    body_text = '\n\n'.join(current_chunk_paragraphs)
                    # Context header ensures independent semantic interpretability
                    chunk_text = f"[{title} | {current_section}]\n{body_text}"

                    chunk_id = f"{doc_id}_c{chunk_idx}"
                    chunks.append({
                        "id": chunk_id,
                        "document_id": doc_id,
                        "chunk_index": chunk_idx,
                        "chunk_text": chunk_text,
                        "section_heading": current_section,
                        "word_count": len(chunk_text.split()),
                        "metadata": {
                            **(document_metadata or {}),
                            "chunk_id": chunk_id,
                            "document_id": doc_id,
                            "document_title": title,
                            "section_heading": current_section,
                            "chunk_index": chunk_idx,
                        }
                    })
                    chunk_idx += 1

                    # Keep overlap words from end
                    words_in_current = body_text.split()
                    overlap_text = ' '.join(words_in_current[-overlap:]) if len(words_in_current) > overlap else ""
                    current_chunk_paragraphs = [overlap_text, part] if overlap_text else [part]
                    current_chunk_words = len(current_chunk_paragraphs[0].split()) + part_words
                else:
                    current_chunk_paragraphs.append(part)
                    current_chunk_words += part_words
            continue

        if current_chunk_words + para_words > target_size and current_chunk_paragraphs:
            body_text = '\n\n'.join(current_chunk_paragraphs)
            chunk_text = f"[{title} | {current_section}]\n{body_text}"
            chunk_id = f"{doc_id}_c{chunk_idx}"

            chunks.append({
                "id": chunk_id,
                "document_id": doc_id,
                "chunk_index": chunk_idx,
                "chunk_text": chunk_text,
                "section_heading": current_section,
                "word_count": len(chunk_text.split()),
                "metadata": {
                    **(document_metadata or {}),
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "document_title": title,
                    "section_heading": current_section,
                    "chunk_index": chunk_idx,
                }
            })
            chunk_idx += 1

            # Build sliding overlap
            words_in_current = body_text.split()
            overlap_text = ' '.join(words_in_current[-overlap:]) if len(words_in_current) > overlap else ""
            current_chunk_paragraphs = [overlap_text, para] if overlap_text else [para]
            current_chunk_words = len(current_chunk_paragraphs[0].split()) + para_words
        else:
            current_chunk_paragraphs.append(para)
            current_chunk_words += para_words

    # Finalize remaining text
    if current_chunk_paragraphs:
        body_text = '\n\n'.join(current_chunk_paragraphs).strip()
        if body_text:
            chunk_text = f"[{title} | {current_section}]\n{body_text}"
            chunk_id = f"{doc_id}_c{chunk_idx}"
            chunks.append({
                "id": chunk_id,
                "document_id": doc_id,
                "chunk_index": chunk_idx,
                "chunk_text": chunk_text,
                "section_heading": current_section,
                "word_count": len(chunk_text.split()),
                "metadata": {
                    **(document_metadata or {}),
                    "chunk_id": chunk_id,
                    "document_id": doc_id,
                    "document_title": title,
                    "section_heading": current_section,
                    "chunk_index": chunk_idx,
                }
            })

    return chunks
