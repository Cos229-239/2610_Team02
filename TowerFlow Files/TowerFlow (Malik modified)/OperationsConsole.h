#pragma once
#include "OperationsInventory.h"
#include <istream>
#include <ostream>
#include <sstream>

// MODIFIED BY MALIK BROWN: Added console prompts for options 10 through 15 | START //
namespace towerflow {
class OperationsConsole {
public:
    OperationsConsole(OperationsInventory& inventory, std::istream& input, std::ostream& output)
        : inventory_(inventory), input_(input), output_(output) {}

    void createWorkOrder() {
        output_ << "Work orders plan jobs; they do not change stock.\n";
        std::string description;
        int number = 0, quantity = 0;
        if (!readText("Job description: ", description) || !readLine(number, quantity)) return;
        auto result = inventory_.createWorkOrder(description, number, quantity);
        report(result);
        if (result == OperationResult::success) listWorkOrders();
    }

    void editWorkOrder() {
        listWorkOrders();
        if (inventory_.workOrders().empty()) return;
        int id = 0, number = 0, quantity = 0;
        std::string description;
        if (!readInt("Work order ID: ", id)) return;
        if (!exists(id)) { report(OperationResult::notFound); return; }
        if (!readText("Replacement description: ", description) || !readLine(number, quantity)) return;
        report(inventory_.editWorkOrder(id, description, number, quantity));
    }

    void deleteWorkOrder() {
        listWorkOrders();
        if (inventory_.workOrders().empty()) return;
        int id = 0;
        if (!readInt("Work order ID to delete: ", id)) return;
        if (!exists(id)) { report(OperationResult::notFound); return; }
        if (!confirm("Type DELETE to remove this planned work order: ", "DELETE")) return;
        report(inventory_.deleteWorkOrder(id));
    }

    void purchasePart() {
        listTransactions("Received purchases", inventory_.receipts());
        output_ << "Receive goods now: this adds units to an EXISTING part.\n";
        std::string supplier;
        int number = 0, quantity = 0, cents = 0;
        if (!readTransaction("Supplier: ", supplier, number, quantity, cents)) return;
        if (!confirm("Type RECEIVE to record these goods and increase stock: ", "RECEIVE")) return;
        auto result = inventory_.purchasePart(supplier, number, quantity, cents);
        report(result);
        if (result == OperationResult::success) printTransaction(inventory_.receipts().back());
    }

    void purchaseOrder() {
        listTransactions("Pending purchase orders", inventory_.purchaseOrders());
        output_ << "Record a supplier request locally. Stock will NOT change; nothing is sent.\n";
        std::string supplier;
        int number = 0, quantity = 0, cents = 0;
        if (!readTransaction("Supplier: ", supplier, number, quantity, cents)) return;
        auto result = inventory_.createPurchaseOrder(supplier, number, quantity, cents);
        report(result);
        if (result == OperationResult::success) printTransaction(inventory_.purchaseOrders().back());
    }

    void createSale() {
        listTransactions("Sales", inventory_.sales());
        output_ << "Record a sale and subtract available units. No payment is processed.\n";
        std::string customer;
        int number = 0, quantity = 0, cents = 0;
        if (!readTransaction("Customer: ", customer, number, quantity, cents)) return;
        if (!confirm("Type SELL to record this sale and reduce stock: ", "SELL")) return;
        auto result = inventory_.createSale(customer, number, quantity, cents);
        report(result);
        if (result == OperationResult::success) printTransaction(inventory_.sales().back());
    }

private:
    OperationsInventory& inventory_;
    std::istream& input_;
    std::ostream& output_;

    bool exists(int id) const {
        for (const auto& order : inventory_.workOrders()) if (order.id == id) return true;
        return false;
    }

    void listWorkOrders() const {
        if (inventory_.workOrders().empty()) output_ << "No work orders available.\n";
        for (const auto& order : inventory_.workOrders()) {
            output_ << "Work order " << order.id << " | " << order.description
                    << " | Part " << order.line.partNumber << " (" << order.line.partName
                    << ") | Planned units: " << order.line.quantity << '\n';
        }
    }

    void printTransaction(const StockTransaction& record) const {
        output_ << "Record " << record.id << " | " << record.contact << " | Part "
                << record.line.partNumber << " (" << record.line.partName << ") | Units: "
                << record.line.quantity << " | Unit cents: " << record.unitCents
                << " | Total cents: " << record.totalCents() << '\n';
    }

    void listTransactions(const char* title, const std::vector<StockTransaction>& records) const {
        output_ << title << ":\n";
        if (records.empty()) output_ << "None yet.\n";
        for (const auto& record : records) printTransaction(record);
    }

    bool readLine(int& number, int& quantity) {
        return readInt("Existing part number: ", number) && readInt("Units (positive whole number): ", quantity);
    }

    bool readTransaction(const char* prompt, std::string& contact, int& number, int& quantity, int& cents) {
        return readText(prompt, contact) && readLine(number, quantity)
            && readInt("Unit price in whole cents (e.g. 1250 = 12.50): ", cents);
    }

    bool readText(const char* prompt, std::string& text) {
        std::string line;
        while (true) {
            output_ << prompt;
            if (!std::getline(input_, line)) return false;
            auto first = line.find_first_not_of(" \t\r\n\f\v");
            if (first != std::string::npos) {
                text = line.substr(first, line.find_last_not_of(" \t\r\n\f\v") - first + 1);
                return true;
            }
            output_ << "Text cannot be blank.\n";
        }
    }

    bool readInt(const char* prompt, int& value) {
        std::string line;
        while (true) {
            output_ << prompt;
            if (!std::getline(input_, line)) return false;
            std::istringstream parser(line);
            int candidate = 0;
            char extra = '\0';
            if ((parser >> candidate) && !(parser >> extra)) { value = candidate; return true; }
            output_ << "Enter one whole number within the int range.\n";
        }
    }

    bool confirm(const char* prompt, const std::string& expected) {
        output_ << prompt;
        std::string answer;
        if (std::getline(input_, answer) && answer == expected) return true;
        output_ << "Cancelled. No changes made.\n";
        return false;
    }

    void report(OperationResult result) const {
        switch (result) {
        case OperationResult::success: output_ << "Operation completed.\n"; break;
        case OperationResult::invalidData: output_ << "Invalid data. Use nonblank text, a positive part number/quantity, and nonnegative cents.\n"; break;
        case OperationResult::notFound: output_ << "Part or work order not found.\n"; break;
        case OperationResult::duplicatePartNumber: output_ << "Duplicate part number. No changes made.\n"; break;
        case OperationResult::insufficientStock: output_ << "Not enough stock. Sale not recorded.\n"; break;
        case OperationResult::overflow: output_ << "Supported quantity or record-ID limit exceeded.\n"; break;
        }
    }
};
} // namespace towerflow
// MODIFIED BY MALIK BROWN: Added console prompts for options 10 through 15 | END //
