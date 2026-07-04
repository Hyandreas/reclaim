FROM python:3.12-slim

WORKDIR /app
COPY . .

EXPOSE 8765
CMD ["python", "backend/server.py", "--host", "0.0.0.0", "--port", "8765"]

