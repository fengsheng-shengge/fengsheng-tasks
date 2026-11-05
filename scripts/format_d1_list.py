#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 Cloudflare D1 数据库清单 API 的返回格式化成人类可读的表格。

用法：python3 scripts/format_d1_list.py <d1-list.json>
只读脚本，不做任何网络请求。
"""

import json
import sys


def main():
    if len(sys.argv) < 2:
        print('用法: python3 scripts/format_d1_list.py <d1-list.json>')
        return 1
    try:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            d = json.load(f)
    except Exception as e:
        print('读取失败: %s' % e)
        return 1

    if not d.get('success'):
        errs = d.get('errors') or []
        print('API 返回失败: %s' % json.dumps(errs, ensure_ascii=False)[:400])
        return 0

    rows = d.get('result') or []
    if not rows:
        print('（该账户下没有 D1 数据库）')
        return 0

    print('%-28s %-38s %8s %14s' % ('名称', 'UUID', '表数', '字节'))
    print('-' * 92)
    for db in rows:
        print('%-28s %-38s %8s %14s' % (
            db.get('name'), db.get('uuid'), db.get('num_tables'), db.get('file_size')))
    return 0


if __name__ == '__main__':
    sys.exit(main())
