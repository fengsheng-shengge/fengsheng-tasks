#!/usr/bin/env python3
"""
小扣子每日 09:00 自动扫描部署任务池
读取飞书多维表《小扣子部署任务池》，状态为"待部署"的任务自动执行部署
"""

import json
import os
import subprocess
import sys
import time
import urllib.request

BASE_TOKEN = "QIVzb8dr0ae3GPsOPpAcQBYYnCg"
TABLE_ID = "tblmVPJbVfFxSAl2"
VIEW_ID = "vewQPaYqql"

def get_tenant_token():
    """获取飞书 tenant_access_token"""
    app_id = os.environ.get("LARK_APP_ID", "")
    app_secret = os.environ.get("LARK_APP_SECRET", "")
    if not app_id or not app_secret:
        print("LARK_APP_ID or LARK_APP_SECRET not set")
        return None
    data = json.dumps({"app_id": app_id, "app_secret": app_secret}).encode()
    req = urllib.request.Request(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        data=data, headers={"Content-Type": "application/json"}
    )
    resp = json.loads(urllib.request.urlopen(req).read())
    return resp.get("tenant_access_token")

def get_pending_tasks(token):
    """获取待部署任务列表"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{BASE_TOKEN}/tables/{TABLE_ID}/records"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    resp = json.loads(urllib.request.urlopen(req).read())
    records = resp.get("data", {}).get("items", [])
    pending = []
    for r in records:
        fields = r.get("fields", {})
        status = ""
        for k, v in fields.items():
            if "状态" in k:
                # 单选字段返回数组格式：["待部署"]
                if isinstance(v, list) and len(v) > 0:
                    status = v[0]
                elif isinstance(v, str):
                    status = v
                elif isinstance(v, dict) and "text" in v:
                    status = v["text"]
                break
        if status == "待部署":
            task_id = ""
            content = ""
            for k, v in fields.items():
                if "任务ID" in k:
                    task_id = v if isinstance(v, str) else str(v)
                if "内容" in k:
                    content = v if isinstance(v, str) else str(v)
            pending.append({"record_id": r.get("record_id", ""), "task_id": task_id, "content": content})
    return pending

def update_task_status(token, record_id, log):
    """更新任务状态为已部署，写入部署日志"""
    import subprocess
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{BASE_TOKEN}/tables/{TABLE_ID}/records/{record_id}"
    body = json.dumps({"fields": {"状态": ["已部署"], "部署日志": log[:500]}})
    cmd = [
        "curl", "-s", "-X", "PATCH", url,
        "-H", f"Authorization: Bearer {token}",
        "-H", "Content-Type: application/json",
        "-d", body
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    resp = json.loads(result.stdout)
    code = resp.get("code", -1)
    if code == 0:
        print(f"   ✅ 飞书状态已更新为「已部署」")
        return True
    else:
        print(f"   ❌ 飞书更新失败: code={code} msg={resp.get('msg','')}")
        # 尝试用 PUT 方法
        cmd2 = ["curl", "-s", "-X", "PUT", url,
                "-H", f"Authorization: Bearer {token}",
                "-H", "Content-Type: application/json",
                "-d", body]
        result2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=30)
        resp2 = json.loads(result2.stdout)
        if resp2.get("code") == 0:
            print(f"   ✅ PUT 方式更新成功")
            return True
        print(f"   ❌ PUT 也失败: {resp2.get('msg','')}")
        print(f"   DEBUG: curl 响应: {result.stdout[:300]}")
        return False

def main():
    print("=" * 60)
    print(f"小扣子部署任务池扫描 · {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    token = get_tenant_token()
    if not token:
        print("❌ 无法获取飞书访问令牌，请检查 LARK_APP_ID / LARK_APP_SECRET")
        return

    pending = get_pending_tasks(token)
    if not pending:
        print("✅ 当前无待部署任务")
        return

    print(f"📋 发现 {len(pending)} 个待部署任务:")
    for p in pending:
        print(f"   [{p['task_id']}] {p['content']}")

    # 执行部署
    for p in pending:
        print(f"\n🚀 开始部署 [{p['task_id']}] {p['content']}")
        try:
            # 部署逻辑：git pull + 验证
            result = subprocess.run(
                ["git", "pull", "origin", "main"],
                capture_output=True, text=True, timeout=120
            )
            deploy_log = result.stdout + result.stderr
            if result.returncode == 0:
                status = "✅ 部署成功"
                print(f"   {status}")
                update_task_status(token, p["record_id"], f"{status}\n{deploy_log[:500]}")
            else:
                status = "❌ 部署失败"
                print(f"   {status}: {result.stderr[:200]}")
                update_task_status(token, p["record_id"], f"{status}\n{result.stderr[:500]}")
        except Exception as e:
            print(f"   ❌ 异常: {e}")
            try:
                update_task_status(token, p["record_id"], f"❌ 部署异常: {str(e)[:200]}")
            except:
                pass

    print("\n" + "=" * 60)
    print("扫描完成")

if __name__ == "__main__":
    main()