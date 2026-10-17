#pragma once
#include "Part (Malik version).cpp"
#include <limits>
#include <vector>

namespace towerflow {

enum class BulkResult {
    success,
    invalidAmount,
    notFound,
    ambiguousPartNumber,
    overflow
};

class BulkInventory {
public:
    // A reference lets us update the existing inventory instead of copying it.
    explicit BulkInventory(std::vector<Part>& parts) : parts_(parts) {}

    const std::vector<Part>& items() const {
        return parts_;
    }

    BulkResult add(int partNumber, int amount) {
        if (amount <= 0) {
            return BulkResult::invalidAmount;
        }

        std::size_t index = 0;
        BulkResult result = findIndex(partNumber, index);
        if (result != BulkResult::success) {
            return result;
        }

        Part& part = parts_[index];
        if (part.Quantity < 0) {
            return BulkResult::invalidAmount;
        }

        // Check BEFORE adding so the quantity cannot overflow.
        if (amount > std::numeric_limits<int>::max() - part.Quantity) {
            return BulkResult::overflow;
        }

        part.Quantity += amount;
        return BulkResult::success;
    }

    BulkResult set(int partNumber, int amount) {
        if (amount < 0) {
            return BulkResult::invalidAmount;
        }

        std::size_t index = 0;
        BulkResult result = findIndex(partNumber, index);
        if (result != BulkResult::success) {
            return result;
        }

        parts_[index].Quantity = amount;
        return BulkResult::success;
    }

    BulkResult clear(int partNumber) {
        return set(partNumber, 0);
    }

    BulkResult lookup(int partNumber) const {
        std::size_t index = 0;
        return findIndex(partNumber, index);
    }

private:
    std::vector<Part>& parts_;

    // Return the position of ONE matching record. Duplicate IDs are unsafe.
    BulkResult findIndex(int partNumber, std::size_t& index) const {
        bool found = false;

        for (std::size_t i = 0; i < parts_.size(); ++i) {
            if (parts_[i].PartNumber != partNumber) {
                continue;
            }

            if (found) {
                return BulkResult::ambiguousPartNumber;
            }

            index = i;
            found = true;
        }

        if (!found) {
            return BulkResult::notFound;
        }
        return BulkResult::success;
    }
};

} // namespace towerflow

