# memsearch

Semantic memory search for markdown knowledge bases. Index your markdown files and Claude session logs, then search them using natural language.

Built on [Milvus Lite](https://milvus.io/) (local vector database, zero config) with pluggable embedding providers.

## Installation

```bash
# Core + OpenAI embeddings (recommended)
pip install "memsearch[openai]"

# Or install from source
git clone https://github.com/zc277584121/memsearch.git
cd memsearch
pip install -e ".[openai]"
```

### Other embedding providers

```bash
pip install "memsearch[google]"      # Google Gemini
pip install "memsearch[voyage]"      # Voyage AI
pip install "memsearch[ollama]"      # Ollama (local)
pip install "memsearch[local]"       # sentence-transformers (local, no API key)
pip install "memsearch[all]"         # Everything
```

## Configuration

API keys are read from environment variables — no keys in code.

```bash
# Embedding providers (set the one you use)
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://..."   # optional, for proxies / Azure
export GOOGLE_API_KEY="..."
export VOYAGE_API_KEY="..."

# LLM for flush/summarization (set the one you use)
export ANTHROPIC_API_KEY="..."         # for flush with Anthropic
```

Data is stored locally at `~/.memsearch/` by default (Milvus database + SQLite embedding cache).

## CLI Usage

### Index markdown files

```bash
# Index one or more directories / files
memsearch index ./docs/ ./notes/

# Use a different embedding provider
memsearch index ./docs/ --provider google

# Force re-index everything
memsearch index ./docs/ --force
```

### Search

```bash
memsearch search "how to configure Redis caching"

# Return more results
memsearch search "authentication flow" --top-k 10

# Filter by document type
memsearch search "deployment steps" --doc-type markdown

# JSON output (for piping to other tools)
memsearch search "error handling" --json-output
```

### Watch for changes

```bash
# Auto-index on file changes (Ctrl+C to stop)
memsearch watch ./docs/ ./notes/
```

### Ingest Claude session logs

```bash
memsearch ingest-session ~/.claude/projects/myproject/session.jsonl
```

### Flush (compress memories)

Summarize indexed chunks into a condensed memory using an LLM:

```bash
memsearch flush

# Use a specific LLM
memsearch flush --llm-provider anthropic
memsearch flush --llm-provider gemini

# Only flush chunks from a specific source
memsearch flush --source ./docs/old-notes.md
```

### Manage

```bash
memsearch stats    # Show index statistics
memsearch reset    # Drop all indexed data (with confirmation)
```

## Python API

```python
import asyncio
from memsearch import MemSearch

async def main():
    with MemSearch(
        paths=["./docs/", "./notes/"],
        embedding_provider="openai",       # or "google", "voyage", "ollama", "local"
    ) as ms:
        # Index all markdown files
        n = await ms.index()
        print(f"Indexed {n} chunks")

        # Semantic search
        results = await ms.search("caching strategy", top_k=5)
        for r in results:
            print(f"[{r['score']:.3f}] {r['source']} — {r['heading']}")
            print(f"  {r['content'][:200]}")

        # Index a single file
        await ms.index_file("./docs/new-note.md")

        # Index a Claude session log
        await ms.index_session("~/.claude/projects/myproject/session.jsonl")

        # Flush: compress all memories into a summary
        summary = await ms.flush(llm_provider="openai")
        print(summary)

asyncio.run(main())
```

### Custom Milvus / cache paths

```python
ms = MemSearch(
    paths=["./docs/"],
    milvus_uri="./my_project.db",           # local Milvus Lite file
    cache_path="./my_cache.db",             # SQLite embedding cache
)
```

### Connect to a remote Milvus server

```python
ms = MemSearch(
    paths=["./docs/"],
    milvus_uri="http://localhost:19530",     # remote Milvus
)
```

## Architecture

```
Markdown files ──► Scanner ──► Chunker ──► Embedder ──► Milvus (vectors)
                                              │
                                     SQLite cache (avoids re-embedding)

Query ──► Embedder ──► Milvus search ──► Results

Flush ──► Retrieve chunks ──► LLM summarize ──► Re-index summary
```

| Component | Description |
|-----------|-------------|
| **Scanner** | Recursively finds `.md` / `.markdown` files, skips hidden files |
| **Chunker** | Splits markdown by headings, large sections split at paragraph boundaries |
| **Embeddings** | Pluggable providers: OpenAI, Google, Voyage, Ollama, sentence-transformers |
| **Store** | Milvus Lite for vector storage (local `.db` file, no server needed) |
| **Cache** | SQLite cache keyed by `(content_hash, model)` — unchanged content is never re-embedded |
| **Watcher** | Watchdog-based file monitor for auto-indexing on changes |
| **Session** | Parses Claude JSONL session logs into searchable chunks |
| **Flush** | Compresses chunks into summaries via LLM (OpenAI / Anthropic / Gemini) |

## Embedding Providers

| Provider | Install | Env Var | Default Model |
|----------|---------|---------|---------------|
| OpenAI | `memsearch[openai]` | `OPENAI_API_KEY` | `text-embedding-3-small` |
| Google | `memsearch[google]` | `GOOGLE_API_KEY` | `text-embedding-004` |
| Voyage | `memsearch[voyage]` | `VOYAGE_API_KEY` | `voyage-3-lite` |
| Ollama | `memsearch[ollama]` | `OLLAMA_HOST` (optional) | `nomic-embed-text` |
| Local | `memsearch[local]` | — | `all-MiniLM-L6-v2` |

## Development

```bash
git clone https://github.com/zc277584121/memsearch.git
cd memsearch
uv sync --dev --extra openai
uv run pytest
```

## License

MIT
