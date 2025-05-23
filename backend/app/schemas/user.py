from pydantic import BaseModel, EmailStr

class UserIn(BaseModel):
    email: EmailStr
    password: str

class UserDB(UserIn):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
