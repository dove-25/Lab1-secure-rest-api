# 安全扫描操作说明

## 当前配置

工作流为 `.github/workflows/ci.yml`，名称 Security Scan，仅一个作业 `security-scan`。每次 push、创建或更新 pull request 自动运行，也可手动触发。

按题目列出的工具顺序执行两项检查：

1. `Run SAST npm audit scan`：执行题目 JavaScript 部分指定的 npm audit，生成 `npm-audit.json`，high 或 critical 漏洞使检查失败。步骤名称沿用题目叫法；npm audit 实际检查的是依赖漏洞。
2. `Run SCA OWASP Dependency-Check`：执行题目指定的 OWASP 扫描器，生成 HTML 和 JSON 报告，CVSS 达到 7 时检查失败。该步骤在依赖安装成功的情况下执行，即使前面的 npm audit 检出漏洞也会继续扫描，最终作业仍显示失败。

Node.js、Java 和漏洞数据库缓存是运行扫描器的准备步骤。Java 仅供 OWASP 工具使用，API 仍是 Node.js。无须 NVD Key 或 Snyk 账户；OWASP 使用 NVD 官方公开 CVE 数据文件。

不再在工作流中运行额外的 CodeQL、测试和 lint 作业。本地仍可通过 `npm.cmd test`、`npm.cmd run lint` 验证 API。

## 查看和截图

进入仓库 Actions → Security Scan → 最新成功运行，打开唯一的 `security-scan` 作业，截图保留两个扫描步骤的绿色状态。这就是与示例图相同的单作业展示方式。

运行页面底部下载 `security-reports` 附件，解压后打开 `dependency-check-report.html`，截图 OWASP 摘要；用编辑器打开 `npm-audit.json`，查看 metadata.vulnerabilities 中的 high 和 critical。按实际报告描述结果，检查通过不等于所有等级漏洞均为零。

报告统一保留 14 天；扫描发现漏洞时仍上传已经生成的报告。网络或工具故障也会返回失败，不能把故障称为无漏洞。

## 上传组件版本

报告上传使用 `actions/upload-artifact@v6`，其自身运行时为 Node.js 24，解决旧 v5 声明 Node.js 20 导致的弃用警告。应用测试使用的 Node.js 22 与 Action 自身运行时相互独立。

本配置只完成作业要求的安全检查，没有自动部署。实验报告 Markdown 文件位于 Homework 根目录，继续只保存在本地。
