# ParkSmart OCR Service

FastAPI service for recognizing license plates from uploaded images.

Use Python 3.10 or 3.11. EasyOCR depends on PyTorch, and Python 3.14 is not a good target for this stack yet.

## Run

```powershell
cd ocr-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Then restart the Spring Boot backend with:

```powershell
$env:OCR_ENGINE_URL="http://localhost:8000/recognize"
cd ..\parking-backend
.\mvnw.cmd spring-boot:run
```

Without `OCR_ENGINE_URL`, the backend returns a clear OCR engine unavailable error. It no longer returns a fake plate.
