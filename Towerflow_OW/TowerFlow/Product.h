#pragma once
#include <string>
#include <map>
#include <cstdint>

struct Product {
    int id = 0;
    std::string name;
    std::string barcode;

    std::int64_t priceCents = 0;
    int minimumStock = 0;

    std::map<std::string, int> stock;
    std::string qrPayload;

    std::int64_t totalStock() const {
        std::int64_t total = 0;

        for (const auto& [location, quantity] : stock)
            total += quantity;

        return total;
    }
};
