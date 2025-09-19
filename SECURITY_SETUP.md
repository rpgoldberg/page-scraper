# Security Monitoring Setup Guide

## Overview
This project includes comprehensive security scanning and monitoring:
- **Build-time scanning**: SBOM generation and vulnerability scanning during Docker builds
- **Scheduled rescanning**: Daily/weekly vulnerability checks of deployed images
- **Issue tracking**: Automatic GitHub issue creation for vulnerabilities
- **Discord notifications**: Real-time alerts for critical vulnerabilities
- **Dependency monitoring**: Dependabot for continuous dependency updates

## Setup Instructions

### 1. Discord Webhook (Optional)
To receive Discord notifications for critical vulnerabilities:

1. In your Discord server, go to Server Settings → Integrations → Webhooks
2. Click "New Webhook" and configure:
   - Name: `Figure Collector Security`
   - Channel: Choose your security alerts channel
3. Copy the Webhook URL
4. Add to GitHub Secrets (Settings → Secrets and variables → Actions):
   - Name: `DISCORD_WEBHOOK`
   - Value: Your webhook URL

### 2. Enable GitHub Features

#### Dependabot (Free)
1. Go to Settings → Security → Code security and analysis
2. Enable:
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates

#### GitHub Pages for Dashboard (Optional)
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs
4. The dashboard will be available at: `https://[username].github.io/[repo]/security`

### 3. Workflow Configuration

The following workflows are included:

| Workflow | Purpose | Schedule |
|----------|---------|----------|
| `docker-publish.yml` | Build images with SBOM | On push/PR |
| `sbom-security-scan.yml` | Comprehensive security scan | Called by docker-publish |
| `scheduled-security-scan.yml` | Rescan deployed images | Daily at 2 AM UTC |
| `vulnerability-dashboard.yml` | Update security dashboard | Daily at 4 AM UTC |

### 4. Customization

#### Adjust Scan Schedule
Edit `.github/workflows/scheduled-security-scan.yml`:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change this cron expression
```

#### Change Severity Threshold
By default, only HIGH and CRITICAL vulnerabilities create issues.
To include MEDIUM:
```yaml
env:
  SEVERITY_THRESHOLD: 'MEDIUM'
```

#### Vulnerability Management Platforms (Free Options)

##### Option A: Use GitHub Security Tab (Recommended)
- Free for public repos
- Automatic with Dependabot enabled
- View at: Repository → Security → Vulnerability alerts

##### Option B: Self-hosted Dependency-Track
```bash
# Deploy with Docker
docker run -d -p 8080:8080 \
  --name dependency-track \
  -v dependency-track:/data \
  dependencytrack/bundled
```

Then update workflows to upload SBOMs:
```yaml
- name: Upload to Dependency-Track
  run: |
    curl -X POST http://your-server:8080/api/v1/bom \
      -H "X-Api-Key: ${{ secrets.DTRACK_API_KEY }}" \
      -F "project=$PROJECT_UUID" \
      -F "bom=@sbom-cyclonedx.json"
```

## Security Reports

### Where to Find Reports

1. **GitHub Actions Artifacts**: Download SBOM and scan reports
   - Go to Actions → Select a workflow run → Artifacts

2. **GitHub Issues**: Vulnerability issues with `security` label
   - Issues are auto-created/updated by scheduled scans

3. **Security Tab**: Dependabot alerts and security advisories
   - Repository → Security → Vulnerability alerts

4. **Discord**: Real-time critical alerts (if configured)

### Understanding Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| CRITICAL | Actively exploited, immediate risk | Patch immediately |
| HIGH | Exploitable, high impact | Patch within days |
| MEDIUM | Potential risk, limited impact | Patch within weeks |
| LOW | Minimal risk | Patch in next release |

## License Compliance

The scanning includes basic license detection. Packages with these licenses are flagged:
- GPL, AGPL, LGPL (Copyleft)
- CC-BY-SA (Share-alike)
- SSPL, BUSL (Source-available)

Review `license-summary.txt` in scan artifacts to ensure compliance with your license policy.

## Troubleshooting

### No Discord notifications
- Verify `DISCORD_WEBHOOK` secret is set correctly
- Check webhook is active in Discord server settings

### Issues not being created
- Ensure workflow has `issues: write` permission
- Check GitHub Actions logs for errors

### Scans timing out
- Increase timeout in workflow:
  ```yaml
  timeout-minutes: 30  # Increase from default
  ```

## Questions?
Open an issue with the `security` label for security-related questions.