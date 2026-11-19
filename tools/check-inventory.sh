#!/usr/bin/env bash
# Portable C++ inventory checks for the Linux contribution runner.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
build=$(mktemp -d)
trap 'rm -rf -- "$build"' EXIT
operations="TowerFlow Files/TowerFlow (Malik modified)"
cxx=${CXX:-g++}

for suite in CurrentPartTests OperationsTests; do
    "$cxx" -std=c++17 "$operations/tests/$suite.cpp" -o "$build/$suite"
    (cd "$build" && "./$suite")
done

"$cxx" -std=c++20 Towerflow_OW/TowerFlow/*.cpp -o "$build/inventory"
cd "$build"
printf '1\nDesk Lamp\nTF-CHECK-407\n12.50\n2\n0\n' | timeout 10 ./inventory stock.txt > create.log
printf '2\n0\n' | timeout 10 ./inventory stock.txt > reopen.log
if ! grep -Fq 'Saved successfully.' create.log || ! grep -Fq 'Desk Lamp | Barcode: TF-CHECK-407 | Price: $12.50' reopen.log; then
    cat create.log reopen.log >&2
    exit 1
fi
echo 'Inventory persistence passed. A fresh process reopened the saved product with its original barcode and price.'
