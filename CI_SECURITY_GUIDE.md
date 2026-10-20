# 安全扫描流水线配置与操作说明

本项目在 `.github/workflows/ci.yml` 配置 GitHub Actions，所有分支的 push、创建或更新 pull request，以及手动 Run workflow 都会触发。流水线包括四个独立作业，测试失败不会阻止其他扫描器运行。

## 扫描器分工

- `Tests and lint`：运行接口测试和 ESLint；ESLint 属于代码规范检查，不单独作为本项目的 SAST。
- `SAST CodeQL`：使用 JavaScript/TypeScript 的 security-extended 查询集扫描源码，向 GitHub Code scanning 发布结果，并保存 SARIF 报告。分析任务成功只代表分析执行成功；仍须查看安全告警，不能仅凭绿色检查断言没有漏洞。
- `SCA npm audit`：扫描包含开发依赖在内的完整依赖图，保存 JSON；high 或 critical 漏洞使作业失败。
- `SCA OWASP Dependency Check`：使用官方 Dependency-Check 13.0.0，检查下载包 SHA-256，扫描锁文件及已安装依赖，生成 HTML 和 JSON。CVSS 达到 7 时失败。漏洞库下载、扫描器或网络失败也会如实显示失败。

`npm audit` 属于依赖漏洞检查，即 SCA。题目中的“Snark”通常指 Snyk；本项目选择题目允许的 OWASP 工具，无需 Snyk 账户。

## 第一步 配置 GitHub

仓库地址：https://github.com/dove-25/Lab1-secure-rest-api

1. 在仓库的 Settings → Actions → General 中，确认允许 GitHub Actions 运行，并允许本工作流引用的官方 actions 和 github/codeql-action。若组织策略限制第三方 Actions，应由管理员调整允许列表。
2. 仓库为 public，CodeQL 可使用 GitHub 提供的功能；工作流自动获得运行所需的 GITHUB_TOKEN，不要手动创建或公开个人访问令牌。
3. 查看 Settings → Code security 中的 CodeQL 状态。当前 YAML 使用 Advanced setup；若此前启用了 CodeQL Default setup，应先禁用 Default setup，避免两种配置冲突。没有启用时无需额外操作。

## 第二步 建议添加 NVD API Key

1. 打开 https://nvd.nist.gov/developers/request-an-api-key ，填写邮箱等申请信息，按邮件指引完成激活。
2. 打开仓库 Settings → Secrets and variables → Actions → New repository secret。
3. Name 填写 `NVD_API_KEY`；Secret 填写你的密钥，点击 Add secret。不要提交到 .env.example、代码或实验报告，也不要把密钥发到聊天中。
4. 未配置密钥时，工作流仍会尝试无密钥同步，不会跳过 OWASP 扫描；但首次同步可能很慢或受到 NVD 限流。配置密钥后可重跑失败作业。

NVD 漏洞数据库会缓存以减少重复下载。来自 fork 的 pull request 通常拿不到仓库 Secret，此时按无 Key 路径运行。此项目使用 pull_request，不使用会对外部代码授予更高权限的 pull_request_target。

## 第三步 提交配置并查看运行

工作流文件需要提交到 GitHub 后才会执行。在仓库的 Actions 页面打开 Secure API CI，查看与最新提交对应的运行。文件进入默认分支后，也可以选择 Run workflow 手动触发。

每个作业独立展示状态。打开失败作业中第一个报错步骤区分安装失败、扫描器执行失败与已发现漏洞，不要用 continue-on-error 或删除审计步骤将风险隐藏为绿色。

## 第四步 下载和阅读扫描报告

进入某次 Actions 运行详情，滚动到 Artifacts 区域下载：

- `sast-codeql-report`：SARIF，配合仓库 Security → Code scanning 查看源码位置、规则和修复建议。
- `sca-npm-audit-report`：JSON，查看漏洞严重程度、直接或间接依赖及可修复版本。
- `sca-owasp-dependency-check-report`：解压后打开 dependency-check-report.html，查看组件、CVE 和 CVSS；JSON 可用于后续自动化处理。

报告保留 14 天，作业在发现漏洞后仍会尝试上传已经生成的报告；如果扫描器未执行完成，可能没有报告，此时应保留错误日志，不能声称扫描通过。报告属于 Actions 附件，不提交进 Git。

## 第五步 可选的合并保护

在 Settings → Rules → Rulesets 或 Branches → Branch protection 中，为 main 要求 pull request 和必需状态检查。先运行一次工作流，再选中四个作业的检查名称。未设置保护时，扫描会自动运行，但红色状态不一定能阻止直接推送或管理员合并。

本项目当前配置的是持续集成和安全检查，没有自动部署目标，不包含生产环境 CD。

## 实验截图取证

1. 编辑器显示 ci.yml 的 push、pull_request 和四个 jobs，作为自动触发与扫描器配置证据。
2. Actions 运行总览展示提交哈希和四个作业。若尚有失败或正在运行，应保留真实状态。
3. 展开 CodeQL 分析步骤，并截取 Security → Code scanning 的结果；没有告警时保留完整扫描记录。
4. 截取 OWASP 扫描步骤与 Artifacts 列表，再截图下载的 HTML 报告摘要，包括扫描时间、依赖数量和漏洞数量。
5. 对 npm audit 保留漏洞摘要和修复前后对比。Secret 的配置只截图名称，绝不展示密钥值。
