#!/bin/sh
geth_processes=$(pgrep -l geth)
echo "$geth_processes"
pkill -f geth