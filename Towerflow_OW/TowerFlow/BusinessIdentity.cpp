#include "BusinessIdentity.h"
#include "FileStorage.h"
#include <algorithm>
#include <fstream>
#include <ostream>

namespace {
std::filesystem::path identityPath(const std::filesystem::path& inventoryFile) {
    auto path = inventoryFile;
    path += ".business";
    return path;
}
}

bool validBusinessName(const std::string& name) {
    return !name.empty() && name.size() <= 160 &&
        name.find_first_not_of(' ') != std::string::npos &&
        std::none_of(name.begin(), name.end(), [](unsigned char ch) {
            return ch < 32 || ch == 127;
        });
}

std::string loadBusinessName(const std::filesystem::path& inventoryFile) {
    std::ifstream file(identityPath(inventoryFile), std::ios::binary);
    std::string name;
    if (!std::getline(file, name) || !validBusinessName(name)) return "TowerFlow";
    return name;
}

bool saveBusinessName(const std::filesystem::path& inventoryFile, const std::string& name) {
    if (!validBusinessName(name)) return false;
    return writeFileAtomically(identityPath(inventoryFile), FileWriteMode::Replace,
        [&](std::ostream& out) { out << name << '\n'; });
}
