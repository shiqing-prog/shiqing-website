> **本站说明（中文）**：本文件是 `/psych` 心理测评板块的许可调研原始记录，用于留存「为什么可以收录/必须回避某个量表」的证据链。
>
> - **本站实际收录（13 个）**：PHQ-9、GAD-7、DASS-21、PHQ-15、mini-IPIP、WHO-5、Flourishing Scale、SWLS、RSES、UCLA-3、ECR-RS，以及**自编非标准化**的「职业兴趣探索（RIASEC）」与「荣格四维偏好速测（16 型）」。
> - **明确回避**：MBTI、MMPI、SCL-90-R、16PF、BDI/BAI、CD-RISC（许可禁止公开题目）、PSS-10（MAPI 授权）、Zung SDS/SAS、BFI-10（授权不明）、O*NET 官方兴趣问卷（CC BY-ND 不允许翻译后分发）、OEJTS（CC BY-NC-SA 的 share-alike 义务，暂不收录，页面已说明）。
> - **自编量表**：不使用任何受版权保护的题目，页面与数据中均标注「非标准化、非 MBTI」。
> - 机器可读数据集见同目录 `instruments.json`；评分逻辑见 `src/lib/psych/scales.ts`，回归自检见 `npm run test:psych`。
> - 注意：如将来想加入 ASRS v1.1（ADHD 6 题，可商用）或 OEJTS，请先按本文件中的许可条款确认署名与 share-alike 要求；ASRS 需使用官方中文 PDF 原文，不得自行翻译。

---

# Curated, license-verified psychological instruments for a self-hosted Chinese-language site

Research pass. Companion machine-readable dataset: `psy_instruments.json` (25 entries, drop-in for a client-side scoring engine).
Every license string below was fetched from the cited page in this session unless marked **UNVERIFIED**.

**Verification legend:** ✅ = rights-holder statement found verbatim · ⚠️ = public-domain *asserted* by reputable secondary sources, no primary statement located · ❌ = restricted / do not ship.

---

## (A) Master table

| slug | EN name | 中文名 | items | response | reverse | subscales | license | source URL |
|---|---|---|---|---|---|---|---|---|
| `phq-9` | Patient Health Questionnaire-9 | 病人健康问卷抑郁量表 / 患者健康问卷-9 | 9 | 0–3 完全不会／有几天／一半以上的天数／几乎每天 | — | — (single total) | ✅ **No permission required to reproduce, translate, display or distribute** | [phqscreeners.com](https://www.phqscreeners.com/select-screener) |
| `gad-7` | Generalized Anxiety Disorder-7 | 广泛性焦虑障碍量表 | 7 | 0–3 同上 | — | — | ✅ same as PHQ-9 | [phqscreeners.com](https://www.phqscreeners.com/select-screener) |
| `phq-2` | PHQ-2 | 患者健康问卷-2 | 2 | 0–3 | — | — | ✅ same | PHQ-9 items 1–2 |
| `gad-2` | GAD-2 | 广泛性焦虑障碍量表-2 | 2 | 0–3 | — | — | ✅ same | GAD-7 items 1–2 |
| `phq-4` | PHQ-4 | 患者健康问卷-4 | 4 | 0–3 | — | 抑郁 1–2 / 焦虑 3–4 | ✅ same | PHQ-2 + GAD-2 |
| `rses` | Rosenberg Self-Esteem Scale | 罗森伯格自尊量表 | 10 | 0–3 很不符合→非常符合 (or 1–4) | 2,5,6,8,9 | — | ⚠️ **Public domain** per university measure libraries; no primary statement | [parqol.org](https://parqol.org/rosenberg-self-esteem-scale-rses/) · [raw items](https://raw.githubusercontent.com/expfactory-experiments/rosenberg-self-esteem-survey/master/survey.tsv) |
| `swls` | Satisfaction With Life Scale | 生活满意度量表 | 5 | 1–7 | — | — | ✅ Copyrighted but **"permitted for non-commercial purposes only"** | [eddiener.com](https://eddiener.com/satisfaction-with-life-scale-swls/) · [中文 PDF](https://eddiener.com/wp-content/uploads/2025/02/SWLS_Chinese.pdf) |
| `flourishing-scale` | Flourishing Scale | 繁荣量表 / 心理繁荣量表 | 8 | 1–7 | — | — | ✅ same **non-commercial only** | [eddiener.com](https://eddiener.com/flourishing-scale-fs/) · [中文 PDF](https://eddiener.com/wp-content/uploads/2025/02/FS_Chinese.pdf) |
| `ucla-3` | Three-Item Loneliness Scale (UCLA-3) | UCLA 孤独量表简版（3条目） | 3 | 1–3 几乎没有／有时／经常 | — | — | ⚠️ Published verbatim as the **UK GSS harmonised standard**; no primary licence | [GOV.UK GSS](https://gss.civilservice.gov.uk/policy-store/loneliness-indicators/) |
| `who-5` | WHO-5 Well-Being Index | WHO-5 幸福感指数 | 5 | 0–5 从来没有→一直 | — | — | ⚠️ WHO copyright — **free permission on request** via WHO permissions form | [WHO-5 questionnaires](https://www.psykiatri-regionh.dk/who-5/who-5-questionnaires/Pages/default.aspx) · [WHO permissions](https://www.who.int/about/policies/publishing/permissions) |
| `dass-21` | Depression Anxiety Stress Scales-21 | 抑郁-焦虑-压力量表简版 | 21 | 0–3 不符合／有时符合／常常符合／总是符合 | — | D 3,5,10,13,16,17,21 · A 2,4,7,9,15,19,20 · S 1,6,8,11,12,14,18 | ✅ **Public domain: "may be downloaded and copied without restriction. However, the scales may not be modified or sold for profit."** | [UNSW DASS](https://www2.psy.unsw.edu.au/groups/dass/down.htm) |
| `mini-ipip` | Mini-IPIP (20-item Big Five) | 迷你IPIP大五人格量表 | 20 | 1–5 非常不准确→非常准确 | 2 per factor | E/A/C/N/I, 4 items each | ✅ **True public domain: "for any purpose, commercial or non-commercial"** | [ipip.ori.org key](https://ipip.ori.org/MiniIPIPKey.htm) · [permission](https://ipip.ori.org/newPermission.htm) |
| `ipip-neo-120` | IPIP-NEO-120 | IPIP-NEO-120 大五人格量表 | 120 | 1–5 | per IPIP keys | 5 domains × 6 facets | ✅ public domain (IPIP) | [ipip.ori.org](https://ipip.ori.org/newNEO_FacetsTable.htm) |
| `oejts` | Open Extended Jungian Type Scales 1.2 | 开放式扩展荣格类型量表（16型） | 60 (32 scored core) | 1–5 bipolar anchors | — | I/E, S/N, T/F, J/P | ✅ **CC BY-NC-SA 4.0** — non-commercial + **share-alike on your adaptation** | [Open Psychometrics](https://www.openpsychometrics.org/tests/OEJTS/) · [license](https://openpsychometrics.org/tests/OEJTS/development/) |
| `onet-ip` | O\*NET Interest Profiler (Mini-IP 30 / Short Form 60) | O\*NET 职业兴趣测评（霍兰德 RIASEC） | 30 or 60 | 1–5 非常不喜欢→非常喜欢 | — | R I A S E C | ✅ **CC BY-ND 4.0 verbatim copying** OR **O\*NET Tools Developer License** for modification ⚠️ a Chinese translation is a derivative → Developer License route required | [onetcenter.org/IP](https://www.onetcenter.org/IP.html) · [60-item PDF](https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf) · [license](https://www.onetcenter.org/license_tools.html) |
| `pss-10` | Perceived Stress Scale (10-item) | 知觉压力量表 | 10 | 0–4 从不→总是 | 4,5,7,8 | — (2-factor optional) | ❌ **Not open.** Permission required via MAPI/ePROVIDE | [CMU scales](https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html) · [ePROVIDE](https://eprovide.mapi-trust.org) |
| `ecr-rs` | **Experiences in Close Relationships – Relationship Structures (ECR-RS)** ⭐ preferred | 亲密关系经历量表-关系结构版 | 9 | 1–7 | 1,2,3,4 | 回避 1–6 · 焦虑 7–9 | ✅ **Author-published, freely usable** — Fraley publishes all items, instructions, scoring key and invites translation: *"If you are interested in translating the ECR-RS from English to another language, please feel free to do so."* | [Fraley lab page (all items)](https://labs.psychology.illinois.edu/~rcfraley/measures/relstructures.htm) |
| `ecr-s` | Experiences in Close Relationships – Short Form | 亲密关系经历量表简版 | 12 | 1–7 | see paper | 焦虑 6 / 回避 6 | ⚠️ **UNVERIFIED** — no licence statement located | [Wei et al. 2007](https://psycnet.apa.org/record/2007-09503-005) |
| `zung-sds` | Zung Self-Rating Depression Scale | Zung 抑郁自评量表 | 20 | 1–4 | 2,5,6,11,12,14,16,17,18,20 | — | ❌ vendor catalogue: **"Costs associated or copyright restricted"** | [restriction evidence](https://kb.medical-objects.com.au/pages/viewpage.action?pageId=114918266) |
| `zung-sas` | Zung Self-Rating Anxiety Scale | Zung 焦虑自评量表 | 20 | 1–4 | 5 positive items (exact key UNVERIFIED) | — | ❌ same as SDS | see above |
| `bfi-10` | Big Five Inventory-10 | 大五人格简版量表 | 10 | 1–5 | **1,3,4,5,7** | E1R+6 · A2+7R · C3R+8 · N4R+9 · O5R+10 | ⚠️ **UNRESOLVED — no published licence grant exists.** Repo licences (Apache-2.0 on `ghoshted/BFI-10`) cover the repo code, not the instrument | [Berkeley BFI-10 transcription](https://socialwork.buffalo.edu/content/dam/socialwork/home/self-care-kit/brief-big-five-personality-inventory.pdf) |
| `asrs-v1.1-6q` | Adult ADHD Self-Report Scale v1.1 – 6-Question Screener | 成人ADHD自评量表（6题筛查版） | 6 | 0–4 从不→非常频繁 | — | 注意缺陷 1–3 / 多动冲动 4–6 | ✅ **"freely available for clinical and non-clinical use, including commercial use, but does require attribution"**; only electronic versions may be created | [NYU TOV licence + downloads](https://license.tov.med.nyu.edu/product/asrs6Qscreener) |

---

## (B) Full item lists

### B1. PHQ-9 ✅ officially free — reproduce as-is

Prompt: *Over the last 2 weeks, how often have you been bothered by any of the following problems?*
中文：在过去两个星期，有多少时候您受到以下任何问题所困扰？

| # | English | 中文（官方简体） |
|---|---|---|
| 1 | Little interest or pleasure in doing things | 做事时提不起劲或没有兴趣 |
| 2 | Feeling down, depressed, or hopeless | 感到心情低落、沮丧或绝望 |
| 3 | Trouble falling or staying asleep, or sleeping too much | 入睡困难、睡不安稳或睡眠过多 |
| 4 | Feeling tired or having little energy | 感觉疲倦或没有活力 |
| 5 | Poor appetite or overeating | 食欲不振或吃太多 |
| 6 | Feeling bad about yourself — or that you are a failure or have let yourself or your family down | 觉得自己很糟，或觉得自己很失败，或让自己或家人失望 |
| 7 | Trouble concentrating on things, such as reading the newspaper or watching television | 对事物专注有困难，例如阅读报纸或看电视时 |
| 8 | Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual | 动作或说话速度缓慢到别人已经察觉；或正好相反——烦躁或坐立不安、动来动去的情况更胜于平常 |
| 9 | Thoughts that you would be better off dead, or of hurting yourself in some way | 有不如死掉或用某种方式伤害自己的念头 |

Response: 0 完全不会 · 1 有几天 · 2 一半以上的天数 · 3 几乎每天
Total 0–27. Bands: **5 轻度 / 10 中度 / 15 中重度 / 20 重度**. Cut-off ≥10 for screening. Plus an unscored functional-impairment item: 毫无困难／有点困难／非常困难／极度困难.

### B2. GAD-7 ✅ officially free — reproduce as-is

Prompt: *Over the last 2 weeks, how often have you been bothered by the following problems?*

| # | English | 中文（辉瑞官方繁体版，已转简体） |
|---|---|---|
| 1 | Feeling nervous, anxious, or on edge | 感到紧张、不安或烦躁 |
| 2 | Not being able to stop or control worrying | 无法停止或控制忧虑 |
| 3 | Worrying too much about different things | 对不同事情过度担忧 |
| 4 | Trouble relaxing | 身心难以放松 |
| 5 | Being so restless that it is hard to sit still | 焦躁不安到难以安静坐着 |
| 6 | Becoming easily annoyed or irritable | 容易心烦或易怒 |
| 7 | Feeling afraid as if something awful might happen | 感到害怕，就像要发生可怕的事情 |

Response: 0–3 identical to PHQ-9. Total 0–21. Bands: **5 轻度 / 10 中度 / 15 重度**. Cut-off ≥10.
The official Pfizer Chinese PDF itself carries: 「無需准許即可複製、翻譯、展示或分發」.

### B3. SWLS ⚠️ non-commercial only

*Below are five statements that you may agree or disagree with. Using the 1–7 scale, indicate your agreement.*

1. In most ways my life is close to my ideal. — 我的生活大致上接近我的理想。
2. The conditions of my life are excellent. — 我的生活条件很好。
3. I am satisfied with my life. — 我对我的生活感到满意。
4. So far I have gotten the important things I want in life. — 到目前为止，我已经得到了我人生中想要的重要东西。
5. If I could live my life over, I would change almost nothing. — 如果人生可以重来，我几乎不会做任何改变。

1–7 = 非常不同意 → 非常同意. Sum 5–35.
Bands: **31–35 非常满意 · 26–30 满意 · 21–25 稍满意 · 20 中立 · 15–19 稍不满意 · 10–14 不满意 · 5–9 非常不满意**.

### B4. Flourishing Scale ⚠️ non-commercial only

1. I lead a purposeful and meaningful life — 我过着有目标、有意义的生活。
2. My social relationships are supportive and rewarding — 我的社会关系是支持性的、令人满意的。
3. I am engaged and interested in my daily activities — 我投入并对我日常的活动感兴趣。
4. I actively contribute to the happiness and well-being of others — 我积极地为他人的幸福与福祉做出贡献。
5. I am competent and capable in the activities that are important to me — 在我所重视的活动中，我是有能力的。
6. I am a good person and live a good life — 我是一个好人，过着良好的生活。
7. I am optimistic about my future — 我对我的未来感到乐观。
8. People respect me — 人们尊重我。

1–7 agreement. Sum **8–56**, higher = more psychological resources. No cut-offs.

### B5. UCLA-3 (Three-Item Loneliness Scale) ⚠️

Prompt: *How often do you feel…* / 您有多经常感到……

1. How often do you feel that you lack companionship? — 您有多经常感到缺少陪伴？
2. How often do you feel left out? — 您有多经常感到被冷落／被排斥？
3. How often do you feel isolated from others? — 您有多经常感到与他人隔绝／孤立？

Response: 1 几乎没有 · 2 有时 · 3 经常. Sum 3–9.
**No accepted cut-off** (explicit in the UK GSS standard) — report means or the % answering 经常.
⚠️ Wording trap: Hughes 2004/NSHAP use "Hardly ever"; the UK GSS standard uses "Hardly ever or never". Not directly comparable — pick one and state it.

### B6. WHO-5 ⚠️ (WHO permission needed)

*Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks.*

1. I have felt cheerful and in good spirits — 我感到心情愉快、精神振奋。
2. I have felt calm and relaxed — 我感到平静和放松。
3. I have felt active and vigorous — 我感到精力充沛、活力十足。
4. I woke up feeling fresh and rested — 我醒来时感到神清气爽、休息充分。
5. My daily life has been filled with things that interest me — 我的日常生活充满了让我感兴趣的事情。

Response: 0 从来没有 · 1 偶尔 · 2 少于一半时间 · 3 多于一半时间 · 4 大部分时间 · 5 一直
Scoring: **raw sum 0–25 × 4 = percentage 0–100**. **<50 = poor well-being**, warrants further testing; ≤28 suggests likely depression.

### B7. BFI-10 ⚠️ licence UNRESOLVED — but the items and key are now verified

Instruction: *How well do the following statements describe your personality?* · Stem: *I see myself as someone who …*

| # | item completion | key | 中文（工作译稿，需审校） |
|---|---|---|---|
| 1 | … is reserved | **R** | ……是内向、拘谨的。 |
| 2 | … is generally trusting | + | ……一般比较信任他人。 |
| 3 | … tends to be lazy | **R** | ……往往比较懒散。 |
| 4 | … is relaxed, handles stress well | **R** | ……是放松的、能很好地应对压力。 |
| 5 | … has few artistic interests | **R** | ……对艺术兴趣不大。 |
| 6 | … is outgoing, sociable | + | ……外向、善于社交。 |
| 7 | … tends to find fault with others | **R** | ……往往爱挑别人的毛病。 |
| 8 | … does a thorough job | + | ……做事踏实彻底。 |
| 9 | … gets nervous easily | + | ……容易紧张。 |
| 10 | … has an active imagination | + | ……想象力丰富。 |

Anchors: 1 Disagree strongly · 2 Disagree a little · 3 Neither · 4 Agree a little · 5 Agree strongly.
Scoring: **E = mean(1R,6) · A = mean(2,7R) · C = mean(3R,8) · N = mean(4R,9) · O = mean(5R,10)**; each 1–5, no total.
⚠️ **My first-pass key (2,4,6,8,10) was WRONG — it was corrected to 1,3,4,5,7 by cross-checking two independent sources that agree exactly.** Do not use the pair-based assumption; the real key is not "the second of each pair."
⚠️ Licence is **UNRESOLVED**, not cleared. The stems are near-verbatim BFI-44 items from the Berkeley / Oliver P. John lab. No published grant of free reproduction exists. **Prefer mini-IPIP**, which is unambiguously public domain.
Sources: https://socialwork.buffalo.edu/content/dam/socialwork/home/self-care-kit/brief-big-five-personality-inventory.pdf (cites the Berkeley `BFI-10.doc` original) and https://raw.githubusercontent.com/ghoshted/BFI-10/main/redcap_instrument/BigFiveInventory10_2024-07-18_1208.zip (`ghoshted/BFI-10`, 1 star, Apache-2.0 — repo licence only).

### B8. DASS-21 ✅ public domain (no modification, no profit)

The 21 items are **not pasted here** because the official PDF is the cleanest source and the licence forbids modification:
- Official response form: https://www2.psy.unsw.edu.au/groups/dass/Download%20files/Dass21.pdf
- Scoring template: https://www2.psy.unsw.edu.au/groups/dass/Download%20files/Dass_template.pdf
- CC BY-SA 4.0 GitHub mirror (PDF + R scoring): https://github.com/jjcurtin/arc_measures/raw/main/DASS21/DASS21.pdf
- UW-Madison page stating "The DASS questionnaire is in the public domain": https://arc.psych.wisc.edu/self-report/depression-anxiety-stress-scale-21-dass21/

Subscale mapping and bands are in section (A) and in `psy_instruments.json`.
⚠️ "may not be modified" — a fresh Chinese translation is a modification. Use an already-published Chinese DASS-21 or contact the authors.

### B9. ECR-RS (9-item attachment) ✅ author-published, freely usable — preferred over ECR-S

Prompt (general form): *Please read each of the following statements and rate the extent to which you believe each statement best describes your feelings about **close relationships in general**.*
中文：请阅读以下陈述，并评价每句话在多大程度上符合你对自己与重要他人关系的感受。

| # | English (general target) | 中文 |
|---|---|---|
| 1 | It helps to turn to people in times of need. | 在需要的时候，向他人求助是有帮助的。 |
| 2 | I usually discuss my problems and concerns with others. | 我通常会与他人谈论我的问题和担忧。 |
| 3 | I talk things over with people. | 我会与他人商量事情。 |
| 4 | I find it easy to depend on others. | 我觉得依赖他人是容易的。 |
| 5 | I don't feel comfortable opening up to others. | 我不太愿意向他人敞开心扉。 |
| 6 | I prefer not to show others how I feel deep down. | 我更愿意不向他人展露我内心深处的感受。 |
| 7 | I often worry that other people do not really care for me. | 我常常担心他人其实并不在乎我。 |
| 8 | I'm afraid that other people may abandon me. | 我害怕他人可能会抛弃我。 |
| 9 | I worry that others won't care about me as much as I care about them. | 我担心他人对我的在乎不如我在乎他们那么多。 |

Scoring: **回避 = mean(items 1–6), reverse-key items 1,2,3,4 · 焦虑 = mean(items 7–9), no reversal.**
Report both dimensions continuously (recommended) or cross high/low to get four attachment styles.
The same 9 stems can be re-administered per target (母亲／父亲／伴侣／好友) by swapping "people/others" for "this person".

### B10. ASRS v1.1 6-Question Screener ✅ free incl. commercial

6 items, 0–4 从不/很少/有时/经常/非常频繁, recall "过去6个月".
Scoring: items 1–3 positive if ≥有时; items 4–6 positive only if ≥经常. **≥4 positives of 6 = symptoms highly consistent with ADHD.**
Official Simplified **and** Traditional Chinese PDFs are in the supporting-documents list on the licence page — use them verbatim, do not re-translate.

---

## (C) Long instruments — exact raw URLs (items NOT pasted)

| instrument | item file URL | dimension mapping |
|---|---|---|
| **PSS-10** | items: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pss.html · scoring: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/html/pssscoring.html | reverse items **4, 5, 7, 8**; optional helplessness 1,2,3,6,9,10 / self-efficacy 4,5,7,8. **No cut-offs** — not a diagnostic instrument. Licence ❌ MAPI/ePROVIDE |
| **mini-IPIP** | https://ipip.ori.org/MiniIPIPKey.htm (complete 20 items + +/- keying on one page) | 4 items per factor: E = 1,6,11,16 · A = 2,7,12,17 · C = 3,8,13,18 · N = 4,9,14,19 · I = 5,10,15,20 (2 reverse-keyed per factor) |
| **IPIP-NEO-120** | https://ipip.ori.org/newNEO_FacetsTable.htm · keys: https://ipip.ori.org/newNEOKey.htm | 5 domains × 6 facets × 4 items. MIT Python scorer: https://github.com/NeuroQuestAi/five-factor-e |
| **OEJTS 1.2** | https://openpsychometrics.org/tests/OEJTS/development/OEJTS1.2.pdf · interactive: https://www.openpsychometrics.org/tests/OEJTS/ | 12 items per dichotomy (I/E, S/N, T/F, J/P); dichotomise at midpoint → 16-type code. CC BY-NC-SA 4.0 |
| **O\*NET Interest Profiler** | 60-item: https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf · score report: https://www.onetcenter.org/dl_tools/ipsf/IP_Score_Report.pdf · career listings: https://www.onetcenter.org/dl_tools/ipsf/IP_Career_Listings.pdf · manual: https://www.onetcenter.org/reports/IP_Manual.html · web 30-item: https://onetinterestprofiler.org/ | equal items per RIASEC area (10 per area in the 60-item form; 5 per area in Mini-IP). Sum per area, top three letters = Holland code; convert raw → 0–100 level via O\*NET normative tables. **Trademark:** "O\*NET® is a trademark of USDOL/ETA" — use as an adjective only |
| **ECR-S** | items are in Wei, Russell, Mallinckrodt & Vogel (2007), *J. Counseling Psychology* 54(2), 187–198 — https://psycnet.apa.org/record/2007-09503-005 | 6 anxiety + 6 avoidance, 1–7; two subscale means; cross to 4 attachment styles. ⚠️ licence UNVERIFIED |
| **Zung SDS / SAS** | items are widely republished but the rights status is ❌ unresolved | SDS: 20 items 1–4, index = raw/80×100, bands 50/60/70. SAS: same structure, ≥50 significant |

---

## (D) Avoid / restricted

### D1. All-rights-reserved — never reproduce items

| instrument | 中文名 | rights holder | why |
|---|---|---|---|
| **MBTI** | MBTI 迈尔斯-布里格斯类型指标 | The Myers-Briggs Company (ex-CPP) | "MBTI", "Myers-Briggs" and the four-letter type codes are **registered trademarks**; all items copyrighted and commercially licensed. Even a look-alike under MBTI branding is infringement. → **use OEJTS 1.2 instead, but never call it MBTI** |
| **MMPI-2 / MMPI-3 / MMPI-A** | 明尼苏达多相人格调查表 | University of Minnesota Press / Pearson | Per-administration licence fee; item reproduction prohibited. No safe substitute. |
| **SCL-90-R / SCL-90** | 症状自评量表 | Pearson (Derogatis) | Copyrighted and sold. The Chinese SCL-90 is ubiquitous in China — ubiquity is not a licence. → **use PHQ-9 + GAD-7 + DASS-21** |
| **16PF** | 卡特尔16种人格因素问卷 | Pearson / IPAT | Commercial, items not openly published. → **use IPIP-NEO-120** |
| **BDI-II / BAI** | 贝克抑郁／焦虑量表 | Pearson (A. T. Beck) | Commercial licence, items not openly published. → **use PHQ-9 / GAD-7 / DASS-21** |
| **CD-RISC 25 / CD-RISC-10** | Connor-Davidson 心理弹性量表 | davidsonresiliencescale.com (licence agreement; site currently unreachable) | Explicit click-through licence. Verbatim terms found in theses that reproduce it: **"You agree (i) not to use the CD-RISC for any commercial purpose unless permission has been granted"** and **"In any publication or report resulting from use of the CD-RISC, you do not publish or partially reproduce items from the CD-RISC"**. → **the licence forbids publishing the items at all.** Do not ship. Use the **Brief Resilience Scale (Smith et al. 2008)**, published open-access |

### D2. Not "restricted-for-sure" but NOT verified open — clear before shipping

| instrument | status | recommendation |
|---|---|---|
| **PSS-10** | CMU routes every request to MAPI/ePROVIDE; free request, but a **formal licence**, not an open licence; non-English translations are the translator's sole IP | Submit the free ePROVIDE request, or substitute the **DASS-21 stress subscale (7 items, public domain)** |
| **Zung SDS / SAS** | No open licence found; a clinical forms catalogue lists SDS as "Costs associated or copyright restricted"; SDS reverse key (2,5,6,11,12,14,16,17,18,20) is verified but the **SAS reverse key remains UNVERIFIED** | **Drop them.** PHQ-9 and GAD-7 cover the same ground and are explicitly free |
| **ECR-S (12-item)** | No licence statement located | **Use the ECR-RS instead** (see row above) — same construct, 9 items, author publishes everything openly and invites translation. Or email the ECR-S corresponding author |
| **WHO-5** | WHO copyright; permission routinely granted free via the WHO form | Submit the WHO permissions form; state non-commercial self-hosted use |
| **BFI-10 / BFI-44 / BFI-2** | **Licence UNRESOLVED** — no published grant of free reproduction exists for the BFI-10 item text; stems are near-verbatim Berkeley BFI-44 items | **mini-IPIP or IPIP-NEO-120 are strictly better licensed** (true public domain incl. commercial). Repo licences on GitHub BFI transcriptions cover the code, not the instrument |
| **ECR (original 36-item) / Brennan, Clark & Shaver 1998** | Verbatim from the Fraley/Shaver measures page: **"Because the chapters are copyrighted by Guilford Press, they should not be reproduced without permission."** | Do not reproduce the original ECR chapter items. **The ECR-RS (9 items) is the open alternative** — the author publishes all items and scoring himself |
| **Rosenberg SES** | Public domain asserted by university measure libraries; no primary statement; the 1965 source is a Princeton UP book | Safe for a **non-commercial** site with full citation. For commercial use, obtain clarification |

### D2b. Research traps to avoid

- **`Alheimsins/b5-inventory`** (1 star, MIT) is named like a Big Five inventory but its `translations/en/questions.json` is **IPIP-NEO-120, not BFI-10**. Do not use it as a BFI-10 source.
- **GitHub repo licences are not instrument licences.** An MIT/Apache-2.0 LICENSE file covers the repository author's code. It grants you nothing with respect to a third-party questionnaire the repo happens to transcribe. Repos found transcribing items under permissive licences: `ghoshted/BFI-10` (Apache-2.0), `mreshtaiwi/Connor-Davidson-Resilience-Scale-CD-RISC-` (MIT — and note the CD-RISC licence *forbids* publishing the items), `VitaliKh/PerceivedStressScale`, `karandeep-singh-bhinder/MINDSCAN`, `alysyuk78-blip/riasec-test` (all unlicensed).
- **No public GitHub repo publishes a clean JSON/YAML/TSV item file for O\*NET IP, PSS-10, CD-RISC, Zung, UCLA-3 or WHO-5.** For O\*NET the authoritative programmatic route is [O\*NET Web Services — Interest Profiler](https://services.onetcenter.org/ip) plus the [paper item list PDF](https://www.onetcenter.org/dl_tools/ipsf/Interest_Profiler.pdf). For WHO-5 the MDM Portal carries all 5 items + 6 anchors in EN and ZH ([EN](https://mdm.mi.uni-heidelberg.de/46186?form-lang=en) · [ZH](https://mdm.mi.uni-heidelberg.de/46186?form-lang=zh)) listed there as CC BY-NC 4.0 — **note this conflicts with WHO's own copyright claim, so clear it with WHO rather than relying on MDM's label.**

### D3. Commercial-use restrictions only (fine for a personal non-commercial site)

These may ship on a **free, non-commercial, self-hosted** site with attribution, but **not** if you ever monetise:

- **SWLS** — "The use of this scale is permitted for non-commercial purposes only."
- **Flourishing Scale** — same wording, same author.
- **OEJTS 1.2** — CC BY-NC-SA 4.0. Two extra obligations: (i) no commercial use, (ii) **share-alike** — your Chinese adaptation must itself be released under CC BY-NC-SA 4.0, and you must credit the Open-Source Psychometrics Project.
- **SPANE** (Scale of Positive and Negative Experience, Diener) — same non-commercial terms family as SWLS/FS.

### D4. Derivative-work traps to watch

- **O\*NET Interest Profiler** — CC BY-ND 4.0 permits *verbatim* copying only. A Chinese translation is a **derivative**, so CC BY-ND does **not** cover it. Use the **O\*NET Tools Developer License** (free; requires crediting O\*NET/USDOL and validating your product). Mark your Chinese version clearly as modified and unendorsed, using O\*NET's prescribed attribution text.
- **DASS-21** — "the scales may not be modified". A fresh translation is a modification. Use a published Chinese DASS-21.
- **ASRS v1.1** — "no other modifications, other than creating electronic versions, are permitted". Use the official Mandarin/Traditional Chinese PDFs verbatim.
- **OEJTS** — share-alike obligation as above.

---

## (E) Recommended shippable minimum set

Highest legal certainty + best Chinese-language availability + good coverage:

`phq-9` · `phq-2` · `gad-7` · `gad-2` · `rses` · `swls` · `flourishing-scale` · `ucla-3` · `who-5` (after WHO permission) · `dass-21` · `mini-ipip` · `oejts` · `ecr-rs` · `asrs-v1.1-6q`

Mandatory disclaimers for every result page (Chinese):

> 自评量表仅供筛查与自我了解，**不能作为诊断依据**。
> 如有自伤或危机念头，请立即联系当地心理援助热线。

**PHQ-9 item 9 safety rule:** if item 9 scores > 0, show the crisis interstitial *immediately*, before any score page. Do not wait for the total. Verify hotline numbers are current before publishing — and make them configurable rather than hard-coded.

Sources compiled during this pass:
- PHQ/GAD-7 licence and downloads — https://www.phqscreeners.com/select-screener
- IPIP public-domain statement — https://ipip.ori.org/newPermission.htm
- Diener scales permission terms — https://eddiener.com/satisfaction-with-life-scale-swls/ and https://eddiener.com/flourishing-scale-fs/
- DASS terms — https://www2.psy.unsw.edu.au/groups/dass/down.htm
- O\*NET tool licences — https://www.onetcenter.org/license_tools.html and https://www.onetcenter.org/license_db.html
- PSS permission route — https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html
- WHO permissions — https://www.who.int/about/policies/publishing/permissions
- OEJTS licence — https://openpsychometrics.org/tests/OEJTS/development/
- ASRS v1.1 licence + official Chinese PDFs — https://license.tov.med.nyu.edu/product/asrs6Qscreener
- UCLA-3 exact wording as a government standard — https://gss.civilservice.gov.uk/policy-store/loneliness-indicators/
- Zung restriction evidence — https://kb.medical-objects.com.au/pages/viewpage.action?pageId=114918266
- Rosenberg public-domain assertion — https://parqol.org/rosenberg-self-esteem-scale-rses/
