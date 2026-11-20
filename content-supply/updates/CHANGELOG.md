# 内容供给仓库 · 动态更新日志

> 格式：日期 | 变更内容 | 版本/md5 | 拍板人 | 群通知凭证

## 2026-11-20
- 仓库建立（生哥 09:31 指令：内容供给仓库+动态迭代+产品侧随时调取）| README v1.0 | 小眼镜
- DICTIONARY.md v1.3 迁入（单一事实源：字段总表/authority 五值定版/勘误对照/D1-D5/拍板日志/对齐规则）| v1.3 | 小眼镜 | om_x100b60ce6ccd28a0cf9bc619824581a
- scripts/ 守门工具挂入：gap_batch1_process.py（authority+source 处理，口径挂字典 v1.3）、five_gates_check.py（五关检测+反测自检）| — | 小眼镜
- data/authority.json 候选 8c8f50f8（official 2557/court 875/industry 907/derived 1776/data 28）待小酒窝儿审核 → 审核通过入库 | 8c8f50f8 | 小眼镜（拍板）+小酒窝儿（门禁）| om_x100b60ce54189cacc1352f4564f1173
- 待办锚点：11.22 W1 结账首批 stats | 11.21 flk 首批 50 部 | 11.24 证据库 Schema 冻结+E4b 794 凭证挂载
- 仓库通告群发（调取协议+迭代节奏+分工）| — | 小眼镜 | om_x100b60ce7b55eca8dc070af31580987
- 字典 v1.3.1（笔误 289/RISK 口径拆注/caseRef 占位符实况/双引证暂缓）+ v1.3.2（RISK 抽检 75%<90% 未过，凭证层/语义层分层原则进字典；拍板丙扩样 120→甲拆分后果型/指引型，乙否决；commit 改一次性）| v1.3.2 | 小眼镜 | om_x100b60ce0feee4f0cfeb0be1b19e97c + om_x100b60cec88f0ca8df1b49be74dd66c
- **RISK 丁方案定版**：P 档 758 全量判定后果型 58%（甲失效，乙再否决）；RISK 830 条 derived+authority_note='法源待复核'，4 条双凭证露出 court（8 条全验真）；候选 v3 d1387551（official 1723/court 879/industry 907/derived 2606/data 28）送小酒窝儿按 v3 审 | v1.3.3 | 小眼镜 | om_x100b60cf5b7dd4a0c051423b1e9ae4f

- 送审预检机制落地（采纳小酒窝儿《品质改进建议单》，D2 扩展）：send_review_check.py 入库 scripts/，规则=预检不过不发工单+审核人回读 md5 与预检报告一致才开审；首审失败根因=审核通道缺失（GitHub 不可达），送审包落坚果云 /风声协作/送审区/GAP第一批_20261120/（五文件回读闭合）| — | 小眼镜 | 本轮群发

- **仓库首推补登**：content-supply/ 此前仅本地存在（push 缺失，小酒窝儿首审失败真根因），11:45 补推远端 commit 40695d5，DICTIONARY/候选v3/预检器/CHANGELOG API 逐项验证在位；对账小马丫两个悬置（8c8f50f8=拍板前v2/丁已拍已执行）om_x100b60c87cb77cb0cd088176a70f8b2；source_url 分层抽检采纳（GAP-2 验收标准）| — | 小眼镜 | om_x100b60c87cb77cb0cd088176a70f8b2
