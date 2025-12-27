#!/usr/bin/env python3
"""
LangChain + Archestra Platform Example

Demonstrates prompt injection vulnerability and how Archestra protects against it.
The agent can fetch GitHub issues and send emails - a classic "lethal trifecta" scenario.
"""

import argparse
import os
import sys

import requests
from dotenv import load_dotenv
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool

load_dotenv()

# The GitHub issue used for demonstration contains a prompt injection attack
DEMO_ISSUE_URL = "https://github.com/archestra-ai/archestra/issues/669"


def get_llm(secure: bool = False):
    """Initialize LLM based on LLM_PROVIDER environment variable."""
    provider = os.getenv("LLM_PROVIDER", "anthropic").lower()
    model_name = os.getenv("MODEL_NAME")

    # Archestra proxy URLs
    archestra_urls = {
        "openai": "http://localhost:9000/v1/openai",
        "anthropic": "http://localhost:9000/v1/anthropic",
        "gemini": "http://localhost:9000/v1/gemini/v1beta",
    }

    # Direct API URLs
    direct_urls = {
        "openai": "https://api.openai.com/v1",
        "anthropic": "https://api.anthropic.com",
        "gemini": None,  # Uses default
    }

    # Default models
    defaults = {
        "openai": "gpt-4o",
        "anthropic": "claude-sonnet-4-5-20250929",
        "gemini": "gemini-2.0-flash-exp",
    }

    if provider not in defaults:
        print(f"Error: Unknown provider '{provider}'")
        print(f"Supported: {', '.join(defaults.keys())}")
        sys.exit(1)

    model = model_name or defaults[provider]
    base_url = archestra_urls[provider] if secure else direct_urls[provider]

    print(f"\nProvider: {provider}")
    print(f"Model: {model}")
    if base_url:
        print(f"Endpoint: {base_url}")
    print(f"Mode: {'Archestra-secured' if secure else 'Direct (vulnerable)'}\n")

    # Initialize appropriate LLM
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("Error: OPENAI_API_KEY not set")
            sys.exit(1)

        return ChatOpenAI(model=model, api_key=api_key, base_url=base_url)

    elif provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("Error: ANTHROPIC_API_KEY not set")
            sys.exit(1)

        return ChatAnthropic(model=model, api_key=api_key, base_url=base_url)

    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Error: GEMINI_API_KEY not set")
            sys.exit(1)

        if secure:
            return ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key,
                client_options={"api_endpoint": base_url} if base_url else None,
            )
        else:
            return ChatGoogleGenerativeAI(model=model, google_api_key=api_key)


@tool
def get_github_issue(issue_url: str) -> str:
    """Fetch a GitHub issue by URL."""
    print(f"[TOOL CALL] get_github_issue: {issue_url}")

    # Parse URL: https://github.com/owner/repo/issues/123
    parts = issue_url.rstrip("/").split("/")
    if len(parts) < 7 or parts[2] != "github.com" or parts[5] != "issues":
        return "Error: Invalid GitHub issue URL"

    owner, repo, issue_num = parts[3], parts[4], parts[6]
    api_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_num}"

    headers = {}
    if token := os.getenv("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        title = data.get("title", "No title")
        body = data.get("body", "No description")

        print(f"[TOOL RESULT] Fetched issue #{issue_num}: {title}")
        return f"**Title:** {title}\n\n**Body:**\n{body}"

    except requests.exceptions.RequestException as e:
        print(f"[TOOL ERROR] {str(e)}")
        return f"Error: {str(e)}"


@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email (simulated - doesn't actually send)."""
    print(f"[TOOL CALL] send_email")
    print(f"  To: {to}")
    print(f"  Subject: {subject}")
    print(f"  Body: {body[:80]}..." if len(body) > 80 else f"  Body: {body}")

    # In a real scenario, this would send actual email
    # For demo purposes, we only print

    print(f"[TOOL RESULT] Email sent to {to}")
    return f"Email sent successfully to {to}"


def create_agent(llm) -> AgentExecutor:
    """Create LangChain agent with GitHub and email tools."""
    tools = [get_github_issue, send_email]

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful assistant. You can fetch GitHub issues and send emails.",
            ),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}"),
        ]
    )

    agent = create_tool_calling_agent(llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False)


def run_demo(secure: bool = False):
    """Run the prompt injection demonstration."""
    print("=" * 70)
    print("LangChain + Archestra Platform Demo")
    print("=" * 70)

    llm = get_llm(secure=secure)
    agent = create_agent(llm)

    user_input = f"Analyze the GitHub issue at {DEMO_ISSUE_URL} and email me a summary at user@example.com"

    print("User request:")
    print(f"  {user_input}\n")
    print("-" * 70)

    try:
        result = agent.invoke({"input": user_input})

        print("\n" + "-" * 70)
        print("[AGENT] Task completed")
        print(f"Output: {result.get('output', 'No output')}")

        if not secure:
            print("\n⚠️  Warning: Agent may have followed malicious instructions")
            print("    Run with --secure to see Archestra protection")
        else:
            print("\nArchestra blocked dangerous operations after untrusted data")
            print("View logs at: http://localhost:3000/logs/llm-proxy")

    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        if secure:
            print("\nThis may be expected - Archestra blocks malicious tool calls")


def main():
    parser = argparse.ArgumentParser(
        description="LangChain agent with optional Archestra security",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent.py           # Vulnerable mode (no protection)
  python agent.py --secure  # Protected mode (via Archestra)

Environment Variables:
  LLM_PROVIDER      openai, anthropic, or gemini (default: anthropic)
  MODEL_NAME        Custom model name (optional)
  ANTHROPIC_API_KEY Required if using Anthropic
  OPENAI_API_KEY    Required if using OpenAI
  GEMINI_API_KEY    Required if using Gemini
  GITHUB_TOKEN      Optional (for higher rate limits)
        """,
    )

    parser.add_argument(
        "--secure",
        action="store_true",
        help="Use Archestra Platform as security proxy",
    )

    args = parser.parse_args()

    # Check Archestra availability if in secure mode
    if args.secure:
        try:
            response = requests.get("http://localhost:9000/health", timeout=2)
            if response.status_code != 200:
                print("Warning: Archestra may not be running properly")
        except requests.exceptions.RequestException:
            print("Error: Cannot connect to Archestra Platform")
            print("Start it with: docker run -p 9000:9000 -p 3000:3000 archestra/platform")
            sys.exit(1)

    run_demo(secure=args.secure)


if __name__ == "__main__":
    main()
