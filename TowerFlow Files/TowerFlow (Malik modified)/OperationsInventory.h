#pragma once
#include "Part (Malik version).cpp"
#include <limits>
#include <string>
#include <vector>

// MODIFIED BY MALIK BROWN: Added work orders, purchase receipts, supplier orders, and sales | START //
namespace towerflow {

enum class OperationResult {
    success, invalidData, notFound, duplicatePartNumber,
    insufficientStock, overflow
};

// Store a snapshot of the part name so history survives later part edits/deletion.
struct OrderLine {
    int partNumber = 0;
    std::string partName;
    int quantity = 0;
};

struct WorkOrder {
    int id = 0;
    std::string description;
    OrderLine line;
};

// Money uses whole cents to avoid floating-point rounding of amounts like 0.10.
struct StockTransaction {
    int id = 0;
    std::string contact;
    OrderLine line;
    int unitCents = 0;
    long long totalCents() const {
        return static_cast<long long>(line.quantity) * unitCents;
    }
};

class OperationsInventory {
public:
    explicit OperationsInventory(std::vector<Part>& parts) : parts_(parts) {}

    const std::vector<WorkOrder>& workOrders() const { return workOrders_; }
    const std::vector<StockTransaction>& receipts() const { return receipts_; }
    const std::vector<StockTransaction>& purchaseOrders() const { return purchaseOrders_; }
    const std::vector<StockTransaction>& sales() const { return sales_; }

    OperationResult createWorkOrder(const std::string& description, int number, int quantity) {
        if (!hasText(description)) return OperationResult::invalidData;
        std::size_t index = 0;
        auto result = validateLine(number, quantity, index);
        if (result != OperationResult::success) return result;
        if (nextWorkId_ == std::numeric_limits<int>::max()) return OperationResult::overflow;
        workOrders_.push_back({nextWorkId_, description, {number, parts_[index].Name, quantity}});
        ++nextWorkId_;
        return OperationResult::success; // Planned work does not reserve or consume stock.
    }

    OperationResult editWorkOrder(int id, const std::string& description, int number, int quantity) {
        for (auto& order : workOrders_) {
            if (order.id != id) continue;
            if (!hasText(description)) return OperationResult::invalidData;
            std::size_t index = 0;
            auto result = validateLine(number, quantity, index);
            if (result != OperationResult::success) return result;
            WorkOrder replacement{id, description, {number, parts_[index].Name, quantity}};
            order = replacement; // Validate everything before replacing the original.
            return OperationResult::success;
        }
        return OperationResult::notFound;
    }

    OperationResult deleteWorkOrder(int id) {
        for (auto it = workOrders_.begin(); it != workOrders_.end(); ++it) {
            if (it->id == id) {
                workOrders_.erase(it);
                return OperationResult::success;
            }
        }
        return OperationResult::notFound;
    }

    // Option 13: record goods received now and increase stock once.
    OperationResult purchasePart(const std::string& supplier, int number, int quantity, int cents) {
        return recordTransaction(receipts_, nextReceiptId_, supplier, number, quantity, cents, 1);
    }

    // Option 14: record a local supplier request. Nothing has arrived yet.
    OperationResult createPurchaseOrder(const std::string& supplier, int number, int quantity, int cents) {
        return recordTransaction(purchaseOrders_, nextPurchaseId_, supplier, number, quantity, cents, 0);
    }

    // Option 15: prevent overselling, record the sale, then reduce stock once.
    OperationResult createSale(const std::string& customer, int number, int quantity, int cents) {
        return recordTransaction(sales_, nextSaleId_, customer, number, quantity, cents, -1);
    }

private:
    std::vector<Part>& parts_;
    std::vector<WorkOrder> workOrders_;
    std::vector<StockTransaction> receipts_, purchaseOrders_, sales_;
    int nextWorkId_ = 1, nextReceiptId_ = 1, nextPurchaseId_ = 1, nextSaleId_ = 1;

    static bool hasText(const std::string& text) {
        return text.find_first_not_of(" \t\r\n\f\v") != std::string::npos;
    }

    OperationResult validateLine(int number, int quantity, std::size_t& index) const {
        if (number <= 0 || quantity <= 0) return OperationResult::invalidData;
        bool found = false;
        for (std::size_t i = 0; i < parts_.size(); ++i) {
            if (parts_[i].PartNumber != number) continue;
            if (found) return OperationResult::duplicatePartNumber;
            found = true;
            index = i;
        }
        return found ? OperationResult::success : OperationResult::notFound;
    }

    OperationResult recordTransaction(std::vector<StockTransaction>& records, int& nextId,
        const std::string& contact, int number, int quantity, int cents, int stockDirection) {
        if (!hasText(contact) || cents < 0) return OperationResult::invalidData;
        std::size_t index = 0;
        auto result = validateLine(number, quantity, index);
        if (result != OperationResult::success) return result;
        Part& part = parts_[index];
        if (part.Quantity < 0) return OperationResult::invalidData;
        if (nextId == std::numeric_limits<int>::max()) return OperationResult::overflow;
        if (stockDirection > 0 && quantity > std::numeric_limits<int>::max() - part.Quantity)
            return OperationResult::overflow;
        if (stockDirection < 0 && quantity > part.Quantity)
            return OperationResult::insufficientStock;

        // Append first: if allocation fails, stock and the ID counter are unchanged.
        records.push_back({nextId, contact, {number, part.Name, quantity}, cents});
        ++nextId;
        if (stockDirection > 0) part.Quantity += quantity;
        if (stockDirection < 0) part.Quantity -= quantity;
        return OperationResult::success;
    }
};
} // namespace towerflow
// MODIFIED BY MALIK BROWN: Added work orders, purchase receipts, supplier orders, and sales | END //
