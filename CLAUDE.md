# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated Weibo trending topics tracker that scrapes trending search data hourly and maintains historical archives. The project tracks Chinese social media trends from Weibo (微博) with advanced AI-powered classification and cloud deployment capabilities.

## Technology Stack

- **Runtime**: Deno (TypeScript)
- **Dependencies**: Deno standard library (`std/datetime/mod.ts` v0.208.0)
- **AI Integration**: Doubao AI API for content classification
- **Storage**: GitHub API for cloud storage, local filesystem for development
- **Deployment**: Deno Deploy with cron jobs and HTTP server

## Development Commands

### Primary Tasks
```bash
# Main application
deno task start          # Run scraper with full permissions
deno task test          # Execute test suite
deno task deploy        # Deploy to Deno Deploy

# AI Filtering Commands
deno task ai-filter     # General AI filtering
deno task ai-social     # Filter social news specifically
deno task ai-entertainment  # Filter entertainment news
deno task ai-tech       # Filter technology news
deno task ai-sports     # Filter sports news
deno task ai-finance    # Filter financial news
deno task ai-stats      # Display processing statistics
deno task ai-test       # Test AI filtering (limit 5 items)
```

### AI Command Options
- `--date YYYY-MM-DD` - Target specific date
- `--category CATEGORY` - Specify classification category
- `--limit NUMBER` - Limit processing count
- `--stats` - Show detailed statistics

## Architecture

### Core Components

- `main.ts` - Unified entry point with HTTP server and cron job registration
- `scraper.ts` - Core scraping logic with automatic AI filtering integration
- `storage.ts` - Dual storage system (GitHub API for production, local for development)
- `utils.ts` - Data processing utilities (merging, deduplication, file generation)
- `types.ts` - TypeScript interfaces (Word, AIFilterConfig, FilterCategory)
- `ai-filter.ts` - AI classification engine using Doubao API
- `ai-storage.ts` - Specialized storage for AI-classified data

### Data Processing Pipeline

1. **Scraping**: Fetches from `https://s.weibo.com/top/summary` using regex parsing
2. **Data Processing**: Two modes available:
   - **Append Mode** (default in Deno Deploy): Preserves all entries with deduplication by title+URL
   - **Merge Mode** (local): Smart merging prevents duplicate topics by title only
3. **AI Classification**: Automatic categorization into 5 categories (社会新闻, 娱乐新闻, 科技新闻, 体育新闻, 财经新闻)
4. **Storage**: Updates outputs simultaneously:
   - Raw JSON: `/raw/YYYY-MM-DD.json`
   - AI classifications: `/ai-classified/YYYY-MM-DD.json`
   - Live README.md with current trends

### HTTP API Endpoints

- `GET /` - Interactive web interface with trending topics
- `GET /api/trending` - JSON API for raw trending data
- `GET /api/filtered?category=CATEGORY` - Filtered data by AI category
- `GET /health` - Service health check
- `POST /trigger` - Manual scraping trigger

### Directory Structure

- `/raw/` - Daily JSON data files
- `/ai-classified/` - AI classification results by date
- `template.html` - Web interface template

## Environment Variables

### Required
- `GITHUB_TOKEN` - For cloud storage operations
- `DOUBAO_API_KEY` - For AI classification features

### Optional
- `WEIBO_COOKIE` - Weibo authentication (has fallback)
- `GITHUB_REPO_OWNER` - Repository owner (default: "Sean529")
- `GITHUB_REPO_NAME` - Repository name (default: "weibo-trending-hot-search-1")
- `WEIBO_APPEND_MODE` - Force append mode (auto-detect by default)

## Key Implementation Details

- **Timezone**: Uses Asia/Shanghai for consistent date handling
- **AI Deduplication**: Smart tracking of processed titles to minimize API calls
- **Error Handling**: Comprehensive retry logic for GitHub API conflicts and AI processing
- **Performance**: Parallel operations for file saves, configurable delays for AI API rate limiting
- **Storage Abstraction**: Automatic switching between GitHub API (production) and local files (development)
- **Deployment Detection**: Behavior changes based on `DENO_DEPLOYMENT_ID` environment variable

## Testing

Tests focus on utility functions for data processing and file generation using Deno's built-in testing framework. All tests require network, read, and write permissions due to scraping operations.
