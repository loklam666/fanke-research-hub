// 当 github.com:443 被阻断时（git push 报 CONNECT tunnel failed / schannel），改用 Git Data API 提交
// 前提：gh 已登录（gh auth login），api.github.com 可访问
// 用法：cd 到仓库根目录，node scripts/push-via-api.mjs "<commit message>"
//      增量基准默认 origin/main，可覆盖：BASE=<本地 ref> node scripts/push-via-api.mjs "..."
// 内容一律取自 git 对象（LF 规范），不会把工作区的 CRLF 带进仓库
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'loklam666';
const NAME = 'fanke-research-hub';
const BRANCH = 'main';
const TOKEN = process.env.GH_TOKEN || (await new Promise((res, rej) =>
  execFile('gh', ['auth', 'token'], { timeout: 20000 }, (e, o) => e ? rej(new Error('需要先 gh auth login')) : res(o.trim()))
));
const MESSAGE = process.argv[2] || 'update';

const API = `https://api.github.com/repos/${OWNER}/${NAME}`;

function curl(args) {
  return new Promise((resolve) => {
    execFile('curl', ['-s', '-4', '-L', '--max-time', '90', '-H', `Authorization: Bearer ${TOKEN}`,
      '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28',
      '-H', 'Content-Type: application/json', ...args], { maxBuffer: 64 << 20, timeout: 100000 }, (err, out) => {
      if (err) return resolve({ error: String(err) });
      try { resolve(JSON.parse(out)); } catch { resolve({ error: 'bad json', raw: String(out).slice(0, 300) }); }
    });
  });
}

const post = (url, bodyFile) => curl(['-X', 'POST', url, '--data-binary', `@${bodyFile}`]);
const patch = (url, bodyFile) => curl(['-X', 'PATCH', url, '--data-binary', `@${bodyFile}`]);
const get = (url) => curl([url]);

const tmp = (obj) => {
  const f = path.join(os.tmpdir(), `gh-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
};

async function withRetry(fn, label, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fn();
    if (r && !r.error && !r.documentation_url) return r;
    const msg = String(r?.message || r?.error || '').slice(0, 120);
    if (i === tries - 1) throw new Error(`${label} failed: ${msg}`);
    await new Promise((s) => setTimeout(s, 1200 * (i + 1)));
  }
}

/* 1) 变更文件清单 */
const list = process.env.FILES
  ? process.env.FILES.split('|').map((s) => s.trim()).filter(Boolean)
  : await new Promise((resolve, reject) => {
      execFile('git', ['-C', REPO, '-c', 'core.quotepath=false', 'diff', '--name-only', `${process.env.BASE || 'origin/main'}..main`],
        { maxBuffer: 8 << 20 }, (e, out) =>
          e ? reject(e) : resolve(out.split('\n').map((s) => s.trim()).filter(Boolean))
        );
    });
console.log('变更文件', list.length);

/* 2) 当前 head */
const ref = await withRetry(() => get(`${API}/git/ref/heads/${BRANCH}`), 'get ref');
const headSha = ref.object.sha;
const headCommit = await withRetry(() => get(`${API}/git/commits/${headSha}`), 'get commit');
console.log('远端 head', headSha.slice(0, 7));

/* 3) 上传 blob */
const entries = [];
let done = 0, failed = 0;
let idx = 0;
const workers = Array.from({ length: 4 }, async () => {
  while (idx < list.length) {
    const rel = list[idx++];
    // 取 git 对象里的规范内容（LF），避免工作区 CRLF 造成 blob 与本地提交不一致
    let mode = '100644', sha = null, buf = null;
    try {
      const ls = (await new Promise((res, rej) =>
        execFile('git', ['-C', REPO, 'ls-tree', 'HEAD', '--', rel], { maxBuffer: 4 << 20 }, (e, o) => e ? rej(e) : res(o))
      )).trim();
      if (!ls) continue;
      const [meta] = ls.split('\t');
      [mode, , sha] = meta.split(/\s+/);
      buf = await new Promise((res, rej) =>
        execFile('git', ['-C', REPO, 'cat-file', 'blob', sha], { maxBuffer: 64 << 20, encoding: 'buffer' }, (e, o) => e ? rej(e) : res(o))
      );
    } catch { continue; }
    const b64 = buf.toString('base64');
    const body = tmp({ content: b64, encoding: 'base64' });
    try {
      const r = await withRetry(() => post(`${API}/git/blobs`, body), `blob ${rel}`);
      entries.push({ path: rel.split(path.sep).join('/'), mode, type: 'blob', sha: r.sha });
      done++;
      if (done % 50 === 0) console.log(`  blob ${done}/${list.length}`);
    } catch (e) {
      failed++;
      console.log('  FAIL', rel, String(e.message).slice(0, 90));
    } finally {
      fs.unlinkSync(body);
    }
  }
});
await Promise.all(workers);

if (failed) {
  console.error(`有 ${failed} 个文件上传失败，中止`);
  process.exit(1);
}
console.log('blob 完成', entries.length);

/* 4) 建 tree */
const treeBody = tmp({ base_tree: headCommit.tree.sha, tree: entries });
const tree = await withRetry(() => post(`${API}/git/trees`, treeBody), 'create tree');
fs.unlinkSync(treeBody);
console.log('tree', tree.sha.slice(0, 7));

/* 5) 建 commit */
const commitBody = tmp({ message: MESSAGE, tree: tree.sha, parents: [headSha] });
const commit = await withRetry(() => post(`${API}/git/commits`, commitBody), 'create commit');
fs.unlinkSync(commitBody);
console.log('commit', commit.sha.slice(0, 7));

/* 6) 移动分支 */
const refBody = tmp({ sha: commit.sha, force: false });
const upd = await withRetry(() => patch(`${API}/git/refs/heads/${BRANCH}`, refBody), 'update ref');
fs.unlinkSync(refBody);
console.log('分支已更新 ->', upd.object?.sha?.slice(0, 7) || 'ok');
console.log('DONE');
