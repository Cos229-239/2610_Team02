#pragma once
#include "Part (Malik version).cpp"
#include "InputCheck (Malik version).cpp"
#include "PartSelection.h"
#include <iostream>
#include <vector>

// MODIFIED BY MALIK BROWN: Updated includes, added name and part validation, modified edit/delete lookup by Part ID, validated edits before saving, increased stock totals, and streamlined input/output | START //

// Keep one shared collection for part actions and bulk actions.
static std::vector<Part> Parts;

bool ReadPartName(std::string& name) {
    std::string line;
    while (towerflow::ReadOptionLine(std::cin, line)) {
        const auto first = line.find_first_not_of(" \t\r\n\f\v");
        if (first != std::string::npos) {
            const auto last = line.find_last_not_of(" \t\r\n\f\v");
            name = line.substr(first, last - first + 1);
            return true;
        }
        std::cout << "Name cannot be blank. Enter Part Name: ";
    }
    return false;
}

// Search by the stored Part ID rather than by position in the vector.
int FindPartIndex(const std::string& partId) {
    for (std::size_t i = 0; i < Parts.size(); ++i) {
        if (Parts[i].PartId == partId) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

bool ValidPart(const Part& part, int ignoredIndex = -1) {
    if (!towerflow::IsPartId(part.PartId) || !towerflow::IsSerialNumber(part.SerialNumber) || part.Quantity < 0) {
        std::cout << "Use a Part ID with letters or digits, a Serial Number with 1 to 20 digits, and a nonnegative quantity.\n";
        return false;
    }
    for (std::size_t i = 0; i < Parts.size(); ++i) {
        if (static_cast<int>(i) != ignoredIndex && Parts[i].PartId == part.PartId) {
            std::cout << "That Part ID already exists. No changes made.\n";
            return false;
        }
    }
    return true;
}

void CreatePart() {
    Part NewPart;
    std::cout << "Enter Part Name: ";
    if (!ReadPartName(NewPart.Name)) return;
    if (!towerflow::ReadPartId(std::cin, std::cout, "Enter Part ID (letters or digits): ", NewPart.PartId)) return;
    if (!towerflow::ReadSerialNumber(std::cin, std::cout, "Enter Serial Number (1-20 digits): ", NewPart.SerialNumber)) return;
    std::cout << "Enter Quantity: ";
    if (!GetValidatedInt(NewPart.Quantity)) return;

    if (!ValidPart(NewPart)) return;
    Parts.push_back(NewPart);
    std::cout << "Part created successfully!\n";
    // No extra cin.get(): every input helper already consumes its entire line.
}

void TotalStockCount() {
    long long Total = 0; // Wider than int so several large quantities can be summed.
    for (const Part& part : Parts) {
        Total += part.Quantity;
        std::cout << "Current Part Total: " << Total << std::endl;
        Divider();
    }
    std::cout << "Total Stock: " << Total << '\n';
}

void ListParts(bool showDividers = false) {
    if (Parts.empty()) {
        std::cout << "No parts available.\n";
        return;
    }
    bool first = true;
    for (const Part& part : Parts) {
        if (showDividers && !first) Divider();
        first = false;
        std::cout << "Part Name: " << part.Name << '\n'
                  << "Part ID: " << part.PartId << '\n'
                  << "Serial Number: " << part.SerialNumber << '\n'
                  << "Quantity: " << part.Quantity << '\n';
    }
}

void EditPart() {
    if (Parts.empty()) {
        std::cout << "No parts available to edit.\n";
        return;
    }
    std::string partId;
    if (!towerflow::ReadExistingPartId(std::cin, std::cout, Parts, "Part ID to edit: ", partId)) return;
    int index = FindPartIndex(partId);
    if (index == -1) {
        std::cout << "Part ID not found.\n";
        return;
    }

    // Edit a temporary copy. Commit it only after every field passes validation.
    Part updated = Parts[index];
    std::cout << "Enter replacement Part Name: ";
    if (!ReadPartName(updated.Name)) return;
    if (!towerflow::ReadPartId(std::cin, std::cout, "Enter replacement Part ID (letters or digits): ", updated.PartId)) return;
    if (!towerflow::ReadSerialNumber(std::cin, std::cout, "Enter replacement Serial Number (1-20 digits): ", updated.SerialNumber)) return;
    std::cout << "Enter replacement Quantity: ";
    if (!GetValidatedInt(updated.Quantity)) return;

    if (!ValidPart(updated, index)) return;
    Parts[index] = updated;
    std::cout << "Part updated successfully!\n";
}

void DeletePart() {
    if (Parts.empty()) {
        std::cout << "No parts available to delete.\n";
        return;
    }
    std::string partId;
    if (!towerflow::ReadExistingPartId(std::cin, std::cout, Parts, "Part ID to delete: ", partId)) return;
    int index = FindPartIndex(partId);
    if (index == -1) {
        std::cout << "Part ID not found.\n";
        return;
    }
    std::cout << "Type DELETE to confirm, or /back to cancel: ";
    std::string confirmation;
    if (!towerflow::ReadOptionLine(std::cin, confirmation)) return;
    if (confirmation != "DELETE") {
        std::cout << "Deletion cancelled.\n";
        return;
    }
    Parts.erase(Parts.begin() + index);
    std::cout << "Part deleted successfully!\n";
}

// MODIFIED BY MALIK BROWN: Updated includes, added name and part validation, modified edit/delete lookup by Part ID, validated edits before saving, increased stock totals, and streamlined input/output | END //
