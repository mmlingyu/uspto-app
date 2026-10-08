# 商标查询

用中文检索美国专利商标局（USPTO）的联邦商标。界面写的是「商标查询」，不是版权查询：这个数据源没有著作权记录。

桌面端覆盖 Windows、macOS、Linux。同一套界面也可以当本地网页用。查询由本机服务代发，避免浏览器跨域，并限制请求频率。结果全部来自 USPTO 实时接口，程序里没有样例数据。

## 环境

- Node.js 22 或更新版本
- 桌面版额外会下载 Electron。Linux 上若窗口起不来，先安装 `libgtk-3-0`、`libnss3`、`libasound2`

## 开发

```bash
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:43123](http://127.0.0.1:43123)。

`npm run dev` 会同时启动：

- 网页：Vite，端口 `43123`
- 接口代理：`43124`，网页把 `/api` 转到这里

## 生产网页

```bash
npm run build
npm start
```

`npm start` 在 `43123` 同时提供页面和 `/api`。默认只监听 `127.0.0.1`。

## 桌面应用

```bash
npm run desktop
```

这条命令会先构建页面、本机服务和 Electron 主进程，再打开窗口。窗口加载的是本机服务，不是直接请求 USPTO。外部链接（包括 TSDR）用系统浏览器打开。

各平台安装包：

| 系统 | 命令 | 说明 |
| --- | --- | --- |
| Linux | `npm run dist:linux` | 生成 AppImage 和 deb，输出在 `release/` |
| Windows | `npm run dist:win` | 生成 NSIS 安装包。在 Linux 上交叉打包通常还需要 Wine |
| macOS | `npm run dist:mac` | 生成 dmg。需要在 macOS 上执行，签名和公证另计 |

`npm run check` 只检查查询体和每日次数的本地逻辑，不会访问 USPTO。

## 界面

- 文字商标、状态（全部 / 有效 / 失效）、申请人或权利人、国际分类（1–45）、申请号、注册号
- 结果列出商标名称、申请号、注册号、状态、权利人、国际分类、申请日、注册日
- 点一条记录看详情。状态码尽量译成中文，并保留 USPTO 英文原文
- 详情里的「打开 USPTO 官方记录（TSDR）」指向 `https://tsdr.uspto.gov/#caseNumber=申请号&caseType=SERIAL_NO&searchType=statusSearch`
- 本页结果可导出 CSV（带 UTF-8 BOM，Excel 能直接打开中文）或 xlsx
- 最近查询保存在本机浏览器存储里
- 没有结果、网络失败、访问防护、频率过高、翻页超出范围，都有中文说明

每天成功查询默认 **5 次**，按本机日期零点重置。页脚有一行「今日剩余 N 次」。翻页也算一次，因为会再请求接口。打开详情、看图样、导出、点 TSDR 链接都不计数。用完后会提示：「今日免费查询次数已用完（5/5），明天再来」。

## 维护者说明（每日次数与解除限制）

这一节给维护应用的人。普通界面上没有这些入口，也不要写进面向使用者的提示里。

隐藏入口有两种：

1. 打开页脚「关于」，在两次点击间隔不超过 2 秒的情况下，连续点击「版本 1.0.0」七次。
2. 快捷键 `Ctrl+Alt+U`。macOS 上是 `Command+Alt+U`。

随后出现「输入代码」。默认代码是 `mark-open-8841`，区分大小写。正确后，这台设备不再限制每日次数，并一直保存在本机。错误只显示「代码不正确」。

源码和构建产物里不保存这段明文，只比较 SHA-256：

`b20a456461aee8bc5b2163ecfb52cec4ecf8bf6551a98810d355e29d4d46af21`

更换代码时在构建或启动开发服务器前设置环境变量，不要把新代码写进源码：

```bash
UNLOCK_CODE='你的新代码' npm run dev
UNLOCK_CODE='你的新代码' npm run build
UNLOCK_CODE='你的新代码' npm run desktop
```

已经打开的开发服务器或已经打好的安装包不会跟着变，需要重新启动或重新构建。

次数和解锁状态写在本机 `localStorage` 和 IndexedDB 里，并用设备号加校验。改坏校验会把当天次数视为已用完。清空整个站点数据可以重置，这是本地限制，没有账号服务器。直接调用本机 `/api/search` 可以绕过计数；给普通使用者用的界面不会这么做。

## 接口是怎么接上的

2026-10-08 用真实请求核对过，不是凭文档猜测。官方页面是 [https://tmsearch.uspto.gov/search/search-results](https://tmsearch.uspto.gov/search/search-results)。页面加载的 `configuration.json` 把检索地址写成：

`serviceUrlSearchElastic = https://tmsearch.uspto.gov/prod-stage-v1-0-0/`

本应用调用的就是 `POST https://tmsearch.uspto.gov/prod-stage-v1-0-0/tmsearch`。同日 `POST https://tmsearch.uspto.gov/prod-v1-0-0/tmsearch` 对 “apple” 也返回了相同的 `totalValue: 4169`，但官方配置指向 stage 这段路径，所以默认用 stage。可用环境变量 `TMSEARCH_URL` 换地址。

### 请求

- 方法：`POST`，`Content-Type: application/json`
- 不带 body 的 `GET` 返回 API Gateway `502`，`{"message":"Internal server error"}`
- `OPTIONS` 返回 `200`，`Access-Control-Allow-Origin: *`，允许 `GET, POST, PATCH, PUT, DELETE, OPTIONS`，允许头 `Content-Type`
- 用 `Origin: http://127.0.0.1:43123` 再发 `POST` 仍然是 `200`，响应里同样是 `Access-Control-Allow-Origin: *`
- 不需要 API key，也不需要 USPTO 登录。`configuration.json` 里的 Okta 只供官网的偏好和提醒，检索本身没走登录
- 页面会加载 AWS WAF 的 `challenge.js`，但 2026-10-08 不带 `aws-waf-token` 的普通 `POST` 已返回真实结果。若以后出现 `403`、`202` 或挑战页，界面会提示防护已收紧，程序不会去解挑战。维护者如果已经从浏览器复制了 cookie，可以设置 `TMSEARCH_WAF_TOKEN`，服务会把它放进 `Cookie: aws-waf-token=...`
- 本机代理发送的头：`Accept: application/json`、浏览器样式的 `User-Agent`、`Origin` 和 `Referer` 指向 `tmsearch.uspto.gov`

查询体是 Elasticsearch 风格，但响应信封不是标准 ES。一个已核对的文字商标请求：

```json
{
  "query": {
    "bool": {
      "must": [{ "match": { "wordmark": { "query": "apple", "operator": "and" } } }],
      "filter": [{ "term": { "alive": true } }, { "term": { "internationalClass": "009" } }]
    }
  },
  "from": 0,
  "size": 20,
  "track_total_hits": true,
  "_source": ["id", "wordmark", "registrationId", "alive", "statusCode", "statusDescription"]
}
```

已核对的过滤：

| 界面 | 实际查询 |
| --- | --- |
| 文字商标 | `match`，字段 `wordmark`，`operator: and`。不用 `query_string`，避免用户输入被当成语法 |
| 有效 / 失效 | `term` `alive: true / false` |
| 权利人 | `match_phrase`，字段 `ownerName` |
| 国际分类 | `term` `internationalClass`。必须是三位数字：`9` 要写成 `009`。写成 `IC 009` 的 `term` 当天返回 0 条；`009` 能命中来源里显示为 `IC 009` 的记录 |
| 申请号 | `term` 字段 `id`。来源里没有可用的 `serialNumber`，命中的 `id` 就是申请号 |
| 注册号 | `term` 字段 `registrationId`。`registrationNumber` 这个名字取不到值。有前导零时要原样保留 |
| 排序 | 有文字且选择相关度时不指定 `sort`。选择申请日，或只有筛选没有文字时，用 `filedDate` 降序 |
| 分页 | `from` + `size`。每页固定 20 条 |

没有文字、权利人、分类、申请号、注册号中的任何一项时，不会发请求。只选「有效」或「失效」也不够。

### 响应

```json
{
  "took": 5,
  "hits": {
    "totalValue": 1044,
    "totalRelation": "eq",
    "hits": [{ "id": "99551004", "source": { "wordmark": "APPLE", "alive": true } }]
  }
}
```

和标准 Elasticsearch 的差别：总数在 `hits.totalValue`（不是 `hits.total.value`），文档在 `source`（不是 `_source`）。不传 `track_total_hits: true` 时，无筛选的总数会停在 `10000` 且 `totalRelation` 为 `gte`。加上之后，`match_all` 当天的精确总数是 `13307184`。

详情直接用这一次检索返回的 `_source`，不再为每条记录请求第二个接口。官网另有 `GET https://tmsearch.uspto.gov/tsdr-api-v1-0-0/tsdr-api?serialNumber=`，当天不带密钥也能返回 JSON，但为了少打 USPTO，详情没有调用它。

图样来自 `GET https://tsdr.uspto.gov/img/{申请号}/large`（当天 `97087321` 返回 `image/png`）。`medium`、`small` 是 `404`。这个地址没有 `Access-Control-Allow-Origin`，所以由本机 `/api/mark-image/:serial` 转发，并做短缓存。

字段名以当天拉到的完整文档为准。早期猜测的 `serialNumber`、`registrationNumber`、`filingDate`、`status` 在 `_source` 里是空的。实际用到的是 `id`、`registrationId`、`filedDate`、`statusCode`、`statusDescription`、`ownerName`、`internationalClass`、`goodsAndServices`、`markType`、`attorney`、`drawingCode` 等。`statusDescription.keyword` 的聚合当天返回空桶，所以没有做状态分面，状态中文是按 `statusCode` 对照的。

### 限制

- `from + size` 不能超过 `10000`，否则 `400`：`Result window is too large`。界面最多翻到前 10000 条
- `size: 100` 当天可以成功。本应用固定每页 20，避免一次拉太多
- 检索请求至少间隔 0.8 秒，图样间隔 0.2 秒。排队超过上限时返回中文「请求过于频繁」
- 短时间的连续请求当天没有看到 USPTO 自己的 `429`。这不是承诺没有上限
- 没有公开的字段契约，USPTO 改索引时这里会坏
- 纯图形商标的 `wordmark` 可能为空
- 每日 5 次是本机界面限制，不是 USPTO 账号配额

若这个接口被防护彻底挡住，又拿不到可用凭据，不要改成假数据。可改用的官方途径是带密钥的 [Trademark Status and Document Retrieval API](https://developer.uspto.gov/)（TSDR，按申请号或注册号取状态，不是这个全文检索），以及 [USPTO Open Data Portal](https://data.uspto.gov/)。全文商标检索目前没有对等的公开 REST 文档，这个 `prod-stage` 地址是官网自己的检索后端。

## 其他环境变量

| 变量 | 作用 |
| --- | --- |
| `PORT` | 监听端口。开发时代理用 `43124`，`npm start` 默认 `43123`。`0` 表示随机端口，桌面版用这个 |
| `HOST` | 默认 `127.0.0.1` |
| `STATIC_DIR` | 设置后，同一进程托管构建好的网页 |
| `TMSEARCH_URL` | 换 USPTO 检索地址 |
| `TMSEARCH_WAF_TOKEN` | 可选。只在防护开始要求 cookie 时使用 |
| `UNLOCK_CODE` | 见上面的维护者说明。不设置就用文档中的默认代码 |
