#pragma once
#include "Product.h"
#include <string>
#include <vector>
#include <cstdint>

class Inventory {
public:
    bool addProduct(
        const std::string& name,
        const std::string& barcode,
        std::int64_t priceCents,
        int minimumStock
    );

    bool editProduct(
        int id,
        const std::string& name,
        const std::string& barcode,
        std::int64_t priceCents,
        int minimumStock
    );

    const Product* findProduct(int id) const;

    const Product* findBarcode(
        const std::string& barcode
    ) const;

    std::vector<const Product*> search(
        const std::string& text
    ) const;

    const std::vector<Product>& products() const {
        return products_;
    }

    bool receive(
        int id,
        const std::string& location,
        int quantity
    );

    bool remove(
        int id,
        const std::string& location,
        int quantity
    );

    bool transfer(
        int id,
        const std::string& from,
        const std::string& to,
        int quantity
    );

    bool save(const std::string& filename) const;
    bool load(const std::string& filename);

private:
    std::vector<Product> products_;
    int nextId_ = 1;

    Product* findMutable(int id);

    bool validDetails(
        const std::string& name,
        const std::string& barcode,
        std::int64_t priceCents,
        int minimumStock,
        int exceptId = 0
    ) const;
};