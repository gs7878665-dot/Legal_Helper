from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.tool import Tool
from app.models.category import Category

class ToolService:
    @staticmethod
    def get_active_tools(
        db: Session,
        category_id: Optional[UUID] = None,
        category_slug: Optional[str] = None
    ) -> List[Tool]:
        stmt = (
            select(Tool)
            .join(Category, Tool.category_id == Category.id)
            .where(Tool.is_active == True, Category.is_active == True)
        )
        if category_id:
            stmt = stmt.where(Tool.category_id == category_id)
        if category_slug:
            stmt = stmt.where(Category.slug == category_slug)
        stmt = stmt.order_by(Tool.sort_order.asc(), Tool.name.asc())
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_tool_by_slug(db: Session, slug: str) -> Optional[Tool]:
        stmt = (
            select(Tool)
            .join(Category, Tool.category_id == Category.id)
            .where(Tool.slug == slug, Tool.is_active == True, Category.is_active == True)
        )
        return db.scalar(stmt)
