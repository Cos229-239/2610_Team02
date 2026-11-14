#pragma once
#include <filesystem>
#include <string>

class Inventory;

std::string inventoryListValue(const Inventory& inventory);
bool exportDashboard(const Inventory& inventory, const std::filesystem::path& destination);
