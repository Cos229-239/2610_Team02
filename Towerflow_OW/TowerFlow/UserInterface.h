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
    std::filesystem::path filename_;

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
    const Product* selectProduct() const;
    void printLocations() const;

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
    void tradeStock(MovementType type);

    // Other operations
    void scanBarcode() const;
    void setQrCode();
    void report() const;
    void movementHistory() const;
    void saveDashboard() const;
};

