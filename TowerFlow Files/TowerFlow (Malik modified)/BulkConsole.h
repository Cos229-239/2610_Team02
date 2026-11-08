#pragma once
#include "BulkInventory.h"
#include "PartSelection.h"
#include <istream>
#include <ostream>
#include <sstream>
#include <string>

namespace towerflow {

class BulkConsole {
public:
    // Streams let the menu use the keyboard, while tests use sample text.
    BulkConsole(BulkInventory& inventory, std::istream& input, std::ostream& output)
        : inventory_(inventory), input_(input), output_(output) {}

    void create() { // Option 6: add units.
        if (empty()) {
            return;
        }

        std::string partId;
        int amount = 0;
        if (!ReadExistingPartId(input_, output_, inventory_.items(), "Part ID: ", partId)) {
            return;
        }
        if (!readInt("Units to add: ", amount)) {
            return;
        }

        report(inventory_.add(partId, amount));
    }

    void list() const { // Option 7: display quantities.
        if (empty()) {
            return;
        }

        for (const Part& part : inventory_.items()) {
            output_ << "Part ID: " << part.PartId << " | " << part.Name
                    << " | Serial: " << part.SerialNumber
                    << " | Units: " << part.Quantity << '\n';
        }
    }

    void edit() { // Option 8: replace the quantity.
        if (empty()) {
            return;
        }

        std::string partId;
        int amount = 0;
        if (!ReadExistingPartId(input_, output_, inventory_.items(), "Part ID: ", partId)) {
            return;
        }
        if (!readInt("New total units on hand: ", amount)) {
            return;
        }

        report(inventory_.set(partId, amount));
    }

    void remove() { // Option 9: clear stock, keeping the part.
        if (empty()) {
            return;
        }

        std::string partId;
        if (!ReadExistingPartId(input_, output_, inventory_.items(), "Part ID to clear: ", partId)) {
            return;
        }

        BulkResult result = inventory_.lookup(partId);
        if (result != BulkResult::success) {
            report(result);
            return;
        }

        output_ << "Set this part's quantity to zero? Type CLEAR to confirm: ";
        std::string confirmation;
        if (!ReadOptionLine(input_, confirmation)) return;
        if (confirmation != "CLEAR") {
            output_ << "Clear cancelled.\n";
            return;
        }

        report(inventory_.clear(partId));
    }

private:
    BulkInventory& inventory_;
    std::istream& input_;
    std::ostream& output_;

    bool empty() const {
        if (inventory_.items().empty()) {
            output_ << "No parts available. Create a part with option 2 first.\n";
            return true;
        }
        return false;
    }

    bool readInt(const char* prompt, int& value) {
        while (true) {
            output_ << prompt;
            std::string line;
            if (!ReadOptionLine(input_, line)) {
                return false; // Cancelled or input closed.
            }

            std::istringstream parser(line);
            int number = 0;
            char extra = '\0';

            // Require one integer. Reject text, decimals and values like 12abc.
            if (parser >> number) {
                if (!(parser >> extra)) {
                    value = number;
                    return true;
                }
            }
            output_ << "Enter one whole number within the int range.\n";
        }
    }

    void report(BulkResult result) {
        switch (result) {
        case BulkResult::success:
            output_ << "Stock amount updated.\n";
            break;
        case BulkResult::invalidAmount:
            output_ << "Use a positive amount to add, or a nonnegative replacement. Existing negative stock must be corrected with Edit Bulk.\n";
            break;
        case BulkResult::notFound:
            output_ << "Part ID not found.\n";
            break;
        case BulkResult::ambiguousPartId:
            output_ << "Duplicate Part IDs found. No changes made; resolve duplicates first.\n";
            break;
        case BulkResult::overflow:
            output_ << "Amount exceeds the maximum supported quantity.\n";
            break;
        }
    }
};

}
