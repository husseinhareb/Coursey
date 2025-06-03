# app/routers/activity.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from app.schemas.activity import ActivityLogCreate, ActivityLogDB
from app.crud.activity import create_activity_log, list_activity_logs
from app.services.auth import get_current_active_user
from app.schemas.user import UserDB

router = APIRouter(
    prefix="/activity-logs",
    tags=["activity-logs"],
    dependencies=[Depends(get_current_active_user)]  # on exige l’utilisateur connecté
)

@router.post("/", response_model=ActivityLogDB)
async def api_create_activity_log(
    log_in: ActivityLogCreate,
    current_user: UserDB = Depends(get_current_active_user)
):
    # On pourrait aussi forcer log_in.user_id = current_user.id ici, pour plus de sécurité.
    return await create_activity_log(log_in)

@router.get("/", response_model=List[ActivityLogDB])
async def api_list_activity_logs(
    user_id: Optional[str] = None,
    current_user: UserDB = Depends(get_current_active_user)
):
    # Si on veut limiter strictement aux admins, vérifier ici le rôle de current_user
    return await list_activity_logs(user_id)
