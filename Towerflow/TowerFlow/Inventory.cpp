#include "Inventory.h"
#include <algorithm>
#include <cctype>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <limits>
#include <set>
#include <utility>

namespace {
    bool hasText(const std::string& text) {
        return std::any_of(text.begin(), text.end(), [](unsigned char c) {
            return !std::isspace(c);
            });
    }

    std::string lower(std::string value) {
        std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
            });
        return value;
    }
}

Product* Inventory::findMutable(int id) {
    for (auto& product : products_)
        if (product.id == id) return &product;
    return nullptr;
}

const Product* Inventory::findProduct(int id) const {
    for (const auto& product : products_)
        if (product.id == id) return &product;
    return nullptr;
}

const Product* Inventory::findBarcode(const std::string& barcode) const {
    for (const auto& product : products_)
        if (product.barcode == barcode) return &product;
    return nullptr;
}

std::vector<const Product*> Inventory::search(const std::string& text) const {
    std::vector<const Product*> matches;
    const auto needle = lower(text);
    for (const auto& product : products_) {
        if (lower(product.name).find(needle) != std::string::npos ||
            lower(product.barcode).find(needle) != std::string::npos ||
            std::to_string(product.id) == text)
            matches.push_back(&product);
    }
    return matches;
}

bool Inventory::validDetails(const std::string& name, const std::string& barcode,
    std::int64_t priceCents, int minimumStock, int exceptId) const {
    if (!hasText(name) || !hasText(barcode) || priceCents < 0 ||
        priceCents > 100'000'000'000LL || minimumStock < 0)
        return false;
    for (const auto& product : products_)
        if (product.id != exceptId && product.barcode == barcode)
            return false;
    return true;
}

bool Inventory::addProduct(const std::string& name, const std::string& barcode,
    std::int64_t priceCents, int minimumStock) {
    if (nextId_ == std::numeric_limits<int>::max() ||
        !validDetails(name, barcode, priceCents, minimumStock))
        return false;
    products_.push_back({ nextId_, name, barcode, priceCents, minimumStock, {} });
    ++nextId_;
    return true;
}

bool Inventory::editProduct(int id, const std::string& name, const std::string& barcode,
    std::int64_t priceCents, int minimumStock) {
    Product* product = findMutable(id);
    if (!product || !validDetails(name, barcode, priceCents, minimumStock, id))
        return false;
    product->name = name;
    product->barcode = barcode;
    product->priceCents = priceCents;
    product->minimumStock = minimumStock;
    return true;
}

bool Inventory::receive(int id, const std::string& location, int quantity) {
    Product* product = findMutable(id);
    if (!product || !hasText(location) || quantity <= 0) return false;
    auto it = product->stock.find(location);
    const int current = it == product->stock.end() ? 0 : it->second;
    if (quantity > std::numeric_limits<int>::max() - current) return false;
    product->stock[location] = current + quantity;
    return true;
}

bool Inventory::remove(int id, const std::string& location, int quantity) {
    Product* product = findMutable(id);
    if (!product || quantity <= 0) return false;
    auto it = product->stock.find(location);
    if (it == product->stock.end() || it->second < quantity) return false;
    it->second -= quantity;
    if (it->second == 0) product->stock.erase(it);
    return true;
}

bool Inventory::transfer(int id, const std::string& from,
    const std::string& to, int quantity) {
    Product* product = findMutable(id);
    if (!product || !hasText(to) || from == to || quantity <= 0) return false;
    auto source = product->stock.find(from);
    if (source == product->stock.end() || source->second < quantity) return false;
    auto dest = product->stock.find(to);
    const int current = dest == product->stock.end() ? 0 : dest->second;
    if (quantity > std::numeric_limits<int>::max() - current) return false;
    source->second -= quantity;
    if (source->second == 0) product->stock.erase(source);
    product->stock[to] = current + quantity;
    return true;
}

bool Inventory::save(const std::string& filename) const {

    const auto temporary = filename + ".tmp";
    {
        std::ofstream file(temporary, std::ios::trunc);
        if (!file) return false;
        file << products_.size() << '\n' << std::fixed << std::setprecision(2);
        for (const auto& p : products_) {
            file << p.id << ' ' << std::quoted(p.name) << ' '
                << std::quoted(p.barcode) << ' '
                << (static_cast<long double>(p.priceCents) / 100) << ' '
                << p.minimumStock << ' ' << p.stock.size() << '\n';
            for (const auto& [location, quantity] : p.stock)
                file << std::quoted(location) << ' ' << quantity << '\n';
        }
        file.flush();
        if (!file) return false;
        file.close();
        if (!file) return false;
    }
    std::error_code ec;
    std::filesystem::rename(temporary, filename, ec);
    if (ec) {
        std::filesystem::remove(temporary, ec);
        return false;
    }
    return true;
}

bool Inventory::load(const std::string& filename) {
    std::ifstream file(filename);
    if (!file) return false;

    std::size_t count = 0;
    if (!(file >> count) || count > 100'000) return false;

    Inventory loaded;
    std::set<int> ids;
    std::set<std::string> barcodes;
    for (std::size_t i = 0; i < count; ++i) {
        Product p;
        double price = 0;
        std::size_t locations = 0;
        if (!(file >> p.id >> std::quoted(p.name) >> std::quoted(p.barcode)
            >> price >> p.minimumStock >> locations) ||
            p.id <= 0 || p.id == std::numeric_limits<int>::max() ||
            !hasText(p.name) || !hasText(p.barcode) ||
            !std::isfinite(price) || price < 0 || price > 1'000'000'000 ||
            p.minimumStock < 0 || locations > 10'000 ||
            !ids.insert(p.id).second || !barcodes.insert(p.barcode).second)
            return false;
        p.priceCents = static_cast<std::int64_t>(std::llround(price * 100));
        for (std::size_t j = 0; j < locations; ++j) {
            std::string location;
            int quantity = 0;
            if (!(file >> std::quoted(location) >> quantity) ||
                !hasText(location) || quantity < 0 ||
                p.stock.contains(location))
                return false;
            if (quantity > 0) p.stock[location] = quantity;
        }
        loaded.nextId_ = std::max(loaded.nextId_, p.id + 1);
        loaded.products_.push_back(std::move(p));
    }
    std::string extra;
    if (file >> extra) return false;
    if (file.bad()) return false;
    *this = std::move(loaded);
    return true;
}
