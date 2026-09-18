#!/usr/bin/env node
/**
 * Pre-publish safety net: make sure every new/changed content/**.mdx file
 * actually compiles as MDX, so one bad bot-written article can't fail the
 * Vercel build and block every deploy after it.
 *
 * Usage:
 *   node scripts/check-mdx-compiles.mjs            # check new/changed files, exit 1 on failure
 *   node scripts/check-mdx-compiles.mjs --delete   # remove failing new files / restore failing edited ones, exit 0
 *   node scripts/check-mdx-compiles.mjs a.mdx b.mdx  # check explicit files
 *
 * Run it in CI after the generator and BEFORE `git add` / index rebuild.
 */
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { compile } from '@mdx-js/mdx'

const args = process.argv.slice(2)
const del = args.includes('--delete')
let files = args.filter(a => !a.startsWith('--'))

if (files.length === 0) {
  const out = execFileSync(
    'git',
    ['ls-files', '--modified', '--others', '--exclude-standard', '--', 'content'],
    { encoding: 'utf8' },
  )
  files = out.split('\n').filter(f => f.endsWith('.mdx') && fs.existsSync(f))
}

function isTracked(f) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', f], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

let failed = 0
for (const f of files) {
  const body = fs.readFileSync(f, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '')
  try {
    await compile(body)
  } catch (e) {
    failed++
    const msg = String(e.message).split('\n')[0]
    console.error(`::error file=${f}::MDX compile failed: ${msg}`)
    if (del) {
      if (isTracked(f)) {
        // Already-published file that was edited: put the published version back.
        execFileSync('git', ['checkout', 'HEAD', '--', f])
        console.error(`  restored ${f} to its published version`)
      } else {
        fs.rmSync(f)
        console.error(`  removed ${f} so it is not published`)
      }
    }
  }
}

console.log(`checked ${files.length} MDX file(s), ${failed} failed${del && failed ? ' (removed)' : ''}`)
process.exit(failed && !del ? 1 : 0)
