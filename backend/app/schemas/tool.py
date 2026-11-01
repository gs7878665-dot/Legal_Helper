from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ToolBase(BaseModel):
    slug: str
    name: str
    description: Optional[str] = None
    route: str
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True

class ToolCreate(ToolBase):
    category_id: UUID

class ToolResponse(ToolBase):
    id: UUID
    category_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
