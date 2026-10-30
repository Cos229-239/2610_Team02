#pragma once
#ifdef INVENTORY_STORAGE_H
#define INVENTORY_STORAGE_H

#include <iostream>
#include <fstream>
#include <string>


class InventoryStorage {
public:
	static bool saveItemToFile(const std::string& filename, const std::string& itemData) {
		std::ofstream outFile(filename, std::ios::app);
		if (!outFile) {
			std::cerr << "Error opening file: " << filename << std::endl;
			return false;
		}
		outFile << itemData;
		outFile.close();
		return true;
	}

	static void loadInventoryFromFile(const std::string& filename) {
		std::ifstream inFile(filename);
		if (!inFile.is_open()) {
			std::cout << "No existing inventory database found (" << filename << "). Starting fresh.\n";
			return;
		}

		std::string line;
		std::cout << "\n--- TowerFlow Inventory Database ---\n";
		while (std::getline(inFile, line)) {
			std::cout << line << std::endl;
		}
		inFile.close();
	}
};

#endif