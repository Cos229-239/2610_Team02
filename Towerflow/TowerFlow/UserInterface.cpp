#include "UserInterface.h"

#include <algorithm>
#include <cctype>
#include <exception>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <utility>

namespace {

    struct InputClosed {};

    void printProduct(const Product& product) {
        std::cout << "ID: " << product.id
            << " | " << product.name
            << " | Barcode: " << product.barcode
            << " | Price: $" << product.priceCents / 100 << '.'
            << std::setfill('0') << std::setw(2)
            << product.priceCents % 100 << std::setfill(' ')
            << " | Stock: " << product.totalStock() << '\n';
    }

    bool allDigits(const std::string& value) {
        return !value.empty() &&
            std::all_of(value.begin(), value.end(), [](unsigned char ch) {
            return std::isdigit(ch) != 0;
                });
    }

}

UserInterface::UserInterface(std::string filename)
    : filename_(std::move(filename)) {
}

std::string UserInterface::readText(const std::string& prompt) {
    std::cout << prompt;
    std::string text;
    if (!std::getline(std::cin, text)) {
        throw InputClosed{};
    }
    return text;
}

int UserInterface::readInt(const std::string& prompt, int minimum) {
    for (;;) {
        std::istringstream input(readText(prompt));
        int value = 0;
        std::string extra;
        if ((input >> value) && !(input >> extra) && value >= minimum) {
            return value;
        }
        std::cout << "Enter a whole number of at least " << minimum << ".\n";
    }
}

std::int64_t UserInterface::readPrice(const std::string& prompt) {
    for (;;) {
        const std::string text = readText(prompt);
        const std::size_t dot = text.find('.');
        const std::string dollars = text.substr(0, dot);
        const std::string cents = dot == std::string::npos
            ? "" : text.substr(dot + 1);

        if (allDigits(dollars) &&
            (dot == std::string::npos ||
                (cents.size() <= 2 &&
                    (cents.empty() || allDigits(cents))))) {
            try {
                const auto whole = std::stoll(dollars);
                if (whole <= 1'000'000'000LL) {
                    const int fraction = cents.empty() ? 0 : std::stoi(cents);
                    const int padded = cents.size() == 1 ? fraction * 10 : fraction;
                    if (whole < 1'000'000'000LL || padded == 0) {
                        return whole * 100 + padded;
                    }
                }
            }
            catch (const std::exception&) {
          
            }
        }
        std::cout << "Enter a valid price (for example 12.50).\n";
    }
}

void UserInterface::saveChange(Inventory& draft, bool successful) {
    if (!successful) {
        std::cout << "Operation failed. Check the details and quantities.\n";
        return;
    }
    if (!draft.save(filename_)) {
        std::cerr << "Could not save inventory. Changes were not applied.\n";
        return;
    }
    inventory_ = std::move(draft);
    std::cout << "Saved successfully.\n";
}

void UserInterface::addProduct() {
    const auto name = readText("Product name: ");
    const auto barcode = readText("Barcode: ");
    const auto price = readPrice("Price ($): ");
    const int minimum = readInt("Low-stock threshold: ");

    Inventory draft = inventory_;
    saveChange(draft, draft.addProduct(name, barcode, price, minimum));
}

void UserInterface::listProducts() const {
    if (inventory_.products().empty()) {
        std::cout << "No products yet.\n";
        return;
    }
    for (const auto& product : inventory_.products()) {
        printProduct(product);
    }
}

void UserInterface::searchProducts() const {
    const auto matches = inventory_.search(readText("Name, barcode, or ID: "));
    if (matches.empty()) {
        std::cout << "No matching products.\n";
    }
    for (const auto* product : matches) {
        printProduct(*product);
    }
}

void UserInterface::editProduct() {
    const int id = readInt("Product ID to edit: ", 1);
    if (inventory_.findProduct(id) == nullptr) {
        std::cout << "Product not found.\n";
        return;
    }

    const auto name = readText("New product name: ");
    const auto barcode = readText("New barcode: ");
    const auto price = readPrice("New price ($): ");
    const int minimum = readInt("New low-stock threshold: ");

    Inventory draft = inventory_;
    saveChange(draft, draft.editProduct(id, name, barcode, price, minimum));
}

void UserInterface::receiveStock() {
    const int id = readInt("Product ID: ", 1);
    const auto location = readText("Location: ");
    const int quantity = readInt("Quantity received: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.receive(id, location, quantity));
}

void UserInterface::removeStock() {
    const int id = readInt("Product ID: ", 1);
    const auto location = readText("Location: ");
    const int quantity = readInt("Quantity removed: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.remove(id, location, quantity));
}

void UserInterface::transferStock() {
    const int id = readInt("Product ID: ", 1);
    const auto from = readText("From location: ");
    const auto to = readText("To location: ");
    const int quantity = readInt("Quantity: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.transfer(id, from, to, quantity));
}

void UserInterface::scanBarcode() const {
    const auto barcode = readText("Scan/enter barcode: ");
    const Product* product = inventory_.findBarcode(barcode);
    if (product != nullptr) {
        printProduct(*product);
    }
    else {
        std::cout << "Product not found.\n";
    }
}

void UserInterface::report() const {
    long double inventoryValue = 0;
    for (const auto& product : inventory_.products()) {
        const auto total = product.totalStock();
        inventoryValue += static_cast<long double>(total) * product.priceCents;
        std::cout << '\n' << product.name << " (ID " << product.id << ")\n";
        for (const auto& [location, quantity] : product.stock) {
            std::cout << "  " << location << ": " << quantity << '\n';
        }
        std::cout << "  Total stock: " << total << '\n';
        if (total <= product.minimumStock) {
            std::cout << "  LOW STOCK\n";
        }
    }
    std::cout << "\nTotal inventory value: $" << std::fixed
        << std::setprecision(2) << inventoryValue / 100 << '\n';
}

int UserInterface::run() {
    std::error_code error;
    const bool exists = std::filesystem::exists(filename_, error);
    if (error || (exists && !inventory_.load(filename_))) {
        std::cerr << "Cannot read inventory file. Original data was not changed.\n";
        return 1;
    }

    try {
        for (;;) {
            std::cout << "\n========== TowerFlow ==========\n"
                << "1. Add product\n"
                << "2. List products\n"
                << "3. Search products\n"
                << "4. Edit product\n"
                << "5. Receive stock\n"
                << "6. Remove stock\n"
                << "7. Transfer stock\n"
                << "8. Scan barcode\n"
                << "9. Inventory report\n"
                << "0. Exit\n";

            switch (readInt("Choice: ")) {
            case 0: std::cout << "Goodbye.\n"; return 0;
            case 1: addProduct(); break;
            case 2: listProducts(); break;
            case 3: searchProducts(); break;
            case 4: editProduct(); break;
            case 5: receiveStock(); break;
            case 6: removeStock(); break;
            case 7: transferStock(); break;
            case 8: scanBarcode(); break;
            case 9: report(); break;
            default: std::cout << "Unknown option.\n";
            }
        }
    }
    catch (const InputClosed&) {
        std::cout << "\nInput ended. Goodbye.\n";
        return 0;
    }
}

