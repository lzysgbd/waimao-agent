# 外贸 AI Agent v1.1

这是一个本地网页工具，用于外贸 B2B 询盘分析、阶梯报价、报价单草稿和跟进阶段管理。第一版只生成草稿，不自动发送邮件。

## 适合场景

- 工厂或外贸公司内部处理 B2B 询盘。
- 上传产品/价格表后，辅助生成报价草稿、英文回复和跟进任务。
- 局域网内给同事一起试用。

不适合直接公开到公网使用，除非你已经加上登录、权限和 HTTPS。

## 功能

- 粘贴询盘文本，自动提取客户、国家、产品、数量、贸易术语、付款方式和缺失信息。
- 上传 CSV/XLSX 产品表，按产品名和型号匹配报价项。
- 根据利润率、阶梯价、贸易术语、付款方式和报价有效期生成 PI/报价草稿。
- 生成英文回复草稿和下一次跟进提醒。
- 管理客户阶段：新询盘、待补充信息、待报价、已报价待跟进、已寄样、谈判中、赢单、丢单、暂停。
- 客户工作流看板：按阶段展示客户卡片，点击卡片可回到分析、报价和邮件草稿。
- 导出可打印的 Draft Quotation / Proforma Invoice Draft。
- 本地保存产品、询盘记录和跟进任务。
- 未配置 OpenAI API key 时使用规则引擎兜底。

## 运行

建议先创建虚拟环境并安装依赖：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

然后在本目录运行：

```powershell
python .\server.py
```

然后打开：

```text
http://127.0.0.1:8765
```

## 局域网访问

默认启动后，同一个 Wi-Fi 或同一个办公室网络里的其他设备也可以访问。把你的电脑局域网 IP 发给同事即可：

```text
http://你的电脑局域网IP:8765
```

例如：

```text
http://192.168.1.23:8765
```

注意：

- 你的电脑必须保持开机，服务窗口不能关闭。
- 同事必须和你在同一个局域网内。
- 如果打不开，通常是 Windows 防火墙拦截了 `8765` 端口，需要允许 Python/此端口通过防火墙。
- 这个版本没有密码保护，不建议暴露到公网。

如需启用 OpenAI Responses API：

```powershell
$env:OPENAI_API_KEY='你的 API key'
$env:OPENAI_MODEL='gpt-4.1-mini'
python .\server.py
```

## 产品表字段

CSV 或 XLSX 至少建议包含：

- 产品名 / product name
- 型号 / model
- MOQ
- 单价 / price
- 币种 / currency
- 包装 / packaging
- 交期 / lead time
- 阶梯价：`price_1000`、`price_5000` 或 `tier_prices`，例如 `1000:2.65;5000:2.38`
- HS Code、重量、体积、认证

目录中包含 `sample-products-v1.1.csv`，可以直接下载测试。

## 安全边界

- 报价、PI 和邮件均为草稿。
- 系统不会自动发送邮件。
- 价格、库存、合规、合同条款需人工最终确认。
- 不要把真实客户数据、真实报价记录或 `.env` 上传到 GitHub。

## 上传 GitHub 前检查

- `.gitignore` 已忽略 `data/`、`.env`、虚拟环境和 Python 缓存。
- 示例产品表是演示数据，可上传。
- 如需公开仓库，请先检查 README、示例数据和截图中没有真实客户资料。

## 发布到 GitHub

先在 GitHub 新建一个空仓库，例如 `trade-ai-agent`，不要勾选初始化 README。

然后在本目录运行：

```powershell
.\publish-to-github.ps1
```

按提示粘贴仓库地址，例如：

```text
https://github.com/USERNAME/trade-ai-agent.git
```

脚本会自动执行初始化仓库、提交、设置远程地址和推送到 `main` 分支。
