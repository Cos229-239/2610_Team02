#include "UserInterface.h"
#include "FileStorage.h"
#include "Report.h"
#include <algorithm>
#include <cctype>
#include <charconv>
#include <chrono>
#include <filesystem>
#include <iomanip>
#include <iostream>
#include <sstream>
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

    void printStock(const Product& product) {
        if (product.stock.empty()) std::cout << "  No stock on hand.\n";
        for (const auto& [location, quantity] : product.stock) {
            std::cout << "  " << location << ": " << quantity << '\n';
        }
    }

    bool allDigits(const std::string& value) {
        return !value.empty() && std::all_of(value.begin(), value.end(), [](char ch) {
            return ch >= '0' && ch <= '9';
        });
    }

    std::string dateTime(std::int64_t secondsSinceEpoch) {
        const auto time = std::chrono::sys_seconds(std::chrono::seconds(secondsSinceEpoch));
        const auto day = std::chrono::floor<std::chrono::days>(time);
        const std::chrono::year_month_day date{ day };
        const std::chrono::hh_mm_ss clock{ time - day };
        std::ostringstream result;
        result << std::setfill('0') << std::setw(4) << static_cast<int>(date.year()) << '-'
            << std::setw(2) << static_cast<unsigned>(date.month()) << '-'
            << std::setw(2) << static_cast<unsigned>(date.day()) << ' '
            << std::setw(2) << clock.hours().count() << ':'
            << std::setw(2) << clock.minutes().count() << ':'
            << std::setw(2) << clock.seconds().count() << " UTC";
        return result.str();
    }
}

UserInterface::UserInterface(std::string filename)
    : filename_(std::move(filename)) {
}

std::string UserInterface::readText(const std::string& prompt) {
    std::cout << prompt;
    std::string text;
    if (!std::getline(std::cin, text)) throw InputClosed{};
    if (!text.empty() && text.back() == '\r') text.pop_back();
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
        const std::string cents = dot == std::string::npos ? "" : text.substr(dot + 1);

        if (allDigits(dollars) && cents.size() <= 2 && (cents.empty() || allDigits(cents))) {
            std::int64_t whole = 0;
            const auto parsed = std::from_chars(dollars.data(), dollars.data() + dollars.size(), whole);
            if (parsed.ec == std::errc{} && whole <= Inventory::maxPriceCents / 100) {
                int fraction = 0;
                if (!cents.empty()) fraction = (cents[0] - '0') * 10;
                if (cents.size() == 2) fraction += cents[1] - '0';
                const auto price = whole * 100 + fraction;
                if (price <= Inventory::maxPriceCents) return price;
            }
        }
        std::cout << "Enter a valid price (for example 12.50).\n";
    }
}

const Product* UserInterface::selectProduct() const {
    const auto key = readText("Product ID, or scan/enter barcode or QR payload: ");
    const auto* byCode = inventory_.findCode(key);
    int id = 0;
    std::istringstream numeric(key);
    std::string extra;
    const auto* byId = (numeric >> id) && !(numeric >> extra) && id > 0
        ? inventory_.findProduct(id) : nullptr;
    const Product* product = byCode ? byCode : byId;
    if (byCode && byId && byCode != byId) {
        std::cout << "1. Use product ID\n";
        printProduct(*byId);
        std::cout << "2. Use barcode or QR code\n";
        printProduct(*byCode);
        const int choice = readInt("Select a match (0 cancels): ");
        if (choice != 1 && choice != 2) return nullptr;
        product = choice == 1 ? byId : byCode;
    }
    if (!product) {
        std::cout << "Product not found.\n";
        return nullptr;
    }
    printProduct(*product);
    return product;
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
    for (const auto& product : inventory_.products()) printProduct(product);
}

void UserInterface::searchProducts() const {
    const auto matches = inventory_.search(readText("Name, barcode, QR payload, or ID: "));
    if (matches.empty()) std::cout << "No matching products.\n";
    for (const auto* product : matches) printProduct(*product);
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

void UserInterface::printLocations() const {
    const auto locations = inventory_.locations();
    if (locations.empty()) return;
    std::cout << "Known locations:\n";
    for (const auto& location : locations) std::cout << "  " << location << '\n';
}

void UserInterface::receiveStock() {
    const auto* product = selectProduct();
    if (!product) return;
    printLocations();
    const auto location = readText("Location: ");
    const int quantity = readInt("Quantity received: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.receive(product->id, location, quantity));
}

void UserInterface::removeStock() {
    const auto* product = selectProduct();
    if (!product) return;
    printStock(*product);
    const auto location = readText("Location: ");
    const int quantity = readInt("Quantity removed: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.remove(product->id, location, quantity));
}

void UserInterface::transferStock() {
    const auto* product = selectProduct();
    if (!product) return;
    printStock(*product);
    const auto from = readText("From location: ");
    printLocations();
    const auto to = readText("To location: ");
    const int quantity = readInt("Quantity: ", 1);

    Inventory draft = inventory_;
    saveChange(draft, draft.transfer(product->id, from, to, quantity));
}

void UserInterface::tradeStock(MovementType type) {
    const auto* product = selectProduct();
    if (!product) return;
    const bool purchase = type == MovementType::Purchase;
    if (purchase) printLocations();
    else printStock(*product);
    const auto location = readText(purchase ? "Receive at location: " : "Ship from location: ");
    const int quantity = readInt("Quantity: ", 1);
    const auto price = readPrice(purchase ? "Unit cost ($): " : "Unit sale price ($): ");
    const auto business = readText(purchase ? "Supplier business: " : "Customer business: ");
    const auto reference = readText("Invoice or order reference (optional): ");

    Inventory draft = inventory_;
    const bool recorded = purchase
        ? draft.purchase(product->id, location, quantity, price, business, reference)
        : draft.sell(product->id, location, quantity, price, business, reference);
    saveChange(draft, recorded);
}

void UserInterface::scanBarcode() const {
    const auto code = readText("Scan/enter barcode or QR payload: ");
    const Product* product = inventory_.findCode(code);
    if (!product) {
        std::cout << "Product not found.\n";
        return;
    }
    printProduct(*product);
    printStock(*product);
}

void UserInterface::setQrCode() {
    const auto* product = selectProduct();
    if (!product) return;
    if (!product->qrPayload.empty()) std::cout << "Current QR payload: " << product->qrPayload << '\n';
    const auto payload = readText("Scan/enter QR payload (blank clears it): ");

    Inventory draft = inventory_;
    saveChange(draft, draft.setQrPayload(product->id, payload));
}

void UserInterface::report() const {
    for (const auto& product : inventory_.products()) {
        const auto total = product.totalStock();
        std::cout << '\n' << product.name << " (ID " << product.id << ")\n";
        printStock(product);
        std::cout << "  Total stock: " << total << '\n';
        if (total <= product.minimumStock) std::cout << "  LOW STOCK\n";
    }
    std::cout << "\nTotal inventory value at list prices: $" << inventoryListValue(inventory_) << '\n';
}

void UserInterface::movementHistory() const {
    const int id = readInt("Product ID to filter (0 for all): ");
    if (id > 0 && !inventory_.findProduct(id)) {
        std::cout << "Product not found.\n";
        return;
    }
    bool found = false;
    const auto& movements = inventory_.movements();
    for (auto entry = movements.rbegin(); entry != movements.rend(); ++entry) {
        if (id > 0 && id != entry->productId) continue;
        found = true;
        std::cout << dateTime(entry->recordedAt) << " | " << movementName(entry->type)
            << " | Product " << entry->productId << " | Qty " << entry->quantity;
        if (!entry->from.empty()) std::cout << " | From " << entry->from;
        if (!entry->to.empty()) std::cout << " | To " << entry->to;
        if (entry->isTrade()) {
            std::cout << " | " << entry->business << " | $" << entry->unitPriceCents / 100
                << '.' << std::setfill('0') << std::setw(2) << entry->unitPriceCents % 100
                << std::setfill(' ') << " per unit";
            if (!entry->reference.empty()) std::cout << " | " << entry->reference;
        }
        std::cout << '\n';
    }
    if (!found) std::cout << "No recorded stock movements.\n";
}

void UserInterface::saveDashboard() const {
    const auto name = readText("HTML output file [towerflow-dashboard.html]: ");
    namespace fs = std::filesystem;
    fs::path destination = name.empty() ? "towerflow-dashboard.html" : name;
    auto extension = destination.extension().string();
    std::transform(extension.begin(), extension.end(), extension.begin(), [](unsigned char ch) {
        return static_cast<char>(std::tolower(ch));
    });
    if (extension != ".html" && extension != ".htm") {
        destination += ".html";
    }

    std::error_code error;
    const auto absoluteTarget = fs::absolute(destination, error);
    if (error) {
        std::cerr << "Cannot resolve the dashboard output path.\n";
        return;
    }
    const auto target = fs::weakly_canonical(absoluteTarget, error);
    if (error || target == filename_) {
        std::cerr << "Choose an output path different from the inventory file.\n";
        return;
    }
    if (!exportDashboard(inventory_, destination)) {
        std::cerr << "Could not export the dashboard. Use a new filename in a writable folder.\n";
        return;
    }
    std::cout << "Dashboard saved to " << destination.string()
        << ". Open it in your browser.\n";
}

int UserInterface::run() {
    namespace fs = std::filesystem;
    std::error_code error;
    const auto absolutePath = fs::absolute(filename_, error);
    if (error) {
        std::cerr << "Cannot resolve the inventory file path.\n";
        return 1;
    }
    const auto path = fs::weakly_canonical(absolutePath, error);
    if (error) {
        std::cerr << "Cannot resolve the inventory file path.\n";
        return 1;
    }
    filename_ = path;
    const InventoryFileLock lock(path);
    if (!lock.acquired()) {
        std::cerr << "Cannot lock the inventory file. Check folder permissions and close other TowerFlow sessions.\n";
        return 1;
    }

    const bool exists = fs::exists(path, error);
    if (error || (exists && (!fs::is_regular_file(path, error) || error || !inventory_.load(path)))) {
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
                << "8. Scan barcode or QR\n"
                << "9. Inventory report\n"
                << "10. Record a purchase\n"
                << "11. Record a sale\n"
                << "12. Stock movement history\n"
                << "13. Export dashboard\n"
                << "14. Set or clear product QR code\n"
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
            case 10: tradeStock(MovementType::Purchase); break;
            case 11: tradeStock(MovementType::Sale); break;
            case 12: movementHistory(); break;
            case 13: saveDashboard(); break;
            case 14: setQrCode(); break;
            default: std::cout << "Unknown option.\n";
            }
        }
    }
    catch (const InputClosed&) {
        std::cout << "\nInput ended. Goodbye.\n";
        return 0;
    }
}
