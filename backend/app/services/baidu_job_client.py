"""
百度百聘 API 客户端 + 智能相关性过滤 + 时效性校验

核心策略：
1. 使用百度百聘 API 获取真实招聘数据
2. 通过"语义近义词扩展"增加搜索覆盖面
3. 用"标题相关性评分"严格过滤掉不相关的结果
4. 通过详情页获取发布时间，只保留近 3 个月内的有效职位
5. 保证返回结果的质量优先于数量
"""
import asyncio
import httpx
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Set, Tuple


class BaiduJobClient:
    """百度百聘 API 客户端（附带智能去噪）"""

    def __init__(self):
        self.base_url = "https://yiqifu.baidu.com/g/aqc/joblist/getDataAjax"
        self.headers = {
            "Referer": "https://yiqifu.baidu.com/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }

        # 常见城市行政区划代码
        self.city_codes: Dict[str, str] = {
            "北京": "110000", "上海": "310000", "广州": "440100",
            "深圳": "440300", "杭州": "330100", "成都": "510100",
            "武汉": "420100", "南京": "320100", "西安": "610100",
            "长沙": "430100", "重庆": "500000", "苏州": "320500",
            "天津": "120000", "合肥": "340100", "郑州": "410100",
            "东莞": "441900", "佛山": "440600", "珠海": "440400",
            "厦门": "350200", "青岛": "370200", "大连": "210200",
            "宁波": "330200", "济南": "370100", "福州": "350100",
            "昆明": "530100", "贵阳": "520100", "南宁": "450100",
            "太原": "140100", "石家庄": "130100", "哈尔滨": "230100",
            "沈阳": "210100", "长春": "220100", "兰州": "620100",
        }

        # 职位级别词，用于区分岗位层级
        self.senior_keywords = {
            "架构师", "总监", "专家", "负责人", "首席", "高级",
            "资深", "主任", "经理", "Director", "Lead", "Principal",
            "Senior", "Chief", "VP",
        }

        self.junior_keywords = {
            "实习", "初级", "助理", "安全员",
        }

    # ------------------------------------------------------------------
    # 公共入口
    # ------------------------------------------------------------------
    async def search_jobs(
        self,
        query: str,
        location: str = "",
        limit: int = 10,
    ) -> List[Dict]:
        """
        智能搜索职位
        
        核心流程：
        1. 生成同义搜索词组（如 "安全架构师" → ["安全架构师", "信息安全 架构", "网络安全 高级", ...])
        2. 对每个搜索词调用百度百聘 API
        3. 去重 + 相关性评分过滤
        4. 按相关性排序返回
        """
        search_terms = self._generate_search_terms(query)
        district = self.city_codes.get(location, "")

        all_raw_jobs: List[Dict] = []
        seen_ids: Set[str] = set()

        def _merge(jobs_batch: List[Dict]):
            """去重合并"""
            for job in jobs_batch:
                dedup_key = job.get("raw_data", {}).get("jobId", "")
                if not dedup_key:
                    dedup_key = f"{job['title']}|{job['company']}"
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_raw_jobs.append(job)

        # 同时搜索：指定城市 + 全国范围（不加 district），多页
        # NOTE: 候选池上限，避免请求过多导致搜索变慢
        max_candidates = limit * 5
        for term in search_terms:
            if len(all_raw_jobs) >= max_candidates:
                break
            # 指定城市搜索
            if district:
                fetched = await self._fetch_jobs(term, district, page_size=20)
                _merge(fetched)
            # 全国搜索（不限地区，覆盖更多数据源）
            for page in range(1, 3):
                if len(all_raw_jobs) >= max_candidates:
                    break
                fetched = await self._fetch_jobs(
                    term, "", page_size=20, page=page
                )
                _merge(fetched)
                if len(fetched) < 5:
                    break

        logging.info(
            f"多策略搜索 '{query}' @ '{location}': "
            f"共 {len(search_terms)} 个词组, "
            f"原始去重后 {len(all_raw_jobs)} 条"
        )

        # 严格相关性过滤：硬性要求标题必须包含原始关键词
        scored_jobs = []
        target_kw = query.lower().strip()
        
        for job in all_raw_jobs:
            title = job.get("title", "").lower()
            if target_kw in title:
                scored_jobs.append(job)
                
        logging.info(f"严格匹配过滤 (标题包含 '{query}'): {len(scored_jobs)} 条")


        # 获取发布时间并过滤掉超过 3 个月的旧职位
        fresh_jobs = await self._filter_by_freshness(scored_jobs)
        logging.info(f"时效性过滤后: {len(fresh_jobs)} 条（仅保留近 3 个月）")

        return fresh_jobs[:limit]

    # ------------------------------------------------------------------
    # 搜索词生成
    # ------------------------------------------------------------------
    def _generate_search_terms(self, query: str) -> List[str]:
        """
        严格模式：仅使用用户输入的原始词，不进行语义扩展。
        """
        return [query]

        # 识别核心领域词和级别词
        domain, level = self._decompose_query(query)

        if domain and level:
            # 原词拆开用空格连接
            terms.append(f"{domain} {level}")

            # 同义领域词
            domain_synonyms = self._get_domain_synonyms(domain)
            for syn in domain_synonyms:
                terms.append(f"{syn} {level}")

            # 同义级别词
            level_synonyms = self._get_level_synonyms(level)
            for lsyn in level_synonyms:
                terms.append(f"{domain} {lsyn}")

        elif domain:
            # 只有领域词没有级别词
            domain_synonyms = self._get_domain_synonyms(domain)
            for syn in domain_synonyms:
                terms.append(syn)

        # 去重，保持顺序
        seen: Set[str] = set()
        unique_terms: List[str] = []
        for t in terms:
            if t not in seen:
                seen.add(t)
                unique_terms.append(t)

        return unique_terms

    def _decompose_query(self, query: str) -> Tuple[str, str]:
        """
        将查询词拆解为「领域」和「级别/角色」两部分
        例如：
        - "安全架构师" → ("安全", "架构师")
        - "网络安全工程师" → ("网络安全", "工程师")
        - "Java开发" → ("Java", "开发")
        """
        # 常见角色后缀（从长到短排列，优先匹配长后缀）
        role_suffixes = [
            "架构师", "工程师", "总监", "专家", "负责人",
            "经理", "主管", "顾问", "分析师", "研究员",
            "设计师", "运维", "开发",
        ]
        for suffix in role_suffixes:
            if query.endswith(suffix) and len(query) > len(suffix):
                domain = query[: -len(suffix)].strip()
                return domain, suffix
            # 也处理 "高级XX工程师" 这种前缀情况
            idx = query.find(suffix)
            if idx > 0:
                domain = query[:idx].strip()
                level = query[idx:].strip()
                return domain, level

        return query, ""

    def _get_domain_synonyms(self, domain: str) -> List[str]:
        """获取领域的同义/近义词"""
        synonym_map: Dict[str, List[str]] = {
            "安全": ["信息安全", "网络安全", "安全管理"],
            "信息安全": ["安全", "网络安全", "数据安全"],
            "网络安全": ["安全", "信息安全", "网络"],
            "数据安全": ["安全", "数据", "信息安全"],
            "前端": ["Web前端", "前端开发"],
            "后端": ["服务端", "后端开发"],
            "Java": ["Java开发", "后端"],
            "Python": ["Python开发"],
            "AI": ["人工智能", "机器学习"],
            "运维": ["DevOps", "SRE", "系统运维"],
            "测试": ["QA", "测试开发", "质量"],
            "产品": ["产品管理", "产品设计"],
        }
        return synonym_map.get(domain, [])

    def _get_level_synonyms(self, level: str) -> List[str]:
        """获取级别/角色的同义词"""
        synonym_map: Dict[str, List[str]] = {
            "架构师": ["高级", "专家", "负责人"],
            "工程师": ["开发", "研发"],
            "总监": ["负责人", "VP"],
            "专家": ["高级", "资深"],
            "经理": ["主管", "负责人"],
            "负责人": ["总监", "经理"],
        }
        return synonym_map.get(level, [])

    # ------------------------------------------------------------------
    # 相关性评分和过滤
    # ------------------------------------------------------------------
    def _score_and_filter(
        self,
        original_query: str,
        target_location: str,
        jobs: List[Dict],
    ) -> List[Dict]:
        """
        对搜索结果做相关性评分和过滤
        
        评分维度：
        1. 标题与原始关键词的语义相关性（核心权重）
        2. 地理位置匹配
        3. 岗位级别匹配（避免高级搜到初级）
        4. 薪资合理性
        """
        domain, level = self._decompose_query(original_query)
        domain_synonyms = set(self._get_domain_synonyms(domain))
        domain_synonyms.add(domain)

        scored: List[Tuple[float, Dict]] = []

        for job in jobs:
            title = job.get("title", "").lower()
            location = job.get("location", "")
            salary = job.get("salary_range", "")
            score = 0.0

            # ----- 1. 标题领域匹配（0-50 分）-----
            # 标题中必须包含至少一个领域关键词，否则直接跳过
            domain_hit = False
            for kw in domain_synonyms:
                if kw.lower() in title:
                    domain_hit = True
                    score += 30
                    break

            if not domain_hit:
                # 标题与搜索领域完全无关，直接淘汰
                continue

            # 精确匹配原始关键词加分
            if original_query.lower() in title:
                score += 20

            # ----- 2. 标题级别匹配（0-20 分）-----
            if level:
                if level.lower() in title:
                    score += 20
                else:
                    # 级别同义词匹配
                    level_syns = self._get_level_synonyms(level)
                    for ls in level_syns:
                        if ls.lower() in title:
                            score += 10
                            break

            # ----- 3. 地理位置匹配（0-15 分）-----
            if target_location and target_location in location:
                score += 15
            elif target_location and target_location not in location:
                # 地点不匹配，降低优先级但不完全淘汰
                score -= 5

            # ----- 4. 过滤明显不匹配的层级 -----
            # 如果搜的是架构师/总监/专家级别，过滤掉初级/实习岗位
            if level in self.senior_keywords:
                for junior in self.junior_keywords:
                    if junior in title:
                        score -= 30
                        break

            # ----- 5. 薪资合理性 -----
            min_salary = self._parse_min_salary(salary)
            if level in {"架构师", "总监", "专家", "负责人", "首席"}:
                # 高级岗位月薪低于 15000 明显不匹配
                if min_salary > 0 and min_salary < 15000:
                    score -= 30

            scored.append((score, job))

        # 相关性门槛：至少要得到 15 分才保留（领域匹配=30 分基础上有余量）
        scored = [(s, j) for s, j in scored if s >= 15]
        scored.sort(key=lambda x: x[0], reverse=True)

        return [j for _, j in scored]

    def _parse_min_salary(self, salary_str: str) -> int:
        """从薪资字符串中提取最低薪资数值"""
        if not salary_str:
            return 0
        match = re.search(r"(\d+)", salary_str.replace(",", ""))
        if match:
            return int(match.group(1))
        return 0

    # ------------------------------------------------------------------
    # HTTP 请求
    # ------------------------------------------------------------------
    async def _fetch_jobs(
        self,
        query: str,
        district: str = "",
        page_size: int = 20,
        page: int = 1,
    ) -> List[Dict]:
        """从百度百聘 API 获取职位列表"""
        try:
            params = {
                "q": query,
                "page": str(page),
                "pagesize": str(page_size),
                "district": district,
                "salaryrange": "",
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    self.base_url,
                    headers=self.headers,
                    params=params,
                )

                if response.status_code == 200:
                    data = response.json()
                    inner = data.get("data")
                    if data.get("status") == 0 and inner:
                        raw_jobs = inner.get("list", [])
                        total = inner.get("total", 0)
                        logging.info(
                            f"百度百聘: '{query}'(d={district}) → "
                            f"{len(raw_jobs)}/{total} 条"
                        )
                        return [self._parse_job(j) for j in raw_jobs]

                logging.warning(
                    f"百度百聘 API 请求失败: HTTP {response.status_code}"
                )
                return []

        except Exception as e:
            logging.error(f"百度百聘 API 调用异常: {e}")
            return []

    def _parse_job(self, job: Dict) -> Dict:
        """解析百度百聘返回的单条职位数据"""
        title = re.sub(r"</?em>", "", job.get("jobName", "未知职位"))

        # 优先使用百度详情页链接（稳定可访问），备选原平台链接
        detail_url = job.get("detailUrl") or ""
        source_url = detail_url or job.get("jumpUrl") or ""

        return {
            "title": title,
            "company": job.get("company", "未知公司"),
            "location": job.get("city", "未知地区"),
            "salary_range": job.get("salary", "面议"),
            "experience_required": job.get("exp", "不限"),
            "education": job.get("edu", "不限"),
            "description": (
                f"职位: {title}\n"
                f"公司: {job.get('company', '')}\n"
                f"地点: {job.get('city', '')}\n"
                f"薪资: {job.get('salary', '面议')}\n"
                f"学历: {job.get('edu', '不限')}\n"
                f"经验: {job.get('exp', '不限')}"
            ),
            "source_url": source_url,
            "detail_url": detail_url,
            "source_platform": job.get("source", "百度百聘"),
            "publish_date": None,  # 稍后通过详情页获取
            "raw_data": job,
        }

    # ------------------------------------------------------------------
    # 时效性过滤
    # ------------------------------------------------------------------
    # 特殊标记：职位已下架
    _EXPIRED_MARKER = "EXPIRED"

    async def _filter_by_freshness(
        self,
        jobs: List[Dict],
        max_age_days: int = 90,
    ) -> List[Dict]:
        """
        并发获取每个职位的发布时间，过滤掉超过 max_age_days 天的职位。
        
        过滤规则：
        - 详情页 404 / 已下架 → 直接淘汰
        - 发布时间超过 max_age_days → 淘汰
        - 无法获取时间（反爬/异常）→ 保留但标记为"未知"
        """
        if not jobs:
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)

        # 并发请求所有详情页（限制并发度避免被封）
        semaphore = asyncio.Semaphore(5)
        async def fetch_with_limit(job: Dict) -> Optional[Dict]:
            async with semaphore:
                return await self._fetch_single_publish_date(job)

        results = await asyncio.gather(
            *[fetch_with_limit(job) for job in jobs],
            return_exceptions=True,
        )

        fresh_jobs: List[Dict] = []
        for job, result in zip(jobs, results):
            if isinstance(result, Exception):
                job["publish_date"] = "未知"
                fresh_jobs.append(job)
                continue

            # 详情页 404 / 已下架 → 直接过滤
            if result == self._EXPIRED_MARKER:
                logging.info(
                    f"[时效过滤] 淘汰已下架职位: {job['title']} "
                    f"(详情页 404 / 已失效)"
                )
                continue

            if result is None:
                job["publish_date"] = "未知"
                fresh_jobs.append(job)
                continue

            pub_date, pub_str = result
            job["publish_date"] = pub_str

            if pub_date >= cutoff:
                fresh_jobs.append(job)
            else:
                logging.info(
                    f"[时效过滤] 淘汰旧职位: {job['title']} "
                    f"(发布于 {pub_str}, 超过 {max_age_days} 天)"
                )

        return fresh_jobs

    async def _fetch_single_publish_date(
        self, job: Dict
    ) -> Optional[tuple]:
        """
        从百度详情页获取职位的发布时间
        
        返回:
        - (datetime, str): 成功解析的发布日期
        - "EXPIRED": 页面 404 / 职位已下架
        - None: 无法获取时间（反爬/格式异常）
        """
        detail_url = job.get("detail_url", "")
        if not detail_url:
            return None

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    detail_url,
                    headers=self.headers,
                    follow_redirects=True,
                )

                if resp.status_code != 200:
                    return self._EXPIRED_MARKER

                html = resp.text

                # 检测 404 / 已下架页面
                if "页面不存在" in html or "NOT FOUND" in html:
                    return self._EXPIRED_MARKER

                # 检测百度安全验证页面（反爬触发）
                if "百度安全验证" in html and len(html) < 3000:
                    logging.debug(f"触发反爬验证: {job.get('title', '')}")
                    return None

                # 策略 1：从 window.pageData JSON 中提取 publishtime
                pd_match = re.search(
                    r'window\.pageData\s*=\s*({.*?});', html, re.DOTALL
                )
                if pd_match:
                    try:
                        page_data = json.loads(pd_match.group(1))
                        pub_time = page_data.get("result", {}).get(
                            "publishtime", ""
                        )
                        if not pub_time:
                            pub_time = (
                                page_data.get("result", {})
                                .get("jobDetail", {})
                                .get("startDate", "")
                            )
                        if pub_time:
                            return self._parse_date(pub_time)
                    except (json.JSONDecodeError, KeyError):
                        pass

                # 策略 2：正则直接从 HTML 中提取日期
                date_match = re.search(
                    r'publishtime[":\s]*"?(\d{4}-\d{2}-\d{2})', html
                )
                if date_match:
                    return self._parse_date(date_match.group(1))

                # 策略 3：查找 datePublished schema
                date_match2 = re.search(
                    r'datePublished[":\s]*"?(\d{4}-\d{2}-\d{2})', html
                )
                if date_match2:
                    return self._parse_date(date_match2.group(1))

        except Exception as e:
            logging.debug(f"获取发布时间失败 ({job.get('title', '')}): {e}")

        return None

    def _parse_date(self, date_str: str) -> Optional[tuple]:
        """将日期字符串解析为 (datetime, 格式化字符串)"""
        # 清理可能包含的时区和时间部分
        clean = date_str.strip().split("T")[0].strip()
        try:
            dt = datetime.strptime(clean, "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
            return dt, clean
        except ValueError:
            return None


baidu_job_client = BaiduJobClient()
