import os

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from starlette import status
from starlette.responses import HTMLResponse
from starlette.staticfiles import StaticFiles

from logbless.config import PATH, LOG_FILENAME, LOGIN, PASSWORD, TITLE

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

static_path = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")
security = HTTPBasic()


def authenticate(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username == LOGIN and credentials.password == PASSWORD:
        return True
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Basic"},
    )


def get_logs():
    with open(LOG_FILENAME, "r") as log_file:
        return log_file.read()


@app.get("/update")
async def update_logs(authenticated: bool = Depends(authenticate)):
    if not authenticated:
        return ""

    return get_logs()


@app.get(PATH, response_class=HTMLResponse, include_in_schema=False)
async def logs_page(authenticated: bool = Depends(authenticate)):
    if not authenticated:
        return {}

    log_data = get_logs()

    with open(f"{static_path}/log_viewer.html") as f:
        return f.read().format(log_data=log_data, title=TITLE)
