const fs = require('fs')
const path = require('path')

const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json')

if (!fs.existsSync(manifestPath)) {
  throw new Error(`找不到构建产物清单文件: ${manifestPath}`)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const csp = manifest.content_security_policy || "script-src 'self'; object-src 'self'"

manifest.manifest_version = 3
manifest.content_security_policy = {
  extension_pages: csp,
}

if (manifest.browser_action) {
  manifest.action = manifest.browser_action
  delete manifest.browser_action
}

if (manifest.background && Array.isArray(manifest.background.scripts)) {
  const [serviceWorker] = manifest.background.scripts
  manifest.background = {
    service_worker: serviceWorker,
  }
}

if (Array.isArray(manifest.permissions)) {
  const hostPermissions = manifest.permissions.filter(permission => permission.includes('://'))
  manifest.permissions = manifest.permissions.filter(permission => !permission.includes('://'))

  if (!manifest.permissions.includes('scripting')) {
    manifest.permissions.push('scripting')
  }

  manifest.host_permissions = Array.from(
    new Set([...(manifest.host_permissions || []), ...hostPermissions, '<all_urls>'])
  )
}

if (Array.isArray(manifest.web_accessible_resources)) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.every(
    resource => typeof resource === 'string'
  )
    ? [
        {
          resources: manifest.web_accessible_resources,
          matches: ['<all_urls>'],
        },
      ]
    : manifest.web_accessible_resources
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('已将 dist/manifest.json 修正为 Manifest V3 格式')
