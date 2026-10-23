#pragma once
#include <string>
#include <map>

struct Product {
    int id = 0;
    std::string name;
    std::string barcode;
    double price = 0.0;
    int minimumStock = 0;

    // Location name, Quantity
    std::map<std::string, int> stock;
};