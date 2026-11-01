from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.category import CategoryResponse, CategoryWithToolsResponse
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryWithToolsResponse])
def get_categories(db: Session = Depends(get_db)):
    """Retrieve all active categories in intended display order."""
    return CategoryService.get_active_categories(db)

@router.get("/{category_slug}", response_model=CategoryWithToolsResponse)
def get_category_by_slug(category_slug: str, db: Session = Depends(get_db)):
    """Retrieve one category and its active tools by slug."""
    category = CategoryService.get_category_by_slug(db, category_slug)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with slug '{category_slug}' not found"
        )
    return category
