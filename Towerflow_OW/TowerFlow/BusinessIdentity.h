#pragma once
#include <filesystem>
#include <string>

bool validBusinessName(const std::string& name);
std::string loadBusinessName(const std::filesystem::path& inventoryFile);
bool saveBusinessName(const std::filesystem::path& inventoryFile, const std::string& name);
