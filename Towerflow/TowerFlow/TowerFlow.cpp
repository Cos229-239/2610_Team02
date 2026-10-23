#include <iostream>
#include <sstream>
#include <string>
#include <cstdlib>
#include "Inventory.h"

std::string readText(const std::string& prompt) {
    std::cout << prompt;
    std::string text;

    if (!std::getline(std::cin, text)) {
        std::exit(0);
    }

    return text;
}

int readInt(const std::string& prompt) {
    while (true) {
        std::istringstream input(readText(prompt));
        int number;
        std::string extra;

        if ((input >> number) && !(input >> extra)) {
            return number;
        }

        std::cout << "Please enter a whole number.\n";
    }
}

double readPrice(const std::string& prompt) {
    while (true) {
        std::istringstream input(readText(prompt));
        double number;
        std::string extra;

        if ((input >> number) && !(input >> extra) &&
            number >= 0 && number <= 1000000000) {
            return number;
        }

        std::cout << "Please enter a valid price.\n";
    }
}

int main() {
    Inventory inventory;
    const std::string filename = "inventory.txt";

    inventory.load(filename);

    while (true) {
        std::cout << "\n===== TowerFlow =====\n"
            << "1. Add product\n"
            << "2. List products\n"
            << "3. Receive stock\n"
            << "4. Remove stock\n"
            << "5. Transfer stock\n"
            << "6. Scan barcode\n"
            << "7. Inventory report\n"
            << "0. Exit\n";

        int choice = readInt("Choice: ");
        bool changed = false;

        if (choice == 0) {
            break;
        }
        else if (choice == 1) {
            std::string name = readText("Product name: ");
            std::string barcode = readText("Barcode: ");
            double price = readPrice("Price: ");
            int minimum = readInt("Low-stock threshold: ");

            changed = inventory.addProduct(
                name, barcode, price, minimum
            );
        }
        else if (choice == 2) {
            inventory.listProducts();
            continue;
        }
        else if (choice == 3) {
            int id = readInt("Product ID: ");
            std::string location = readText("Location: ");
            int quantity = readInt("Quantity received: ");

            changed = inventory.receive(
                id, location, quantity
            );
        }
        else if (choice == 4) {
            int id = readInt("Product ID: ");
            std::string location = readText("Location: ");
            int quantity = readInt("Quantity removed: ");

            changed = inventory.remove(
                id, location, quantity
            );
        }
        else if (choice == 5) {
            int id = readInt("Product ID: ");
            std::string from = readText("From location: ");
            std::string to = readText("To location: ");
            int quantity = readInt("Quantity: ");

            changed = inventory.transfer(
                id, from, to, quantity
            );
        }
        else if (choice == 6) {
            std::string barcode = readText(
                "Scan/enter barcode: "
            );

            Product* product = inventory.findBarcode(barcode);

            if (product) {
                std::cout << "Found: " << product->name
                    << " (ID " << product->id << ")\n";
            }
            else {
                std::cout << "Product not found.\n";
            }

            continue;
        }
        else if (choice == 7) {
            inventory.report();
            continue;
        }
        else {
            std::cout << "Unknown option.\n";
            continue;
        }

        if (changed) {
            inventory.save(filename);
            std::cout << "Success.\n";
        }
        else {
            std::cout << "Operation failed. Check your inputs.\n";
        }
    }

    std::cout << "Goodbye.\n";
}
