#!/bin/bash

# Set file limit
ulimit -n 65536

# Start with tunnel mode (avoids file watcher issues)
npx expo start --tunnel
