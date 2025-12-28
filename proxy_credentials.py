from fastapi import FastAPI, Header, HTTPException
import requests
import os

app = FastAPI()

CREDENTIAL_MANAGER_URL = os.getenv('CREDENTIAL_MANAGER_URL', 'http://localhost:8000')

def validate_token(auth_header: str | None) -> str:
    if not auth_header:
        raise HTTPException(status_code=401, detail='missing auth')
    # minimal validation for prototype
    if not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='invalid auth')
    return auth_header.split(' ', 1)[1]

@app.get('/internal/credentials/{name}')
def proxy_secret(name: str, authorization: str | None = Header(None)):
    token = validate_token(authorization)
    # forward token as-is for credential_manager to enforce policy
    resp = requests.get(f"{CREDENTIAL_MANAGER_URL}/secret/{name}", headers={
        'Authorization': f'Bearer {token}'
    }, timeout=10)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()
