#!/bin/bash
# Auto TypeScript check after editing .ts/.tsx files in careercat-frontend

FILE_PATH=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
FRONTEND_DIR="/Users/camille/Documents/JOB AI project/CareerCat/careercat-frontend"

# Only run for TypeScript files in the frontend
if [[ "$FILE_PATH" != *"careercat-frontend"* ]] || [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

TS_ERRORS=$(cd "$FRONTEND_DIR" && node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1 | grep " error TS" | head -15)

if [ -n "$TS_ERRORS" ]; then
  jq -n --arg errors "$TS_ERRORS" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("TypeScript errors detected:\n" + $errors + "\n\nFix all errors before continuing.")
    }
  }'
fi

exit 0
