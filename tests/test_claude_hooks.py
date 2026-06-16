from __future__ import annotations

import os
import subprocess
from pathlib import Path


def test_claude_hook_memsearch_disable_exits_before_writing_memory(tmp_path: Path) -> None:
    script = Path("plugins/claude-code/hooks/session-start.sh")
    env = {
        **os.environ,
        "MEMSEARCH_DISABLE": "1",
        "CLAUDE_PROJECT_DIR": str(tmp_path),
        "MEMSEARCH_DIR": str(tmp_path / ".memsearch"),
    }

    result = subprocess.run(
        ["bash", str(script)],
        input="{}",
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )

    assert result.stdout.strip() == "{}"
    assert not (tmp_path / ".memsearch").exists()
