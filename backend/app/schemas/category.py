from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.tool import ToolResponse

class CategoryBase(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    branch_position: Dict[str, Any]
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CategoryWithToolsResponse(CategoryResponse):
    tools: List[ToolResponse] = []

    model_config = ConfigDict(from_attributes=True)
