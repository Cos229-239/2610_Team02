#include "Inventory.h"
#include "FileStorage.h"
#include <algorithm>
#include <cctype>
#include <chrono>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <limits>
#include <locale>
#include <stdexcept>
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

    std::int64_t now() {
        return std::chrono::floor<std::chrono::seconds>(
            std::chrono::system_clock::now()).time_since_epoch().count();
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

const Product* Inventory::findCode(const std::string& code) const {
    if (code.empty()) return nullptr;
    for (const auto& product : products_)
        if (product.barcode == code || product.qrPayload == code) return &product;
    return nullptr;
}

bool Inventory::setQrPayload(int id, const std::string& payload) {
    auto* product = findMutable(id);
    const auto* assigned = findCode(payload);
    if (!product || (!payload.empty() && !hasText(payload)) ||
        (assigned && assigned->id != id))
        return false;
    product->qrPayload = payload;
    return true;
}

std::vector<const Product*> Inventory::search(const std::string& text) const {
    std::vector<const Product*> matches;
    const auto needle = lower(text);
    for (const auto& product : products_) {
        if (lower(product.name).find(needle) != std::string::npos ||
            lower(product.barcode).find(needle) != std::string::npos ||
            lower(product.qrPayload).find(needle) != std::string::npos ||
            std::to_string(product.id) == text)
            matches.push_back(&product);
    }
    return matches;
}

bool Inventory::validDetails(const std::string& name, const std::string& barcode,
    std::int64_t priceCents, int minimumStock, int exceptId) const {
    const auto* assigned = findCode(barcode);
    return hasText(name) && hasText(barcode) && priceCents >= 0 &&
        priceCents <= maxPriceCents && minimumStock >= 0 &&
        (!assigned || assigned->id == exceptId);
}

bool Inventory::addProduct(const std::string& name, const std::string& barcode,
    std::int64_t priceCents, int minimumStock) {
    if (products_.size() >= maxProducts || nextId_ == std::numeric_limits<int>::max() ||
        !validDetails(name, barcode, priceCents, minimumStock))
        return false;
    products_.push_back({ nextId_, name, barcode, priceCents, minimumStock, {}, {} });
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
    return record({ MovementType::Receive, id, quantity, {}, location, now(), 0, {}, {} });
}

bool Inventory::remove(int id, const std::string& location, int quantity) {
    return record({ MovementType::Remove, id, quantity, location, {}, now(), 0, {}, {} });
}

bool Inventory::transfer(int id, const std::string& from,
    const std::string& to, int quantity) {
    return record({ MovementType::Transfer, id, quantity, from, to, now(), 0, {}, {} });
}

bool Inventory::purchase(int id, const std::string& location, int quantity,
    std::int64_t unitCostCents, const std::string& supplier, const std::string& reference) {
    return record({ MovementType::Purchase, id, quantity, {}, location, now(),
        unitCostCents, supplier, reference });
}

bool Inventory::sell(int id, const std::string& location, int quantity,
    std::int64_t unitPriceCents, const std::string& customer, const std::string& reference) {
    return record({ MovementType::Sale, id, quantity, location, {}, now(),
        unitPriceCents, customer, reference });
}

bool Inventory::validMovement(const Movement& movement) {
    if (movement.productId <= 0 || movement.quantity <= 0 || movement.recordedAt < 0 ||
        movement.recordedAt > maxTimestamp)
        return false;
    if (movement.isTrade()) {
        if (!hasText(movement.business) || movement.unitPriceCents < 0 ||
            movement.unitPriceCents > maxPriceCents)
            return false;
    }
    else if (movement.unitPriceCents != 0 || !movement.business.empty() ||
        !movement.reference.empty()) {
        return false;
    }

    switch (movement.type) {
    case MovementType::Receive:
    case MovementType::Purchase:
        return movement.from.empty() && hasText(movement.to);
    case MovementType::Remove:
    case MovementType::Sale:
        return hasText(movement.from) && movement.to.empty();
    case MovementType::Transfer:
        return hasText(movement.from) && hasText(movement.to) && movement.from != movement.to;
    }
    return false;
}

bool Inventory::record(Movement movement) {
    Product* product = findMutable(movement.productId);
    if (!product || !validMovement(movement)) return false;

    auto& stock = product->stock;
    auto source = stock.find(movement.from);
    if (!movement.from.empty() && (source == stock.end() || source->second < movement.quantity))
        return false;

    auto destination = stock.find(movement.to);
    const int current = destination == stock.end() ? 0 : destination->second;
    const bool newLocation = !movement.to.empty() && destination == stock.end();
    const bool clearsSource = source != stock.end() && source->second == movement.quantity;
    if (!movement.to.empty() && (movement.quantity > std::numeric_limits<int>::max() - current ||
        (newLocation && stock.size() >= maxLocationsPerProduct && !clearsSource)))
        return false;

    movements_.push_back(std::move(movement));
    if (newLocation) {
        try {
            destination = stock.emplace(movements_.back().to, 0).first;
        }
        catch (...) {
            movements_.pop_back();
            throw;
        }
    }
    const int quantity = movements_.back().quantity;
    if (destination != stock.end()) destination->second += quantity;
    if (source != stock.end()) {
        if (clearsSource) stock.erase(source);
        else source->second -= quantity;
    }
    return true;
}

std::set<std::string> Inventory::locations() const {
    std::set<std::string> result;
    for (const auto& product : products_)
        for (const auto& [location, quantity] : product.stock)
            result.insert(location);

    for (const auto& movement : movements_) {
        if (!movement.from.empty()) result.insert(movement.from);
        if (!movement.to.empty()) result.insert(movement.to);
    }
    return result;
}

bool Inventory::save(const std::filesystem::path& filename) const {
    return writeFileAtomically(filename, FileWriteMode::Replace, [&](std::ostream& file) {
        file << "TOWERFLOW 2\n" << products_.size() << '\n';
        for (const auto& p : products_) {
            file << p.id << ' ' << std::quoted(p.name) << ' ' << std::quoted(p.barcode)
                << ' ' << p.priceCents << ' ' << p.minimumStock << ' '
                << std::quoted(p.qrPayload) << ' ' << p.stock.size() << '\n';
            for (const auto& [location, quantity] : p.stock)
                file << std::quoted(location) << ' ' << quantity << '\n';
        }
        file << movements_.size() << '\n';
        for (const auto& movement : movements_) {
            file << static_cast<int>(movement.type) << ' ' << movement.productId << ' '
                << movement.quantity << ' ' << std::quoted(movement.from) << ' '
                << std::quoted(movement.to) << ' ' << movement.recordedAt << ' '
                << movement.unitPriceCents << ' ' << std::quoted(movement.business) << ' '
                << std::quoted(movement.reference) << '\n';
        }
    });
}

bool Inventory::load(const std::filesystem::path& filename) {
    std::ifstream file(filename, std::ios::binary);
    if (!file) return false;
    file.imbue(std::locale::classic());

    std::string firstToken;
    if (!(file >> firstToken)) return false;
    const bool versioned = firstToken == "TOWERFLOW";
    std::size_t count = 0;
    if (versioned) {
        int version;
        if (!(file >> version >> count) || version != 2) return false;
    }
    else {
        // The original format starts with a product count and stores dollar prices.
        file.seekg(0);
        if (!(file >> count)) return false;
    }
    if (count > maxProducts) return false;

    Inventory loaded;
    loaded.products_.reserve(count);
    std::set<int> ids;
    std::set<std::string> codes;
    for (std::size_t i = 0; i < count; ++i) {
        Product p;
        std::size_t locationCount = 0;
        if (!(file >> p.id >> std::quoted(p.name) >> std::quoted(p.barcode)))
            return false;
        if (versioned) {
            if (!(file >> p.priceCents >> p.minimumStock >> std::quoted(p.qrPayload) >> locationCount))
                return false;
        }
        else {
            long double price;
            if (!(file >> price >> p.minimumStock >> locationCount) || !std::isfinite(price) ||
                price < 0 || price > 1'000'000'000)
                return false;
            p.priceCents = std::llround(price * 100);
        }

        if (p.id <= 0 || p.id == std::numeric_limits<int>::max() ||
            !hasText(p.name) || !hasText(p.barcode) || p.priceCents < 0 ||
            p.priceCents > maxPriceCents || p.minimumStock < 0 ||
            locationCount > maxLocationsPerProduct || !ids.insert(p.id).second ||
            !codes.insert(p.barcode).second)
            return false;
        if (!p.qrPayload.empty() && p.qrPayload != p.barcode &&
            (!hasText(p.qrPayload) || !codes.insert(p.qrPayload).second))
            return false;

        for (std::size_t j = 0; j < locationCount; ++j) {
            std::string location;
            int quantity;
            if (!(file >> std::quoted(location) >> quantity) || !hasText(location) ||
                quantity < 0 || !p.stock.emplace(location, quantity).second)
                return false;
        }
        std::erase_if(p.stock, [](const auto& entry) { return entry.second == 0; });
        loaded.nextId_ = std::max(loaded.nextId_, p.id + 1);
        loaded.products_.push_back(std::move(p));
    }

    if (versioned) {
        std::string countToken;
        if (!(file >> countToken) || countToken.empty() ||
            countToken.find_first_not_of("0123456789") != std::string::npos)
            return false;
        std::size_t movementCount;
        try {
            const auto value = std::stoull(countToken);
            if (value > loaded.movements_.max_size()) return false;
            movementCount = static_cast<std::size_t>(value);
        }
        catch (const std::out_of_range&) {
            return false;
        }

        for (std::size_t i = 0; i < movementCount; ++i) {
            Movement movement{};
            int type;
            if (!(file >> type >> movement.productId >> movement.quantity >>
                std::quoted(movement.from) >> std::quoted(movement.to) >>
                movement.recordedAt >> movement.unitPriceCents >>
                std::quoted(movement.business) >> std::quoted(movement.reference)) ||
                type < static_cast<int>(MovementType::Receive) ||
                type > static_cast<int>(MovementType::Sale))
                return false;
            movement.type = static_cast<MovementType>(type);
            if (!ids.contains(movement.productId) || !validMovement(movement))
                return false;
            loaded.movements_.push_back(std::move(movement));
        }
    }

    std::string extra;
    if (file >> extra || !file.eof() || file.bad()) return false;
    *this = std::move(loaded);
    return true;
}
