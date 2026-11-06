#!/bin/bash
# an.sh SCRIPT ARGS... : run an analysis script with the analysis venv's python, isolated.
cd /tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/F
exec /home/edbarker/Documents/Projects/tree-simulation/analysis/.venv/bin/python -I "$@"
