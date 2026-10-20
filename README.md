# Lab 1 · Secure REST API

使用 **JavaScript / Node.js 22 + Express + npm + SQLite** 实现的教学 REST API。用户资料保存在 SQLite 中，示例数据使用内存数组；登录后使用 JWT 访问受保护资源。

Git 远程地址：https://github.com/dove-25/Lab1-secure-rest-api.git 。关联远程地址与推送代码是两个独立步骤。

## 安装和运行

需要 Node.js 22 或以上版本。在项目目录执行：

```powershell
npm.cmd ci
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

将生成的随机字符串填写到 `.env` 的 `JWT_SECRET`，然后执行：

```powershell
npm.cmd start
```

Windows PowerShell 使用 `npm.cmd`，可绕过本机 `npm.ps1` 路径失效的问题。macOS/Linux 使用 `npm`，并通过 `cp .env.example .env` 复制配置。

默认地址为 `http://localhost:3000`。首次启动自动创建 `data/lab1.sqlite` 和演示用户，无需另外安装数据库服务。

- 演示登录名：`alice`
- 演示密码：`ChangeMe123!`
- `PORT` 默认 `3000`。
- `JWT_SECRET` 至少 32 个字符，应替换示例值。
- `JWT_EXPIRES_IN` 默认 `1h`。
- `DATABASE_PATH` 默认 `./data/lab1.sqlite`，相对路径以启动时的工作目录为基准。

演示账户仅用于本地实验，数据库中存储 bcrypt 哈希。项目未提供注册、修改密码、退出登录接口，已签发 Token 在到期前持续有效。

## 三个业务接口

### POST /auth/login

请求类型为 `application/json`，接收 `login` 和 `password`，并兼容旧版 `username` 字段；同时提供时以 `login` 为准：

```json
{ "login": "alice", "password": "ChangeMe123!" }
```

成功返回 `200`：

```json
{ "token": "<JWT>", "tokenType": "Bearer", "expiresIn": "1h" }
```

缺少字段、空字段或类型不正确返回 `400`。用户名或密码错误返回 `401`，错误提示一致。

### GET /api/data

必须携带 `Authorization: Bearer <JWT>`。成功返回 `200`：

```json
{
  "user": "alice",
  "items": [
    { "id": 1, "title": "Secure API notes" },
    { "id": 2, "title": "Authentication checklist" }
  ]
}
```

缺少 Token，或 Token 无效、签名错误、过期时，返回 `401`。

### GET /api/profile

自主设计的第三个接口，查询当前登录用户的个人资料。鉴权方式与 `/api/data` 相同。成功返回 `200`，响应的 `profile` 包含 `id`、`username`、`displayName`、`email`、`bio` 和 `createdAt`，不返回密码哈希。

用户身份来自经过验证的 JWT，客户端不能通过提交其他用户 ID 选择查询对象。对应用户不存在时返回 `404`。

另提供 `GET /health` 健康检查，返回 `{"status":"ok"}`，无需登录。

## PowerShell 验证示例

保持服务运行，在另一个终端执行：

```powershell
$baseUrl = 'http://localhost:3000'
Invoke-RestMethod "$baseUrl/health"

# 未登录请求：预期 HTTP 401。
curl.exe -i "$baseUrl/api/data"

$body = @{ login = 'alice'; password = 'ChangeMe123!' } | ConvertTo-Json
$login = Invoke-RestMethod "$baseUrl/auth/login" -Method Post -ContentType 'application/json' -Body $body
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod "$baseUrl/api/data" -Headers $headers | ConvertTo-Json -Depth 5
Invoke-RestMethod "$baseUrl/api/profile" -Headers $headers | ConvertTo-Json -Depth 5

# 无效 Token：预期 HTTP 401。
curl.exe -i "$baseUrl/api/data" -H 'Authorization: Bearer invalid-token'
```

## 测试与项目结构

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd audit --audit-level=high
```

测试使用独立内存数据库，覆盖登录、受保护数据和个人资料、错误密码、非法字段、SQL 注入字符串、缺失/伪造/过期 Token、算法限制、请求体错误及健康检查，不写入本地 SQLite 文件。

- `src/server.js`：环境变量加载、密钥检查、HTTP 服务启动。
- `src/app.js`：业务路由、输入校验、JSON 错误响应。
- `src/auth.js`：Bearer Token 校验，仅允许 HS256。
- `src/db.js`：SQLite 表初始化、演示用户创建、预编译 SQL。
- `tests/api.test.js`：Jest + Supertest 接口测试。
- `.github/workflows/`：依赖安装、测试、ESLint 和依赖审计。

安全措施包括 bcrypt 哈希、预编译 SQL、JWT 签名和有效期验证、Helmet 响应头、32 KB 请求体限制及隐藏内部异常。公开部署前还应配置 HTTPS、登录限流并替换演示账户。`.env`、数据库及 `node_modules` 已加入 Git 忽略列表。

## Git 初始化与关联

本地项目已初始化 Git，`origin` 指向上述 GitHub 仓库：

```powershell
git status
git remote -v
```

提交和首次推送可执行以下命令。如果远程已有提交，应先获取并整合远程历史：

```powershell
git add .
git commit -m "Implement authenticated REST API with SQLite"
git branch -M main
git push -u origin main
```

推送需要网络连接及当前机器上的 GitHub 仓库访问权限。

## 安全要求实现

- **SQL 注入防护**：所有涉及用户数据的查询和写入都通过 `db.prepare()` 与 `?` 占位符绑定参数，不拼接用户输入。建表语句是固定 SQL。
- **用户数据输出转义**：Express 启用 `app.set('json escape', true)`，对所有 `res.json()` 输出中的 `<`、`>`、`&` 统一编码为 `\u003c`、`\u003e`、`\u0026`，覆盖用户名称和个人资料中的字符串。框架同时完成引号、反斜杠等 JSON 语法字符的编码。
- **认证**：登录成功签发带有效期的 HS256 JWT；`/api/data` 和 `/api/profile` 均使用 `requireAuth` 校验签名、有效期、算法和用户声明。缺失、伪造、过期 Token 返回 401。
- **密码存储**：SQLite 只保存 bcrypt 哈希；演示账户使用成本因子 12，登录时使用 bcrypt 比较，接口不返回密码哈希。

Express 没有内置 `escape()`。这里按 JSON 输出上下文使用框架自带的 `json escape`，而不是把资料预先转换成 HTML 实体。JSON 解析后仍会还原原始字符串；前端显示资料时应使用 `textContent` 或模板框架的默认文本插值，不能直接放入 `innerHTML`。此输出编码不等同于允许富文本输入的 HTML 清洗器。

新增测试把含 `<img ... onerror=...>` 的资料写入测试内存数据库，再通过真实登录访问两个受保护接口，检查原始 HTTP 响应的 Unicode 转义、JSON 类型和 `nosniff`，同时验证解析后的数据保持原值。另有测试检查数据库中的 bcrypt 哈希和成本因子。全部测试可用 `npm.cmd test` 运行。

## CI 安全扫描

每次 push 和 pull request 自动运行一个 `security-scan` 作业，依次执行题目指定的 npm audit 和 OWASP Dependency-Check，统一上传 `security-reports` 报告。查看与截图步骤见 [CI_SECURITY_GUIDE.md](CI_SECURITY_GUIDE.md)。接口测试和 lint 可在本地执行。
