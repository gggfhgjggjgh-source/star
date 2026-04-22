from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Teacher password (configurable via env, defaults to "yasser")
TEACHER_PASSWORD = os.environ.get('TEACHER_PASSWORD', 'yasser')

app = FastAPI(title="لوحة الدراسات API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    name: str
    stars: int = 0
    negatives: int = 0
    balance: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def _to_student(doc: dict) -> Student:
    stars = int(doc.get("stars", 0))
    negatives = int(doc.get("negatives", 0))
    return Student(
        code=doc["code"],
        name=doc["name"],
        stars=stars,
        negatives=negatives,
        balance=stars - negatives,
        created_at=doc.get("created_at", datetime.now(timezone.utc).isoformat()),
    )


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "لوحة الدراسات API"}


class TeacherLogin(BaseModel):
    password: str


@api_router.post("/teacher/login")
async def teacher_login(payload: TeacherLogin):
    if payload.password != TEACHER_PASSWORD:
        raise HTTPException(status_code=401, detail="كلمة السر غير صحيحة")
    return {"ok": True}


@api_router.post("/students", response_model=Student)
async def add_student(payload: StudentCreate):
    name = payload.name.strip()
    code = await _generate_unique_code()

    doc = {
        "code": code,
        "name": name,
        "stars": 0,
        "negatives": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.students.insert_one(doc)
    doc.pop("_id", None)
    return _to_student(doc)


async def _generate_unique_code() -> str:
    """Generate a unique 9-digit random code that doesn't already exist."""
    for _ in range(25):
        code = str(random.randint(100_000_000, 999_999_999))
        existing = await db.students.find_one({"code": code}, {"_id": 1})
        if not existing:
            return code
    raise HTTPException(status_code=500, detail="تعذر توليد كود فريد، حاول مرة أخرى")


@api_router.get("/students", response_model=List[Student])
async def list_students():
    docs = await db.students.find({}, {"_id": 0}).to_list(10000)
    students = [_to_student(d) for d in docs]
    students.sort(key=lambda s: (-s.balance, s.name))
    return students


@api_router.get("/students/{code}", response_model=Student)
async def get_student(code: str):
    doc = await db.students.find_one({"code": code.strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return _to_student(doc)


@api_router.post("/students/{code}/star", response_model=Student)
async def add_star(code: str, count: int = 1):
    if count < 1:
        raise HTTPException(status_code=400, detail="العدد يجب أن يكون 1 أو أكثر")
    if count > 1000:
        raise HTTPException(status_code=400, detail="العدد كبير جداً")
    doc = await db.students.find_one_and_update(
        {"code": code.strip()},
        {"$inc": {"stars": count}},
        return_document=True,
        projection={"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return _to_student(doc)


@api_router.post("/students/{code}/negative", response_model=Student)
async def add_negative(code: str, count: int = 1):
    if count < 1:
        raise HTTPException(status_code=400, detail="العدد يجب أن يكون 1 أو أكثر")
    if count > 1000:
        raise HTTPException(status_code=400, detail="العدد كبير جداً")
    doc = await db.students.find_one_and_update(
        {"code": code.strip()},
        {"$inc": {"negatives": count}},
        return_document=True,
        projection={"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return _to_student(doc)


@api_router.post("/students/{code}/star/remove", response_model=Student)
async def remove_star(code: str):
    doc = await db.students.find_one({"code": code.strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    new_val = max(0, int(doc.get("stars", 0)) - 1)
    updated = await db.students.find_one_and_update(
        {"code": code.strip()},
        {"$set": {"stars": new_val}},
        return_document=True,
        projection={"_id": 0},
    )
    return _to_student(updated)


@api_router.post("/students/{code}/negative/remove", response_model=Student)
async def remove_negative(code: str):
    doc = await db.students.find_one({"code": code.strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    new_val = max(0, int(doc.get("negatives", 0)) - 1)
    updated = await db.students.find_one_and_update(
        {"code": code.strip()},
        {"$set": {"negatives": new_val}},
        return_document=True,
        projection={"_id": 0},
    )
    return _to_student(updated)


@api_router.delete("/students/{code}")
async def delete_student(code: str):
    result = await db.students.delete_one({"code": code.strip()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
