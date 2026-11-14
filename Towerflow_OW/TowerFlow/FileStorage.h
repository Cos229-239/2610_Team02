#pragma once
#include <filesystem>
#include <functional>
#include <iosfwd>

class InventoryFileLock {
public:
    explicit InventoryFileLock(std::filesystem::path filename);
    ~InventoryFileLock();
    InventoryFileLock(const InventoryFileLock&) = delete;
    InventoryFileLock& operator=(const InventoryFileLock&) = delete;

    bool acquired() const;

private:
#ifdef _WIN32
    void* handle_ = nullptr;
#else
    int descriptor_ = -1;
#endif
};

enum class FileWriteMode { Replace, Create };

bool writeFileAtomically(const std::filesystem::path& destination,
    FileWriteMode mode, const std::function<void(std::ostream&)>& write);
