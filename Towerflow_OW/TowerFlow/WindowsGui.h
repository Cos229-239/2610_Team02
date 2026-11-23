#pragma once

#ifdef _WIN32
#include <filesystem>

// Runs the native Windows interface. The inventory file can be an existing
// TowerFlow file or a new path in a writable folder.
int runWindowsGui(const std::filesystem::path& inventoryFile);
#endif
