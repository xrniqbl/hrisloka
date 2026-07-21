#!/usr/bin/env python3
"""Safely fix simple fetchData mount-only exhaustive-deps patterns."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Simple admin/public pages: convert mount effect + wrap fetch* in useCallback
TARGETS = [
    "src/pages/AICapability.jsx",
    "src/pages/AnalyticsReportBuilder.jsx",
    "src/pages/AuditTrail.jsx",
    "src/pages/BranchManagement.jsx",
    "src/pages/CandidatePipeline.jsx",
    "src/pages/Departments.jsx",
    "src/pages/JobPosting.jsx",
    "src/pages/LoanManagement.jsx",
    "src/pages/OnboardingChecklist.jsx",
    "src/pages/OrgChart.jsx",
    "src/pages/TrainingManagement.jsx",
    "src/pages/ContractManagement.jsx",
    "src/pages/Employees.jsx",
    "src/pages/ContractEditor.jsx",
    "src/pages/founder/FounderAnalytics.jsx",
]


def ensure_usecallback_import(text: str) -> str:
    m = re.search(r"import\s*\{([^}]+)\}\s*from\s*['\"]react['\"]", text)
    if not m:
        return text
    specs = m.group(1)
    if "useCallback" in specs:
        return text
    new_specs = specs.rstrip() + ", useCallback"
    return text[: m.start(1)] + new_specs + text[m.end(1) :]


def find_arrow_fn_end(text: str, body_open_brace: int) -> int:
    """body_open_brace index of '{'; of async () => { ... }"""
    depth = 0
    j = body_open_brace
    while j < len(text):
        c = text[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return -1


def wrap_named_async(text: str, name: str) -> str:
    """const name = async (...) => { ... };  -> useCallback"""
    if f"const {name} = useCallback" in text:
        return text
    m = re.search(rf"const {name} = async\s*(\([^)]*\))\s*=>\s*\{{", text)
    if not m:
        return text
    start = m.start()
    brace = m.end() - 1
    end = find_arrow_fn_end(text, brace)
    if end < 0:
        return text
    # include trailing semicolon if present
    end_semi = end
    if end_semi < len(text) and text[end_semi] == ";":
        end_semi += 1

    body = text[start:end]  # without trailing ;
    # infer deps
    deps: list[str] = []
    if re.search(r"employee\?\.company_id|employee\.company_id", body):
        deps.append("employee?.company_id")
    if re.search(r"\buser\?\.|\buser\.", body) and "user" not in deps:
        deps.append("user")
    if re.search(r"\bid\b", body) and "id" in body and re.search(r"\bid\b", m.group(0)):
        pass
    # ContractEditor may use id from params
    if re.search(r"\bid\b", body) and "useParams" in text:
        if re.search(rf"const {name} = async", body) or "id" in body:
            # only if id used as free variable in body
            if re.search(r"[^.\w]id[^.\w]", body) or re.search(r"\(id\)|\bid\b", body):
                if "id" not in deps and re.search(r"\bid\b", body):
                    # conservative: include id if referenced outside employee_id
                    if re.search(r"(?<![.\w])id(?![.\w])", body):
                        deps.append("id")

    dep_str = ", ".join(deps)
    # Rewrite
    new_body = body.replace(f"const {name} = async", f"const {name} = useCallback(async", 1)
    # insert deps before final closing brace of arrow: change trailing } to }, [deps])
    if not new_body.rstrip().endswith("}"):
        return text
    new_body = new_body.rstrip()[:-1] + f"}}, [{dep_str}])"
    return text[:start] + new_body + text[end_semi:]


def fix_mount_effects(text: str) -> str:
    for name in ("fetchData", "fetchAll", "fetchEmployees", "fetchContract", "fetchJob"):
        text = re.sub(
            rf"useEffect\(\(\)\s*=>\s*\{{\s*{name}\(\);\s*\}}\s*,\s*\[\s*\]\s*\);?",
            f"useEffect(() => {{ {name}(); }}, [{name}]);",
            text,
        )
        # multiline
        text = re.sub(
            rf"useEffect\(\(\)\s*=>\s*\{{\s*\n\s*{name}\(\);\s*\n\s*\}}\s*,\s*\[\s*\]\s*\);?",
            f"useEffect(() => {{ {name}(); }}, [{name}]);",
            text,
        )
    return text


def remove_unused_disable(text: str) -> str:
    # remove lines that only have unused eslint-disable exhaustive-deps
    return re.sub(
        r"[ \t]*//\s*eslint-disable-next-line\s+react-hooks/exhaustive-deps\s*\n",
        "",
        text,
    )


def process(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text
    text = ensure_usecallback_import(text)
    for name in ("fetchData", "fetchAll", "fetchEmployees", "fetchContract"):
        text = wrap_named_async(text, name)
    text = fix_mount_effects(text)
    text = remove_unused_disable(text)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = []
    for rel in TARGETS:
        p = ROOT / rel
        if not p.exists():
            print("missing", rel)
            continue
        if process(p):
            changed.append(rel)
            print("updated", rel)
        else:
            print("skip", rel)
    print(f"CHANGED {len(changed)}")


if __name__ == "__main__":
    main()
