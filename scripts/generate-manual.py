from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "item"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def clean(value: Any) -> str:
    return str(value or "").replace("\r\n", "\n").strip()


def row_cell(row: dict[str, Any], col: int) -> dict[str, Any] | None:
    for cell in row["cells"]:
        if cell.get("covered"):
            continue
        if cell.get("col") == col:
            return cell
    return None


def cell_text(row: dict[str, Any], col: int) -> str:
    cell = row_cell(row, col)
    return clean(cell.get("text")) if cell else ""


def cell_address(row: dict[str, Any], col: int) -> str | None:
    cell = row_cell(row, col)
    return cell.get("address") if cell else None


def non_empty_cells(sheet: dict[str, Any]) -> list[dict[str, Any]]:
    cells = []
    for row in sheet["rows"]:
        for cell in row["cells"]:
            if cell.get("covered"):
                continue
            if clean(cell.get("text")):
                cells.append(
                    {
                        "address": cell["address"],
                        "row": cell["row"],
                        "col": cell["col"],
                        "text": clean(cell.get("text")),
                    }
                )
    return cells


def mark(used: dict[str, str], address: str | None, category: str) -> None:
    if address:
        used[address] = category


def image_file_to_url(file_value: str) -> str:
    return file_value.replace("./public/", "/")


def link_reference(text: str, docs_by_title: dict[str, str]) -> dict[str, str] | None:
    value = clean(text)
    if not value.lower().startswith("refer to"):
        return None
    normalized = value.lower()
    for title, doc_id in docs_by_title.items():
        if title.lower().replace(" sop", "") in normalized:
            return {"label": value, "targetDocId": doc_id}
    return {"label": value, "targetDocId": ""}


def find_doc_for_action(text: str, docs: list[dict[str, Any]]) -> str:
    normalized = slugify(text)
    for doc in docs:
        title_slug = slugify(doc["title"])
        if title_slug and title_slug in normalized:
            return doc["id"]
    replacements = {
        "button-switch": "replace-button-switches",
        "rocker-switch": "replace-the-rocker-switch",
        "peripheral-board": "replace-peripheral-boards",
        "arm-board": "replace-arm-boards",
        "screen": "replace-screen",
        "main-control-board": "replace-control-main-board",
        "40-pin": "replace-40-pin-gray-ribbon-cabl",
        "485": "replace-spectrum-analyzer-485-c",
        "light-source": "replace-light-source",
        "lamp": "replace-the-lamp",
        "motor": "replace-motor",
        "sensor": "replace-sensor",
        "optical-fiber": "replace-optical-fiber",
        "usb": "replace-the-usb-cable",
    }
    for key, doc_id in replacements.items():
        if key in normalized:
            return doc_id
    return ""


def sheet_title(sheet: dict[str, Any]) -> str:
    for cell in non_empty_cells(sheet):
        if cell["row"] <= 2:
            return cell["text"]
    return sheet["title"]


def build_toc(sheet: dict[str, Any], used: dict[str, str]) -> list[dict[str, Any]]:
    items = []
    for cell in non_empty_cells(sheet):
        mark(used, cell["address"], "toc")
        items.append({"row": cell["row"], "text": cell["text"]})
    return items


def build_troubleshooting_flow(sheet: dict[str, Any], used: dict[str, str]) -> dict[str, Any]:
    steps = []
    current = None
    for cell in non_empty_cells(sheet):
        mark(used, cell["address"], "flow")
        text = cell["text"]
        match = re.match(r"Step\s+(\d+)\s*:\s*(.+)", text, flags=re.I)
        if match:
            current = {
                "number": match.group(1),
                "title": match.group(2).strip(),
                "details": [],
                "sourceCells": [cell["address"]],
            }
            steps.append(current)
        elif current:
            current["details"].append({"text": text, "sourceCell": cell["address"]})
            current["sourceCells"].append(cell["address"])
        else:
            steps.append({"number": "", "title": text, "details": [], "sourceCells": [cell["address"]]})
    return {"title": sheet_title(sheet), "steps": steps}


def build_faults(sheet: dict[str, Any], used: dict[str, str], docs: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    active_category = ""
    for row in sheet["rows"][2:]:
        values = [cell_text(row, col) for col in range(1, 8)]
        addresses = [cell_address(row, col) for col in range(1, 8)]
        if not any(values):
            continue
        if values[0]:
            active_category = values[0]
        for address in addresses:
            mark(used, address, "troubleshooting")
        maintenance = values[3]
        rows.append(
            {
                "id": f"fault-{len(rows) + 1}",
                "category": active_category,
                "possibleCause": values[1],
                "inspection": values[2],
                "maintenance": maintenance,
                "tools": values[5],
                "spareParts": values[6],
                "relatedDocId": find_doc_for_action(maintenance, docs),
                "sourceCells": [address for address in addresses if address],
            }
        )
    groups: dict[str, list[dict[str, Any]]] = {}
    for item in rows:
        groups.setdefault(item["category"] or "Other", []).append(item)
    return {"title": sheet_title(sheet), "items": rows, "groups": [{"category": k, "items": v} for k, v in groups.items()]}


def collect_resource_rows(sheet: dict[str, Any], used: dict[str, str], row_start: int, row_end: int, col_start: int, col_end: int, category: str) -> list[dict[str, Any]]:
    resources = []
    for row in sheet["rows"]:
        if row["index"] < row_start or row["index"] > row_end:
            continue
        cells = []
        for col in range(col_start, col_end + 1):
            text = cell_text(row, col)
            address = cell_address(row, col)
            if text:
                mark(used, address, category)
                cells.append({"col": col, "text": text, "sourceCell": address})
        if cells:
            resources.append({"row": row["index"], "cells": cells})
    return resources


def parse_step_rows(
    sheet: dict[str, Any],
    used: dict[str, str],
    step_col: int,
    image_col: int | None,
    start_row: int,
    end_row: int,
    docs_by_title: dict[str, str],
) -> list[dict[str, Any]]:
    steps = []
    for row in sheet["rows"]:
        if row["index"] < start_row or row["index"] > end_row:
            continue
        text = cell_text(row, step_col)
        if not text:
            continue
        step_address = cell_address(row, step_col)
        image_text = cell_text(row, image_col) if image_col else ""
        image_address = cell_address(row, image_col) if image_col else None
        mark(used, step_address, "sop-step")
        if image_text:
            mark(used, image_address, "sop-image-note")
        reference = link_reference(image_text, docs_by_title) if image_text else None
        steps.append(
            {
                "id": f"step-{len(steps) + 1}",
                "number": str(len(steps) + 1),
                "sourceRow": row["index"],
                "instruction": text,
                "imageNote": "" if image_text.lower() == "none" else image_text,
                "noImage": image_text.lower() == "none",
                "reference": reference,
                "images": [],
                "sourceCells": [address for address in [step_address, image_address] if address],
            }
        )
    for index, step in enumerate(steps):
        step["endRow"] = steps[index + 1]["sourceRow"] - 1 if index + 1 < len(steps) else end_row
    return steps


def attach_images(
    sheet: dict[str, Any],
    versions: list[dict[str, Any]],
    coverage_images: dict[str, dict[str, Any]],
    cover_cutoff_row: int = 2,
) -> list[dict[str, Any]]:
    unmatched = []
    for image in sheet["images"]:
        image_row = image["anchor"]["from"]["row"]
        image_col = image["anchor"]["from"]["col"]
        image_payload = {
            "id": image["id"],
            "src": image_file_to_url(image["file"]),
            "width": image.get("width"),
            "height": image.get("height"),
            "anchor": image["anchor"],
        }
        if image_row <= cover_cutoff_row:
            coverage_images[image["id"]] = {"status": "cover", "row": image_row, "col": image_col}
            unmatched.append({**image_payload, "reason": "cover-or-title-image"})
            continue
        candidate_versions = []
        for version in versions:
            for min_col, max_col in version.get("imageColRanges", []):
                if min_col <= image_col <= max_col:
                    candidate_versions.append(version)
                    break
        if not candidate_versions and len(versions) == 1:
            candidate_versions = versions
        best_step = None
        best_version = None
        for version in candidate_versions:
            for step in version["steps"]:
                if step["sourceRow"] <= image_row <= step["endRow"]:
                    best_step = step
                    best_version = version
                    break
            if best_step:
                break
            previous = [step for step in version["steps"] if step["sourceRow"] <= image_row]
            if previous:
                best_step = previous[-1]
                best_version = version
        if not best_step and candidate_versions:
            best_version = candidate_versions[0]
            best_step = best_version["steps"][0] if best_version["steps"] else None
        if best_step:
            best_step["images"].append(image_payload)
            coverage_images[image["id"]] = {
                "status": "bound",
                "versionId": best_version["id"],
                "stepId": best_step["id"],
                "row": image_row,
                "col": image_col,
            }
        else:
            unmatched.append({**image_payload, "reason": "no-step-candidate"})
            coverage_images[image["id"]] = {"status": "unmatched", "row": image_row, "col": image_col}
    return unmatched


def find_header_row(sheet: dict[str, Any], terms: tuple[str, ...]) -> int:
    for row in sheet["rows"]:
        row_text = " ".join(cell_text(row, col).lower() for col in range(1, sheet["dimensions"]["maxColumn"] + 1))
        if all(term.lower() in row_text for term in terms):
            return row["index"]
    return 0


def first_footer_row(sheet: dict[str, Any], start_row: int) -> int:
    for row in sheet["rows"]:
        if row["index"] <= start_row:
            continue
        first = cell_text(row, 1).lower()
        thirteenth = cell_text(row, 13).lower()
        if first.startswith("tools") or thirteenth.startswith("tools"):
            return row["index"]
    return sheet["dimensions"]["maxRow"] + 1


def build_standard_sop(sheet: dict[str, Any], doc_id: str, docs_by_title: dict[str, str], used: dict[str, str]) -> dict[str, Any]:
    title = sheet_title(sheet)
    mark(used, cell_address(sheet["rows"][0], 1), "sop-title")
    header_row = find_header_row(sheet, ("step", "image"))
    if not header_row:
        header_row = 2
    for col in range(1, sheet["dimensions"]["maxColumn"] + 1):
        mark(used, cell_address(sheet["rows"][header_row - 1], col), "sop-header")

    max_col = sheet["dimensions"]["maxColumn"]
    versions = []
    if max_col >= 4 and cell_text(sheet["rows"][header_row - 1], 3).lower().startswith("step"):
        version_specs = [
            ("v1", clean(cell_text(sheet["rows"][header_row - 2], 1)) or "Kernel Version 1", 1, 2, [(2, 2)]),
            ("v2", clean(cell_text(sheet["rows"][header_row - 2], 3)) or "Kernel Version 2", 3, 4, [(4, 4)]),
        ]
        mark(used, cell_address(sheet["rows"][header_row - 2], 1), "sop-version")
        mark(used, cell_address(sheet["rows"][header_row - 2], 3), "sop-version")
    else:
        label = clean(cell_text(sheet["rows"][1], 1)) if len(sheet["rows"]) > 1 else ""
        if "kernel" in label.lower():
            mark(used, cell_address(sheet["rows"][1], 1), "sop-version")
        version_specs = [("main", label or "All versions", 1, 2 if max_col >= 2 else None, [(2, 2), (1, max_col)])]

    for version_id, label, step_col, image_col, image_ranges in version_specs:
        steps = parse_step_rows(sheet, used, step_col, image_col, header_row + 1, sheet["dimensions"]["maxRow"], docs_by_title)
        versions.append(
            {
                "id": version_id,
                "label": label,
                "steps": steps,
                "resources": [],
                "imageColRanges": image_ranges,
            }
        )

    image_coverage = {}
    unmatched = attach_images(sheet, versions, image_coverage)
    for version in versions:
        version.pop("imageColRanges", None)

    return {
        "id": doc_id,
        "title": title,
        "sourceSheet": sheet["title"],
        "sourceSheetSlug": sheet["slug"],
        "type": "sop",
        "versions": versions,
        "unmatchedImages": unmatched,
        "imageCoverage": image_coverage,
    }


def build_removal_sop(sheet: dict[str, Any], doc_id: str, docs_by_title: dict[str, str], used: dict[str, str]) -> dict[str, Any]:
    title = sheet_title(sheet)
    mark(used, cell_address(sheet["rows"][0], 1), "sop-title")
    header_row = find_header_row(sheet, ("step", "operation"))
    footer_row = first_footer_row(sheet, header_row)
    max_col = sheet["dimensions"]["maxColumn"]

    if max_col >= 24:
        version_specs = [
            ("v1", clean(cell_text(sheet["rows"][1], 1)) or "Kernel Version 1", 9, 10, [(1, 8)], (3, header_row - 1, 9, 12), (footer_row, sheet["dimensions"]["maxRow"], 1, 12)),
            ("v2", clean(cell_text(sheet["rows"][1], 13)) or "Kernel Version 2", 21, 22, [(13, 20)], (3, header_row - 1, 21, 24), (footer_row, sheet["dimensions"]["maxRow"], 13, 24)),
        ]
        mark(used, cell_address(sheet["rows"][1], 1), "sop-version")
        mark(used, cell_address(sheet["rows"][1], 13), "sop-version")
    else:
        version_specs = [
            ("main", "All versions", 9, 10, [(1, 8)], (3, header_row - 1, 9, 14), (footer_row, sheet["dimensions"]["maxRow"], 1, 14)),
        ]

    versions = []
    for version_id, label, step_col, text_col, image_ranges, material_range, footer_range in version_specs:
        mark(used, cell_address(sheet["rows"][header_row - 1], step_col), "sop-header")
        mark(used, cell_address(sheet["rows"][header_row - 1], text_col), "sop-header")
        steps = parse_step_rows(sheet, used, step_col, None, header_row + 1, footer_row - 1, docs_by_title)
        materials = collect_resource_rows(sheet, used, *material_range, category="materials")
        footer = collect_resource_rows(sheet, used, *footer_range, category="tools-consumables-metadata")
        versions.append(
            {
                "id": version_id,
                "label": label,
                "steps": steps,
                "resources": [
                    {"title": "Materials and tools", "rows": materials},
                    {"title": "Tools, consumables and document metadata", "rows": footer},
                ],
                "imageColRanges": image_ranges,
            }
        )

    image_coverage = {}
    unmatched = attach_images(sheet, versions, image_coverage)
    for version in versions:
        version.pop("imageColRanges", None)

    return {
        "id": doc_id,
        "title": title,
        "sourceSheet": sheet["title"],
        "sourceSheetSlug": sheet["slug"],
        "type": "sop",
        "versions": versions,
        "unmatchedImages": unmatched,
        "imageCoverage": image_coverage,
    }


def classify_sop(sheet: dict[str, Any]) -> str:
    row_text = "\n".join(cell["text"] for cell in non_empty_cells(sheet))
    if "Operation Steps" in row_text or "Operational Steps" in row_text:
        return "removal"
    return "standard"


def account_for_unclassified(sheet: dict[str, Any], used: dict[str, str]) -> list[dict[str, Any]]:
    annex = []
    for cell in non_empty_cells(sheet):
        if cell["address"] not in used:
            used[cell["address"]] = "audit-annex"
            annex.append(cell)
    return annex


def build_manual_for_product(product_id: str) -> dict[str, Any]:
    product_path = ROOT / "public" / "content" / "products" / product_id / "product.json"
    product = read_json(product_path)
    excel_dir = ROOT / "public" / "content" / "products" / product_id / "excel"
    manifest = read_json(excel_dir / "manifest.json")
    sheets = [read_json(ROOT / item["path"].replace("./", "")) for item in manifest["sheets"]]

    docs = []
    for sheet in sheets[3:]:
        docs.append(
            {
                "id": sheet["slug"],
                "title": sheet_title(sheet),
                "sourceSheet": sheet["title"],
                "sourceSheetSlug": sheet["slug"],
            }
        )
    docs_by_title = {doc["title"]: doc["id"] for doc in docs}
    docs_by_title.update({doc["sourceSheet"]: doc["id"] for doc in docs})

    coverage: dict[str, dict[str, Any]] = {}
    used_by_sheet: dict[str, dict[str, str]] = {}
    image_coverage_by_sheet: dict[str, dict[str, Any]] = {}

    toc_used: dict[str, str] = {}
    toc = build_toc(sheets[0], toc_used)
    used_by_sheet[sheets[0]["slug"]] = toc_used

    flow_used: dict[str, str] = {}
    flow = build_troubleshooting_flow(sheets[1], flow_used)
    used_by_sheet[sheets[1]["slug"]] = flow_used

    structured_docs = []
    for sheet in sheets[3:]:
        used: dict[str, str] = {}
        kind = classify_sop(sheet)
        doc_id = sheet["slug"]
        if kind == "removal":
            doc = build_removal_sop(sheet, doc_id, docs_by_title, used)
        else:
            doc = build_standard_sop(sheet, doc_id, docs_by_title, used)
        doc["annexCells"] = account_for_unclassified(sheet, used)
        used_by_sheet[sheet["slug"]] = used
        image_coverage_by_sheet[sheet["slug"]] = doc["imageCoverage"]
        structured_docs.append(doc)

    fault_used: dict[str, str] = {}
    faults = build_faults(sheets[2], fault_used, structured_docs)
    used_by_sheet[sheets[2]["slug"]] = fault_used

    for sheet in sheets[:3]:
        account_for_unclassified(sheet, used_by_sheet[sheet["slug"]])

    for sheet in sheets:
        sheet_used = used_by_sheet.get(sheet["slug"], {})
        image_coverage = image_coverage_by_sheet.get(sheet["slug"], {})
        coverage[sheet["slug"]] = {
            "title": sheet["title"],
            "cells": [{"address": address, "category": category} for address, category in sorted(sheet_used.items())],
            "images": [{"id": image_id, **payload} for image_id, payload in sorted(image_coverage.items())],
        }

    manual = {
        "productId": product_id,
        "productName": product["name"],
        "title": product["title"],
        "sourceWorkbook": product["sourceWorkbook"],
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "toc": toc,
        "troubleshootingFlow": flow,
        "troubleshooting": faults,
        "documents": structured_docs,
        "sourceSheets": manifest["sheets"],
        "coverage": coverage,
    }
    write_json(ROOT / "public" / "content" / "products" / product_id / "manual" / "manual.json", manual)
    return manual


def write_summary(manuals: list[dict[str, Any]]) -> None:
    lines = [
        "# 客户文档结构化迁移摘要",
        "",
        "本文件由 `scripts/generate-manual.py` 生成。它说明 Excel 内容已被转换为客户可读的目录、故障排查、流程和步骤卡片结构。",
        "",
    ]
    for manual in manuals:
        image_total = sum(len(doc.get("imageCoverage", {})) for doc in manual["documents"])
        unmatched = sum(1 for doc in manual["documents"] for image in doc.get("unmatchedImages", []) if image.get("reason") != "cover-or-title-image")
        lines.extend(
            [
                f"## {manual['productId']}",
                "",
                f"- SOP 文档：{len(manual['documents'])}",
                f"- 故障排查条目：{len(manual['troubleshooting']['items'])}",
                f"- 排查流程步骤：{len(manual['troubleshootingFlow']['steps'])}",
                f"- 已处理图片：{image_total}",
                f"- 未匹配步骤图片：{unmatched}",
                "",
            ]
        )
    (ROOT / "MANUAL_MIGRATION_SUMMARY.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    manuals = [build_manual_for_product(product_id) for product_id in ("ias-3120", "ias-5100")]
    write_summary(manuals)
    print(json.dumps({"status": "ok", "products": [{"productId": item["productId"], "documents": len(item["documents"])} for item in manuals]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
