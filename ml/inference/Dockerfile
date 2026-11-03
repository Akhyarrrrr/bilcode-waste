FROM python:3.12-slim
WORKDIR /service
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY inference/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt 'uvicorn==0.54.0'
COPY inference/app.py app.py
COPY artifacts/model.onnx artifacts/metadata.json ./
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
