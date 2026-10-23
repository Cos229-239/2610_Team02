#include "Inventory.h"
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <utility>

namespace {
    int totalStock(const Product& product) {
        int total = 0;

        for (const auto& [location, quantity] : product.stock) {
            total += quantity;
        }

        return total;
    }
}

bool Inventory::addProduct(const std::string& name,
    const std::string& barcode,
    double price, int minimumStock) {
    if (name.empty() || barcode.empty() ||
        price < 0 || minimumStock < 0) {
        return false;
    }

    if (findBarcode(barcode)) {
        return false;
    }

    products.push_back({
        nextId++, name, barcode, price, minimumStock, {}
        });

    return true;
}

Product* Inventory::findProduct(int id) {
    for (auto& product : products) {
        if (product.id == id) {
            return &product;
        }
    }

    return nullptr;
}

Product* Inventory::findBarcode(const std::string& barcode) {
    for (auto& product : products) {
        if (product.barcode == barcode) {
            return &product;
        }
    }

    return nullptr;
}

bool Inventory::receive(int id,
    const std::string& location,
    int quantity) {
    Product* product = findProduct(id);

    if (!product || location.empty() || quantity <= 0) {
        return false;
    }

    int current = product->stock[location];

    if (quantity > std::numeric_limits<int>::max() - current) {
        return false;
    }

    product->stock[location] += quantity;
    return true;
}

bool Inventory::remove(int id,
    const std::string& location,
    int quantity) {
    Product* product = findProduct(id);

    if (!product || quantity <= 0) {
        return false;
    }

    auto it = product->stock.find(location);

    if (it == product->stock.end() ||
        it->second < quantity) {
        return false;
    }

    it->second -= quantity;
    return true;
}

bool Inventory::transfer(int id,
    const std::string& from,
    const std::string& to,
    int quantity) {
    Product* product = findProduct(id);

    if (!product || from == to ||
        to.empty() || quantity <= 0) {
        return false;
    }

    auto source = product->stock.find(from);

    if (source == product->stock.end() ||
        source->second < quantity) {
        return false;
    }

    int destination = product->stock[to];

    if (quantity >
        std::numeric_limits<int>::max() - destination) {
        return false;
    }

    source->second -= quantity;
    product->stock[to] += quantity;

    return true;
}

void Inventory::listProducts() const {
    if (products.empty()) {
        std::cout << "No products yet.\n";
        return;
    }

    for (const auto& product : products) {
        std::cout << "ID: " << product.id
            << " | " << product.name
            << " | Barcode: " << product.barcode
            << " | Price: $" << std::fixed
            << std::setprecision(2) << product.price
            << " | Total: " << totalStock(product)
            << '\n';
    }
}

void Inventory::report() const {
    double inventoryValue = 0;

    for (const auto& product : products) {
        int total = totalStock(product);
        inventoryValue += total * product.price;

        std::cout << "\n" << product.name
            << " (ID " << product.id << ")\n";

        for (const auto& [location, quantity] : product.stock) {
            std::cout << "  " << location
                << ": " << quantity << '\n';
        }

        std::cout << "  Total stock: " << total << '\n';

        if (total <= product.minimumStock) {
            std::cout << "  LOW STOCK\n";
        }
    }

    std::cout << "\nTotal inventory value: $"
        << std::fixed << std::setprecision(2)
        << inventoryValue << '\n';
}

void Inventory::save(const std::string& filename) const {
    std::ofstream file(filename);

    if (!file) {
        std::cout << "Could not save inventory.\n";
        return;
    }

    file << products.size() << '\n'
        << std::setprecision(17);

    for (const auto& product : products) {
        file << product.id << ' '
            << std::quoted(product.name) << ' '
            << std::quoted(product.barcode) << ' '
            << product.price << ' '
            << product.minimumStock << ' '
            << product.stock.size() << '\n';

        for (const auto& [location, quantity] : product.stock) {
            file << std::quoted(location)
                << ' ' << quantity << '\n';
        }
    }
}

void Inventory::load(const std::string& filename) {
    std::ifstream file(filename);

    if (!file) {
        return; // No saved inventory on first launch
    }

    size_t count;

    if (!(file >> count) || count > 100000) {
        return;
    }

    std::vector<Product> loaded;
    int newNextId = 1;

    for (size_t i = 0; i < count; ++i) {
        Product product;
        size_t locations;

        if (!(file >> product.id
            >> std::quoted(product.name)
            >> std::quoted(product.barcode)
            >> product.price
            >> product.minimumStock
            >> locations) || locations > 100000) {
            std::cout << "Could not load inventory data.\n";
            return;
        }

        for (size_t j = 0; j < locations; ++j) {
            std::string location;
            int quantity;

            if (!(file >> std::quoted(location) >> quantity)) {
                std::cout << "Could not load inventory data.\n";
                return;
            }

            product.stock[location] = quantity;
        }

        if (product.id >= newNextId) {
            newNextId = product.id + 1;
        }

        loaded.push_back(std::move(product));
    }

    products = std::move(loaded);
    nextId = newNextId;
}