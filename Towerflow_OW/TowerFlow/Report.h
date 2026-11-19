#pragma once
#include <filesystem>
#include <string>
#include <string_view>

class Inventory;

std::string inventoryListValue(const Inventory& inventory);
bool exportDashboard(const Inventory& inventory, const std::filesystem::path& destination,
    std::string_view businessName = "TowerFlow");
