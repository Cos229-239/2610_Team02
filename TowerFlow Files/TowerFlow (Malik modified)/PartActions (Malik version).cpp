#pragma once
#include "Part (Malik version).cpp"
#include "InputCheck (Malik version).cpp"
#include <iostream>
#include <vector>

// MODIFIED BY MALIK BROWN: Updated includes, added name and part validation, modified edit/delete lookup by part number, validated edits before saving, increased stock totals, and streamlined input/output | START //

// Keep one shared collection for part actions and bulk actions.
static std::vector<Part> Parts;

bool ReadPartName(std::string& name) {
    std::string line;
    while (std::getline(std::cin, line)) {
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

// A part number is an ID, not a position in the vector.
int FindPartIndex(int number) {
    for (std::size_t i = 0; i < Parts.size(); ++i) {
        if (Parts[i].PartNumber == number) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

bool ValidPart(const Part& part, int ignoredIndex = -1) {
    if (part.PartNumber <= 0 || part.SerialNumber < 0 || part.Quantity < 0) {
        std::cout << "Use a positive part number and nonnegative serial number and quantity.\n";
        return false;
    }
    for (std::size_t i = 0; i < Parts.size(); ++i) {
        if (static_cast<int>(i) != ignoredIndex && Parts[i].PartNumber == part.PartNumber) {
            std::cout << "That part number already exists. No changes made.\n";
            return false;
        }
    }
    return true;
}

void CreatePart() {
    Part NewPart;
    std::cout << "Enter Part Name: ";
    if (!ReadPartName(NewPart.Name)) return;
    std::cout << "Enter Part Number: ";
    if (!GetValidatedInt(NewPart.PartNumber)) return;
    std::cout << "Enter Serial Number: ";
    if (!GetValidatedInt(NewPart.SerialNumber)) return;
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

void ListParts() {
    if (Parts.empty()) {
        std::cout << "No parts available.\n";
        return;
    }
    for (const Part& part : Parts) {
        std::cout << "Part Name: " << part.Name << '\n'
                  << "Part Number: " << part.PartNumber << '\n'
                  << "Serial Number: " << part.SerialNumber << '\n'
                  << "Quantity: " << part.Quantity << '\n';
    }
}

void EditPart() {
    if (Parts.empty()) {
        std::cout << "No parts available to edit.\n";
        return;
    }
    ListParts();
    std::cout << "Enter the Part Number of the part you want to edit: ";
    int number = 0;
    if (!GetValidatedInt(number)) return;
    int index = FindPartIndex(number);
    if (index == -1) {
        std::cout << "Part number not found.\n";
        return;
    }

    // Edit a temporary copy. Commit it only after every field passes validation.
    Part updated = Parts[index];
    std::cout << "Enter replacement Part Name: ";
    if (!ReadPartName(updated.Name)) return;
    std::cout << "Enter replacement Part Number: ";
    if (!GetValidatedInt(updated.PartNumber)) return;
    std::cout << "Enter replacement Serial Number: ";
    if (!GetValidatedInt(updated.SerialNumber)) return;
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
    ListParts();
    std::cout << "Enter the Part Number of the part you want to delete: ";
    int number = 0;
    if (!GetValidatedInt(number)) return;
    int index = FindPartIndex(number);
    if (index == -1) {
        std::cout << "Part number not found.\n";
        return;
    }
    Parts.erase(Parts.begin() + index);
    std::cout << "Part deleted successfully!\n";
}

// MODIFIED BY MALIK BROWN: Updated includes, added name and part validation, modified edit/delete lookup by part number, validated edits before saving, increased stock totals, and streamlined input/output | END //
