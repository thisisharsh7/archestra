# Archestra + LangChain Example

This example demonstrates prompt injection vulnerabilities in LangChain agents and how Archestra Platform protects against them.

Documentation: https://archestra.ai/docs/platform-langchain-example

## Overview

This agent has access to:
1. GitHub issues (external data)
2. Email sending capability (external communication)

GitHub issue #669 contains a hidden prompt injection that attempts to make the agent exfiltrate sensitive data via email. This demonstrates the "lethal trifecta" vulnerability.

## Prerequisites

- Python 3.9+
- Docker (for Archestra Platform)
- API key for OpenAI, Anthropic, or Gemini

## Quick Start

### 1. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API key
```

Required:
```bash
LLM_PROVIDER=anthropic  # or: openai, gemini
ANTHROPIC_API_KEY=sk-ant-...
```

Optional:
```bash
GITHUB_TOKEN=ghp_...  # For higher rate limits
MODEL_NAME=claude-3-5-sonnet-latest  # Override default
```

### 3. Run Vulnerable Mode

```bash
python agent.py
```

The agent will:
- Fetch GitHub issue #669
- Read hidden malicious instructions
- Attempt to send sensitive data via email

### 4. Run Protected Mode

Start Archestra:
```bash
docker run -p 9000:9000 -p 3000:3000 archestra/platform
```

Run agent with protection:
```bash
python agent.py --secure
```

Archestra will:
- Mark GitHub response as untrusted
- Block the send_email tool call
- Prevent data exfiltration

## Integration

To protect your own LangChain agents, point the LLM to Archestra's proxy:

### OpenAI

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url="http://localhost:9000/v1/openai",
)
```

### Anthropic

```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-sonnet-4-5-20250929",
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    base_url="http://localhost:9000/v1/anthropic",
)
```

### Gemini

```python
from langchain_google_genai import ChatGoogleGenerativeAI

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    client_options={"api_endpoint": "http://localhost:9000/v1/gemini/v1beta"},
)
```

### Using Specific Profiles

Include profile ID in URL:
```python
base_url="http://localhost:9000/v1/openai/{profile-id}"
```

Manage profiles at: http://localhost:3000/profiles

## How It Works

### Without Archestra

```
User → Agent → GitHub (malicious issue) → Agent reads injection →
Agent sends email with sensitive data
```

### With Archestra

```
User → Agent → Archestra → GitHub (malicious issue) →
Archestra marks as UNTRUSTED → Agent attempts send_email →
Archestra BLOCKS tool call
```

## Observability

View logs at: http://localhost:3000/logs/llm-proxy

See:
- Complete conversation flow
- Tool calls and their arguments
- Which responses were marked untrusted
- Which tool calls were blocked and why

## Configuring Policies

### Tool Invocation Policies

Control tools when context is untrusted:

1. Go to http://localhost:3000/tools
2. Find `send_email`
3. Add policy to block certain recipients

### Trusted Data Policies

Define which data sources are trusted:

1. Find `get_github_issue` tool
2. Add policy: trust issues from your org's repos
3. Agent keeps full functionality with trusted sources

Example: Trust issues from `github.com/myorg/*` repositories while blocking others.

## Docker

```bash
# Build
docker build -t langchain-example .

# Run vulnerable
docker run --env-file .env langchain-example

# Run secure (requires Archestra)
docker run --env-file .env --network host langchain-example --secure
```

## Troubleshooting

### Cannot connect to Archestra

```bash
# Check Archestra is running
curl http://localhost:9000/health

# Start Archestra
docker run -p 9000:9000 -p 3000:3000 archestra/platform
```

### API key not set

Create `.env` file (not `.env.example`) with your API key.

### Import errors

Make sure virtual environment is activated:
```bash
source venv/bin/activate
```

## Learn More

- [Archestra Documentation](https://archestra.ai/docs)
- [Lethal Trifecta Explained](https://archestra.ai/docs/platform-lethal-trifecta)
- [Dynamic Tools Feature](https://archestra.ai/docs/platform-dynamic-tools)
- [LangChain Documentation](https://python.langchain.com/docs/)
