from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:  # pragma: no cover - optional dependency at runtime
    AsyncIOMotorClient = None


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'app')
use_in_memory = os.environ.get('USE_IN_MEMORY_DB', 'false').lower() == 'true'
client = None
db = None
status_checks_store = []
leaderboard_store = []

if not use_in_memory and mongo_url and AsyncIOMotorClient:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
else:
    use_in_memory = True

app = FastAPI()
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    mode: str
    rounds: int
    money: int
    properties_count: int
    correct_answers: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaderboardCreate(BaseModel):
    name: str
    mode: str
    rounds: int
    money: int
    properties_count: int
    correct_answers: int


@api_router.get("/")
async def root():
    return {"message": "Monopoli Merdeka API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    if use_in_memory:
        status_checks_store.append(doc)
    else:
        await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if use_in_memory:
        rows = list(status_checks_store)
    else:
        rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


@api_router.post("/leaderboard", response_model=LeaderboardEntry)
async def add_leaderboard(entry: LeaderboardCreate):
    obj = LeaderboardEntry(**entry.model_dump())
    doc = obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    if use_in_memory:
        leaderboard_store.append(doc)
    else:
        await db.leaderboard.insert_one(doc)
    return obj


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard():
    if use_in_memory:
        rows = sorted(leaderboard_store, key=lambda r: r.get("timestamp", ""), reverse=True)[:50]
    else:
        rows = await db.leaderboard.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
