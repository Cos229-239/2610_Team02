#pragma once
#include "Product.h"
#include <string>
#include <vector>

class Inventory {
private:
    std::vector<Product> products;
    int nextId = 1;

public:
    bool addProduct(const std::string& name,
        const std::string& barcode,
        double price, int minimumStock);

    Product* findProduct(int id);
    Product* findBarcode(const std::string& barcode);

    bool receive(int id, const std::string& location,
        int quantity);

    bool remove(int id, const std::string& location,
        int quantity);

    bool transfer(int id, const std::string& from,
        const std::string& to, int quantity);

    void listProducts() const;
    void report() const;

    void save(const std::string& filename) const;
    void load(const std::string& filename);
};