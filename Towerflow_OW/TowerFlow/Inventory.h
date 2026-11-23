#pragma once
#include "Movement.h"
#include "Product.h"
#include <filesystem>
#include <set>
#include <string>
#include <vector>
#include <cstdint>

class Inventory {
public:
    static constexpr std::int64_t maxPriceCents = 100'000'000'000LL;

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

    const Product* findCode(const std::string& code) const;
    bool setQrPayload(int id, const std::string& payload);

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

    bool purchase(int id, const std::string& location, int quantity,
        std::int64_t unitCostCents, const std::string& supplier,
        const std::string& reference);
    bool sell(int id, const std::string& location, int quantity,
        std::int64_t unitPriceCents, const std::string& customer,
        const std::string& reference);

    const std::vector<Movement>& movements() const { return movements_; }
    std::set<std::string> locations() const;

    bool save(const std::filesystem::path& filename) const;
    bool load(const std::filesystem::path& filename);

private:
    static constexpr std::size_t maxProducts = 100'000;
    static constexpr std::size_t maxLocationsPerProduct = 10'000;
    static constexpr std::int64_t maxTimestamp = 253'402'300'799LL;

    std::vector<Product> products_;
    std::vector<Movement> movements_;
    int nextId_ = 1;

    Product* findMutable(int id);
    bool record(Movement movement);
    static bool validMovement(const Movement& movement);

    bool validDetails(
        const std::string& name,
        const std::string& barcode,
        std::int64_t priceCents,
        int minimumStock,
        int exceptId = 0
    ) const;
};
