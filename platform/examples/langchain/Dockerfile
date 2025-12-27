FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY agent.py .

# Make agent.py executable
RUN chmod +x agent.py

# Set default command
ENTRYPOINT ["python", "agent.py"]

# Default to vulnerable mode (can be overridden with --secure)
CMD []
