# File: app/routers/activity.py

from fastapi import APIRouter, Depends
from typing import List, Optional
from app.schemas.activity import ActivityLogCreate, ActivityLogDB
from app.crud.activity import create_activity_log, list_activity_logs
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

router = APIRouter(
    prefix="/activity-logs",
    tags=["activity-logs"],
    dependencies=[Depends(get_current_active_user)]  # sécuriser l’accès
)

@router.post("/", response_model=ActivityLogDB)
async def api_create_activity_log(
    log_in: ActivityLogCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # On force l’ID de l’utilisateur authentifié,
    # même si le client envoie un user_id différent ou vide.
    log_in.user_id = current_user.id
    return await create_activity_log(log_in)

@router.get("/", response_model=List[ActivityLogDB])
async def api_list_activity_logs(
    user_id: Optional[str] = None,
    current_user: UserDB = Depends(get_current_active_user)
):
    # On pourrait ajouter une vérification sur le rôle pour n’autoriser que l’admin.
    return await list_activity_logs(user_id)
