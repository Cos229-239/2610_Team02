#include "FileStorage.h"
#include <fstream>
#include <locale>
#include <random>
#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#else
#include <fcntl.h>
#include <sys/file.h>
#include <unistd.h>
#endif

namespace fs = std::filesystem;

InventoryFileLock::InventoryFileLock(fs::path filename) {
    filename += ".lock";
#ifdef _WIN32
    auto handle = CreateFileW(filename.c_str(), GENERIC_READ | GENERIC_WRITE,
        0, nullptr, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (handle != INVALID_HANDLE_VALUE) handle_ = handle;
#else
    const int descriptor = open(filename.c_str(), O_CREAT | O_RDWR | O_CLOEXEC, 0666);
    if (descriptor == -1) return;
    if (flock(descriptor, LOCK_EX | LOCK_NB) == 0) {
        descriptor_ = descriptor;
    }
    else {
        close(descriptor);
    }
#endif
}

InventoryFileLock::~InventoryFileLock() {
#ifdef _WIN32
    if (handle_) CloseHandle(handle_);
#else
    if (descriptor_ != -1) close(descriptor_);
#endif
}

bool InventoryFileLock::acquired() const {
#ifdef _WIN32
    return handle_ != nullptr;
#else
    return descriptor_ != -1;
#endif
}

namespace {
    struct StagedFile {
        fs::path directory;
        fs::path filename;

        ~StagedFile() {
            std::error_code ignored;
            fs::remove(filename, ignored);
            fs::remove(directory, ignored);
        }
    };
}

bool writeFileAtomically(const fs::path& destination, FileWriteMode mode,
    const std::function<void(std::ostream&)>& write) {
    std::random_device random;
    for (int attempt = 0; attempt < 10; ++attempt) {
        const auto directory = destination.parent_path() /
            (".towerflow-write-" + std::to_string(random()));
        std::error_code error;
        if (!fs::create_directory(directory, error)) {
            if (!error || error == std::errc::file_exists) continue;
            return false;
        }

        const StagedFile staging{ directory, directory / "data" };
        std::ofstream file(staging.filename, std::ios::binary);
        if (!file) return false;
        file.imbue(std::locale::classic());
        write(file);
        file.close();
        if (!file) return false;

       
#ifdef _WIN32
        const DWORD flags = MOVEFILE_WRITE_THROUGH |
            (mode == FileWriteMode::Replace ? MOVEFILE_REPLACE_EXISTING : 0);
        return MoveFileExW(staging.filename.c_str(), destination.c_str(), flags) != 0;
#else
        if (mode == FileWriteMode::Replace) {
            fs::rename(staging.filename, destination, error);
        }
        else {
            fs::create_hard_link(staging.filename, destination, error);
        }
        return !error;
#endif
    }
    return false;
}
