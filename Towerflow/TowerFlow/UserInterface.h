#pragma once
#include "Inventory.h"
#include <cstdint>
#include <string>

class UserInterface {
public:
    explicit UserInterface(std::string filename);
    int run();

private:
    Inventory inventory_;
    std::string filename_;

    // Input helpers
    static std::string readText(
        const std::string& prompt
    );

    static int readInt(
        const std::string& prompt,
        int minimum = 0
    );

    static std::int64_t readPrice(
        const std::string& prompt
    );

    // Saving
    void saveChange(
        Inventory& draft,
        bool successful
    );

    // Product operations
    void addProduct();
    void listProducts() const;
    void searchProducts() const;
    void editProduct();

    // Stock operations
    void receiveStock();
    void removeStock();
    void transferStock();

    // Other operations
    void scanBarcode() const;
    void report() const;
};

