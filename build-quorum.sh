#!/bin/bash

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

QUORUM="${parent_path}/quorum"
QUORUMAL="${parent_path}/quorumal"
QUORUMALDEL="${parent_path}/quorumal_del"

build_project() {
    local project_path=$1
    echo "Building project in ${project_path}..."
    cd "${project_path}" || {
        echo "Directory ${project_path} not found. Exiting."
        exit 1
    }
    make all &> /dev/null &
}

# Build each project
build_project "${QUORUM}"
build_project "${QUORUMAL}"
build_project "${QUORUMALDEL}"

wait
