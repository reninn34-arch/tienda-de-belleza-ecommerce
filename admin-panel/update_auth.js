/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // match export async function POST(request: NextRequest, etc)
      // replace headers: { "Content-Type": "application/json" }
      // with headers: { "Content-Type": "application/json", ...authHeader(request) }
      
      if (content.includes('method: "POST"') || content.includes('method: "PUT"') || content.includes('method: "DELETE"')) {
        
        if (!content.includes('const token = request.cookies.get("admin_token")?.value;')) {
          // Find all fetch calls that have method: POST, PUT, DELETE
          
          content = content.replace(/(const res = await fetch\(`\$\{BACKEND\}[^`]+`, {\s*method: "([A-Z]+)",\s*headers: {)/g, (match) => {
            return `const token = request.cookies.get("admin_token")?.value;\n  ${match} Authorization: token ? \`Bearer \${token}\` : "",`;
          });
          
          content = content.replace(/(const res = await fetch\(`\$\{BACKEND\}[^`]+`, {\s*method: "DELETE")([^}]+})/g, (match, prefix, suffix) => {
            if (suffix.includes("headers")) return match;
            return `const token = request.cookies.get("admin_token")?.value;\n  ${prefix}, headers: { Authorization: token ? \`Bearer \${token}\` : "" }${suffix}`;
          });

          fs.writeFileSync(fullPath, content, 'utf8');
          console.log("Updated", fullPath);
        }
      }
    }
  }
}

processDir('app/api/admin');
