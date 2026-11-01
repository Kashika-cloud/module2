const test = require('node:test'); const assert = require('node:assert'); const { stage, sh } = require('../lib');
const { dir, o } = stage(2);
test('git branch (after merge+delete) -> feature/add-user-route no longer listed', () => { assert.ok(!sh(dir, 'git branch').includes('feature/add-user-route')); assert.match(o.t2, /Fast-forward/); });
test("git log --oneline on main -> includes the 'Add GET /users route' commit", () => { assert.match(sh(dir, 'git log --oneline main'), /Add GET \/users route/); });
test('git push origin main -> remote main branch updated (matches local main)', () => {
  assert.equal(sh(dir, 'git rev-parse main').trim(), sh(dir, 'git --git-dir=../fsd-project.git rev-parse main').trim()); assert.match(o.t2, /main -> main/); });
