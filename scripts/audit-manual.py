from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def non_empty_cells(sheet: dict[str, Any]) -> list[str]:
    addresses = []
    for row in sheet["rows"]:
        for cell in row["cells"]:
            if cell.get("covered"):
                continue
            if str(cell.get("text") or "").strip():
                addresses.append(cell["address"])
    return addresses


def cell_text(row: dict[str, Any], col: int) -> str:
    for cell in row["cells"]:
        if cell.get("covered"):
            continue
        if cell.get("col") == col:
            return str(cell.get("text") or "").strip()
    return ""


def expects_two_versions(sheet: dict[str, Any]) -> bool:
    for row in sheet["rows"]:
        left = cell_text(row, 1).lower()
        right = cell_text(row, 3).lower()
        if left in ("step", "steps") and right in ("step", "steps"):
            return True
        if cell_text(row, 9).lower() == "step" and cell_text(row, 21).lower() == "step":
            return True
    return False


def audit_product(product_id: str) -> dict[str, Any]:
    base = ROOT / "public" / "content" / "products" / product_id
    manifest = read_json(base / "excel" / "manifest.json")
    manual = read_json(base / "manual" / "manual.json")
    issues = []
    warnings = []
    sheet_results = []

    coverage_by_sheet = manual.get("coverage", {})
    docs_by_sheet = {doc["sourceSheetSlug"]: doc for doc in manual["documents"]}

    for sheet_meta in manifest["sheets"]:
        sheet_slug = sheet_meta["slug"]
        sheet = read_json(ROOT / sheet_meta["path"].replace("./", ""))
        coverage = coverage_by_sheet.get(sheet_slug, {})
        covered_cells = {item["address"] for item in coverage.get("cells", [])}
        covered_images = {item["id"]: item for item in coverage.get("images", [])}
        expected_cells = set(non_empty_cells(sheet))
        missing_cells = sorted(expected_cells - covered_cells)

        if missing_cells:
            issues.append(f"{sheet['title']}: missing structured coverage for cells {', '.join(missing_cells[:20])}")

        missing_image_ids = []
        for image in sheet["images"]:
            image_path = ROOT / image["file"].replace("./", "")
            if not image_path.exists() or image_path.stat().st_size == 0:
                issues.append(f"{sheet['title']}: image file missing or empty {image['file']}")
            if image["id"] not in covered_images:
                missing_image_ids.append(image["id"])
        if missing_image_ids:
            issues.append(f"{sheet['title']}: missing image coverage {', '.join(missing_image_ids)}")

        if sheet_slug in docs_by_sheet:
            doc = docs_by_sheet[sheet_slug]
            if not doc.get("versions"):
                issues.append(f"{doc['title']}: SOP has no versions")
            step_counts = [len(version.get("steps", [])) for version in doc.get("versions", [])]
            if not step_counts or any(count == 0 for count in step_counts):
                issues.append(f"{doc['title']}: at least one SOP version has no steps")
            if expects_two_versions(sheet) and len(doc.get("versions", [])) < 2:
                issues.append(f"{doc['title']}: expected two version branches")
            unmatched = [
                image
                for image in doc.get("unmatchedImages", [])
                if image.get("reason") != "cover-or-title-image"
            ]
            for image in unmatched:
                warnings.append(f"{doc['title']}: image {image['id']} is shown in unmatched image area")

        sheet_results.append(
            {
                "title": sheet["title"],
                "slug": sheet_slug,
                "nonEmptyCells": len(expected_cells),
                "coveredCells": len(covered_cells),
                "images": len(sheet["images"]),
                "coveredImages": len(covered_images),
                "status": "ok" if not missing_cells and not missing_image_ids else "failed",
            }
        )

    return {
        "productId": product_id,
        "status": "failed" if issues else ("warning" if warnings else "ok"),
        "issues": issues,
        "warnings": warnings,
        "documents": len(manual["documents"]),
        "faultItems": len(manual["troubleshooting"]["items"]),
        "flowSteps": len(manual["troubleshootingFlow"]["steps"]),
        "sheets": sheet_results,
    }


def write_markdown(results: list[dict[str, Any]]) -> None:
    overall = "failed" if any(result["issues"] for result in results) else ("warning" if any(result["warnings"] for result in results) else "ok")
    lines = [
        "# 客户文档结构化审核报告",
        "",
        "本报告核对结构化客户文档是否覆盖 Excel 非空单元格、图片、SOP 版本和步骤。",
        "",
        f"总体验证状态：`{overall}`",
        "",
    ]
    for result in results:
        lines.extend(
            [
                f"## {result['productId']}",
                "",
                f"- 状态：`{result['status']}`",
                f"- SOP 文档：{result['documents']}",
                f"- 故障排查条目：{result['faultItems']}",
                f"- 排查流程步骤：{result['flowSteps']}",
                f"- 问题数量：{len(result['issues'])}",
                f"- 警告数量：{len(result['warnings'])}",
                "",
                "| # | 工作表 | 非空单元格 | 已覆盖单元格 | 图片 | 已覆盖图片 | 状态 |",
                "|---:|---|---:|---:|---:|---:|---|",
            ]
        )
        for index, sheet in enumerate(result["sheets"], 1):
            lines.append(
                f"| {index} | {sheet['title']} | {sheet['nonEmptyCells']} | {sheet['coveredCells']} | "
                f"{sheet['images']} | {sheet['coveredImages']} | {sheet['status']} |"
            )
        if result["issues"]:
            lines.extend(["", "### 问题", ""])
            lines.extend([f"- {issue}" for issue in result["issues"]])
        if result["warnings"]:
            lines.extend(["", "### 警告", ""])
            lines.extend([f"- {warning}" for warning in result["warnings"]])
        lines.append("")
    (ROOT / "MANUAL_AUDIT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    results = [audit_product(product_id) for product_id in ("ias-3120", "ias-5100")]
    overall = "failed" if any(result["issues"] for result in results) else ("warning" if any(result["warnings"] for result in results) else "ok")
    payload = {"status": overall, "products": results}
    write_json(ROOT / "MANUAL_AUDIT.json", payload)
    write_markdown(results)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
