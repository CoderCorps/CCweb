from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.testclient import TestClient

app = FastAPI()

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    return {"username": form_data.username}

client = TestClient(app)
print("Multipart Form:")
print(client.post("/login", data={"username": "a", "password": "b"}, files={"dummy": ("dummy", b"")}).status_code)
