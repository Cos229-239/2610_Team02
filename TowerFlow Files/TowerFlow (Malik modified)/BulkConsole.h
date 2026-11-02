#pragma once
#include "BulkInventory.h"
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

        int number = 0;
        int amount = 0;
        if (!readInt("Part number: ", number)) {
            return;
        }
        if (!readInt("Units to add: ", amount)) {
            return;
        }

        report(inventory_.add(number, amount));
    }

    void list() const { // Option 7: display quantities.
        if (empty()) {
            return;
        }

        for (const Part& part : inventory_.items()) {
            output_ << "Part number: " << part.PartNumber << " | " << part.Name
                    << " | Serial: " << part.SerialNumber
                    << " | Units: " << part.Quantity << '\n';
        }
    }

    void edit() { // Option 8: replace the quantity.
        if (empty()) {
            return;
        }

        int number = 0;
        int amount = 0;
        if (!readInt("Part number: ", number)) {
            return;
        }
        if (!readInt("New total units on hand: ", amount)) {
            return;
        }

        report(inventory_.set(number, amount));
    }

    void remove() { // Option 9: clear stock, keeping the part.
        if (empty()) {
            return;
        }

        int number = 0;
        if (!readInt("Part number to clear: ", number)) {
            return;
        }

        BulkResult result = inventory_.lookup(number);
        if (result != BulkResult::success) {
            report(result);
            return;
        }

        output_ << "Set this part's quantity to zero? Type CLEAR to confirm: ";
        std::string confirmation;
        std::getline(input_, confirmation);
        if (!input_ || confirmation != "CLEAR") {
            output_ << "Clear cancelled.\n";
            return;
        }

        report(inventory_.clear(number));
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
            if (!std::getline(input_, line)) {
                return false; // Input closed: return instead of looping forever.
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
            output_ << "Part number not found.\n";
            break;
        case BulkResult::ambiguousPartNumber:
            output_ << "Duplicate part numbers found. No changes made; resolve duplicates first.\n";
            break;
        case BulkResult::overflow:
            output_ << "Amount exceeds the maximum supported quantity.\n";
            break;
        }
    }
};

}
