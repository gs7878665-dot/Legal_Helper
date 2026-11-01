from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.tool import ToolResponse
from app.services.tool_service import ToolService

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("", response_model=List[ToolResponse])
def get_tools(
    category_id: Optional[UUID] = Query(None, description="Filter tools by category ID"),
    category_slug: Optional[str] = Query(None, description="Filter tools by category slug"),
    db: Session = Depends(get_db)
):
    """Retrieve active tools, optionally filtered by category."""
    return ToolService.get_active_tools(db, category_id=category_id, category_slug=category_slug)

@router.get("/{tool_slug}", response_model=ToolResponse)
def get_tool_by_slug(tool_slug: str, db: Session = Depends(get_db)):
    """Retrieve selected tool metadata by slug."""
    tool = ToolService.get_tool_by_slug(db, tool_slug)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool with slug '{tool_slug}' not found"
        )
    return tool
