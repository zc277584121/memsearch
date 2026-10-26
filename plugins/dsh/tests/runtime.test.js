import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { detectPythonCmd, execCommandSync } from '../runtime.js'

const plugin = process.env.MEMSEARCH_RUNTIME_ROOT
  ? pathToFileURL(join(process.env.MEMSEARCH_RUNTIME_ROOT, 'plugins/dsh/index.js')).href
  : new URL('../index.js', import.meta.url).href
const { detectDshCmd, deriveCollection, summarizeTurn, writeCapture } = await import(plugin)

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'memsearch runtime '))
  const environment = { ...process.env }
  t.after(() => {
    for (const name of Object.keys(process.env)) if (!(name in environment)) delete process.env[name]
    Object.assign(process.env, environment)
    rmSync(root, { recursive: true, force: true })
  })
  delete process.env.MEMSEARCH_PYTHON
  delete process.env.DSH_CLI
  return root
}

test('headless summary uses the explicitly quoted CLI and writes Unicode memory', async t => {
  const root = fixture(t)
  const recorder = join(root, 'summary fixture.mjs')
  writeFileSync(recorder, "process.stdout.write('- 会议决定：周五发布 😀')")
  process.env.DSH_CLI = `"${process.execPath}" "${recorder}"`
  const summary = await summarizeTurn({}, { summarizeMode: 'dsh-headless', agentName: 'Test' }, '中文对话', root)
  assert.equal(summary, '- 会议决定：周五发布 😀')
  const memory = join(root, 'memory')
  writeCapture(memory, summary, 'runtime-session', 1, join(root, 'session.jsonl'))
  const day = new Date().toISOString().slice(0, 10)
  assert.match(readFileSync(join(memory, `${day}.md`), 'utf8'), /会议决定：周五发布 😀/)
})

test('Windows Desktop cmd launcher preserves arguments and explicit selection', { skip: process.platform !== 'win32' }, async t => {
  const root = fixture(t)
  const recorder = join(root, 'record argv.mjs')
  const output = join(root, 'argv.json')
  writeFileSync(recorder, "import fs from 'node:fs'; fs.writeFileSync(process.env.DSH_TEST_ARGV, JSON.stringify(process.argv.slice(2))); process.stdout.write('- Fixed summary')")
  const launcher = join(root, 'dsh.cmd')
  writeFileSync(launcher, `@echo off\r\nsetlocal DisableDelayedExpansion\r\n"${process.execPath}" "${recorder}" %*\r\nexit /b %errorlevel%\r\n`)
  process.env.DSH_TEST_ARGV = output
  process.env.PATH = `${root}${delimiter}${process.env.PATH}`
  assert.deepEqual(detectDshCmd(), [launcher])
  process.env.DSH_CLI = `"${launcher}"`
  const transcript = '中文 "quoted" & echo SHOULD_NOT_RUN | %PATH% !literal! ^caret^ (group)\nnext line'
  assert.equal(await summarizeTurn({}, { summarizeMode: 'dsh-headless', agentName: 'Test' }, transcript, root), '- Fixed summary')
  const argv = JSON.parse(readFileSync(output, 'utf8'))
  assert.deepEqual(argv.slice(0, 2), ['--profile', 'headless'])
  assert.equal(argv.length, 3)
  assert.ok(argv[2].endsWith(`Transcript:\n${transcript}`), JSON.stringify(argv))
})

test('Python discovery rejects an unusable alias and respects an explicit override', t => {
  const root = fixture(t)
  const realPython = detectPythonCmd()
  assert.ok(realPython, 'test runner must provide Python 3')
  const interpreter = execCommandSync(realPython, ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).trim()
  const windows = process.platform === 'win32'
  writeFileSync(join(root, windows ? 'python3.cmd' : 'python3'), windows ? '@exit /b 9009\r\n' : '#!/bin/sh\nexit 127\n', { mode: 0o755 })
  writeFileSync(join(root, windows ? 'python.cmd' : 'python'), windows
    ? `@echo off\r\n"${interpreter}" %*\r\nexit /b %errorlevel%\r\n`
    : `#!/bin/sh\nexec "${interpreter}" "$@"\n`, { mode: 0o755 })
  process.env.PATH = `${root}${delimiter}${process.env.PATH}`
  const selected = detectPythonCmd()
  assert.equal(selected[0], join(root, windows ? 'python.cmd' : 'python'))
  assert.equal(execCommandSync(selected, ['-c', 'print("python-ok")'], { encoding: 'utf8' }).trim(), 'python-ok')
  process.env.MEMSEARCH_PYTHON = join(root, 'missing-python')
  assert.equal(detectPythonCmd(), null)
})

test('collection derivation preserves Linux names including symlinked missing paths', { skip: process.platform !== 'linux' }, t => {
  const root = fixture(t)
  const target = join(root, 'Actual Project')
  mkdirSync(target)
  symlinkSync(target, join(root, 'link'))
  for (const directory of [target, join(root, 'link'), join(root, 'link', 'not-created'), join(root, '中文 Project')]) {
    const expected = execFileSync('bash', [new URL('../scripts/derive-collection.sh', import.meta.url).pathname, directory], { encoding: 'utf8' }).trim()
    assert.equal(deriveCollection(directory), expected)
  }
})
