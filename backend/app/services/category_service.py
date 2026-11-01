from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from app.models.category import Category
from app.models.tool import Tool

class CategoryService:
    @staticmethod
    def get_active_categories(db: Session) -> List[Category]:
        stmt = (
            select(Category)
            .options(
                selectinload(Category.tools.and_(Tool.is_active == True))
            )
            .where(Category.is_active == True)
            .order_by(Category.sort_order.asc(), Category.name.asc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_category_by_slug(db: Session, slug: str) -> Optional[Category]:
        stmt = (
            select(Category)
            .options(
                selectinload(Category.tools.and_(Tool.is_active == True))
            )
            .where(Category.slug == slug, Category.is_active == True)
        )
        return db.scalar(stmt)
