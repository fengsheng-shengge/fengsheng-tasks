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

- 小酒窝儿首次「通过」回执退回（om_x100b60c80dbbccb4b49015db7ca1887）：回执按 v2 旧值复述（md5 8c8f50f8/分布 2557-875-1776），未实际取件；我方三方复核（本地=坚果云=预检报告）均为 d1387551 无漂移；发 5 分钟快审包（md5 d1387551+三数对照/或跑预检器）；RISK 无二次送审（v3 即终态）；commit 挂起等 v3 回执 | — | 小眼镜 | om_x100b60c80dbbccb4b49015db7ca1887

- 技术线 #245 P0 四件套+证据包导出页交付验收（8 commit 全线上）：过期过滤与字典时效口径对齐✓、立场签过渡=机构立场不造假✓；渲染门禁两条交付组件侧（CITY CONDITIONAL 不亮绿/RISK 830 derived+note 非 official）；技术线清单旧基准 8c8f50f8 更正为 d1387551；衔接时序=今晚 commit→authority.json 交付组件 | — | 小眼镜 | om_x100b60c81457f4b8b4b0c63b7cc5094

- **GAP 第一批一次性 commit 完成（全链闭环）**：主库 bc614c84→c1f76527，expect_count 6122（CITY 21 CONDITIONAL 不落），note 830/auth_raw 8/source 6143+raw 5078；分片 manifest v1.1 重切；三端一致（GitHub a395d5e/坚果云/本地）；组件交付件 authority.json 5d927195（6122 条+conditional_ids+渲染门禁三条）；小酒窝儿 v3 回执授权生效（核验真实，转述数字串行已勘误）；新规则=回执禁手抄数字必须贴脚本输出（对齐规则第 6 条）| c1f76527 | 小眼镜 | om_x100b60c8cc767caccd09ee34776265d

### 🔴 authority 第一批落库成功（信用资产核心里程碑 · 小扣子补登）

| 核验项 | 值 | 证据 |
|---|---|---|
| 主库 md5 | **c1f76527**（bc614c84 → c1f76527）| `md5sum data/entries.json` |
| expect_count | **6122/6143**（21 条 CITY CONDITIONAL 按规则留空）| 小酒窝儿回执 + L2 交叉表 |
| authority 分布 | official=1702 · court=879 · industry=907 · data=28 · derived=2606 · 空=21 | entryType × authority 交叉表 |
| 分片同步 | v3/split manifest v1.1 · 9 分片 6143 闭合 | 重切分片含 authority |
| authority.json 组件 | md5 **5d927195**（6122 条 + conditional_ids 21 + 渲染门禁三条）| content-supply/data/authority.json |
| 审核链 | 小酒窝儿 v3 重审通过（send_review_check.py v1.1 PASS + md5 d1387551 + 抽检 20 条映射链路）| 群内回执 |
| commit | **a395d5e**（一次性 commit，含数据+分片+CHANGELOG+authority.json）| git log |
| EvidenceLink 徽章 | 8 页全覆盖显示真实 authority 值，不再靠 deriveEntryAuth() 兜底推导 | 浏览器 search 页验证 PASS |

**entryType × authority 交叉表**：
- LAW=1226 / POL=476 → official（1702）
- CASE=871 / RISK 案号型=8 → court（879）
- STD=453 / TERM=454 → industry（907）
- DATA=28 → data（28）
- PROC=1301 / RISK 830 + ABIL/KNOWLEDGE 等 → derived（2606）
- CITY=21 → 空（CONDITIONAL，补证前不落 authority）

**信用资产更新**：《品质手册》A4.3 条目修订为「送审通道标准化+版本锚定（2026-11-20）」— 预检器 send_review_check.py v1.1 强制 md5 回读，三要素锁定（主库 md5 + 填充数 + 空值规则），审核人回读 md5 与预检报告一致才开审。| 字典 v1.3.3 | 小眼镜（治理）+ 小酒窝儿（门禁）| 小扣子（commit）| 群内回执
- 字典 v1.3.4：stance 字段登记归口（小豆子 12.31 清单 #1）——v1 全库机构级默认值正式化立场签（随下次治理批落库），真人级前置=生产归属映射表（主库无 owner 字段，不虚承诺）；source_url 优先级建议：12.31 前 LAW 1226+CASE 871 优先覆盖（消费者点开凭证价值最高），flk 管道周五首批 50 部起不变 | v1.3.4 | 小眼镜 | 本轮群发

- 技术线 #245 里程碑对接验收：EvidenceLink 徽章 PASS（LAW official/DATA data/KNOWLEDGE derived 三值域标准样本）+Worker 9 endpoint 审计+scene/entries 补 evidence 字段（9→19），12.31 开发侧硬指标全达成；stance 字段 v1.3.4 归口（v1 机构级默认值随治理批落库/真人级前置=生产归属映射表，主库无 owner 字段不虚承诺）；source_url 优先级建议 LAW 1226+CASE 871 先行 | v1.3.4 | 小眼镜 | om_x100b60c882e584b0c48c7fa73f75b35 + om_x100b60c883d7c0a8b4fb0629721ae5c

## 2026-11-22 · superseded 首批 preview + 字典 v1.3.5（生哥指令：查收小马丫采集结果→同步字典仓库→推小扣子）

- **查收**：小马丫群文件直发《财税2016-23号废止影响清单_20261121.csv》（om_x100b7f1*19:13），主库全量扫描财税〔2016〕23号废止影响，命中 **21 条**（多法源 6 / 单法源 15）
- **落位**：`updates/preview/superseded_batch1_2016_23_20261122.json`（md5 **e371ff86**，21 条结构化：id/domain/name/legalRef/has_source_url/reference_type/hit_mode/disposal；D1 必填完整性 PASS / id 唯一 PASS）。按守门协议 preview 状态，**待小酒窝儿审核后转正 data/**
- **处置口径两类**：①多法源条目剔除失效文件，按剩余法源取首个命中挂链；②单法源且已废止，改引财政部 税务总局 住房城乡建设部公告 2024 年第 16 号后挂链
- **字典 v1.3.5**：登记 `law_version`/`superseded` 字段口径；基准库行更新 bc614c84→**00c2e150**（含 GAP1 authority 落库+328aab0 话术修正；11-21 sync 回退事故修复，旧 md5 退役）
- **推达**：小扣子（留痕参考+调取协议锁定 md5 e371ff86）；小酒窝儿（发起 preview 审核）| v1.3.5 | 小眼镜（归口）+ 小马丫（采集）| 本轮群发

## 2026-11-24
- **家装服务域 P0 批 1 特批入库（域从 0 建设首批）**：25 条直入 data/domains/家装服务.json（原空数组）——域总纲 JZ-SUM-001×1 + 能力定义 ABIL×13（DSGN-4/PROJ-4/SOFT-5，双角色 SOP+13 维模型）+ 已核验标准锚点×11（GB 50242-2002 4.2.1 打压/0.8话术辨析 RISK/通水 4.2.2、JGJ 298-2013 5.3.3 防水高度、住建部保障房防水 2m 口径、GB 50325-2020 甲醛 0.07、GB/T 18883-2022 0.08、E1/E0/ENF 分级、京津冀示范文本 BTHF-2023-0201 变更单/附件体系/保修 7 日）| 特批依据=生哥 11-24“开始跑吧”（bypass_audit+trust_level 0.85）| 小眼镜 | preview 备案：家装P0_batch1_特批_20261124.json（待小酒窝儿复核）
- **字典 v1.3.6**：字段总表登记 trust_level/approval_source/bypass_audit 三字段（特批链路口径：仅生哥明确指令适用） | v1.3.6 | 小眼镜 | om_x100b7f7b633fd0b8dd1727243155f99
- **省积分分工（生哥 11-24 指令）**：家装语料扩采（验收流程 PROC 词条素材/剩余国标目录/各地合同示范文本/增项纠纷判例）→ 小马丫采集落交接区；小眼镜保留体系设计+循证核验+五关质检+定稿入库
