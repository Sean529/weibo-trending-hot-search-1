# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

This is an automated Weibo trending topics tracker that scrapes trending search
data hourly and maintains historical archives. The project tracks Chinese social
media trends from Weibo (微博) starting from 2020-11-24.

## Technology Stack

- **Runtime**: Deno (TypeScript/JavaScript)
- **Language**: TypeScript
- **Dependencies**: Deno standard library only
- **Automation**: GitHub Actions for CI/CD and scheduled tasks

## Development Commands

```bash
# Run the main scraping script
deno task start

# Run tests
deno task test

# Manual execution with permissions
deno run --allow-net --allow-read --allow-write main.ts
```

## Architecture

### Core Files

- `main.ts` - Main scraping script that fetches from Weibo API
- `utils.ts` - Data processing utilities (mergeWords, createArchive,
  createReadme)
- `types.ts` - TypeScript interfaces (Word type definition)
- `utils.test.ts` - Test suite

### Data Flow

1. Scrapes `https://s.weibo.com/top/summary` using regex parsing
2. Extracts trending topics into Word objects (url, title)
3. Merges with existing daily data (deduplicates by title)
4. Updates three outputs:
   - Raw JSON in `/raw/YYYY-MM-DD.json`
   - Daily archive in `/archives/YYYY-MM-DD.md`
   - Live README.md with current trends

### Directory Structure

- `/raw/` - Raw JSON data files by date
- `/archives/` - Daily markdown archives
- `/.github/workflows/` - CI (`ci.yml`) and hourly scheduling (`schedule.yml`)

## Key Implementation Details

- **Timezone**: Uses Asia/Shanghai for consistent date handling
- **Authentication**: Requires Weibo cookie in headers for API access
- **Data Accumulation**: 
  - **Append Mode** (`WEIBO_APPEND_MODE=true`): Keeps all hourly updates, no deduplication
  - **Merge Mode** (default): Smart merging prevents duplicate trending topics by title
- **Error Handling**: Exits with -1 on failed HTTP requests
- **Date Format**: Uses `std/datetime/mod.ts` for YYYY-MM-DD formatting

## Automation

- **Hourly Schedule**: GitHub Actions runs every hour (`0 * * * *`)
- **Auto-commit**: Bot commits with "update by github action" message
- **Cross-platform CI**: Tests on macOS, Ubuntu, Windows
- **Code Quality**: Deno fmt with 120 character line width

## Testing

Tests focus on utility functions for data processing and file generation. All
tests require network, read, and write permissions due to the nature of the
scraping operations.
