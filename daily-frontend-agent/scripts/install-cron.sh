#!/bin/bash
set -e

# Daily Frontend Agent - Cron Installation Script
# This script sets up a cron job to run the agent daily

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/daily-reports/logs"

# Default values
RUN_TIME="${DAILY_AGENT_TIME:-08:30}"
NODE_PATH="${NODE_PATH:-$(which node)}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --time)
            RUN_TIME="$2"
            shift 2
            ;;
        --uninstall)
            UNINSTALL=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --time HH:MM    Set the run time (default: 08:30)"
            echo "  --uninstall     Remove the cron job"
            echo "  --dry-run       Show what would be done without doing it"
            echo "  -h, --help      Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Parse time
HOUR=$(echo "$RUN_TIME" | cut -d: -f1)
MINUTE=$(echo "$RUN_TIME" | cut -d: -f2)

# Validate time
if ! [[ "$HOUR" =~ ^[0-9]+$ ]] || ! [[ "$MINUTE" =~ ^[0-9]+$ ]]; then
    echo "Error: Invalid time format. Use HH:MM"
    exit 1
fi

if [ "$HOUR" -gt 23 ] || [ "$MINUTE" -gt 59 ]; then
    echo "Error: Invalid time. Hour must be 0-23, minute must be 0-59"
    exit 1
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Cron job command
CRON_CMD="cd $PROJECT_DIR && $NODE_PATH dist/cli/index.js run --execute >> $LOG_DIR/cron-\$(date +\%Y-\%m-\%d).txt 2>&1"
CRON_LINE="$MINUTE $HOUR * * * $CRON_CMD"
CRON_MARKER="# daily-frontend-agent"

if [ "$UNINSTALL" = true ]; then
    echo "Removing daily-frontend-agent cron job..."

    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would remove cron entry"
        crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true
    else
        (crontab -l 2>/dev/null | grep -v "$CRON_MARKER") | crontab -
        echo "Cron job removed."
    fi
    exit 0
fi

echo "Installing daily-frontend-agent cron job..."
echo "  Time: $RUN_TIME"
echo "  Project: $PROJECT_DIR"
echo "  Log dir: $LOG_DIR"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would add the following cron entry:"
    echo "$CRON_LINE $CRON_MARKER"
else
    # Remove existing entry and add new one
    (crontab -l 2>/dev/null | grep -v "$CRON_MARKER"; echo "$CRON_LINE $CRON_MARKER") | crontab -

    echo "Cron job installed successfully!"
    echo ""
    echo "Current crontab:"
    crontab -l | grep "$CRON_MARKER" || echo "  (no entry found - this is unexpected)"
fi

echo ""
echo "To uninstall: $0 --uninstall"
echo "To change time: $0 --time HH:MM"
