import os

import uvicorn

from main import app

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("PP_PORT", "8765")),
        log_config=None,
    )
