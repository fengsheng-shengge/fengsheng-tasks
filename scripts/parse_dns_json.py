#!/usr/bin/env python3
"""解析 Google DoH / Cloudflare DoH 的 JSON 响应，打印 Status 与 Answer 记录。

用法: python3 scripts/parse_dns_json.py <response.json>
用途: 诊断 fengsheng.tech 等生产域名的 DNS 记录是否完整
      （2026-11-05 实测该域名只返回 NS 记录、缺 A 记录，导致线上接口解析失败）
"""
import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: parse_dns_json.py <response.json>")
        return 2
    try:
        with open(sys.argv[1], encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as exc:  # noqa: BLE001
        print(f"  parse fail: {exc}")
        return 0
    print("  Status:", data.get("Status"))
    answers = data.get("Answer") or []
    if not answers:
        print("   (no Answer record)")
    for item in answers:
        print("  ", item.get("type"), "->", item.get("data"), "(TTL", item.get("TTL"), ")")
    return 0


if __name__ == "__main__":
    sys.exit(main())
