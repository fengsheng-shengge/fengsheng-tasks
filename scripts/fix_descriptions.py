#!/usr/bin/env python3
import os

# 文件 -> description 映射
desc_map = {
    '404.html': '页面未找到。风声 · 帮助服务者配得上被好好对待。',
    'knowledge.html': '风声知识底座：居住服务业务字典，涵盖交易、租赁、整装、家政、人才字典、十五五政策等6大业务域，131条词条。',
    'sample.html': '风声美观版样本页 v3.0：展示六维品质居住标准的视觉设计样本。',
    'care-test/v2-demo.html': '服务者四维关怀测评：身体、心理、尊严、生活四个维度，帮助服务者了解自己被关怀的程度。',
    'quality-test/v2-demo.html': '六维品质居住测评：安全、健康、整洁、温暖、美观、惬意六个维度评估居住品质。',
    'reply/v2-demo.html': '快回·客户解码器：快速回复客户咨询，提升服务响应效率。',
    's1-report/v2-demo.html': '六维带看报告生成器：一键生成专业的房产带看报告。',
}

for f, desc in desc_map.items():
    if not os.path.exists(f):
        print(f"✗ {f} 不存在")
        continue
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    if 'meta name="description"' in content:
        print(f"⊘ {f} 已有description")
        continue
    # 在 </title> 后插入
    content = content.replace('</title>', f'</title>\n<meta name="description" content="{desc}">', 1)
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print(f"✓ {f} 已添加description")
