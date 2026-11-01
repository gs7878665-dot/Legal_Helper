from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.categories import router as categories_router
from app.api.v1.routes.tools import router as tools_router
from app.api.v1.routes.advisor import router as advisor_router
from app.api.v1.routes.research import router as research_router
from app.api.v1.routes.rag import router as rag_router
from app.api.v1.routes.documents import router as documents_router
from app.api.v1.routes.drafts import router as drafts_router
from app.api.v1.routes.notice_replies import router as notice_replies_router
from app.api.v1.routes.vault import router as vault_router
from app.api.v1.routes.provisions import router as provisions_router
from app.api.v1.routes.lawyer_preparation import router as lawyer_preparation_router
from app.api.v1.routes.legal_aid import router as legal_aid_router
from app.api.v1.routes.scam_detector import router as scam_detector_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(categories_router)
api_v1_router.include_router(tools_router)
api_v1_router.include_router(advisor_router)
api_v1_router.include_router(research_router)
api_v1_router.include_router(rag_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(drafts_router)
api_v1_router.include_router(notice_replies_router)
api_v1_router.include_router(vault_router)
api_v1_router.include_router(provisions_router)
api_v1_router.include_router(lawyer_preparation_router)
api_v1_router.include_router(legal_aid_router)
api_v1_router.include_router(scam_detector_router)




