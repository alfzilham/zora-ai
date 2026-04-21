from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "ZORA AI is running"}

@app.get("/health")
async def health2():
    return {"status": "ok"}